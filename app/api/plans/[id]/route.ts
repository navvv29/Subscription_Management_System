import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { updatePlanSchema } from '@/lib/validation/schemas';
import { store } from '@/lib/store';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const plan = store.plans.get(id);
  if (!plan) {
    return apiError('NOT_FOUND', 'Plan not found', 404);
  }
  return apiSuccess(plan);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const plan = store.plans.get(id);
    if (!plan) {
      return apiError('NOT_FOUND', 'Plan not found', 404);
    }

    const body = await request.json();
    const parsed = updatePlanSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join(', '));
    }

    const availableFrom = parsed.data.availableFrom ?? plan.availableFrom;
    const availableUntil = parsed.data.availableUntil ?? plan.availableUntil;
    if (availableFrom && availableUntil && availableUntil < availableFrom) {
      return apiError('VALIDATION_ERROR', 'availableUntil must be on or after availableFrom');
    }

    const updated = {
      ...plan,
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    };
    store.plans.set(id, updated);
    return apiSuccess(updated);
  } catch (err: unknown) {
    return apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Failed to update plan', 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const plan = store.plans.get(id);
    if (!plan) {
      return apiError('NOT_FOUND', 'Plan not found', 404);
    }

    const inUse = Array.from(store.subscriptions.values()).some(
      (s) => s.planId === id && s.status !== 'closed'
    );
    if (inUse) {
      return apiError(
        'PLAN_IN_USE',
        'This plan is used by subscriptions and cannot be deleted.',
        409
      );
    }

    store.plans.delete(id);
    return apiSuccess({ id });
  } catch (err: unknown) {
    return apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Failed to delete plan', 500);
  }
}
