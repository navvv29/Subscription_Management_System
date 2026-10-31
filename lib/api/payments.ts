import type { Payment, PaymentMethod, Invoice, ListQueryParams, PaginatedResponse } from '@/types';
import type {
  Invoice as ServerInvoice,
  Payment as ServerPayment,
} from '@/types/database';
import { apiFetch, toQuery, isMockApiEnabled, ApiRequestError } from './client';
import { mapInvoice, mapPayment, matches, paginateRows } from './mappers';
import { db, mockDelay, matchesSearch, nextId, paginate } from './mock-store';

export interface RefundInput {
  invoiceId: string;
  paymentId: string;
  refundAmountMinor: number;
  refundReason: string;
}

export interface PaymentInput {
  invoiceId: string;
  amountMinor: number;
  method: PaymentMethod;
  paymentDate: string;
  note?: string;
}

export async function listPayments(
  params: ListQueryParams & { invoiceId?: string } = {}
): Promise<PaginatedResponse<Payment>> {
  if (!isMockApiEnabled()) {
    const [payments, invoicesPayload] = await Promise.all([
      apiFetch<ServerPayment[]>(`/api/payments${toQuery({ invoiceId: params.invoiceId })}`),
      apiFetch<{ data: ServerInvoice[] }>('/api/invoices?pageSize=100'),
    ]);
    const invoicesById = new Map(invoicesPayload.data.map((invoice) => [invoice.id, invoice]));
    const rows = payments
      .map((payment) => mapPayment(payment, invoicesById))
      .filter((payment) => matches([payment.invoiceNumber, payment.customerName], params.search))
      .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
    return paginateRows(rows, params);
  }

  const rows = db.payments
    .filter((p) => (!params.invoiceId || p.invoiceId === params.invoiceId)
      && matchesSearch(params.search, p.invoiceNumber, p.customerName))
    .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
  return mockDelay(paginate(rows, params.page ?? 1, params.pageSize ?? 10));
}

/** Invoices that still have an outstanding balance (filtered from server records). */
export async function listPayableInvoices(): Promise<Invoice[]> {
  if (!isMockApiEnabled()) {
    const payload = await apiFetch<{ data: ServerInvoice[] }>('/api/invoices?pageSize=100');
    return payload.data
      .map(mapInvoice)
      .filter((invoice) => invoice.balanceMinor > 0 && invoice.status !== 'cancelled' && invoice.status !== 'draft');
  }
  const rows = db.invoices.filter(
    (i) => i.balanceMinor > 0 && i.status !== 'cancelled' && i.status !== 'draft'
  );
  return mockDelay(rows);
}

export async function createPayment(input: PaymentInput): Promise<Payment> {
  if (!isMockApiEnabled()) {
    try {
      const result = await apiFetch<{ payment: ServerPayment; invoice: ServerInvoice }>('/api/payments', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      const invoicesById = new Map([[result.invoice.id, result.invoice]]);
      return mapPayment(result.payment, invoicesById);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.code === 'NOT_FOUND' || err.code === 'INVOICE_NOT_FOUND') {
          throw new ApiRequestError({ code: err.code, message: err.message, field: 'invoice' });
        }
        if (err.code === 'PAYMENT_REJECTED' || err.code === 'VALIDATION_ERROR') {
          throw new ApiRequestError({ code: err.code, message: err.message, field: 'amount' });
        }
      }
      throw err;
    }
  }

  const invoice = db.invoices.find((i) => i.id === input.invoiceId);
  if (!invoice) throw new ApiRequestError({ code: 'INVOICE_REQUIRED', message: 'Select a valid invoice.', field: 'invoice' });
  if (invoice.status === 'cancelled' || invoice.status === 'draft') {
    throw new ApiRequestError({ code: 'INVOICE_NOT_PAYABLE', message: 'This invoice cannot receive payments.', field: 'invoice' });
  }
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new ApiRequestError({ code: 'INVALID_AMOUNT', message: 'Enter an amount greater than zero.', field: 'amount' });
  }
  if (input.amountMinor > invoice.balanceMinor) {
    throw new ApiRequestError({
      code: 'AMOUNT_EXCEEDS_BALANCE',
      message: 'Amount exceeds the invoice balance.',
      field: 'amount',
    });
  }

  const payment: Payment = {
    id: nextId('pay'),
    invoiceId: invoice.id,
    invoiceNumber: invoice.number,
    customerName: invoice.customerName,
    amountMinor: input.amountMinor,
    method: input.method,
    paymentDate: input.paymentDate,
    note: input.note?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  db.payments.unshift(payment);

  // Balance arithmetic lives with the server-side invoice state, not the page.
  invoice.paidMinor += payment.amountMinor;
  invoice.balanceMinor = invoice.totalMinor - invoice.paidMinor;
  invoice.status = invoice.balanceMinor === 0 ? 'paid' : 'partially_paid';
  invoice.updatedAt = new Date().toISOString();

  return mockDelay(payment);
}

/**
 * Records a reversal against the original payment. The server validates the
 * refundable amount and updates the invoice balance and status.
 */
export async function refundPayment(input: RefundInput): Promise<Payment> {
  if (!isMockApiEnabled()) {
    try {
      const result = await apiFetch<{ refundPayment: ServerPayment; invoice: ServerInvoice }>(
        '/api/payments/refund',
        { method: 'POST', body: JSON.stringify(input) }
      );
      const invoicesById = new Map([[result.invoice.id, result.invoice]]);
      return mapPayment(result.refundPayment, invoicesById);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'REFUND_REJECTED') {
        throw new ApiRequestError({ code: err.code, message: err.message, field: 'amount' });
      }
      throw err;
    }
  }

  const invoice = db.invoices.find((i) => i.id === input.invoiceId);
  const payment = db.payments.find((p) => p.id === input.paymentId);
  if (!invoice || !payment) {
    throw new ApiRequestError({ code: 'NOT_FOUND', message: 'Payment or invoice not found.' });
  }
  if (!Number.isInteger(input.refundAmountMinor) || input.refundAmountMinor <= 0) {
    throw new ApiRequestError({ code: 'INVALID_AMOUNT', message: 'Enter a refund amount greater than zero.', field: 'amount' });
  }
  if (input.refundAmountMinor > payment.amountMinor) {
    throw new ApiRequestError({
      code: 'REFUND_EXCEEDS_PAYMENT',
      message: 'Refund cannot exceed the original payment amount.',
      field: 'amount',
    });
  }

  const refund: Payment = {
    id: nextId('refund'),
    invoiceId: invoice.id,
    invoiceNumber: invoice.number,
    customerName: invoice.customerName,
    amountMinor: input.refundAmountMinor,
    method: payment.method,
    paymentDate: new Date().toISOString().slice(0, 10),
    note: `Refund: ${input.refundReason}`,
    isRefund: true,
    refundReason: input.refundReason,
    originalPaymentId: payment.id,
    createdAt: new Date().toISOString(),
  };
  db.payments.unshift(refund);

  invoice.paidMinor = Math.max(0, invoice.paidMinor - input.refundAmountMinor);
  invoice.balanceMinor = invoice.totalMinor - invoice.paidMinor;
  invoice.status = invoice.balanceMinor === 0 ? 'paid' : invoice.paidMinor > 0 ? 'partially_paid' : 'confirmed';
  invoice.updatedAt = new Date().toISOString();

  return mockDelay(refund);
}
