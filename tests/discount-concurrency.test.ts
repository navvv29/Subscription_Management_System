import { describe, it, expect } from 'vitest';
import { processBillingBatch, generateInvoiceForSubscription } from '@/features/billing/billing-service';
import type { Subscription, Discount, TaxRule } from '@/types/database';

describe('Discount Usage Limits & Contractual End-Date Guards', () => {
  it('strictly caps discount usage count across sequential invoice generation', () => {
    const limitedDiscount: Discount = {
      id: 'disc-limited-2',
      name: 'Limited to 2 Uses',
      type: 'fixed',
      value: 10000, // ₹100
      validFrom: '2026-01-01',
      validUntil: '2026-12-31',
      usageLimit: 2,
      usageCount: 0,
      isActive: true,
      createdAt: '',
      updatedAt: '',
    };

    const subscriptions: Array<Subscription & { plan: { interval: 'monthly'; name: string } }> = [
      {
        id: 'sub-cap-1',
        number: 'SUB-C1',
        customerId: 'c1',
        planId: 'p1',
        plan: { interval: 'monthly', name: 'Monthly' },
        status: 'active',
        startDate: '2026-05-01',
        nextBillingDate: '2026-05-01',
        paymentTerms: 'Net 30',
        items: [
          {
            id: 'it-1',
            subscriptionId: 'sub-cap-1',
            productId: 'p1',
            productName: 'P1',
            quantity: 1,
            unitPriceMinor: 50000,
            taxAmountMinor: 0,
            discountAmountMinor: 0,
            totalMinor: 50000,
          },
        ],
        subtotalMinor: 50000,
        taxTotalMinor: 0,
        discountTotalMinor: 0,
        totalMinor: 50000,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'sub-cap-2',
        number: 'SUB-C2',
        customerId: 'c2',
        planId: 'p1',
        plan: { interval: 'monthly', name: 'Monthly' },
        status: 'active',
        startDate: '2026-05-01',
        nextBillingDate: '2026-05-01',
        paymentTerms: 'Net 30',
        items: [
          {
            id: 'it-2',
            subscriptionId: 'sub-cap-2',
            productId: 'p1',
            productName: 'P1',
            quantity: 1,
            unitPriceMinor: 50000,
            taxAmountMinor: 0,
            discountAmountMinor: 0,
            totalMinor: 50000,
          },
        ],
        subtotalMinor: 50000,
        taxTotalMinor: 0,
        discountTotalMinor: 0,
        totalMinor: 50000,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'sub-cap-3',
        number: 'SUB-C3',
        customerId: 'c3',
        planId: 'p1',
        plan: { interval: 'monthly', name: 'Monthly' },
        status: 'active',
        startDate: '2026-05-01',
        nextBillingDate: '2026-05-01',
        paymentTerms: 'Net 30',
        items: [
          {
            id: 'it-3',
            subscriptionId: 'sub-cap-3',
            productId: 'p1',
            productName: 'P1',
            quantity: 1,
            unitPriceMinor: 50000,
            taxAmountMinor: 0,
            discountAmountMinor: 0,
            totalMinor: 50000,
          },
        ],
        subtotalMinor: 50000,
        taxTotalMinor: 0,
        discountTotalMinor: 0,
        totalMinor: 50000,
        createdAt: '',
        updatedAt: '',
      },
    ];

    const customersMap = new Map([
      ['c1', { id: 'c1', name: 'Cust 1', email: 'c1@test.com' }],
      ['c2', { id: 'c2', name: 'Cust 2', email: 'c2@test.com' }],
      ['c3', { id: 'c3', name: 'Cust 3', email: 'c3@test.com' }],
    ]);

    const batch = processBillingBatch(subscriptions, customersMap, {
      asOfDate: '2026-05-01',
      taxRules: new Map(),
      discounts: [limitedDiscount],
    });

    expect(batch.summary.successCount).toBe(3);

    // First two invoices received the discount
    expect(batch.results[0].invoice?.discountTotalMinor).toBe(10000);
    expect(batch.results[1].invoice?.discountTotalMinor).toBe(10000);

    // Third invoice had discount exhausted and paid full price
    expect(batch.results[2].invoice?.discountTotalMinor).toBe(0);
    expect(limitedDiscount.usageCount).toBe(2);
  });

  it('stops billing when subscription reaches its contractual end date', () => {
    const expiredSub: Subscription & { plan: { interval: 'monthly'; name: string } } = {
      id: 'sub-ended',
      number: 'SUB-END-1',
      customerId: 'c1',
      planId: 'p1',
      plan: { interval: 'monthly', name: 'Monthly' },
      status: 'active',
      startDate: '2026-01-01',
      endDate: '2026-03-31', // Contract concluded on March 31
      nextBillingDate: '2026-04-01', // Billing run attempted for April
      paymentTerms: 'Net 30',
      items: [
        {
          id: 'it-1',
          subscriptionId: 'sub-ended',
          productId: 'p1',
          productName: 'P1',
          quantity: 1,
          unitPriceMinor: 50000,
          taxAmountMinor: 0,
          discountAmountMinor: 0,
          totalMinor: 50000,
        },
      ],
      subtotalMinor: 50000,
      taxTotalMinor: 0,
      discountTotalMinor: 0,
      totalMinor: 50000,
      createdAt: '',
      updatedAt: '',
    };

    const res = generateInvoiceForSubscription(
      expiredSub,
      { id: 'c1', name: 'Cust 1', email: 'c1@test.com' },
      {
        asOfDate: '2026-04-01',
        taxRules: new Map(),
        discounts: [],
      }
    );

    expect(res.success).toBe(false);
    expect(res.error).toContain('reached its contractual end date');
  });
});
