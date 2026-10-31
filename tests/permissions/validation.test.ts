import { describe, expect, it } from 'vitest';
import { passwordSchema, productSchema, planSchema } from '../../lib/validation/schemas';
import { canCreateStaff } from '../../lib/permissions/roles';

describe('backend input validation', () => {
  it('allows only admins to create staff accounts', () => {
    expect(canCreateStaff('admin')).toBe(true);
    expect(canCreateStaff('staff')).toBe(false);
    expect(canCreateStaff('customer')).toBe(false);
  });

  it('requires a password longer than eight characters with upper, lower and special characters', () => {
    for (const invalid of ['Abcdef!8', 'abcdefgh!9', 'ABCDEFGH!9', 'Abcdefgh9', 'Abcdefghi!']) {
      expect(passwordSchema.safeParse(invalid).success).toBe(false);
    }
    expect(passwordSchema.safeParse('Abcdefgh!9').success).toBe(true);
  });

  it('rejects negative integer money and fractional minor units', () => {
    const base = { name: 'Service', type: 'service', sale_price_minor: 1500, cost_price_minor: 0, is_active: true };
    expect(productSchema.safeParse({ ...base, sale_price_minor: -1 }).success).toBe(false);
    expect(productSchema.safeParse({ ...base, sale_price_minor: 1.5 }).success).toBe(false);
  });

  it('requires positive quantities and valid availability intervals', () => {
    const plan = {
      name: 'Monthly',
      billing_interval: 'monthly',
      minimum_quantity: 1,
      available_from: '2026-10-31',
      available_until: '2026-11-01',
      allow_pause: false,
      allow_early_close: true,
      allow_renewal: true,
      is_active: true,
    };
    expect(planSchema.safeParse({ ...plan, minimum_quantity: 0 }).success).toBe(false);
    expect(planSchema.safeParse({ ...plan, available_from: '2026-11-02', available_until: '2026-11-01' }).success).toBe(false);
  });
});

