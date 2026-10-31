import type {
  Invoice, InvoiceStatus, Customer, Payment, ListQueryParams, PaginatedResponse,
} from '@/types';
import type {
  Invoice as ServerInvoice,
  Payment as ServerPayment,
} from '@/types/database';
import { apiFetch, apiFetchOrNull, toQuery, isMockApiEnabled, ApiRequestError } from './client';
import { mapInvoice, mapPayment, matches, paginateRows } from './mappers';
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
    const needsClientFilter = params.search || params.status === 'overdue';

    if (needsClientFilter) {
      const payload = await apiFetch<{ data: ServerInvoice[] }>(
        `/api/invoices${toQuery({ customerId: params.customerId, pageSize: 100 })}`
      );
      const rows = payload.data
        .map(mapInvoice)
        .filter((invoice) => {
          const matchesStatus = !params.status || params.status === 'all' || invoice.status === params.status;
          return matchesStatus && matches([invoice.number, invoice.customerName], params.search);
        });
      return paginateRows(rows, params);
    }

    const payload = await apiFetch<{
      data: ServerInvoice[];
      pagination: { page: number; pageSize: number; totalCount: number; totalPages: number };
    }>(`/api/invoices${toQuery({
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 10,
      status: params.status && params.status !== 'all' ? params.status : undefined,
      customerId: params.customerId,
    })}`);

    return {
      data: payload.data.map(mapInvoice),
      total: payload.pagination.totalCount,
      page: payload.pagination.page,
      pageSize: payload.pagination.pageSize,
      totalPages: payload.pagination.totalPages,
    };
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
  if (!isMockApiEnabled()) {
    const invoice = await apiFetchOrNull<ServerInvoice>(`/api/invoices/${id}`);
    if (!invoice) return null;

    const [customer, payments, subscription] = await Promise.all([
      apiFetchOrNull<Customer>(`/api/customers/${invoice.customerId}`),
      apiFetch<ServerPayment[]>(`/api/payments${toQuery({ invoiceId: id })}`),
      invoice.subscriptionId
        ? apiFetchOrNull<{ number: string }>(`/api/subscriptions/${invoice.subscriptionId}`)
        : Promise.resolve(null),
    ]);

    const invoicesById = new Map([[invoice.id, invoice]]);
    return {
      invoice: { ...mapInvoice(invoice), subscriptionNumber: subscription?.number },
      customer,
      payments: payments.map((payment) => mapPayment(payment, invoicesById)),
    };
  }

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
    const invoice = await apiFetch<ServerInvoice>(`/api/invoices/${id}/confirm`, { method: 'POST' });
    return mapInvoice(invoice);
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
    const invoice = await apiFetch<ServerInvoice>(`/api/invoices/${id}/cancel`, { method: 'POST' });
    return mapInvoice(invoice);
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
 * No email provider is configured, so this reports the demo fallback instead of
 * claiming the invoice was emailed. Wire a verified provider before enabling.
 */
export async function sendInvoiceEmail(id: string): Promise<SendEmailResult> {
  if (!isMockApiEnabled()) {
    const result = await apiFetch<{
      message: string;
      dispatch: {
        mode: 'smtp' | 'mock_logged';
        recipientEmail: string;
        dispatchedAt: string;
      };
    }>(`/api/invoices/${id}/send`, { method: 'POST', body: JSON.stringify({}) });

    // The server logs dispatches without a configured provider. Only report a
    // real send when a live transport actually handled it.
    if (result.dispatch.mode === 'smtp') {
      return { sent: true, message: result.message, emailSentAt: result.dispatch.dispatchedAt };
    }
    return {
      sent: false,
      message: `Demo mode: no email provider is configured, so this invoice was logged for ${result.dispatch.recipientEmail} but not delivered.`,
    };
  }
  const invoice = db.invoices.find((i) => i.id === id);
  if (!invoice) throw new ApiRequestError({ code: 'NOT_FOUND', message: 'Invoice not found.' });
  return mockDelay({
    sent: false,
    message: 'Email provider is not configured for this demo. The invoice was not sent.',
  });
}
