import { describe, it, expect } from 'vitest';
import {
  generateInvoiceForSubscription,
  processBillingBatch,
  type BillingContext,
} from '@/features/billing/billing-service';
import type { Subscription, Invoice, TaxRule, Discount } from '@/types/database';

describe('Billing Batch & Idempotency / Duplicate Protection', () => {
  const taxRules = new Map<string, TaxRule>([
    [
      'tax-1',
      {
        id: 'tax-1',
        name: 'GST 18%',
        rate: 18,
        behavior: 'exclusive',
        isActive: true,
        createdAt: '',
        updatedAt: '',
      },
    ],
  ]);

  const discounts: Discount[] = [];

  const customer = {
    id: 'cust-1',
    name: 'Customer One',
    email: 'c1@example.com',
  };

  const sampleSubscription: Subscription & { plan: { interval: 'monthly'; name: 'Monthly Standard' } } = {
    id: 'sub-test-1',
    number: 'SUB-TEST-001',
    customerId: 'cust-1',
    planId: 'plan-1',
    plan: { interval: 'monthly', name: 'Monthly Standard' },
    status: 'active',
    startDate: '2026-04-01',
    nextBillingDate: '2026-04-01',
    paymentTerms: 'Net 30',
    items: [
      {
        id: 'item-1',
        subscriptionId: 'sub-test-1',
        productId: 'prod-1',
        productName: 'Cloud Server',
        quantity: 1,
        unitPriceMinor: 100000, // ₹1,000
        taxRuleId: 'tax-1',
        taxRate: 18,
        taxAmountMinor: 18000,
        discountAmountMinor: 0,
        totalMinor: 118000,
      },
    ],
    subtotalMinor: 100000,
    discountTotalMinor: 0,
    taxTotalMinor: 18000,
    totalMinor: 118000,
    createdAt: '2026-04-01',
    updatedAt: '2026-04-01',
  };

  it('generates an invoice for a due active subscription', () => {
    const context: BillingContext = {
      asOfDate: '2026-04-01',
      taxRules,
      discounts,
      existingInvoices: [],
    };

    const res = generateInvoiceForSubscription(sampleSubscription, customer, context);
    expect(res.success).toBe(true);
    expect(res.invoice).toBeDefined();
    expect(res.invoice?.subscriptionId).toBe(sampleSubscription.id);
    expect(res.invoice?.billingPeriodStart).toBe('2026-04-01');
    expect(res.invoice?.billingPeriodEnd).toBe('2026-04-30');
    expect(res.invoice?.totalMinor).toBe(118000);
    expect(res.newNextBillingDate).toBe('2026-05-01');
  });

  it('prevents duplicate invoice when billing is run a second time for the same period', () => {
    const context1: BillingContext = {
      asOfDate: '2026-04-01',
      taxRules,
      discounts,
      existingInvoices: [],
    };
    const res1 = generateInvoiceForSubscription(sampleSubscription, customer, context1);
    expect(res1.success).toBe(true);
    const existingInvoice = res1.invoice!;

    // Run again with the existing invoice passed into context
    const context2: BillingContext = {
      asOfDate: '2026-04-01',
      taxRules,
      discounts,
      existingInvoices: [existingInvoice],
    };

    const res2 = generateInvoiceForSubscription(sampleSubscription, customer, context2);
    expect(res2.success).toBe(true);
    expect(res2.isDuplicate).toBe(true);
    expect(res2.invoice?.id).toBe(existingInvoice.id);
  });

  it('skips paused, closed, and expired subscriptions from billing', () => {
    const context: BillingContext = {
      asOfDate: '2026-04-01',
      taxRules,
      discounts,
      existingInvoices: [],
    };

    const pausedSub = { ...sampleSubscription, status: 'paused' as const };
    const resPaused = generateInvoiceForSubscription(pausedSub, customer, context);
    expect(resPaused.success).toBe(false);
    expect(resPaused.error).toContain('cannot be billed');

    const closedSub = { ...sampleSubscription, status: 'closed' as const };
    const resClosed = generateInvoiceForSubscription(closedSub, customer, context);
    expect(resClosed.success).toBe(false);
    expect(resClosed.error).toContain('cannot be billed');

    const expiredSub = { ...sampleSubscription, status: 'expired' as const };
    const resExpired = generateInvoiceForSubscription(expiredSub, customer, context);
    expect(resExpired.success).toBe(false);
  });

  it('does not process subscriptions that are not yet due', () => {
    const context: BillingContext = {
      asOfDate: '2026-03-15', // Checking before billing date 2026-04-01
      taxRules,
      discounts,
      existingInvoices: [],
    };

    const res = generateInvoiceForSubscription(sampleSubscription, customer, context);
    expect(res.success).toBe(false);
    expect(res.error).toContain('not due for billing');
  });

  it('processes multiple subscriptions and does not fail entire batch if one is invalid', () => {
    const validSub = { ...sampleSubscription, id: 'sub-valid', number: 'SUB-V' };
    const pausedSub = { ...sampleSubscription, id: 'sub-paused', number: 'SUB-P', status: 'paused' as const };

    const customersMap = new Map([[customer.id, customer]]);
    const context: BillingContext = {
      asOfDate: '2026-04-01',
      taxRules,
      discounts,
      existingInvoices: [],
    };

    const batchRes = processBillingBatch([validSub, pausedSub], customersMap, context);
    expect(batchRes.summary.totalProcessed).toBe(2);
    expect(batchRes.summary.successCount).toBe(1);
    expect(batchRes.summary.skippedCount).toBe(1);
  });
});

