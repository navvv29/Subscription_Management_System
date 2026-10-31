import { NextResponse } from 'next/server';
import type { UserRole } from '@/types/database';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { canManageStaff, isStaff } from '@/lib/permissions/roles';

export async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { response: NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } }, { status: 401 }) } as const;

  const { data: profile, error: profileError } = await supabase.from('profiles').select('id, email, display_name, role').eq('id', user.id).maybeSingle();
  if (profileError || !profile) return { response: NextResponse.json({ error: { code: 'PROFILE_MISSING', message: 'Account profile is unavailable' } }, { status: 403 }) } as const;
  return { supabase, user, profile, role: profile.role as UserRole } as const;
}

export async function requireStaff() {
  const auth = await requireUser();
  if ('response' in auth) return auth;
  if (!isStaff(auth.role)) return { response: NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Staff access required' } }, { status: 403 }) } as const;
  return auth;
}

export async function requireAdmin() {
  const auth = await requireUser();
  if ('response' in auth) return auth;
  if (!canManageStaff(auth.role)) return { response: NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Admin access required' } }, { status: 403 }) } as const;
  return auth;
}

export async function getLinkedCustomerId(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, userId: string): Promise<string | null> {
  const { data } = await supabase.from('customers').select('id').eq('auth_user_id', userId).maybeSingle();
  return data?.id ?? null;
}
