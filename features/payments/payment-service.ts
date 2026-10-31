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
  recordedBy: string = 'system'
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

  const paidMinor = payments.reduce((sum, p) => sum + p.amountMinor, 0);
  const balanceMinor = Math.max(0, totalMinor - paidMinor);

  let status: InvoiceStatus = currentStatus;
  if (balanceMinor === 0 && paidMinor > 0) {
    status = 'paid';
  } else if (paidMinor > 0) {
    status = 'partially_paid';
  } else {
    status = 'confirmed';
  }

  return {
    paidMinor,
    balanceMinor,
    status,
  };
}
