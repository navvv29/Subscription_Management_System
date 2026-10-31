import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { createPaymentSchema } from '@/lib/validation/schemas';
import { validateAndApplyPayment } from '@/features/payments/payment-service';
import { store } from '@/lib/store';
import { recordAuditLog } from '@/lib/audit/audit-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('invoiceId');

    let list = Array.from(store.payments.values());
    if (invoiceId) {
      list = list.filter((p) => p.invoiceId === invoiceId);
    }

    list.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
    return apiSuccess(list);
  } catch (err: unknown) {
    return apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Failed to fetch payments', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join(', '));
    }

    const { invoiceId, amountMinor, method, paymentDate, note } = parsed.data;
    const invoice = store.invoices.get(invoiceId);

    if (!invoice) {
      return apiError('NOT_FOUND', 'Invoice not found', 404);
    }

    const transactionRef = (body.transactionRef as string) || undefined;
    const recordedBy = (body.recordedBy as string) || 'system';

    const result = validateAndApplyPayment(
      invoice,
      amountMinor,
      method,
      paymentDate,
      note,
      recordedBy,
      transactionRef
    );

    if (!result.success || !result.payment || !result.updatedInvoice) {
      return apiError('PAYMENT_REJECTED', result.error ?? 'Payment validation failed', 400);
    }

    // Persist payment & update invoice
    store.payments.set(result.payment.id, result.payment);
    Object.assign(invoice, result.updatedInvoice);
    store.invoices.set(invoice.id, invoice);

    // Record audit log
    recordAuditLog({
      actorId: recordedBy,
      action: 'payment.recorded',
      entityType: 'payment',
      entityId: result.payment.id,
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        amountMinor: result.payment.amountMinor,
        method: result.payment.method,
        newBalanceMinor: result.updatedInvoice.balanceMinor,
        newStatus: result.updatedInvoice.status,
      },
    });

    // Atomic disk persistence
    store.persist();

    return apiSuccess(
      {
        payment: result.payment,
        invoice,
      },
      201
    );
  } catch (err: unknown) {
    return apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Payment recording failed', 500);
  }
}
