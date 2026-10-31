import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { store } from '@/lib/store';
import { isDateExpired } from '@/lib/billing/date-utils';
import type { QuotationStatus } from '@/types/database';

type Params = { params: Promise<{ id: string }> };

const statusSchema = z.object({
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']),
});

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const quotation = store.quotations.get(id);
  if (!quotation) {
    return apiError('NOT_FOUND', 'Quotation not found', 404);
  }
  return apiSuccess(quotation);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const quotation = store.quotations.get(id);
    if (!quotation) {
      return apiError('NOT_FOUND', 'Quotation not found', 404);
    }

    const body = await request.json();
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join(', '));
    }

    const next = parsed.data.status as QuotationStatus;
    const current = quotation.status;

    const allowed: Record<string, QuotationStatus[]> = {
      draft: ['sent'],
      sent: ['accepted', 'rejected', 'expired'],
      accepted: [],
      rejected: [],
      expired: [],
    };

    if (!allowed[current]?.includes(next)) {
      return apiError(
        'INVALID_TRANSITION',
        `Cannot change quotation status from '${current}' to '${next}'.`
      );
    }

    if (next === 'accepted' && isDateExpired(quotation.validUntil)) {
      quotation.status = 'expired';
      quotation.updatedAt = new Date().toISOString();
      store.quotations.set(id, quotation);
      return apiError('QUOTATION_EXPIRED', 'This quotation has expired and cannot be accepted.');
    }

    quotation.status = next;
    quotation.updatedAt = new Date().toISOString();
    store.quotations.set(id, quotation);
    return apiSuccess(quotation);
  } catch (err: unknown) {
    return apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Failed to update quotation', 500);
  }
}
