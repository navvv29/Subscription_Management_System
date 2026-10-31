import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { store } from '@/lib/store';
import { requireStaff } from '@/lib/auth/guards';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaff();
  if ('response' in auth) return auth.response;
  const { id } = await params;
  const invoice = store.invoices.get(id);
  if (!invoice) {
    return apiError('NOT_FOUND', 'Invoice not found', 404);
  }

  if (invoice.status === 'paid') {
    return apiError('INVALID_STATUS', 'Cannot cancel an invoice that is already fully paid.', 400);
  }

  if (invoice.paidMinor > 0) {
    return apiError(
      'INVALID_STATUS',
      'Cannot cancel an invoice with recorded payments. Settle or reverse payments before cancellation.',
      400
    );
  }

  if (invoice.status === 'cancelled') {
    return apiError('INVALID_STATUS', 'Invoice is already cancelled.', 400);
  }

  invoice.status = 'cancelled';
  invoice.updatedAt = new Date().toISOString();
  store.invoices.set(id, invoice);

  return apiSuccess(invoice);
}
