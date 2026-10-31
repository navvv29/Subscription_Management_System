import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { processBillingSchema } from '@/lib/validation/schemas';
import { processBillingBatch } from '@/features/billing/billing-service';
import { store } from '@/lib/store';
import { billingLock } from '@/lib/billing/billing-lock';
import { recordAuditLog } from '@/lib/audit/audit-service';
import { format } from 'date-fns';
import type { BillingInterval, BillingRun } from '@/types/database';

export async function POST(request: NextRequest) {
  let lockId: string | null = null;
  const startedAt = new Date().toISOString();
  const startTimeMs = Date.now();

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = processBillingSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join(', '));
    }

    const asOfDate = parsed.data.asOfDate ?? format(new Date(), 'yyyy-MM-dd');

    // 1. Concurrency Control: Acquire exclusive batch lock
    const lockResult = billingLock.acquire('billing-engine-api');
    if (!lockResult.acquired) {
      return apiError('LOCK_CONFLICT', lockResult.error || 'A billing batch is already running.', 409);
    }
    lockId = lockResult.lock!.lockId;

    // 2. Query active subscriptions
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
        summary: { totalProcessed: 0, successCount: 0, failureCount: 0, skippedCount: 0, duplicateCount: 0, totalBilledMinor: 0 },
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

    // 3. Execute billing batch
    const batchOutcome = processBillingBatch(activeSubs, customersMap, context);

    // 4. Persist newly created invoices and advance nextBillingDate
    const newInvoiceNumbers: string[] = [];
    for (const result of batchOutcome.results) {
      if (result.success && result.invoice && !result.isDuplicate) {
        store.invoices.set(result.invoice.id, result.invoice);
        newInvoiceNumbers.push(result.invoice.number);

        // Record audit log for generated invoice
        recordAuditLog({
          actorId: 'billing-engine',
          action: 'invoice.generated',
          entityType: 'invoice',
          entityId: result.invoice.id,
          metadata: {
            subscriptionId: result.subscriptionId,
            invoiceNumber: result.invoice.number,
            totalMinor: result.invoice.totalMinor,
            billingPeriodStart: result.invoice.billingPeriodStart,
            billingPeriodEnd: result.invoice.billingPeriodEnd,
          },
        });

        // Advance billing date
        const sub = store.subscriptions.get(result.subscriptionId);
        if (sub && result.newNextBillingDate) {
          sub.nextBillingDate = result.newNextBillingDate;
          sub.updatedAt = new Date().toISOString();
          store.subscriptions.set(sub.id, sub);
        }
      }
    }

    // 5. Formal BillingRun record
    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startTimeMs;
    const billingRun: BillingRun = {
      id: `RUN-${format(new Date(), 'yyMM')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      asOfDate,
      startedAt,
      completedAt,
      durationMs,
      totalProcessed: batchOutcome.summary.totalProcessed,
      successCount: batchOutcome.summary.successCount,
      failureCount: batchOutcome.summary.failureCount,
      skippedCount: batchOutcome.summary.skippedCount,
      duplicateCount: batchOutcome.summary.duplicateCount,
      totalBilledMinor: batchOutcome.summary.totalBilledMinor,
      status: batchOutcome.summary.failureCount > 0 ? (batchOutcome.summary.successCount > 0 ? 'completed' : 'failed') : 'completed',
      triggeredBy: 'api',
      errors: batchOutcome.errors,
    };

    store.billingRuns.set(billingRun.id, billingRun);

    // 6. Record audit log for billing run
    recordAuditLog({
      actorId: 'billing-engine',
      action: 'billing_run.executed',
      entityType: 'billing_run',
      entityId: billingRun.id,
      metadata: {
        asOfDate,
        summary: batchOutcome.summary,
        durationMs,
        newInvoiceCount: newInvoiceNumbers.length,
      },
    });

    // 7. Atomic persistence to disk
    store.persist();

    return apiSuccess({
      message: 'Billing batch completed.',
      billingRunId: billingRun.id,
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
  } finally {
    // 8. Always release concurrency lock
    if (lockId) {
      billingLock.release(lockId);
    }
  }
}
