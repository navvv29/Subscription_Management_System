import type { SubscriptionStatus, Plan } from '@/types/database';

const VALID_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  draft: ['quotation'],
  quotation: ['confirmed'],
  confirmed: ['active'],
  active: ['paused', 'closed', 'expired'],
  paused: ['active', 'closed'],
  expired: ['closed'],
  closed: [], // Terminal
};

export interface TransitionResult {
  success: boolean;
  newStatus?: SubscriptionStatus;
  error?: string;
}

function actionToStatus(action: string): SubscriptionStatus | null {
  const map: Record<string, SubscriptionStatus> = {
    submit_quotation: 'quotation',
    confirm: 'confirmed',
    activate: 'active',
    pause: 'paused',
    resume: 'active',
    close: 'closed',
    expire: 'expired',
  };
  return map[action] ?? null;
}

/**
 * Validate and execute a subscription state transition.
 */
export function validateTransition(
  currentStatus: SubscriptionStatus,
  action: string,
  plan?: Plan | null
): TransitionResult {
  const targetStatus = actionToStatus(action);

  if (!targetStatus) {
    return { success: false, error: `Unknown action: '${action}'` };
  }

  const allowedTargets = VALID_TRANSITIONS[currentStatus];

  if (!allowedTargets || !allowedTargets.includes(targetStatus)) {
    return {
      success: false,
      error: `Cannot transition from '${currentStatus}' to '${targetStatus}'. Allowed transitions: ${allowedTargets?.join(', ') || 'none'}`,
    };
  }

  if (targetStatus === 'paused' && plan && !plan.allowPause) {
    return {
      success: false,
      error: 'Plan policy does not allow pausing subscriptions',
    };
  }

  if (targetStatus === 'closed' && currentStatus === 'active' && plan && !plan.allowEarlyClose) {
    return {
      success: false,
      error: 'Plan policy does not allow early closure of subscriptions',
    };
  }

  return { success: true, newStatus: targetStatus };
}

/**
 * Check if a subscription can be billed.
 * Only active subscriptions can be billed.
 */
export function canBeBilled(status: SubscriptionStatus): boolean {
  return status === 'active';
}

/**
 * Get allowed transition actions for a given status.
 */
export function getAllowedActions(
  currentStatus: SubscriptionStatus,
  plan?: Plan | null
): string[] {
  const actions: string[] = [];
  const targets = VALID_TRANSITIONS[currentStatus] || [];

  for (const target of targets) {
    if (target === 'quotation') actions.push('submit_quotation');
    else if (target === 'confirmed') actions.push('confirm');
    else if (target === 'active' && currentStatus === 'confirmed') actions.push('activate');
    else if (target === 'active' && currentStatus === 'paused') actions.push('resume');
    else if (target === 'paused') {
      if (!plan || plan.allowPause) actions.push('pause');
    }
    else if (target === 'closed') {
      if (currentStatus === 'active') {
        if (!plan || plan.allowEarlyClose) actions.push('close');
      } else {
        actions.push('close');
      }
    }
    else if (target === 'expired') actions.push('expire');
  }

  return actions;
}

