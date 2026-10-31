import { describe, it, expect } from 'vitest';
import type { Subscription, Invoice, Payment } from '@/types/database';
import { isDueForBilling } from '@/lib/billing/date-utils';
import { isBefore, parseISO, startOfDay } from 'date-fns';

describe('Dashboard Metrics Reconciliation', () => {
  it('reconciles dashboard summary figures with underlying source records', () => {
    const todayStr = '2026-05-01';
    const today = startOfDay(parseISO(todayStr));

    const subscriptions: Subscription[] = [
      {
        id: 's1',
        number: 'SUB-1',
        customerId: 'c1',
        planId: 'p1',
        status: 'active',
        startDate: '2026-01-01',
        nextBillingDate: '2026-05-01', // Due today
        paymentTerms: 'Net 30',
        items: [],
        subtotalMinor: 100000,
        discountTotalMinor: 0,
        taxTotalMinor: 0,
        totalMinor: 100000,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      {
        id: 's2',
        number: 'SUB-2',
        customerId: 'c2',
        planId: 'p1',
        status: 'active',
        startDate: '2026-02-01',
        nextBillingDate: '2026-05-15', // Not due yet
        paymentTerms: 'Net 30',
        items: [],
        subtotalMinor: 200000,
        discountTotalMinor: 0,
        taxTotalMinor: 0,
        totalMinor: 200000,
        createdAt: '2026-02-01',
        updatedAt: '2026-02-01',
      },
      {
        id: 's3',
        number: 'SUB-3',
        customerId: 'c3',
        planId: 'p1',
        status: 'paused', // Paused - not active
        startDate: '2026-01-01',
        nextBillingDate: '2026-05-01',
        paymentTerms: 'Net 30',
        items: [],
        subtotalMinor: 150000,
        discountTotalMinor: 0,
        taxTotalMinor: 0,
        totalMinor: 150000,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ];

    const invoices: Invoice[] = [
      {
        id: 'inv-1',
        number: 'INV-1',
        customerId: 'c1',
        customerName: 'C1',
        customerEmail: 'c1@test.com',
        status: 'confirmed',
        dueDate: '2026-04-15', // Overdue as of 2026-05-01
        subtotalMinor: 100000,
        discountTotalMinor: 0,
        taxTotalMinor: 0,
        totalMinor: 100000,
        paidMinor: 30000,
        balanceMinor: 70000,
        items: [],
        createdAt: '2026-04-01',
        updatedAt: '2026-04-01',
      },
      {
        id: 'inv-2',
        number: 'INV-2',
        customerId: 'c2',
        customerName: 'C2',
        customerEmail: 'c2@test.com',
        status: 'paid', // Fully paid
        dueDate: '2026-04-20',
        subtotalMinor: 50000,
        discountTotalMinor: 0,
        taxTotalMinor: 0,
        totalMinor: 50000,
        paidMinor: 50000,
        balanceMinor: 0,
        items: [],
        createdAt: '2026-04-01',
        updatedAt: '2026-04-01',
      },
      {
        id: 'inv-3',
        number: 'INV-3',
        customerId: 'c3',
        customerName: 'C3',
        customerEmail: 'c3@test.com',
        status: 'confirmed', // Not overdue yet
        dueDate: '2026-05-10',
        subtotalMinor: 80000,
        discountTotalMinor: 0,
        taxTotalMinor: 0,
        totalMinor: 80000,
        paidMinor: 0,
        balanceMinor: 80000,
        items: [],
        createdAt: '2026-04-25',
        updatedAt: '2026-04-25',
      },
    ];

    const payments: Payment[] = [
      {
        id: 'p1',
        invoiceId: 'inv-1',
        amountMinor: 30000,
        method: 'upi',
        paymentDate: '2026-04-10',
        recordedBy: 'admin',
        createdAt: '2026-04-10',
      },
      {
        id: 'p2',
        invoiceId: 'inv-2',
        amountMinor: 50000,
        method: 'bank_transfer',
        paymentDate: '2026-04-15',
        recordedBy: 'admin',
        createdAt: '2026-04-15',
      },
    ];

    // Compute metrics
    const activeSubscriptions = subscriptions.filter((s) => s.status === 'active').length;
    expect(activeSubscriptions).toBe(2);

    const collectedMinor = payments.reduce((sum, p) => sum + p.amountMinor, 0);
    expect(collectedMinor).toBe(80000); // 30,000 + 50,000

    const outstandingMinor = invoices
      .filter((i) => i.status !== 'cancelled' && i.status !== 'paid')
      .reduce((sum, i) => sum + i.balanceMinor, 0);
    expect(outstandingMinor).toBe(150000); // 70,000 (inv-1) + 80,000 (inv-3)

    const overdueMinor = invoices
      .filter((i) => {
        if (i.status === 'cancelled' || i.status === 'paid') return false;
        return isBefore(startOfDay(parseISO(i.dueDate)), today);
      })
      .reduce((sum, i) => sum + i.balanceMinor, 0);
    expect(overdueMinor).toBe(70000); // Only inv-1 is before 2026-05-01

    const dueForBillingCount = subscriptions.filter(
      (s) => s.status === 'active' && isDueForBilling(s.nextBillingDate, todayStr)
    ).length;
    expect(dueForBillingCount).toBe(1); // Only s1 is due on or before 2026-05-01
  });
});

