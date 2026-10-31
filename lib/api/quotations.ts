import type {
  Customer,
  Plan,
  Quotation,
  QuotationStatus,
  ListQueryParams,
  PaginatedResponse,
  Subscription,
} from '@/types';
import type {
  Quotation as ServerQuotation,
  Subscription as ServerSubscription,
} from '@/types/database';
import { apiFetch, apiFetchOrNull, isMockApiEnabled, ApiRequestError } from './client';
import { mapQuotation, mapSubscription, matches, nameMap, paginateRows } from './mappers';
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

async function loadLookups() {
  const [customers, plans] = await Promise.all([
    apiFetch<Customer[]>('/api/customers'),
    apiFetch<Plan[]>('/api/plans'),
  ]);
  return { customerNames: nameMap(customers), planNames: nameMap(plans), plans };
}

export async function listQuotations(
  params: ListQueryParams & { status?: QuotationStatus | 'all'; customerId?: string } = {}
): Promise<PaginatedResponse<Quotation>> {
  if (!isMockApiEnabled()) {
    const [rows, lookups] = await Promise.all([
      apiFetch<ServerQuotation[]>('/api/quotations'),
      loadLookups(),
    ]);
    const filtered = rows
      .map((row) => mapQuotation(row, lookups))
      .filter((q) => {
        const matchesStatus = !params.status || params.status === 'all' || q.status === params.status;
        const matchesCustomer = !params.customerId || q.customerId === params.customerId;
        return matchesStatus && matchesCustomer && matches([q.number, q.customerName], params.search);
      });
    return paginateRows(filtered, params);
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
  if (!isMockApiEnabled()) {
    const [quotation, lookups] = await Promise.all([
      apiFetchOrNull<ServerQuotation>(`/api/quotations/${id}`),
      loadLookups(),
    ]);
    return quotation ? mapQuotation(quotation, lookups) : null;
  }
  return mockDelay(db.quotations.find((q) => q.id === id) ?? null);
}

export async function createQuotation(input: QuotationInput): Promise<Quotation> {
  if (!isMockApiEnabled()) {
    const created = await apiFetch<ServerQuotation>('/api/quotations', {
      method: 'POST',
      body: JSON.stringify({
        customerId: input.customerId,
        validUntil: input.validUntil,
        notes: input.notes,
        items: input.items.map((line) => ({
          productId: line.productId,
          planId: line.planId,
          quantity: line.quantity,
          unitPriceMinor: line.unitPriceMinor,
        })),
      }),
    });
    const lookups = await loadLookups();
    return mapQuotation(created, lookups);
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
    const updated = await apiFetch<ServerQuotation>(`/api/quotations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    const lookups = await loadLookups();
    return mapQuotation(updated, lookups);
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

/** Converts an accepted quotation into a subscription. The server owns numbering and totals. */
export async function convertQuotation(id: string): Promise<Subscription> {
  if (!isMockApiEnabled()) {
    const [quotation, lookups] = await Promise.all([
      apiFetch<ServerQuotation>(`/api/quotations/${id}`),
      loadLookups(),
    ]);

    // Prefer the plan chosen on the quotation lines, then the first plan whose
    // minimum quantity the quotation satisfies.
    const totalQuantity = quotation.items.reduce((sum, item) => sum + item.quantity, 0);
    const planId =
      quotation.items.find((item) => item.planId)?.planId ??
      lookups.plans.find((plan) => plan.minimumQuantity <= totalQuantity)?.id;

    const subscription = await apiFetch<ServerSubscription>(`/api/quotations/${id}/convert`, {
      method: 'POST',
      body: JSON.stringify(planId ? { planId } : {}),
    });
    return mapSubscription(subscription, lookups);
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
