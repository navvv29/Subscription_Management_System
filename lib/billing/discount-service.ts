import type { Discount } from '@/types/database';
import { parseISO, isBefore, isAfter, startOfDay, format } from 'date-fns';

export interface DiscountEvaluationResult {
  isEligible: boolean;
  discountAmountMinor: number;
  reason?: string;
  discountId?: string;
}

/**
 * Evaluate if a discount rule applies to a given line item.
 * All amounts are in minor units (paise).
 */
export function evaluateDiscount(
  discount: Discount | null,
  lineSubtotalMinor: number,
  lineQuantity: number,
  productId: string,
  asOfDate: string = format(new Date(), 'yyyy-MM-dd')
): DiscountEvaluationResult {
  if (!discount) {
    return { isEligible: false, discountAmountMinor: 0, reason: 'No discount provided' };
  }

  if (!discount.isActive) {
    return { isEligible: false, discountAmountMinor: 0, reason: 'Discount is inactive' };
  }

  const today = startOfDay(parseISO(asOfDate));
  const validFrom = startOfDay(parseISO(discount.validFrom));
  const validUntil = startOfDay(parseISO(discount.validUntil));

  if (isBefore(today, validFrom)) {
    return { isEligible: false, discountAmountMinor: 0, reason: 'Discount not yet active' };
  }

  if (isAfter(today, validUntil)) {
    return { isEligible: false, discountAmountMinor: 0, reason: 'Discount has expired' };
  }

  if (discount.usageLimit !== undefined && discount.usageLimit !== null && discount.usageCount >= discount.usageLimit) {
    return { isEligible: false, discountAmountMinor: 0, reason: 'Discount usage limit reached' };
  }

  if (discount.minimumPurchaseMinor !== undefined && discount.minimumPurchaseMinor !== null && lineSubtotalMinor < discount.minimumPurchaseMinor) {
    return {
      isEligible: false,
      discountAmountMinor: 0,
      reason: `Line subtotal below minimum purchase of ${discount.minimumPurchaseMinor}`,
    };
  }

  if (discount.minimumQuantity !== undefined && discount.minimumQuantity !== null && lineQuantity < discount.minimumQuantity) {
    return {
      isEligible: false,
      discountAmountMinor: 0,
      reason: `Quantity below minimum of ${discount.minimumQuantity}`,
    };
  }

  if (discount.productScope && discount.productScope.length > 0 && !discount.productScope.includes(productId)) {
    return { isEligible: false, discountAmountMinor: 0, reason: 'Product not in discount scope' };
  }

  let discountAmountMinor: number;

  if (discount.type === 'fixed') {
    discountAmountMinor = Math.min(discount.value, lineSubtotalMinor);
  } else {
    // Percentage discount
    discountAmountMinor = Math.round((lineSubtotalMinor * discount.value) / 100);
  }

  discountAmountMinor = Math.min(discountAmountMinor, lineSubtotalMinor);

  return {
    isEligible: true,
    discountAmountMinor,
    discountId: discount.id,
  };
}
