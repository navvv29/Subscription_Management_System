import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { parseJson, badRequest, success } from '@/lib/api';

export async function POST(request: Request) {
  const p = z.object({ email: z.string().email() }).safeParse(await parseJson(request));
  if (!p.success) return badRequest('A valid email is required');
  try {
    const s = await createSupabaseServerClient();
    const { error } = await s.auth.resetPasswordForEmail(p.data.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password`,
    });
    if (error) return NextResponse.json({ error: { code: 'RESET_REQUEST_FAILED', message: error.message } }, { status: 400 });
    return success({ requested: true });
  } catch (err) {
    return NextResponse.json({ error: { code: 'SERVER_CONFIGURATION', message: err instanceof Error ? err.message : 'Database error' } }, { status: 503 });
  }
}
