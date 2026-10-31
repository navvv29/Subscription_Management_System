import type { TaxRule, TaxBehavior } from '@/types/database';

export interface TaxCalculationResult {
  preTaxAmountMinor: number;
  taxAmountMinor: number;
  totalWithTaxMinor: number;
  taxRate: number;
  taxBehavior: TaxBehavior;
}

/**
 * Calculate tax on a line item amount deterministically using minor units (paise).
 *
 * Exclusive: Subtotal is pre-tax. Tax is added on top.
 * Inclusive: Subtotal includes tax. Pre-tax is derived backwards.
 */
export function calculateLineTax(
  amountMinor: number,
  taxRule: TaxRule | null
): TaxCalculationResult {
  if (!taxRule || !taxRule.isActive) {
    return {
      preTaxAmountMinor: amountMinor,
      taxAmountMinor: 0,
      totalWithTaxMinor: amountMinor,
      taxRate: 0,
      taxBehavior: 'exclusive',
    };
  }

  const rate = taxRule.rate; // e.g. 18 for 18%

  if (taxRule.behavior === 'inclusive') {
    // Amount includes tax: preTax = round((amount * 100) / (100 + rate))
    const preTaxMinor = Math.round((amountMinor * 100) / (100 + rate));
    const taxMinor = amountMinor - preTaxMinor;
    return {
      preTaxAmountMinor: preTaxMinor,
      taxAmountMinor: taxMinor,
      totalWithTaxMinor: amountMinor,
      taxRate: rate,
      taxBehavior: 'inclusive',
    };
  } else {
    // Exclusive: tax = round((amount * rate) / 100)
    const taxMinor = Math.round((amountMinor * rate) / 100);
    return {
      preTaxAmountMinor: amountMinor,
      taxAmountMinor: taxMinor,
      totalWithTaxMinor: amountMinor + taxMinor,
      taxRate: rate,
      taxBehavior: 'exclusive',
    };
  }
}

/**
 * Calculate tax for a line item (unitPriceMinor * quantity).
 */
export function calculateLineItemTax(
  unitPriceMinor: number,
  quantity: number,
  taxRule: TaxRule | null
): TaxCalculationResult {
  const lineSubtotal = unitPriceMinor * quantity;
  return calculateLineTax(lineSubtotal, taxRule);
}

