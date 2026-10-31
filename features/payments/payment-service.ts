import type { Invoice, Payment, InvoiceStatus, PaymentMethod } from '@/types/database';

export interface PaymentValidationResult {
  success: boolean;
  payment?: Payment;
  updatedInvoice?: {
    paidMinor: number;
    balanceMinor: number;
    status: InvoiceStatus;
    updatedAt: string;
  };
  error?: string;
}

export interface RefundValidationResult {
  success: boolean;
  refundPayment?: Payment;
  updatedInvoice?: {
    paidMinor: number;
    balanceMinor: number;
    status: InvoiceStatus;
    updatedAt: string;
  };
  error?: string;
}

/**
 * Validate and apply a payment to an invoice.
 *
 * Rules:
 * - Cannot pay draft, paid, or cancelled invoices
 * - Payment amount must be positive integer (paise)
 * - Overpayment is rejected: amount cannot exceed balanceMinor
 * - Updates paidMinor, balanceMinor, and status deterministically
 */
export function validateAndApplyPayment(
  invoice: Invoice,
  amountMinor: number,
  method: PaymentMethod,
  paymentDate: string,
  note?: string,
  recordedBy: string = 'system',
  transactionRef?: string
): PaymentValidationResult {
  if (invoice.status === 'draft') {
    return {
      success: false,
      error: 'Cannot record payment against a draft invoice. Confirm invoice first.',
    };
  }

  if (invoice.status === 'paid' || invoice.balanceMinor <= 0) {
    return {
      success: false,
      error: 'Invoice is already fully paid.',
    };
  }

  if (invoice.status === 'cancelled') {
    return {
      success: false,
      error: 'Cannot record payment against a cancelled invoice.',
    };
  }

  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    return {
      success: false,
      error: 'Payment amount must be a positive integer in minor units (paise).',
    };
  }

  if (amountMinor > invoice.balanceMinor) {
    return {
      success: false,
      error: `Payment amount (${amountMinor} paise) exceeds remaining balance (${invoice.balanceMinor} paise). Overpayment is rejected.`,
    };
  }

  const newPaidMinor = invoice.paidMinor + amountMinor;
  const newBalanceMinor = invoice.totalMinor - newPaidMinor;

  let newStatus: InvoiceStatus;
  if (newBalanceMinor === 0) {
    newStatus = 'paid';
  } else {
    newStatus = 'partially_paid';
  }

  const payment: Payment = {
    id: crypto.randomUUID(),
    invoiceId: invoice.id,
    amountMinor,
    method,
    paymentDate,
    note,
    recordedBy,
    transactionRef,
    isRefund: false,
    createdAt: new Date().toISOString(),
  };

  return {
    success: true,
    payment,
    updatedInvoice: {
      paidMinor: newPaidMinor,
      balanceMinor: newBalanceMinor,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Validate and apply a payment refund / reversal.
 *
 * Real-world rules:
 * - Cannot refund if no payments exist or paidMinor <= 0
 * - Refund amount must be positive integer (paise)
 * - Refund amount cannot exceed the original payment amount
 * - Refund amount cannot exceed invoice paidMinor
 * - Adjusts paidMinor, balanceMinor, and updates invoice status (e.g. from paid to partially_paid or confirmed)
 */
export function validateAndApplyRefund(
  invoice: Invoice,
  originalPayment: Payment,
  refundAmountMinor: number,
  refundReason: string,
  recordedBy: string = 'system',
  existingRefundsForPayment: Payment[] = []
): RefundValidationResult {
  if (invoice.id !== originalPayment.invoiceId) {
    return {
      success: false,
      error: 'Original payment does not belong to the specified invoice.',
    };
  }

  if (invoice.paidMinor <= 0) {
    return {
      success: false,
      error: 'Invoice has no paid balance to refund.',
    };
  }

  if (!Number.isInteger(refundAmountMinor) || refundAmountMinor <= 0) {
    return {
      success: false,
      error: 'Refund amount must be a positive integer in minor units (paise).',
    };
  }

  // Calculate previously refunded amount for this payment
  const previouslyRefundedMinor = existingRefundsForPayment
    .filter((p) => p.isRefund && p.originalPaymentId === originalPayment.id)
    .reduce((sum, p) => sum + p.amountMinor, 0);

  const availableRefundableOnPayment = originalPayment.amountMinor - previouslyRefundedMinor;

  if (refundAmountMinor > availableRefundableOnPayment) {
    return {
      success: false,
      error: `Refund amount (${refundAmountMinor} paise) exceeds remaining refundable amount on this payment (${availableRefundableOnPayment} paise).`,
    };
  }

  if (refundAmountMinor > invoice.paidMinor) {
    return {
      success: false,
      error: `Refund amount (${refundAmountMinor} paise) exceeds invoice total paid balance (${invoice.paidMinor} paise).`,
    };
  }

  const newPaidMinor = invoice.paidMinor - refundAmountMinor;
  const newBalanceMinor = invoice.totalMinor - newPaidMinor;

  let newStatus: InvoiceStatus;
  if (newPaidMinor === 0) {
    newStatus = 'confirmed';
  } else if (newBalanceMinor > 0) {
    newStatus = 'partially_paid';
  } else {
    newStatus = 'paid';
  }

  const refundPayment: Payment = {
    id: crypto.randomUUID(),
    invoiceId: invoice.id,
    amountMinor: refundAmountMinor,
    method: originalPayment.method,
    paymentDate: new Date().toISOString().split('T')[0],
    note: `Refund: ${refundReason}`,
    recordedBy,
    isRefund: true,
    refundReason,
    originalPaymentId: originalPayment.id,
    createdAt: new Date().toISOString(),
  };

  return {
    success: true,
    refundPayment,
    updatedInvoice: {
      paidMinor: newPaidMinor,
      balanceMinor: newBalanceMinor,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Reconcile multiple payments against an invoice total.
 */
export function reconcileInvoicePayments(
  totalMinor: number,
  payments: Payment[],
  currentStatus: InvoiceStatus
): {
  paidMinor: number;
  balanceMinor: number;
  status: InvoiceStatus;
} {
  if (currentStatus === 'draft' || currentStatus === 'cancelled') {
    return {
      paidMinor: 0,
      balanceMinor: totalMinor,
      status: currentStatus,
    };
  }

  // Normal payments add, refunds subtract
  const paidMinor = payments.reduce((sum, p) => {
    return p.isRefund ? sum - p.amountMinor : sum + p.amountMinor;
  }, 0);

  const safePaidMinor = Math.max(0, paidMinor);
  const balanceMinor = Math.max(0, totalMinor - safePaidMinor);

  let status: InvoiceStatus = currentStatus;
  if (balanceMinor === 0 && safePaidMinor > 0) {
    status = 'paid';
  } else if (safePaidMinor > 0) {
    status = 'partially_paid';
  } else {
    status = 'confirmed';
  }

  return {
    paidMinor: safePaidMinor,
    balanceMinor,
    status,
  };
}
