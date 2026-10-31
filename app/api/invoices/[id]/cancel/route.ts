import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { store } from '@/lib/store';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const invoice = store.invoices.get(id);
  if (!invoice) {
    return apiError('NOT_FOUND', 'Invoice not found', 404);
  }

  if (invoice.status === 'paid') {
    return apiError('INVALID_STATUS', 'Cannot cancel a paid invoice.', 400);
  }

  if (invoice.status === 'cancelled') {
    return apiError('INVALID_STATUS', 'Invoice is already cancelled.', 400);
  }

  invoice.status = 'cancelled';
  invoice.updatedAt = new Date().toISOString();
  store.invoices.set(invoice.id, invoice);

  return apiSuccess(invoice);
}
