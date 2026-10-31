import type {
  Customer,
  Invoice,
  Plan,
  Subscription,
  SubscriptionStatus,
  ListQueryParams,
  PaginatedResponse,
} from '@/types';
import type {
  Invoice as ServerInvoice,
  Subscription as ServerSubscription,
  SubscriptionStatus as ServerSubscriptionStatus,
} from '@/types/database';
import { apiFetch, toQuery, isMockApiEnabled, ApiRequestError } from './client';
import {
  mapInvoice,
  mapSubscription,
  matches,
  nameMap,
  paginateRows,
  toServerSubscriptionStatus,
} from './mappers';
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

async function loadLookups() {
  const [customers, plans] = await Promise.all([
    apiFetch<Customer[]>('/api/customers'),
    apiFetch<Plan[]>('/api/plans'),
  ]);
  return { customerNames: nameMap(customers), planNames: nameMap(plans), plans };
}

export async function listSubscriptions(
  params: ListQueryParams & { status?: SubscriptionStatus | 'all'; customerId?: string } = {}
): Promise<PaginatedResponse<Subscription>> {
  if (!isMockApiEnabled()) {
    const lookups = await loadLookups();
    const status = params.status && params.status !== 'all'
      ? toServerSubscriptionStatus(params.status)
      : undefined;

    // The endpoint filters and paginates by status; free-text search needs the
    // full collection because the API has no search parameter yet.
    if (params.search) {
      const payload = await apiFetch<{ data: ServerSubscription[] }>(
        `/api/subscriptions${toQuery({ status, customerId: params.customerId, pageSize: 100 })}`
      );
      const rows = payload.data
        .map((row) => mapSubscription(row, lookups))
        .filter((row) => matches([row.number, row.customerName, row.planName], params.search));
      return paginateRows(rows, params);
    }

    const payload = await apiFetch<{
      data: ServerSubscription[];
      pagination: { page: number; pageSize: number; totalCount: number; totalPages: number };
    }>(`/api/subscriptions${toQuery({
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 10,
      status,
      customerId: params.customerId,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    })}`);

    return {
      data: payload.data.map((row) => mapSubscription(row, lookups)),
      total: payload.pagination.totalCount,
      page: payload.pagination.page,
      pageSize: payload.pagination.pageSize,
      totalPages: payload.pagination.totalPages,
    };
  }

  const rows = db.subscriptions.filter((s) => {
    const matchesStatus = !params.status || params.status === 'all' || s.status === params.status;
    const matchesCustomer = !params.customerId || s.customerId === params.customerId;
    return matchesStatus && matchesCustomer && matchesSearch(params.search, s.number, s.customerName, s.planName);
  });
  return mockDelay(paginate(rows, params.page ?? 1, params.pageSize ?? 10));
}

export async function getSubscription(id: string): Promise<SubscriptionDetail | null> {
  if (!isMockApiEnabled()) {
    try {
      const [subscription, lookups, invoicesPayload] = await Promise.all([
        apiFetch<ServerSubscription>(`/api/subscriptions/${id}`),
        loadLookups(),
        apiFetch<{ data: ServerInvoice[] }>(
          `/api/invoices${toQuery({ subscriptionId: id, pageSize: 100 })}`
        ),
      ]);

      return {
        subscription: mapSubscription(subscription, lookups),
        plan: lookups.plans.find((plan) => plan.id === subscription.planId) ?? null,
        customerId: subscription.customerId,
        invoices: invoicesPayload.data.map(mapInvoice),
      };
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'NOT_FOUND') return null;
      throw err;
    }
  }

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
  if (next === 'active' && (active === 'draft' || active === 'confirmed')) return;
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
  if (next === 'cancelled' && (active === 'active' || active === 'paused' || active === 'expired')) {
    if (plan && !plan.allowEarlyClose && active === 'active') {
      throw new ApiRequestError({
        code: 'PLAN_DISALLOWS_EARLY_CLOSE',
        message: 'This plan does not allow early close. Contact an administrator.',
      });
    }
    return;
  }
  throw new ApiRequestError({
    code: 'INVALID_TRANSITION',
    message: `Cannot change status from ${active} to ${next}.`,
  });
}

/**
 * Applies the server lifecycle actions. The UI exposes a target status, while
 * the API accepts explicit actions, so a draft has to be submitted and
 * confirmed before it can be activated.
 */
async function applyTransition(
  id: string,
  target: SubscriptionStatus
): Promise<Subscription> {
  const current = await apiFetch<ServerSubscription>(`/api/subscriptions/${id}`);
  const lookups = await loadLookups();

  const patch = async (action: string) => {
    const updated = await apiFetch<ServerSubscription>(`/api/subscriptions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action }),
    });
    return mapSubscription(updated, lookups);
  };

  const currentStatus = current.status as ServerSubscriptionStatus;

  if (target === 'active') {
    if (currentStatus === 'draft') {
      await patch('submit_quotation');
      await patch('confirm');
      return patch('activate');
    }
    if (currentStatus === 'quotation') {
      await patch('confirm');
      return patch('activate');
    }
    if (currentStatus === 'confirmed') return patch('activate');
    if (currentStatus === 'paused') return patch('resume');
  }

  if (target === 'paused' && currentStatus === 'active') return patch('pause');
  if (target === 'cancelled') return patch('close');

  throw new ApiRequestError({
    code: 'INVALID_TRANSITION',
    message: `Cannot change status from ${currentStatus} to ${target}.`,
  });
}

export async function transitionSubscription(
  id: string,
  status: SubscriptionStatus
): Promise<Subscription> {
  if (!isMockApiEnabled()) return applyTransition(id, status);

  const subscription = db.subscriptions.find((s) => s.id === id);
  if (!subscription) throw new ApiRequestError({ code: 'NOT_FOUND', message: 'Subscription not found.' });
  const plan = db.plans.find((p) => p.id === subscription.planId);
  assertTransitionAllowed(subscription, status, plan);
  subscription.status = status;
  subscription.updatedAt = new Date().toISOString();
  return mockDelay(subscription);
}
