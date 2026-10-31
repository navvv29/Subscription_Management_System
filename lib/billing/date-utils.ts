import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  startOfDay,
  getDaysInMonth,
  isBefore,
  isEqual,
  parseISO,
  format,
} from 'date-fns';
import type { BillingInterval } from '@/types/database';

/**
 * Calculate the next billing date from a given date based on the billing interval.
 *
 * Month-end policy: If the original start date was on day 29, 30, or 31,
 * and the target month has fewer days, pin to the last day of the target month.
 * E.g. Jan 31 -> Feb 28 (or Feb 29 in leap year).
 *
 * Leap-year policy: Feb 29 start date -> Feb 28 in non-leap years for yearly interval.
 */
export function calculateNextBillingDate(
  currentBillingDate: string,
  interval: BillingInterval,
  originalStartDay?: number
): string {
  const current = parseISO(currentBillingDate);
  const startDay = originalStartDay ?? current.getDate();

  let next: Date;

  switch (interval) {
    case 'daily':
      next = addDays(current, 1);
      break;
    case 'weekly':
      next = addWeeks(current, 1);
      break;
    case 'monthly': {
      const rawNext = addMonths(current, 1);
      const daysInNextMonth = getDaysInMonth(rawNext);
      const targetDay = Math.min(startDay, daysInNextMonth);
      next = new Date(rawNext.getFullYear(), rawNext.getMonth(), targetDay);
      break;
    }
    case 'yearly': {
      const rawNext = addYears(current, 1);
      if (startDay === 29 && current.getMonth() === 1) {
        const daysInFeb = getDaysInMonth(new Date(rawNext.getFullYear(), 1, 1));
        next = new Date(rawNext.getFullYear(), 1, Math.min(29, daysInFeb));
      } else {
        const daysInTargetMonth = getDaysInMonth(rawNext);
        const targetDay = Math.min(startDay, daysInTargetMonth);
        next = new Date(rawNext.getFullYear(), rawNext.getMonth(), targetDay);
      }
      break;
    }
    default:
      throw new Error(`Unknown billing interval: ${interval}`);
  }

  return format(startOfDay(next), 'yyyy-MM-dd');
}

/**
 * Calculate the billing period end date for a given start date and interval.
 * The period end date is the day before the next billing date.
 */
export function calculateBillingPeriodEnd(
  periodStart: string,
  interval: BillingInterval,
  originalStartDay?: number
): string {
  const nextBilling = calculateNextBillingDate(periodStart, interval, originalStartDay);
  const endDate = addDays(parseISO(nextBilling), -1);
  return format(endDate, 'yyyy-MM-dd');
}

/**
 * Check if a subscription is due for billing on or before a given date.
 */
export function isDueForBilling(
  nextBillingDate: string,
  asOfDate: string = format(new Date(), 'yyyy-MM-dd')
): boolean {
  const billingDate = startOfDay(parseISO(nextBillingDate));
  const checkDate = startOfDay(parseISO(asOfDate));
  return isBefore(billingDate, checkDate) || isEqual(billingDate, checkDate);
}

/**
 * Check if a date is in the past (strictly before today).
 */
export function isDateExpired(dateStr: string, asOfDate: string = format(new Date(), 'yyyy-MM-dd')): boolean {
  const date = startOfDay(parseISO(dateStr));
  const today = startOfDay(parseISO(asOfDate));
  return isBefore(date, today);
}

/**
 * Generate a unique human-readable identifier with prefix and timestamp component.
 */
export function generateUniqueNumber(prefix: string): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${year}${month}-${random}`;
}

