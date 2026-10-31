import type { DashboardSummary, Invoice, Subscription } from '@/types';
import { apiFetch, isMockApiEnabled } from './client';
import { mockDelay } from './mock-store';
import { mockDashboardSummary } from '@/lib/mock-data';
import { listSubscriptions } from './subscriptions';
import { listInvoices } from './invoices';

export interface DashboardOverview {
  summary: DashboardSummary;
  recentSubscriptions: Subscription[];
  overdueInvoices: Invoice[];
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  if (!isMockApiEnabled()) {
    return apiFetch('/api/dashboard');
  }
  const [subscriptions, invoices] = await Promise.all([
    listSubscriptions({ status: 'active', pageSize: 3 }),
    listInvoices({ status: 'overdue', pageSize: 5 }),
  ]);
  return mockDelay({
    summary: mockDashboardSummary,
    recentSubscriptions: subscriptions.data,
    overdueInvoices: invoices.data,
  }, 150);
}
