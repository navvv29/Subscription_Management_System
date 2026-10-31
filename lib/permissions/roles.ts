import type { Role } from '@/lib/auth/guards';

export const canCreateStaff = (role: Role): boolean => role === 'admin';
