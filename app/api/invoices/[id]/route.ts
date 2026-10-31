import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { store } from '@/lib/store';
import { getLinkedCustomerId, requireUser } from '@/lib/auth/guards';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ('response' in auth) return auth.response;
  const { id } = await params;
  const invoice = store.invoices.get(id);
  if (!invoice) {
    return apiError('NOT_FOUND', 'Invoice not found', 404);
  }
  if (auth.role === 'customer') {
    const customerId = await getLinkedCustomerId(auth.supabase, auth.user.id);
    if (!customerId || invoice.customerId !== customerId) return apiError('NOT_FOUND', 'Invoice not found', 404);
  }
  return apiSuccess(invoice);
}

