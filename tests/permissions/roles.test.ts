import { describe, expect, it } from 'vitest';
import { canManageStaff } from '@/lib/permissions/roles';

describe('staff account provisioning permissions', () => {
  it('allows admins only', () => {
    expect(canManageStaff('admin')).toBe(true);
    expect(canManageStaff('staff')).toBe(false);
    expect(canManageStaff('customer')).toBe(false);
  });
});
