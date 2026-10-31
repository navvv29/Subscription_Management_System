import { describe, it, expect } from 'vitest';
import {
  validateTransition,
  canBeBilled,
  getAllowedActions,
} from '@/features/subscriptions/subscription-service';
import type { Plan } from '@/types/database';

describe('Subscription Lifecycle State Machine', () => {
  const permissivePlan: Plan = {
    id: 'p1',
    name: 'Permissive',
    interval: 'monthly',
    minimumQuantity: 1,
    allowPause: true,
    allowEarlyClose: true,
    allowRenewal: true,
    createdAt: '',
    updatedAt: '',
  };

  const restrictivePlan: Plan = {
    id: 'p2',
    name: 'Restrictive',
    interval: 'monthly',
    minimumQuantity: 1,
    allowPause: false,
    allowEarlyClose: false,
    allowRenewal: false,
    createdAt: '',
    updatedAt: '',
  };

  it('allows valid standard lifecycle transitions', () => {
    expect(validateTransition('draft', 'submit_quotation').newStatus).toBe('quotation');
    expect(validateTransition('quotation', 'confirm').newStatus).toBe('confirmed');
    expect(validateTransition('confirmed', 'activate').newStatus).toBe('active');
    expect(validateTransition('active', 'close', permissivePlan).newStatus).toBe('closed');
  });

  it('rejects invalid state transitions', () => {
    // Draft directly to active
    const res1 = validateTransition('draft', 'activate');
    expect(res1.success).toBe(false);
    expect(res1.error).toContain('Cannot transition');

    // Closed to active (terminal state)
    const res2 = validateTransition('closed', 'activate');
    expect(res2.success).toBe(false);

    // Expired to active directly
    const res3 = validateTransition('expired', 'activate');
    expect(res3.success).toBe(false);
  });

  it('respects plan pause policy', () => {
    const resAllowed = validateTransition('active', 'pause', permissivePlan);
    expect(resAllowed.success).toBe(true);
    expect(resAllowed.newStatus).toBe('paused');

    const resBlocked = validateTransition('active', 'pause', restrictivePlan);
    expect(resBlocked.success).toBe(false);
    expect(resBlocked.error).toContain('does not allow pausing');
  });

  it('respects plan early close policy', () => {
    const resAllowed = validateTransition('active', 'close', permissivePlan);
    expect(resAllowed.success).toBe(true);

    const resBlocked = validateTransition('active', 'close', restrictivePlan);
    expect(resBlocked.success).toBe(false);
    expect(resBlocked.error).toContain('does not allow early closure');
  });

  it('canBeBilled allows billing ONLY for active status', () => {
    expect(canBeBilled('active')).toBe(true);
    expect(canBeBilled('draft')).toBe(false);
    expect(canBeBilled('quotation')).toBe(false);
    expect(canBeBilled('confirmed')).toBe(false);
    expect(canBeBilled('paused')).toBe(false);
    expect(canBeBilled('expired')).toBe(false);
    expect(canBeBilled('closed')).toBe(false);
  });

  it('returns appropriate allowed actions list based on current status and plan', () => {
    const activeActions = getAllowedActions('active', permissivePlan);
    expect(activeActions).toContain('pause');
    expect(activeActions).toContain('close');
    expect(activeActions).toContain('expire');

    const restrictiveActions = getAllowedActions('active', restrictivePlan);
    expect(restrictiveActions).not.toContain('pause');
    expect(restrictiveActions).not.toContain('close');
  });
});
