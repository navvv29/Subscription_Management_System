import { NextResponse } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-helpers';
import { signUpSchema } from '@/lib/validation/schemas';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return apiError('VALIDATION_ERROR', 'A JSON request body is required'); }
  const parsed = signUpSchema.safeParse(body);
  if (!parsed.success) return apiError('VALIDATION_ERROR', parsed.error.issues.map((issue) => issue.message).join(', '));
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { data: { display_name: parsed.data.displayName }, emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` },
    });
    if (error) return apiError('SIGNUP_FAILED', error.message, 400);
    return apiSuccess({ userId: data.user?.id, emailConfirmationRequired: !data.session }, 201);
  } catch (error) {
    return NextResponse.json({ error: { code: 'SERVER_CONFIGURATION', message: error instanceof Error ? error.message : 'Supabase is unavailable' } }, { status: 503 });
  }
}
