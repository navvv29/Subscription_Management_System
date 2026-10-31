// ============================================================================
// Mock store — stand-in for the server while endpoints are being built.
// All shapes are the shared DTOs from `@/types`; money stays in minor units.
// ============================================================================

import {
  mockCustomers, mockProducts, mockVariants, mockPlans,
  mockQuotations, mockSubscriptions, mockInvoices, mockPayments,
} from '@/lib/mock-data';
import type { Plan, PaginatedResponse } from '@/types';

function clone<T>(rows: T[]): T[] {
  return rows.map((row) => ({ ...row }));
}

export const db = {
  customers: clone(mockCustomers),
  products: clone(mockProducts),
  variants: clone(mockVariants),
  plans: clone(mockPlans),
  quotations: clone(mockQuotations),
  subscriptions: clone(mockSubscriptions),
  invoices: clone(mockInvoices),
  payments: clone(mockPayments),
};

/** Simulated network latency so loading states are exercised honestly. */
export function mockDelay<T>(value: T, ms = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export function nextId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function paginate<T>(rows: T[], page = 1, pageSize = 10): PaginatedResponse<T> {
  const safePage = Math.max(1, page);
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (safePage - 1) * pageSize;
  return {
    data: rows.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export function matchesSearch(search: string | undefined, ...fields: (string | undefined)[]): boolean {
  if (!search) return true;
  const needle = search.toLowerCase();
  return fields.some((field) => (field ?? '').toLowerCase().includes(needle));
}

/** Adds one interval to an ISO date — mock billing-date helper only. */
export function advanceDate(dateString: string, interval: Plan['interval']): string {
  const date = new Date(dateString);
  if (interval === 'daily') date.setDate(date.getDate() + 1);
  if (interval === 'weekly') date.setDate(date.getDate() + 7);
  if (interval === 'monthly') date.setMonth(date.getMonth() + 1);
  if (interval === 'yearly') date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}
