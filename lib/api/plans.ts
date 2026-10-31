import type { Plan, PlanInterval } from '@/types';
import { apiFetch, isMockApiEnabled, ApiRequestError } from './client';
import { matches } from './mappers';
import { db, mockDelay, matchesSearch, nextId } from './mock-store';

export interface PlanInput {
  name: string;
  interval: PlanInterval;
  minimumQuantity: number;
  availableFrom?: string;
  availableUntil?: string;
  allowPause: boolean;
  allowEarlyClose: boolean;
  allowRenewal: boolean;
}

export async function listPlans(
  params: { search?: string; interval?: PlanInterval | 'all' } = {}
): Promise<Plan[]> {
  if (!isMockApiEnabled()) {
    const rows = await apiFetch<Plan[]>('/api/plans');
    return rows.filter((plan) => {
      const matchesInterval = !params.interval || params.interval === 'all' || plan.interval === params.interval;
      return matchesInterval && matches([plan.name], params.search);
    });
  }
  const rows = db.plans.filter((p) => {
    const matchesInterval = !params.interval || params.interval === 'all' || p.interval === params.interval;
    return matchesInterval && matchesSearch(params.search, p.name);
  });
  return mockDelay(rows);
}

export async function createPlan(input: PlanInput): Promise<Plan> {
  if (!isMockApiEnabled()) {
    return apiFetch('/api/plans', { method: 'POST', body: JSON.stringify(input) });
  }
  const plan: Plan = { id: nextId('plan'), ...input, createdAt: new Date().toISOString() };
  db.plans.unshift(plan);
  return mockDelay(plan);
}

export async function updatePlan(id: string, input: PlanInput): Promise<Plan> {
  if (!isMockApiEnabled()) {
    return apiFetch(`/api/plans/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
  }
  const plan = db.plans.find((p) => p.id === id);
  if (!plan) throw new ApiRequestError({ code: 'NOT_FOUND', message: 'Plan not found.' });
  Object.assign(plan, input, { updatedAt: new Date().toISOString() });
  return mockDelay(plan);
}

export async function deletePlan(id: string): Promise<void> {
  if (!isMockApiEnabled()) {
    await apiFetch(`/api/plans/${id}`, { method: 'DELETE' });
    return;
  }
  const inUse = db.subscriptions.some((s) => s.planId === id && s.status !== 'cancelled');
  if (inUse) {
    throw new ApiRequestError({
      code: 'PLAN_IN_USE',
      message: 'This plan is used by active subscriptions and cannot be deleted.',
    });
  }
  const index = db.plans.findIndex((p) => p.id === id);
  if (index === -1) throw new ApiRequestError({ code: 'NOT_FOUND', message: 'Plan not found.' });
  db.plans.splice(index, 1);
  await mockDelay(undefined);
}
