import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (!code) return NextResponse.json({ error: { code: 'AUTH_CODE_MISSING', message: 'Confirmation code is missing or expired' } }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.json({ error: { code: 'AUTH_CALLBACK_FAILED', message: 'Confirmation link is invalid or expired' } }, { status: 400 });
  return NextResponse.redirect(new URL('/dashboard', url.origin));
}
