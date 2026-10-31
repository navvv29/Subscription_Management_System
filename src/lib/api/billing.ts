import type { BillingBatchResult, Subscription } from '@/types';
import { apiFetch, isMockApiEnabled } from './client';
import { db, mockDelay } from './mock-store';
import { mockBillingResult } from '@/lib/mock-data';

/** Active subscriptions whose next billing date has arrived. */
export async function listDueSubscriptions(): Promise<Subscription[]> {
  if (!isMockApiEnabled()) {
    return apiFetch('/api/billing/due');
  }
  const today = new Date(new Date().toDateString());
  const rows = db.subscriptions.filter(
    (s) => s.status === 'active' && new Date(s.nextBillingDate) <= today
  );
  return mockDelay(rows);
}

/**
 * Authorized server-side batch. The demo returns the recorded batch fixture;
 * per-record failures are rendered as returned, never inferred in the browser.
 */
export async function processDueInvoices(): Promise<BillingBatchResult> {
  if (!isMockApiEnabled()) {
    return apiFetch('/api/billing/process', { method: 'POST' });
  }
  return mockDelay(mockBillingResult, 1200);
}
