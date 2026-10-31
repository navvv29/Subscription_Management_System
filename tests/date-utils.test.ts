import { describe, it, expect } from 'vitest';
import {
  calculateNextBillingDate,
  calculateBillingPeriodEnd,
  isDueForBilling,
  isDateExpired,
} from '@/lib/billing/date-utils';

describe('Billing Date Utilities', () => {
  it('calculates daily interval correctly', () => {
    expect(calculateNextBillingDate('2026-03-01', 'daily')).toBe('2026-03-02');
  });

  it('calculates weekly interval correctly', () => {
    expect(calculateNextBillingDate('2026-03-01', 'weekly')).toBe('2026-03-08');
  });

  it('calculates monthly interval with standard dates', () => {
    expect(calculateNextBillingDate('2026-01-15', 'monthly')).toBe('2026-02-15');
  });

  it('handles month-end pinning for 31st (Jan 31 -> Feb 28 in non-leap year)', () => {
    // 2026 is non-leap year
    expect(calculateNextBillingDate('2026-01-31', 'monthly', 31)).toBe('2026-02-28');
  });

  it('handles month-end pinning for leap year (Jan 31 -> Feb 29 in 2024)', () => {
    // 2024 is leap year
    expect(calculateNextBillingDate('2024-01-31', 'monthly', 31)).toBe('2024-02-29');
  });

  it('handles yearly interval in regular years', () => {
    expect(calculateNextBillingDate('2026-05-10', 'yearly')).toBe('2027-05-10');
  });

  it('handles yearly leap-year rollover (Feb 29 2024 -> Feb 28 2025)', () => {
    expect(calculateNextBillingDate('2024-02-29', 'yearly', 29)).toBe('2025-02-28');
  });

  it('calculates billing period end date correctly as day before next billing', () => {
    const end = calculateBillingPeriodEnd('2026-01-01', 'monthly');
    expect(end).toBe('2026-01-31');
  });

  it('evaluates isDueForBilling correctly', () => {
    expect(isDueForBilling('2026-01-01', '2026-01-01')).toBe(true);
    expect(isDueForBilling('2026-01-01', '2026-01-05')).toBe(true);
    expect(isDueForBilling('2026-01-10', '2026-01-05')).toBe(false);
  });

  it('evaluates isDateExpired correctly', () => {
    expect(isDateExpired('2026-01-01', '2026-01-05')).toBe(true);
    expect(isDateExpired('2026-01-10', '2026-01-05')).toBe(false);
  });
});

