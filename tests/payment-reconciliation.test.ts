import { describe, it, expect } from 'vitest';
import {
  validateAndApplyPayment,
  reconcileInvoicePayments,
} from '@/features/payments/payment-service';
import type { Invoice, Payment } from '@/types/database';

describe('Payment Reconciliation & Validation', () => {
  const baseInvoice: Invoice = {
    id: 'inv-test-101',
    number: 'INV-2604-001',
    customerId: 'cust-1',
    customerName: 'Acme Corp',
    customerEmail: 'billing@acme.com',
    status: 'confirmed',
    dueDate: '2026-04-30',
    subtotalMinor: 100000,
    discountTotalMinor: 0,
    taxTotalMinor: 18000,
    totalMinor: 118000, // ₹1,180
    paidMinor: 0,
    balanceMinor: 118000,
    items: [],
    createdAt: '2026-04-01',
    updatedAt: '2026-04-01',
  };

  it('rejects payment on a draft invoice', () => {
    const draftInv = { ...baseInvoice, status: 'draft' as const };
    const res = validateAndApplyPayment(draftInv, 50000, 'upi', '2026-04-05');
    expect(res.success).toBe(false);
    expect(res.error).toContain('draft invoice');
  });

  it('rejects payment on a cancelled invoice', () => {
    const cancelledInv = { ...baseInvoice, status: 'cancelled' as const };
    const res = validateAndApplyPayment(cancelledInv, 50000, 'upi', '2026-04-05');
    expect(res.success).toBe(false);
    expect(res.error).toContain('cancelled invoice');
  });

  it('rejects negative or zero payment amount', () => {
    const resZero = validateAndApplyPayment(baseInvoice, 0, 'upi', '2026-04-05');
    expect(resZero.success).toBe(false);
    expect(resZero.error).toContain('positive integer');

    const resNeg = validateAndApplyPayment(baseInvoice, -500, 'upi', '2026-04-05');
    expect(resNeg.success).toBe(false);
  });

  it('rejects overpayment when amount exceeds balance', () => {
    const overpayAmount = baseInvoice.balanceMinor + 1000;
    const res = validateAndApplyPayment(baseInvoice, overpayAmount, 'card', '2026-04-05');
    expect(res.success).toBe(false);
    expect(res.error).toContain('Overpayment is rejected');
  });

  it('handles partial payment correctly (status: partially_paid, balance reduced)', () => {
    const partialAmount = 50000; // ₹500
    const res = validateAndApplyPayment(baseInvoice, partialAmount, 'bank_transfer', '2026-04-05');
    expect(res.success).toBe(true);
    expect(res.payment).toBeDefined();
    expect(res.updatedInvoice?.paidMinor).toBe(50000);
    expect(res.updatedInvoice?.balanceMinor).toBe(68000); // 118000 - 50000
    expect(res.updatedInvoice?.status).toBe('partially_paid');
  });

  it('handles full payment correctly (status: paid, balance: 0)', () => {
    const fullAmount = 118000;
    const res = validateAndApplyPayment(baseInvoice, fullAmount, 'upi', '2026-04-05');
    expect(res.success).toBe(true);
    expect(res.updatedInvoice?.paidMinor).toBe(118000);
    expect(res.updatedInvoice?.balanceMinor).toBe(0);
    expect(res.updatedInvoice?.status).toBe('paid');
  });

  it('rejects payment on an already paid invoice', () => {
    const paidInv = { ...baseInvoice, status: 'paid' as const, paidMinor: 118000, balanceMinor: 0 };
    const res = validateAndApplyPayment(paidInv, 1000, 'upi', '2026-04-06');
    expect(res.success).toBe(false);
    expect(res.error).toContain('already fully paid');
  });

  it('reconciles multiple payments deterministically', () => {
    const payments: Payment[] = [
      {
        id: 'p1',
        invoiceId: baseInvoice.id,
        amountMinor: 40000,
        method: 'upi',
        paymentDate: '2026-04-05',
        recordedBy: 'staff',
        createdAt: '',
      },
      {
        id: 'p2',
        invoiceId: baseInvoice.id,
        amountMinor: 78000,
        method: 'bank_transfer',
        paymentDate: '2026-04-10',
        recordedBy: 'staff',
        createdAt: '',
      },
    ];

    const reconciled = reconcileInvoicePayments(baseInvoice.totalMinor, payments, 'confirmed');
    expect(reconciled.paidMinor).toBe(118000);
    expect(reconciled.balanceMinor).toBe(0);
    expect(reconciled.status).toBe('paid');
  });
});

