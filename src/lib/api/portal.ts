// ============================================================================
// Customer portal adapters.
//
// Every operation is scoped to the signed-in customer. The mock session mirrors
// what RLS will enforce server-side: no customer ID is accepted from the page.
// ============================================================================

import type {
  Profile, Quotation, Subscription, Invoice, Payment, ListQueryParams, PaginatedResponse,
} from '@/types';
import { apiFetch, toQuery, isMockApiEnabled, ApiRequestError } from './client';
import { db, mockDelay, matchesSearch, paginate } from './mock-store';

/** Stand-in for the authenticated session until Supabase auth is wired. */
export const portalSession: Profile = {
  id: 'auth-user-001',
  email: 'rajesh.kumar@techcorp.in',
  displayName: 'Rajesh Kumar',
  role: 'customer',
};

const SESSION_CUSTOMER_ID = 'cust-001';

function assertOwned(customerId: string, what: string): void {
  if (customerId !== SESSION_CUSTOMER_ID) {
    throw new ApiRequestError({ code: 'FORBIDDEN', message: `${what} is not available for your account.` });
  }
}

export async function getPortalProfile(): Promise<{ profile: Profile; customerId: string }> {
  if (!isMockApiEnabled()) {
    return apiFetch('/api/portal/me');
  }
  return mockDelay({ profile: portalSession, customerId: SESSION_CUSTOMER_ID }, 120);
}

export async function listMyQuotations(
  params: ListQueryParams = {}
): Promise<PaginatedResponse<Quotation>> {
  if (!isMockApiEnabled()) {
    return apiFetch(`/api/portal/quotations${toQuery({ ...params })}`);
  }
  const rows = db.quotations
    .filter((q) => q.customerId === SESSION_CUSTOMER_ID && matchesSearch(params.search, q.number))
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  return mockDelay(paginate(rows, params.page ?? 1, params.pageSize ?? 10));
}

export async function getMyQuotation(id: string): Promise<Quotation> {
  if (!isMockApiEnabled()) {
    return apiFetch(`/api/portal/quotations/${id}`);
  }
  const quotation = db.quotations.find((q) => q.id === id);
  if (!quotation) throw new ApiRequestError({ code: 'NOT_FOUND', message: 'Quotation not found.' });
  assertOwned(quotation.customerId, 'This quotation');
  return mockDelay(quotation);
}

export async function acceptMyQuotation(id: string): Promise<Quotation> {
  if (!isMockApiEnabled()) {
    return apiFetch(`/api/portal/quotations/${id}/accept`, { method: 'POST' });
  }
  const quotation = await getMyQuotation(id);
  if (quotation.status !== 'sent') {
    throw new ApiRequestError({ code: 'INVALID_TRANSITION', message: 'This quotation cannot be accepted.' });
  }
  if (new Date(quotation.validUntil) < new Date(new Date().toDateString())) {
    throw new ApiRequestError({ code: 'QUOTATION_EXPIRED', message: 'This quotation has expired.' });
  }
  quotation.status = 'accepted';
  quotation.updatedAt = new Date().toISOString();
  return mockDelay(quotation);
}

export async function listMySubscriptions(
  params: ListQueryParams = {}
): Promise<PaginatedResponse<Subscription>> {
  if (!isMockApiEnabled()) {
    return apiFetch(`/api/portal/subscriptions${toQuery({ ...params })}`);
  }
  const rows = db.subscriptions.filter(
    (s) => s.customerId === SESSION_CUSTOMER_ID && matchesSearch(params.search, s.number, s.planName)
  );
  return mockDelay(paginate(rows, params.page ?? 1, params.pageSize ?? 10));
}

export async function listMyInvoices(
  params: ListQueryParams = {}
): Promise<PaginatedResponse<Invoice>> {
  if (!isMockApiEnabled()) {
    return apiFetch(`/api/portal/invoices${toQuery({ ...params })}`);
  }
  const rows = db.invoices
    .filter((i) => i.customerId === SESSION_CUSTOMER_ID && matchesSearch(params.search, i.number))
    .sort((a, b) => (b.issueDate ?? '').localeCompare(a.issueDate ?? ''));
  return mockDelay(paginate(rows, params.page ?? 1, params.pageSize ?? 10));
}

export async function getMyInvoice(id: string): Promise<{ invoice: Invoice; payments: Payment[] }> {
  if (!isMockApiEnabled()) {
    return apiFetch(`/api/portal/invoices/${id}`);
  }
  const invoice = db.invoices.find((i) => i.id === id);
  if (!invoice) throw new ApiRequestError({ code: 'NOT_FOUND', message: 'Invoice not found.' });
  assertOwned(invoice.customerId, 'This invoice');
  return mockDelay({
    invoice,
    payments: db.payments.filter((p) => p.invoiceId === invoice.id),
  });
}
