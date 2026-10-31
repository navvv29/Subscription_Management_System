import { describe, it, expect } from 'vitest';
import { calculateNextBillingDate } from '@/lib/billing/date-utils';
import { validateAndApplyPayment } from '@/features/payments/payment-service';
import type { Invoice } from '@/types/database';

describe('Financial & Calendar Edge Cases', () => {
  it('handles month-end transitions for 30-day months correctly', () => {
    // April 30 -> May 30
    expect(calculateNextBillingDate('2026-04-30', 'monthly', 30)).toBe('2026-05-30');
    // May 31 -> June 30 (June only has 30 days)
    expect(calculateNextBillingDate('2026-05-31', 'monthly', 31)).toBe('2026-06-30');
    // Aug 31 -> Sept 30 (September only has 30 days)
    expect(calculateNextBillingDate('2026-08-31', 'monthly', 31)).toBe('2026-09-30');
  });

  it('handles 4-year yearly intervals spanning leap year correctly', () => {
    // Starts Feb 29, 2024 (leap year)
    const y1 = calculateNextBillingDate('2024-02-29', 'yearly', 29);
    expect(y1).toBe('2025-02-28'); // Non-leap year clamps to Feb 28

    const y2 = calculateNextBillingDate('2025-02-28', 'yearly', 29);
    expect(y2).toBe('2026-02-28'); // Non-leap year clamps to Feb 28

    const y3 = calculateNextBillingDate('2026-02-28', 'yearly', 29);
    expect(y3).toBe('2027-02-28'); // Non-leap year clamps to Feb 28

    const y4 = calculateNextBillingDate('2027-02-28', 'yearly', 29);
    expect(y4).toBe('2028-02-29'); // 2028 is leap year, returns to Feb 29!
  });

  it('handles exact sum of multiple partial payments resulting in paid status', () => {
    let invoice: Invoice = {
      id: 'inv-multi-pay',
      number: 'INV-M1',
      customerId: 'c1',
      customerName: 'C1',
      customerEmail: 'c1@test.com',
      status: 'confirmed',
      dueDate: '2026-06-01',
      subtotalMinor: 100000,
      discountTotalMinor: 0,
      taxTotalMinor: 0,
      totalMinor: 100000, // ₹1,000
      paidMinor: 0,
      balanceMinor: 100000,
      items: [],
      createdAt: '',
      updatedAt: '',
    };

    // 1st partial payment: ₹300
    const res1 = validateAndApplyPayment(invoice, 30000, 'upi', '2026-05-10');
    expect(res1.success).toBe(true);
    Object.assign(invoice, res1.updatedInvoice);
    expect(invoice.status).toBe('partially_paid');
    expect(invoice.balanceMinor).toBe(70000);

    // 2nd partial payment: ₹400
    const res2 = validateAndApplyPayment(invoice, 40000, 'card', '2026-05-15');
    expect(res2.success).toBe(true);
    Object.assign(invoice, res2.updatedInvoice);
    expect(invoice.status).toBe('partially_paid');
    expect(invoice.balanceMinor).toBe(30000);

    // 3rd final payment: exact remaining ₹300
    const res3 = validateAndApplyPayment(invoice, 30000, 'bank_transfer', '2026-05-20');
    expect(res3.success).toBe(true);
    Object.assign(invoice, res3.updatedInvoice);
    expect(invoice.status).toBe('paid');
    expect(invoice.balanceMinor).toBe(0);
    expect(invoice.paidMinor).toBe(100000);

    // Any subsequent payment is strictly rejected
    const res4 = validateAndApplyPayment(invoice, 100, 'upi', '2026-05-21');
    expect(res4.success).toBe(false);
    expect(res4.error).toContain('already fully paid');
  });
});

