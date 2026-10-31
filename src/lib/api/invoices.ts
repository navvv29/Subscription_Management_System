import type {
  Invoice, InvoiceStatus, Customer, Payment, ListQueryParams, PaginatedResponse,
} from '@/types';
import { apiFetch, toQuery, isMockApiEnabled, ApiRequestError } from './client';
import { db, mockDelay, matchesSearch, paginate } from './mock-store';

export interface InvoiceDetail {
  invoice: Invoice;
  customer: Customer | null;
  payments: Payment[];
}

export interface SendEmailResult {
  sent: boolean;
  message: string;
  emailSentAt?: string;
}

export async function listInvoices(
  params: ListQueryParams & { status?: InvoiceStatus | 'all'; customerId?: string } = {}
): Promise<PaginatedResponse<Invoice>> {
  if (!isMockApiEnabled()) {
    return apiFetch(`/api/invoices${toQuery({ ...params })}`);
  }
  const rows = db.invoices
    .filter((i) => {
      const matchesStatus = !params.status || params.status === 'all' || i.status === params.status;
      const matchesCustomer = !params.customerId || i.customerId === params.customerId;
      return matchesStatus && matchesCustomer && matchesSearch(params.search, i.number, i.customerName);
    })
    .sort((a, b) => (b.issueDate ?? '').localeCompare(a.issueDate ?? ''));
  return mockDelay(paginate(rows, params.page ?? 1, params.pageSize ?? 10));
}

export async function getInvoice(id: string): Promise<InvoiceDetail | null> {
  if (!isMockApiEnabled()) return apiFetch(`/api/invoices/${id}`);
  const invoice = db.invoices.find((i) => i.id === id);
  if (!invoice) return mockDelay(null);
  return mockDelay({
    invoice,
    customer: db.customers.find((c) => c.id === invoice.customerId) ?? null,
    payments: db.payments.filter((p) => p.invoiceId === invoice.id),
  });
}

export async function confirmInvoice(id: string): Promise<Invoice> {
  if (!isMockApiEnabled()) {
    return apiFetch(`/api/invoices/${id}/confirm`, { method: 'POST' });
  }
  const invoice = db.invoices.find((i) => i.id === id);
  if (!invoice) throw new ApiRequestError({ code: 'NOT_FOUND', message: 'Invoice not found.' });
  if (invoice.status !== 'draft') {
    throw new ApiRequestError({ code: 'INVALID_TRANSITION', message: 'Only draft invoices can be confirmed.' });
  }
  invoice.status = 'confirmed';
  invoice.updatedAt = new Date().toISOString();
  return mockDelay(invoice);
}

export async function cancelInvoice(id: string): Promise<Invoice> {
  if (!isMockApiEnabled()) {
    return apiFetch(`/api/invoices/${id}/cancel`, { method: 'POST' });
  }
  const invoice = db.invoices.find((i) => i.id === id);
  if (!invoice) throw new ApiRequestError({ code: 'NOT_FOUND', message: 'Invoice not found.' });
  if (invoice.status === 'paid') {
    throw new ApiRequestError({ code: 'INVALID_TRANSITION', message: 'A paid invoice cannot be cancelled.' });
  }
  if (invoice.paidMinor > 0) {
    throw new ApiRequestError({
      code: 'PAYMENTS_RECORDED',
      message: 'This invoice has recorded payments. Reverse payments before cancelling.',
    });
  }
  invoice.status = 'cancelled';
  invoice.updatedAt = new Date().toISOString();
  return mockDelay(invoice);
}

/**
 * No email provider is configured for this demo, so the mock adapter reports
 * failure instead of claiming the invoice was emailed.
 */
export async function sendInvoiceEmail(id: string): Promise<SendEmailResult> {
  if (!isMockApiEnabled()) {
    return apiFetch(`/api/invoices/${id}/send-email`, { method: 'POST' });
  }
  const invoice = db.invoices.find((i) => i.id === id);
  if (!invoice) throw new ApiRequestError({ code: 'NOT_FOUND', message: 'Invoice not found.' });
  return mockDelay({
    sent: false,
    message: 'Email provider is not configured for this demo. The invoice was not sent.',
  });
}
