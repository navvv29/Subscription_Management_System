import { describe, it, expect } from 'vitest';
import {
  createCustomerSchema,
  createProductSchema,
  createPlanSchema,
  createSubscriptionSchema,
  createPaymentSchema,
  createDiscountSchema,
} from '@/lib/validation/schemas';

describe('API Input Validation Schemas', () => {
  it('rejects invalid email for customer creation', () => {
    const invalidCustomer = {
      name: 'Test Customer',
      email: 'not-an-email',
    };
    const res = createCustomerSchema.safeParse(invalidCustomer);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.errors[0].message).toContain('Invalid email');
    }
  });

  it('rejects negative or floating point prices for products', () => {
    const negPrice = {
      name: 'Cloud Hosting',
      type: 'service',
      salePriceMinor: -500,
      costPriceMinor: 200,
    };
    expect(createProductSchema.safeParse(negPrice).success).toBe(false);

    const floatPrice = {
      name: 'Cloud Hosting',
      type: 'service',
      salePriceMinor: 500.5,
      costPriceMinor: 200,
    };
    expect(createProductSchema.safeParse(floatPrice).success).toBe(false);
  });

  it('rejects plan when availableUntil is before availableFrom', () => {
    const invalidPlan = {
      name: 'Summer Promo',
      interval: 'monthly',
      minimumQuantity: 1,
      availableFrom: '2026-06-01',
      availableUntil: '2026-05-01', // Before availableFrom
    };
    const res = createPlanSchema.safeParse(invalidPlan);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.errors[0].message).toContain('availableUntil must be on or after availableFrom');
    }
  });

  it('rejects subscription when endDate is before startDate', () => {
    const invalidSub = {
      customerId: 'cust-1',
      planId: 'plan-1',
      startDate: '2026-06-01',
      endDate: '2026-05-01', // Before startDate
      paymentTerms: 'Net 30',
      items: [
        {
          productId: 'prod-1',
          quantity: 1,
          unitPriceMinor: 10000,
        },
      ],
    };
    const res = createSubscriptionSchema.safeParse(invalidSub);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.errors[0].message).toContain('endDate must be on or after startDate');
    }
  });

  it('rejects payment with zero or negative amount', () => {
    const zeroPayment = {
      invoiceId: 'inv-1',
      amountMinor: 0,
      method: 'upi',
      paymentDate: '2026-06-01',
    };
    expect(createPaymentSchema.safeParse(zeroPayment).success).toBe(false);

    const negPayment = {
      invoiceId: 'inv-1',
      amountMinor: -100,
      method: 'upi',
      paymentDate: '2026-06-01',
    };
    expect(createPaymentSchema.safeParse(negPayment).success).toBe(false);
  });

  it('rejects discount percentage exceeding 100%', () => {
    const invalidDiscount = {
      name: 'Super Saver',
      type: 'percentage',
      value: 150, // > 100%
      validFrom: '2026-01-01',
      validUntil: '2026-12-31',
    };
    const res = createDiscountSchema.safeParse(invalidDiscount);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.errors[0].message).toContain('cannot exceed 100%');
    }
  });

  it('rejects discount when validUntil is before validFrom', () => {
    const invalidDates = {
      name: 'Spring Offer',
      type: 'fixed',
      value: 500,
      validFrom: '2026-04-01',
      validUntil: '2026-03-01',
    };
    const res = createDiscountSchema.safeParse(invalidDates);
    expect(res.success).toBe(false);
  });
});

