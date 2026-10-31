import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { store } from '@/lib/store';
import { sendInvoiceEmail } from '@/lib/notifications/email-service';
import { z } from 'zod';

const sendInvoiceSchema = z.object({
  recipientEmail: z.string().email('Invalid email address').optional(),
  actorId: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoice = store.invoices.get(id);

    if (!invoice) {
      return apiError('NOT_FOUND', `Invoice '${id}' was not found.`, 404);
    }

    const body = await request.json().catch(() => ({}));
    const parsed = sendInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join(', '));
    }

    const result = await sendInvoiceEmail(
      invoice,
      parsed.data.recipientEmail,
      parsed.data.actorId || 'operations_admin'
    );

    if (!result.success) {
      return apiError('DISPATCH_FAILED', result.error || 'Failed to dispatch invoice email.', 500);
    }

    return apiSuccess({
      message: `Invoice ${invoice.number} dispatched to ${result.recipientEmail}.`,
      dispatch: result,
    });
  } catch (err: unknown) {
    return apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Dispatch failed.', 500);
  }
}

