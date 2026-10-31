import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get('code');
  if (!code) return NextResponse.json({ error: { code: 'RESET_CODE_MISSING', message: 'Reset code is missing or expired' } }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.json({ error: { code: 'RESET_SESSION_FAILED', message: 'Password reset link is invalid or expired' } }, { status: 400 });
  return NextResponse.json({ data: { resetSessionReady: true, message: 'Submit a new password to POST /api/auth/update-password' } });
}
