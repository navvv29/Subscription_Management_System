import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { canCreateStaff } from '@/lib/permissions/roles';

export type Role = 'admin' | 'staff' | 'customer';

export async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return {
      response: NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } }, { status: 401 }),
    } as const;
  }
  const { data: profile } = await supabase.from('profiles').select('id,role,email,display_name').eq('id', user.id).maybeSingle();
  if (!profile) {
    return {
      response: NextResponse.json({ error: { code: 'PROFILE_MISSING', message: 'Account profile is unavailable' } }, { status: 403 }),
    } as const;
  }
  return { supabase, user, profile, role: profile.role as Role } as const;
}

export async function requireStaff() {
  const r = await requireUser();
  if ('response' in r) return r;
  if (r.role !== 'admin' && r.role !== 'staff') {
    return {
      response: NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Staff access required' } }, { status: 403 }),
    } as const;
  }
  return r;
}

export async function requireAdmin() {
  const r = await requireUser();
  if ('response' in r) return r;
  if (!canCreateStaff(r.role)) {
    return {
      response: NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Admin access required' } }, { status: 403 }),
    } as const;
  }
  return r;
}

