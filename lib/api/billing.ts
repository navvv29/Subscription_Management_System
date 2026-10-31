import type { BillingBatchResult, Subscription } from '@/types';
import { apiFetch, isMockApiEnabled } from './client';
import { db, mockDelay } from './mock-store';
import { mockBillingResult } from '@/lib/mock-data';
import { listSubscriptions } from './subscriptions';

interface BillingBatchPayload {
  summary: {
    totalProcessed: number;
    successCount: number;
    failureCount: number;
    skippedCount: number;
    duplicateCount: number;
  };
  results: Array<{
    subscriptionId: string;
    subscriptionNumber?: string;
    success: boolean;
    invoiceNumber?: string;
    isDuplicate?: boolean;
    error?: string;
  }>;
}

/** Active subscriptions whose next billing date has arrived. */
export async function listDueSubscriptions(): Promise<Subscription[]> {
  if (!isMockApiEnabled()) {
    const page = await listSubscriptions({ status: 'active', pageSize: 100 });
    const today = new Date().toISOString().slice(0, 10);
    return page.data.filter((subscription) => subscription.nextBillingDate.slice(0, 10) <= today);
  }
  const today = new Date().toISOString().slice(0, 10);
  const rows = db.subscriptions.filter(
    (s) => s.status === 'active' && s.nextBillingDate.slice(0, 10) <= today
  );
  return mockDelay(rows);
}

/**
 * Authorized server-side batch. Per-record outcomes are rendered exactly as the
 * server returns them, including duplicates and failures.
 */
export async function processDueInvoices(): Promise<BillingBatchResult> {
  if (!isMockApiEnabled()) {
    const payload = await apiFetch<BillingBatchPayload>('/api/billing/process', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    return {
      totalProcessed: payload.summary.totalProcessed,
      successCount: payload.summary.successCount,
      failureCount: payload.summary.failureCount,
      results: payload.results.map((result) => ({
        subscriptionId: result.subscriptionId,
        subscriptionNumber: result.subscriptionNumber ?? result.subscriptionId,
        invoiceNumber: result.invoiceNumber,
        success: result.success,
        error: result.error,
      })),
    };
  }
  return mockDelay(mockBillingResult, 1200);
}
