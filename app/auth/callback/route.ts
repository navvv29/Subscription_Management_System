import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (code) {
    try {
      const s = await createSupabaseServerClient();
      await s.auth.exchangeCodeForSession(code);
    } catch {
      // Continue to redirect if Supabase is offline or not configured
    }
  }
  return NextResponse.redirect(new URL('/dashboard', url.origin));
}
