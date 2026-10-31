import type { UserRole } from '@/types/database';

export const canManageStaff = (role: UserRole): boolean => role === 'admin';
export const isStaff = (role: UserRole): boolean => role === 'admin' || role === 'staff';
