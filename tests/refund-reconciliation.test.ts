import { describe, it, expect } from 'vitest';
import {
  validateAndApplyPayment,
  validateAndApplyRefund,
  reconcileInvoicePayments,
} from '@/features/payments/payment-service';
import type { Invoice, Payment } from '@/types/database';

describe('Payment Refund & Reversal Operations', () => {
  const baseInvoice: Invoice = {
    id: 'inv-test-refund-01',
    number: 'INV-2610-RFND1',
    customerId: 'cust-101',
    customerName: 'Brightloop Technologies',
    customerEmail: 'contact@brightloop.io',
    status: 'confirmed',
    dueDate: '2026-11-30',
    subtotalMinor: 1000000,
    discountTotalMinor: 0,
    taxTotalMinor: 180000,
    totalMinor: 1180000, // 11,800 INR
    paidMinor: 0,
    balanceMinor: 1180000,
    items: [],
    createdAt: '2026-10-31T00:00:00.000Z',
    updatedAt: '2026-10-31T00:00:00.000Z',
  };

  it('correctly processes a partial refund and adjusts invoice balance', () => {
    // 1. Pay the invoice in full
    const payResult = validateAndApplyPayment(
      baseInvoice,
      1180000,
      'upi',
      '2026-10-31',
      'Full payment via UPI'
    );
    expect(payResult.success).toBe(true);
    const paidInvoice: Invoice = {
      ...baseInvoice,
      ...payResult.updatedInvoice!,
    };
    expect(paidInvoice.status).toBe('paid');
    expect(paidInvoice.balanceMinor).toBe(0);

    // 2. Customer asks for partial refund of 500,000 paise (5,000 INR)
    const refundResult = validateAndApplyRefund(
      paidInvoice,
      payResult.payment!,
      500000,
      'Downgrade compute tier adjustment',
      'finance_lead'
    );

    expect(refundResult.success).toBe(true);
    expect(refundResult.refundPayment).toBeDefined();
    expect(refundResult.refundPayment?.isRefund).toBe(true);
    expect(refundResult.refundPayment?.amountMinor).toBe(500000);

    // Invoice status should regress from paid to partially_paid
    expect(refundResult.updatedInvoice?.status).toBe('partially_paid');
    expect(refundResult.updatedInvoice?.paidMinor).toBe(680000);
    expect(refundResult.updatedInvoice?.balanceMinor).toBe(500000);
  });

  it('rejects refund exceeding original payment or invoice paid balance', () => {
    const payResult = validateAndApplyPayment(
      baseInvoice,
      500000,
      'bank_transfer',
      '2026-10-31'
    );
    const partiallyPaidInvoice: Invoice = {
      ...baseInvoice,
      ...payResult.updatedInvoice!,
    };

    // Attempt to refund 600,000 paise when only 500,000 was paid
    const overRefundResult = validateAndApplyRefund(
      partiallyPaidInvoice,
      payResult.payment!,
      600000,
      'Over-refund test'
    );
    expect(overRefundResult.success).toBe(false);
    expect(overRefundResult.error).toContain('exceeds remaining refundable amount');
  });

  it('reconciles multi-payment stream with refunds deterministically', () => {
    const payment1: Payment = {
      id: 'p1',
      invoiceId: 'inv-test-refund-01',
      amountMinor: 600000,
      method: 'bank_transfer',
      paymentDate: '2026-10-31',
      recordedBy: 'system',
      createdAt: '2026-10-31T00:00:00.000Z',
    };
    const payment2: Payment = {
      id: 'p2',
      invoiceId: 'inv-test-refund-01',
      amountMinor: 580000,
      method: 'upi',
      paymentDate: '2026-10-31',
      recordedBy: 'system',
      createdAt: '2026-10-31T00:00:00.000Z',
    };
    const refund: Payment = {
      id: 'r1',
      invoiceId: 'inv-test-refund-01',
      amountMinor: 200000,
      method: 'upi',
      paymentDate: '2026-11-01',
      recordedBy: 'admin',
      isRefund: true,
      originalPaymentId: 'p2',
      createdAt: '2026-11-01T00:00:00.000Z',
    };

    const reconciliation = reconcileInvoicePayments(
      1180000,
      [payment1, payment2, refund],
      'confirmed'
    );

    // Total paid: 600k + 580k - 200k = 980k
    expect(reconciliation.paidMinor).toBe(980000);
    // Balance: 1,180k - 980k = 200k
    expect(reconciliation.balanceMinor).toBe(200000);
    expect(reconciliation.status).toBe('partially_paid');
  });
});

