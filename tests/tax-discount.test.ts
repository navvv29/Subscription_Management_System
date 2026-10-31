import { describe, it, expect } from 'vitest';
import { calculateLineTax, calculateLineItemTax } from '@/lib/billing/tax-service';
import { evaluateDiscount } from '@/lib/billing/discount-service';
import type { TaxRule, Discount } from '@/types/database';

describe('Tax & Discount Deterministic Calculations', () => {
  const gst18Exclusive: TaxRule = {
    id: 't1',
    name: 'GST 18% Exclusive',
    rate: 18,
    behavior: 'exclusive',
    isActive: true,
    createdAt: '',
    updatedAt: '',
  };

  const gst18Inclusive: TaxRule = {
    id: 't2',
    name: 'GST 18% Inclusive',
    rate: 18,
    behavior: 'inclusive',
    isActive: true,
    createdAt: '',
    updatedAt: '',
  };

  it('matches the exact deterministic fixture from the blueprint', () => {
    // 2 units at ₹10,000 (1,000,000 paise) + ₹560 (56,000 paise) variant adjustment
    const unitPriceMinor = 1000000 + 56000; // 1,056,000 paise = ₹10,560.00
    const quantity = 2;
    const subtotalMinor = unitPriceMinor * quantity; // 2,112,000 paise = ₹21,120.00
    expect(subtotalMinor).toBe(2112000);

    // 10% discount
    const discount10: Discount = {
      id: 'd1',
      name: '10% Discount',
      type: 'percentage',
      value: 10,
      validFrom: '2026-01-01',
      validUntil: '2026-12-31',
      isActive: true,
      usageCount: 0,
      createdAt: '',
      updatedAt: '',
    };

    const discountRes = evaluateDiscount(discount10, subtotalMinor, quantity, 'prod-1', '2026-06-01');
    expect(discountRes.isEligible).toBe(true);
    expect(discountRes.discountAmountMinor).toBe(211200); // ₹2,112.00

    const discountedSubtotalMinor = subtotalMinor - discountRes.discountAmountMinor; // 1,900,800 paise = ₹19,008.00
    expect(discountedSubtotalMinor).toBe(1900800);

    // 18% exclusive tax on ₹19,008
    const taxRes = calculateLineTax(discountedSubtotalMinor, gst18Exclusive);
    expect(taxRes.taxAmountMinor).toBe(342144); // ₹3,421.44
    expect(taxRes.totalWithTaxMinor).toBe(2242944); // ₹22,429.44
  });

  it('handles inclusive tax derivation accurately', () => {
    // Total is ₹1,180 (118,000 paise) including 18% tax
    // Pre-tax should be ₹1,000 (100,000 paise), Tax should be ₹180 (18,000 paise)
    const taxRes = calculateLineTax(118000, gst18Inclusive);
    expect(taxRes.preTaxAmountMinor).toBe(100000);
    expect(taxRes.taxAmountMinor).toBe(18000);
    expect(taxRes.totalWithTaxMinor).toBe(118000);
  });

  it('rejects discount when expired', () => {
    const expiredDiscount: Discount = {
      id: 'd-exp',
      name: 'Expired',
      type: 'fixed',
      value: 50000,
      validFrom: '2025-01-01',
      validUntil: '2025-12-31',
      isActive: true,
      usageCount: 0,
      createdAt: '',
      updatedAt: '',
    };
    const res = evaluateDiscount(expiredDiscount, 100000, 1, 'p1', '2026-01-01');
    expect(res.isEligible).toBe(false);
    expect(res.reason).toContain('expired');
  });

  it('rejects discount when usage limit is exhausted', () => {
    const exhaustedDiscount: Discount = {
      id: 'd-lim',
      name: 'Exhausted',
      type: 'fixed',
      value: 50000,
      validFrom: '2026-01-01',
      validUntil: '2026-12-31',
      usageLimit: 5,
      usageCount: 5,
      isActive: true,
      createdAt: '',
      updatedAt: '',
    };
    const res = evaluateDiscount(exhaustedDiscount, 100000, 1, 'p1', '2026-06-01');
    expect(res.isEligible).toBe(false);
    expect(res.reason).toContain('usage limit reached');
  });

  it('rejects discount when below minimum purchase threshold', () => {
    const minPurchaseDiscount: Discount = {
      id: 'd-min',
      name: 'Min 5000',
      type: 'fixed',
      value: 50000,
      minimumPurchaseMinor: 500000, // ₹5,000
      validFrom: '2026-01-01',
      validUntil: '2026-12-31',
      isActive: true,
      usageCount: 0,
      createdAt: '',
      updatedAt: '',
    };
    const res = evaluateDiscount(minPurchaseDiscount, 300000, 1, 'p1', '2026-06-01');
    expect(res.isEligible).toBe(false);
    expect(res.reason).toContain('minimum purchase');
  });

  it('rejects discount when product is not in scope', () => {
    const scopedDiscount: Discount = {
      id: 'd-scope',
      name: 'Scoped',
      type: 'percentage',
      value: 15,
      productScope: ['prod-allowed-1', 'prod-allowed-2'],
      validFrom: '2026-01-01',
      validUntil: '2026-12-31',
      isActive: true,
      usageCount: 0,
      createdAt: '',
      updatedAt: '',
    };
    const res = evaluateDiscount(scopedDiscount, 100000, 1, 'prod-forbidden', '2026-06-01');
    expect(res.isEligible).toBe(false);
    expect(res.reason).toContain('not in discount scope');
  });
});
