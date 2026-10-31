import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { subscriptionTransitionSchema } from '@/lib/validation/schemas';
import { validateTransition } from '@/features/subscriptions/subscription-service';
import { store } from '@/lib/store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const subscription = store.subscriptions.get(id);
  if (!subscription) {
    return apiError('NOT_FOUND', 'Subscription not found', 404);
  }
  return apiSuccess(subscription);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const subscription = store.subscriptions.get(id);
    if (!subscription) {
      return apiError('NOT_FOUND', 'Subscription not found', 404);
    }

    const body = await request.json();
    const parsed = subscriptionTransitionSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join(', '));
    }

    const plan = store.plans.get(subscription.planId);
    const result = validateTransition(subscription.status, parsed.data.action, plan);

    if (!result.success || !result.newStatus) {
      return apiError('INVALID_TRANSITION', result.error ?? 'Invalid state transition', 400);
    }

    subscription.status = result.newStatus;
    subscription.updatedAt = new Date().toISOString();
    store.subscriptions.set(subscription.id, subscription);

    return apiSuccess(subscription);
  } catch (err: unknown) {
    return apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Update failed', 500);
  }
}
