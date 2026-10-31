import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (!code) {
    return NextResponse.json({ error: { code: 'RESET_CODE_MISSING', message: 'Password reset code is missing or expired' } }, { status: 400 });
  }
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.json({ error: { code: 'RESET_SESSION_FAILED', message: 'Password reset link is invalid or expired' } }, { status: 400 });
    }
    return NextResponse.json({ data: { resetSessionReady: true, message: 'Submit a new password to POST /api/auth/update-password' } });
  } catch (err) {
    return NextResponse.json({ error: { code: 'SERVER_CONFIGURATION', message: err instanceof Error ? err.message : 'Database error' } }, { status: 503 });
  }
}
