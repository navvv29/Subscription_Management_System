import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { z } from 'zod';
import { validateAndApplyRefund } from '@/features/payments/payment-service';
import { store } from '@/lib/store';
import { recordAuditLog } from '@/lib/audit/audit-service';

const refundSchema = z.object({
  invoiceId: z.string().min(1, 'invoiceId is required'),
  paymentId: z.string().min(1, 'paymentId is required'),
  refundAmountMinor: z.number().int().positive('refundAmountMinor must be a positive integer in minor units'),
  refundReason: z.string().min(3, 'refundReason must be at least 3 characters'),
  recordedBy: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = refundSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join(', '));
    }

    const { invoiceId, paymentId, refundAmountMinor, refundReason, recordedBy = 'finance_admin' } = parsed.data;

    const invoice = store.invoices.get(invoiceId);
    if (!invoice) {
      return apiError('NOT_FOUND', `Invoice '${invoiceId}' was not found.`, 404);
    }

    const payment = store.payments.get(paymentId);
    if (!payment) {
      return apiError('NOT_FOUND', `Original payment '${paymentId}' was not found.`, 404);
    }

    const existingPayments = Array.from(store.payments.values());

    const result = validateAndApplyRefund(
      invoice,
      payment,
      refundAmountMinor,
      refundReason,
      recordedBy,
      existingPayments
    );

    if (!result.success || !result.refundPayment || !result.updatedInvoice) {
      return apiError('REFUND_REJECTED', result.error ?? 'Refund validation failed.', 400);
    }

    // Persist refund payment & update invoice
    store.payments.set(result.refundPayment.id, result.refundPayment);
    Object.assign(invoice, result.updatedInvoice);
    store.invoices.set(invoice.id, invoice);

    // Record audit log
    recordAuditLog({
      actorId: recordedBy,
      action: 'payment.refunded',
      entityType: 'payment',
      entityId: result.refundPayment.id,
      metadata: {
        originalPaymentId: payment.id,
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        refundAmountMinor,
        refundReason,
        newBalanceMinor: result.updatedInvoice.balanceMinor,
        newStatus: result.updatedInvoice.status,
      },
    });

    // Atomic disk persistence
    store.persist();

    return apiSuccess({
      message: 'Refund recorded successfully.',
      refundPayment: result.refundPayment,
      invoice,
    });
  } catch (err: unknown) {
    return apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Refund processing failed.', 500);
  }
}

