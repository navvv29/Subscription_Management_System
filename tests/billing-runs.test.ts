import { describe, it, expect } from 'vitest';
import { processBillingBatch } from '@/features/billing/billing-service';
import type { Subscription, TaxRule, Discount } from '@/types/database';

describe('Billing Run Formalization & Error Tracking', () => {
  const taxRules = new Map<string, TaxRule>();
  const discounts: Discount[] = [];

  it('records summary with duplicate counts, billed totals and captures errors', () => {
    const validSub: Subscription = {
      id: 'sub-valid-run',
      number: 'SUB-2610-VAL01',
      customerId: 'cust-101',
      planId: 'plan-monthly-core',
      status: 'active',
      startDate: '2026-10-01',
      nextBillingDate: '2026-10-31',
      paymentTerms: 'Net 15',
      items: [
        {
          id: 'item-1',
          subscriptionId: 'sub-valid-run',
          productId: 'prod-saas-basic',
          productName: 'Cloud Infrastructure Basic',
          quantity: 1,
          unitPriceMinor: 1000000,
          taxAmountMinor: 0,
          discountAmountMinor: 0,
          totalMinor: 1000000,
        },
      ],
      subtotalMinor: 1000000,
      taxTotalMinor: 0,
      discountTotalMinor: 0,
      totalMinor: 1000000,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    };

    const notDueSub: Subscription = {
      ...validSub,
      id: 'sub-notdue-run',
      number: 'SUB-2610-NOTDUE',
      nextBillingDate: '2026-12-01',
    };

    const customersMap = new Map([
      ['cust-101', { id: 'cust-101', name: 'Brightloop', email: 'billing@brightloop.io' }],
    ]);

    const batchResult = processBillingBatch(
      [validSub, notDueSub],
      customersMap,
      {
        asOfDate: '2026-10-31',
        taxRules,
        discounts,
      }
    );

    expect(batchResult.summary.totalProcessed).toBe(2);
    expect(batchResult.summary.successCount).toBe(1);
    expect(batchResult.summary.skippedCount).toBe(1);
    expect(batchResult.summary.totalBilledMinor).toBe(1000000);
    expect(batchResult.results[0].invoice?.number).toMatch(/^INV-/);
  });
});

