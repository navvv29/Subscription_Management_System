import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { processBillingSchema } from '@/lib/validation/schemas';
import { processBillingBatch } from '@/features/billing/billing-service';
import { store } from '@/lib/store';
import { format } from 'date-fns';
import type { BillingInterval } from '@/types/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = processBillingSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join(', '));
    }

    const asOfDate = parsed.data.asOfDate ?? format(new Date(), 'yyyy-MM-dd');

    // Get active subscriptions
    const activeSubs = Array.from(store.subscriptions.values())
      .filter((s) => s.status === 'active')
      .map((s) => {
        const plan = store.plans.get(s.planId);
        return {
          ...s,
          plan: {
            interval: (plan?.interval ?? 'monthly') as BillingInterval,
            name: plan?.name ?? 'Standard Plan',
          },
        };
      });

    if (activeSubs.length === 0) {
      return apiSuccess({
        message: 'No active subscriptions found for billing.',
        summary: { totalProcessed: 0, successCount: 0, failureCount: 0, skippedCount: 0, duplicateCount: 0 },
        results: [],
      });
    }

    const customersMap = new Map<string, { id: string; name: string; email: string }>();
    for (const sub of activeSubs) {
      const cust = store.customers.get(sub.customerId);
      if (cust) {
        customersMap.set(cust.id, { id: cust.id, name: cust.name, email: cust.email });
      }
    }

    const context = {
      asOfDate,
      taxRules: store.taxRules,
      discounts: Array.from(store.discounts.values()),
      existingInvoices: Array.from(store.invoices.values()),
    };

    const batchOutcome = processBillingBatch(activeSubs, customersMap, context);

    // Persist new invoices and advance nextBillingDate
    for (const result of batchOutcome.results) {
      if (result.success && result.invoice && !result.isDuplicate) {
        store.invoices.set(result.invoice.id, result.invoice);

        // Advance billing date
        const sub = store.subscriptions.get(result.subscriptionId);
        if (sub && result.newNextBillingDate) {
          sub.nextBillingDate = result.newNextBillingDate;
          sub.updatedAt = new Date().toISOString();
          store.subscriptions.set(sub.id, sub);
        }
      }
    }

    return apiSuccess({
      message: 'Billing batch completed.',
      asOfDate,
      summary: batchOutcome.summary,
      results: batchOutcome.results.map((r) => ({
        subscriptionId: r.subscriptionId,
        success: r.success,
        invoiceNumber: r.invoice?.number,
        isDuplicate: !!r.isDuplicate,
        error: r.error,
      })),
    });
  } catch (err: unknown) {
    return apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Billing run failed', 500);
  }
}
