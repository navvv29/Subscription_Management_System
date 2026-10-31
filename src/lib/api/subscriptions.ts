import type {
  Subscription, SubscriptionStatus, Invoice, Plan, ListQueryParams, PaginatedResponse,
} from '@/types';
import { apiFetch, toQuery, isMockApiEnabled, ApiRequestError } from './client';
import { db, mockDelay, matchesSearch, paginate } from './mock-store';

export interface SubscriptionTransition {
  status: SubscriptionStatus;
}

export interface SubscriptionDetail {
  subscription: Subscription;
  plan: Plan | null;
  customerId: string;
  invoices: Invoice[];
}

export async function listSubscriptions(
  params: ListQueryParams & { status?: SubscriptionStatus | 'all'; customerId?: string } = {}
): Promise<PaginatedResponse<Subscription>> {
  if (!isMockApiEnabled()) {
    return apiFetch(`/api/subscriptions${toQuery({ ...params })}`);
  }
  const rows = db.subscriptions.filter((s) => {
    const matchesStatus = !params.status || params.status === 'all' || s.status === params.status;
    const matchesCustomer = !params.customerId || s.customerId === params.customerId;
    return matchesStatus && matchesCustomer && matchesSearch(params.search, s.number, s.customerName, s.planName);
  });
  return mockDelay(paginate(rows, params.page ?? 1, params.pageSize ?? 10));
}

export async function getSubscription(id: string): Promise<SubscriptionDetail | null> {
  if (!isMockApiEnabled()) return apiFetch(`/api/subscriptions/${id}`);
  const subscription = db.subscriptions.find((s) => s.id === id);
  if (!subscription) return mockDelay(null);
  return mockDelay({
    subscription,
    plan: db.plans.find((p) => p.id === subscription.planId) ?? null,
    customerId: subscription.customerId,
    invoices: db.invoices.filter((i) => i.subscriptionId === subscription.id),
  });
}

function assertTransitionAllowed(
  subscription: Subscription,
  next: SubscriptionStatus,
  plan: Plan | undefined
): void {
  const active = subscription.status;
  if (next === 'active' && active === 'draft') return;
  if (next === 'active' && active === 'paused') {
    if (plan && !plan.allowPause) {
      throw new ApiRequestError({ code: 'PLAN_DISALLOWS_PAUSE', message: 'This plan does not allow pausing/resuming.' });
    }
    return;
  }
  if (next === 'paused' && active === 'active') {
    if (plan && !plan.allowPause) {
      throw new ApiRequestError({ code: 'PLAN_DISALLOWS_PAUSE', message: 'This plan does not allow pausing.' });
    }
    return;
  }
  if (next === 'cancelled' && (active === 'active' || active === 'paused')) {
    if (plan && !plan.allowEarlyClose) {
      throw new ApiRequestError({
        code: 'PLAN_DISALLOWS_EARLY_CLOSE',
        message: 'This plan does not allow early close. Contact an administrator.',
      });
    }
    return;
  }
  if (next === 'active' && (active === 'expired' || active === 'pending_renewal')) {
    if (plan && !plan.allowRenewal) {
      throw new ApiRequestError({ code: 'PLAN_DISALLOWS_RENEWAL', message: 'This plan does not allow renewal.' });
    }
    return;
  }
  throw new ApiRequestError({
    code: 'INVALID_TRANSITION',
    message: `Cannot change status from ${active} to ${next}.`,
  });
}

export async function transitionSubscription(
  id: string,
  status: SubscriptionStatus
): Promise<Subscription> {
  if (!isMockApiEnabled()) {
    return apiFetch(`/api/subscriptions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status } satisfies SubscriptionTransition),
    });
  }
  const subscription = db.subscriptions.find((s) => s.id === id);
  if (!subscription) throw new ApiRequestError({ code: 'NOT_FOUND', message: 'Subscription not found.' });
  const plan = db.plans.find((p) => p.id === subscription.planId);
  assertTransitionAllowed(subscription, status, plan);
  subscription.status = status;
  subscription.updatedAt = new Date().toISOString();
  return mockDelay(subscription);
}
