import type { Customer, ListQueryParams, PaginatedResponse } from '@/types';
import { apiFetch, toQuery, isMockApiEnabled, ApiRequestError } from './client';
import { db, mockDelay, matchesSearch, nextId, paginate } from './mock-store';

export interface CustomerInput {
  name: string;
  email: string;
  phone?: string;
  company?: string;
}

export async function listCustomers(
  params: ListQueryParams = {}
): Promise<PaginatedResponse<Customer>> {
  if (!isMockApiEnabled()) {
    return apiFetch(`/api/customers${toQuery({ ...params })}`);
  }
  const rows = db.customers
    .filter((c) => matchesSearch(params.search, c.name, c.email, c.company, c.phone))
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  return mockDelay(paginate(rows, params.page ?? 1, params.pageSize ?? 10));
}

export async function getCustomer(id: string): Promise<Customer | null> {
  if (!isMockApiEnabled()) return apiFetch(`/api/customers/${id}`);
  return mockDelay(db.customers.find((c) => c.id === id) ?? null);
}

export async function createCustomer(input: CustomerInput): Promise<Customer> {
  if (!isMockApiEnabled()) {
    return apiFetch('/api/customers', { method: 'POST', body: JSON.stringify(input) });
  }
  const email = input.email.trim().toLowerCase();
  if (db.customers.some((c) => c.email.toLowerCase() === email)) {
    throw new ApiRequestError({ code: 'EMAIL_EXISTS', message: 'A customer with this email already exists.', field: 'email' });
  }
  const now = new Date().toISOString();
  const customer: Customer = {
    id: nextId('cust'),
    name: input.name.trim(),
    email,
    phone: input.phone?.trim() || undefined,
    company: input.company?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  db.customers.unshift(customer);
  return mockDelay(customer);
}

export async function updateCustomer(id: string, input: CustomerInput): Promise<Customer> {
  if (!isMockApiEnabled()) {
    return apiFetch(`/api/customers/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
  }
  const customer = db.customers.find((c) => c.id === id);
  if (!customer) {
    throw new ApiRequestError({ code: 'NOT_FOUND', message: 'Customer not found.' });
  }
  const email = input.email.trim().toLowerCase();
  if (db.customers.some((c) => c.id !== id && c.email.toLowerCase() === email)) {
    throw new ApiRequestError({ code: 'EMAIL_EXISTS', message: 'A customer with this email already exists.', field: 'email' });
  }
  Object.assign(customer, {
    name: input.name.trim(),
    email,
    phone: input.phone?.trim() || undefined,
    company: input.company?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  });
  return mockDelay(customer);
}

export async function deleteCustomer(id: string): Promise<void> {
  if (!isMockApiEnabled()) {
    await apiFetch(`/api/customers/${id}`, { method: 'DELETE' });
    return;
  }
  const index = db.customers.findIndex((c) => c.id === id);
  if (index === -1) {
    throw new ApiRequestError({ code: 'NOT_FOUND', message: 'Customer not found.' });
  }
  db.customers.splice(index, 1);
  await mockDelay(undefined);
}
