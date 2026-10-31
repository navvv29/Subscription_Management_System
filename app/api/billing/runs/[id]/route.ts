import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { store } from '@/lib/store';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const run = store.billingRuns.get(id);

  if (!run) {
    return apiError('NOT_FOUND', `Billing run with ID '${id}' was not found.`, 404);
  }

  return apiSuccess(run);
}

