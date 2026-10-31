import { describe, it, expect } from 'vitest';
import { processBillingBatch } from '@/features/billing/billing-service';
import type { Subscription, BillingInterval } from '@/types/database';

describe('Performance Benchmark (N01: Under-Two-Second Processing)', () => {
  it('processes and queries thousands of subscriptions in under 2 seconds', () => {
    const COUNT = 5000;
    const subscriptions: Array<Subscription & { plan: { interval: BillingInterval; name: string } }> = [];
    const customersMap = new Map<string, { id: string; name: string; email: string }>();

    // Generate 5,000 mock subscriptions
    for (let i = 1; i <= COUNT; i++) {
      const custId = `cust-${i % 200}`;
      if (!customersMap.has(custId)) {
        customersMap.set(custId, {
          id: custId,
          name: `Customer ${custId}`,
          email: `${custId}@example.com`,
        });
      }

      subscriptions.push({
        id: `sub-bench-${i}`,
        number: `SUB-BENCH-${i.toString().padStart(5, '0')}`,
        customerId: custId,
        planId: 'plan-monthly',
        plan: { interval: 'monthly', name: 'Monthly Standard' },
        status: i % 10 === 0 ? 'paused' : 'active',
        startDate: '2026-01-01',
        nextBillingDate: '2026-05-01',
        paymentTerms: 'Net 30',
        items: [
          {
            id: `item-${i}`,
            subscriptionId: `sub-bench-${i}`,
            productId: 'prod-saas-1',
            productName: 'Cloud Server',
            quantity: 1,
            unitPriceMinor: 100000,
            taxAmountMinor: 18000,
            discountAmountMinor: 0,
            totalMinor: 118000,
          },
        ],
        subtotalMinor: 100000,
        discountTotalMinor: 0,
        taxTotalMinor: 18000,
        totalMinor: 118000,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      });
    }

    // 1. Benchmark Querying & Aggregation over 5,000 subscriptions
    const queryStart = performance.now();
    const active = subscriptions.filter((s) => s.status === 'active');
    const totalActiveValue = active.reduce((sum, s) => sum + s.totalMinor, 0);
    const sorted = [...subscriptions].sort((a, b) => b.totalMinor - a.totalMinor).slice(0, 50);
    const queryDuration = performance.now() - queryStart;

    expect(active.length).toBe(4500);
    expect(totalActiveValue).toBe(4500 * 118000);
    expect(sorted.length).toBe(50);
    // Must be under 2,000ms
    expect(queryDuration).toBeLessThan(2000);

    // 2. Benchmark Batch Billing for 1,000 due subscriptions
    const BATCH_SIZE = 1000;
    const batchSlice = subscriptions.slice(0, BATCH_SIZE);

    const billingStart = performance.now();
    const batchResult = processBillingBatch(batchSlice, customersMap, {
      asOfDate: '2026-05-01',
      taxRules: new Map(),
      discounts: [],
      existingInvoices: [],
    });
    const billingDuration = performance.now() - billingStart;

    expect(batchResult.summary.totalProcessed).toBe(BATCH_SIZE);
    // Must be well under 2,000ms
    expect(billingDuration).toBeLessThan(2000);

    console.log(
      `[Benchmark N01] 5,000 Subscriptions Filter/Sort: ${queryDuration.toFixed(2)}ms | 1,000 Invoice Generation Batch: ${billingDuration.toFixed(2)}ms`
    );
  });
});

