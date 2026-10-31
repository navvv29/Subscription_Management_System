import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const s = await createSupabaseServerClient();
    const { error } = await s.auth.signOut();
    if (error) return NextResponse.json({ error: { code: 'LOGOUT_FAILED', message: error.message } }, { status: 400 });
    return NextResponse.json({ data: { signedOut: true } });
  } catch (err) {
    return NextResponse.json({ error: { code: 'SERVER_CONFIGURATION', message: err instanceof Error ? err.message : 'Database error' } }, { status: 503 });
  }
}

