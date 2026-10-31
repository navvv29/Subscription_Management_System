// ============================================================================
// Server -> view-model mapping.
//
// The API returns canonical persisted records (types/database.ts). The pages
// use view models (types/ui.ts) that add display joins and derived states such
// as `overdue`. No financial value is recomputed here: subtotal, tax, discount,
// total, paid and balance are copied from the server record.
// ============================================================================

import type {
  Invoice as ServerInvoice,
  InvoiceStatus as ServerInvoiceStatus,
  Payment as ServerPayment,
  Quotation as ServerQuotation,
  Subscription as ServerSubscription,
  SubscriptionStatus as ServerSubscriptionStatus,
} from '@/types/database';
import type {
  Invoice,
  InvoiceStatus,
  ListQueryParams,
  PaginatedResponse,
  Payment,
  Quotation,
  QuotationStatus,
  Subscription,
  SubscriptionStatus,
} from '@/types';

export interface NameLookups {
  customerNames?: Map<string, string>;
  planNames?: Map<string, string>;
}

export function nameMap<T extends { id: string; name: string }>(rows: T[]): Map<string, string> {
  return new Map(rows.map((row) => [row.id, row.name]));
}

export function paginateRows<T>(
  rows: T[],
  params: ListQueryParams = {},
  defaultPageSize = 10
): PaginatedResponse<T> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, params.pageSize ?? defaultPageSize);
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  return {
    data: rows.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages,
  };
}

export function matches(haystacks: Array<string | undefined>, search?: string): boolean {
  if (!search) return true;
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return haystacks.some((value) => value?.toLowerCase().includes(needle));
}

/** Server subscription states that the UI collapses into existing labels. */
export function toUiSubscriptionStatus(status: ServerSubscriptionStatus): SubscriptionStatus {
  if (status === 'quotation') return 'draft';
  if (status === 'closed') return 'cancelled';
  return status;
}

export function toServerSubscriptionStatus(status: SubscriptionStatus): ServerSubscriptionStatus {
  if (status === 'cancelled') return 'closed';
  if (status === 'pending_renewal') return 'expired';
  return status;
}

function isPastDate(date: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return false;
  return value.getTime() < today.getTime();
}

export function mapQuotation(
  quotation: ServerQuotation,
  lookups: NameLookups = {}
): Quotation {
  return {
    id: quotation.id,
    number: quotation.number,
    customerId: quotation.customerId,
    customerName: lookups.customerNames?.get(quotation.customerId),
    status: quotation.status as QuotationStatus,
    validUntil: quotation.validUntil,
    items: quotation.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      planId: item.planId,
      planName: item.planName ?? (item.planId ? lookups.planNames?.get(item.planId) : undefined),
      quantity: item.quantity,
      unitPriceMinor: item.unitPriceMinor,
      totalMinor: item.totalMinor,
    })),
    totalMinor: quotation.totalMinor,
    notes: quotation.notes,
    createdAt: quotation.createdAt,
    updatedAt: quotation.updatedAt,
  };
}

export function mapSubscription(
  subscription: ServerSubscription,
  lookups: NameLookups = {}
): Subscription {
  return {
    id: subscription.id,
    number: subscription.number,
    customerId: subscription.customerId,
    customerName: lookups.customerNames?.get(subscription.customerId),
    planId: subscription.planId,
    planName: lookups.planNames?.get(subscription.planId),
    status: toUiSubscriptionStatus(subscription.status),
    startDate: subscription.startDate,
    endDate: subscription.endDate,
    nextBillingDate: subscription.nextBillingDate,
    paymentTerms: subscription.paymentTerms,
    items: subscription.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPriceMinor: item.unitPriceMinor,
      totalMinor: item.totalMinor,
    })),
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
  };
}

export function toUiInvoiceStatus(invoice: ServerInvoice): InvoiceStatus {
  const settled = invoice.status === 'paid' || invoice.status === 'cancelled';
  if (!settled && invoice.balanceMinor > 0 && isPastDate(invoice.dueDate)) return 'overdue';
  return invoice.status as ServerInvoiceStatus as InvoiceStatus;
}

export function mapInvoice(invoice: ServerInvoice): Invoice {
  return {
    id: invoice.id,
    number: invoice.number,
    customerId: invoice.customerId,
    customerName: invoice.customerName,
    subscriptionId: invoice.subscriptionId,
    status: toUiInvoiceStatus(invoice),
    billingPeriodStart: invoice.billingPeriodStart,
    billingPeriodEnd: invoice.billingPeriodEnd,
    issueDate: invoice.createdAt.slice(0, 10),
    dueDate: invoice.dueDate,
    lineItems: invoice.items.map((item) => ({
      id: item.id,
      description: item.productDescription,
      quantity: item.quantity,
      unitPriceMinor: item.unitPriceMinor,
      totalMinor: item.lineTotalMinor,
    })),
    subtotalMinor: invoice.subtotalMinor,
    taxMinor: invoice.taxTotalMinor,
    discountMinor: invoice.discountTotalMinor,
    totalMinor: invoice.totalMinor,
    paidMinor: invoice.paidMinor,
    balanceMinor: invoice.balanceMinor,
    notes: invoice.notes,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
  };
}

export function mapPayment(
  payment: ServerPayment,
  invoices?: Map<string, ServerInvoice>
): Payment {
  const invoice = invoices?.get(payment.invoiceId);
  return {
    id: payment.id,
    invoiceId: payment.invoiceId,
    invoiceNumber: invoice?.number,
    customerName: invoice?.customerName,
    amountMinor: payment.amountMinor,
    method: payment.method,
    paymentDate: payment.paymentDate,
    note: payment.note,
    createdAt: payment.createdAt,
  };
}
