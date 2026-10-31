import type {
  Quotation, QuotationStatus, ListQueryParams, PaginatedResponse, Subscription,
} from '@/types';
import { apiFetch, toQuery, isMockApiEnabled, ApiRequestError } from './client';
import { db, mockDelay, matchesSearch, nextId, paginate } from './mock-store';

export interface QuotationLineInput {
  productId: string;
  planId?: string;
  quantity: number;
  unitPriceMinor: number;
}

export interface QuotationInput {
  customerId: string;
  validUntil: string;
  notes?: string;
  items: QuotationLineInput[];
}

export async function listQuotations(
  params: ListQueryParams & { status?: QuotationStatus | 'all'; customerId?: string } = {}
): Promise<PaginatedResponse<Quotation>> {
  if (!isMockApiEnabled()) {
    return apiFetch(`/api/quotations${toQuery({ ...params })}`);
  }
  const rows = db.quotations
    .filter((q) => {
      const matchesStatus = !params.status || params.status === 'all' || q.status === params.status;
      const matchesCustomer = !params.customerId || q.customerId === params.customerId;
      return matchesStatus && matchesCustomer && matchesSearch(params.search, q.number, q.customerName);
    })
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  return mockDelay(paginate(rows, params.page ?? 1, params.pageSize ?? 10));
}

export async function getQuotation(id: string): Promise<Quotation | null> {
  if (!isMockApiEnabled()) return apiFetch(`/api/quotations/${id}`);
  return mockDelay(db.quotations.find((q) => q.id === id) ?? null);
}

export async function createQuotation(input: QuotationInput): Promise<Quotation> {
  if (!isMockApiEnabled()) {
    return apiFetch('/api/quotations', { method: 'POST', body: JSON.stringify(input) });
  }
  const customer = db.customers.find((c) => c.id === input.customerId);
  if (!customer) throw new ApiRequestError({ code: 'CUSTOMER_REQUIRED', message: 'Select a valid customer.', field: 'customer' });
  if (!input.items.length) throw new ApiRequestError({ code: 'ITEMS_REQUIRED', message: 'Add at least one line item.', field: 'items' });
  if (new Date(input.validUntil) < new Date(new Date().toDateString())) {
    throw new ApiRequestError({ code: 'INVALID_VALIDITY', message: 'Valid until must be today or later.', field: 'validUntil' });
  }

  const items = input.items.map((line) => {
    const product = db.products.find((p) => p.id === line.productId);
    if (!product) throw new ApiRequestError({ code: 'INVALID_PRODUCT', message: 'A line item references an unknown product.' });
    const plan = line.planId ? db.plans.find((p) => p.id === line.planId) : undefined;
    const quantity = Math.max(1, Math.trunc(line.quantity));
    return {
      id: nextId('qi'),
      productId: product.id,
      productName: product.name,
      planId: plan?.id,
      planName: plan?.name,
      quantity,
      unitPriceMinor: Math.round(line.unitPriceMinor),
      totalMinor: quantity * Math.round(line.unitPriceMinor),
    };
  });

  const year = new Date().getFullYear();
  const quotation: Quotation = {
    id: nextId('quot'),
    number: `QT-${year}-${String(db.quotations.length + 1).padStart(3, '0')}`,
    customerId: customer.id,
    customerName: customer.name,
    status: 'draft',
    validUntil: input.validUntil,
    items,
    totalMinor: items.reduce((sum, item) => sum + item.totalMinor, 0),
    notes: input.notes || undefined,
    createdAt: new Date().toISOString(),
  };
  db.quotations.unshift(quotation);
  return mockDelay(quotation);
}

export async function updateQuotationStatus(
  id: string,
  status: QuotationStatus
): Promise<Quotation> {
  if (!isMockApiEnabled()) {
    return apiFetch(`/api/quotations/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
  }
  const quotation = db.quotations.find((q) => q.id === id);
  if (!quotation) throw new ApiRequestError({ code: 'NOT_FOUND', message: 'Quotation not found.' });
  if (status === 'accepted') {
    if (quotation.status !== 'sent') {
      throw new ApiRequestError({ code: 'INVALID_TRANSITION', message: 'Only a sent quotation can be accepted.' });
    }
    if (new Date(quotation.validUntil) < new Date(new Date().toDateString())) {
      throw new ApiRequestError({ code: 'QUOTATION_EXPIRED', message: 'This quotation has expired and cannot be accepted.' });
    }
  }
  quotation.status = status;
  quotation.updatedAt = new Date().toISOString();
  return mockDelay(quotation);
}

/** Converts an accepted quotation into a draft subscription (server owns numbering). */
export async function convertQuotation(id: string): Promise<Subscription> {
  if (!isMockApiEnabled()) {
    return apiFetch(`/api/quotations/${id}/convert`, { method: 'POST' });
  }
  const quotation = db.quotations.find((q) => q.id === id);
  if (!quotation) throw new ApiRequestError({ code: 'NOT_FOUND', message: 'Quotation not found.' });
  if (quotation.status !== 'accepted') {
    throw new ApiRequestError({ code: 'INVALID_TRANSITION', message: 'Only accepted quotations can be converted.' });
  }
  const firstPlanId = quotation.items.find((item) => item.planId)?.planId;
  if (!firstPlanId) {
    throw new ApiRequestError({ code: 'PLAN_REQUIRED', message: 'Quotation lines must reference a plan before conversion.' });
  }
  const plan = db.plans.find((p) => p.id === firstPlanId);
  const year = new Date().getFullYear();
  const subscription: Subscription = {
    id: nextId('sub'),
    number: `SUB-${year}-${String(db.subscriptions.length + 1).padStart(3, '0')}`,
    customerId: quotation.customerId,
    customerName: quotation.customerName,
    planId: firstPlanId,
    planName: plan?.name,
    status: 'draft',
    startDate: new Date().toISOString().slice(0, 10),
    nextBillingDate: new Date().toISOString().slice(0, 10),
    paymentTerms: 'Net 30',
    items: quotation.items.map((item) => ({
      id: nextId('si'),
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPriceMinor: item.unitPriceMinor,
      totalMinor: item.totalMinor,
    })),
    createdAt: new Date().toISOString(),
  };
  db.subscriptions.unshift(subscription);
  quotation.status = 'converted';
  quotation.updatedAt = new Date().toISOString();
  return mockDelay(subscription);
}
