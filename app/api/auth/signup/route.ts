import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { parseJson, badRequest, success } from '@/lib/api';
import { signUpSchema } from '@/lib/validation/schemas';

export async function POST(request: Request) {
  const p = signUpSchema.safeParse(await parseJson(request));
  if (!p.success) return badRequest('Invalid sign-up details', p.error.flatten());
  try {
    const supabase = await createSupabaseServerClient();
    const { email, password, displayName } = p.data;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
      },
    });
    if (error) return NextResponse.json({ error: { code: 'SIGNUP_FAILED', message: error.message } }, { status: 400 });
    return success({ userId: data.user?.id, emailConfirmationRequired: !data.session }, 201);
  } catch (err) {
    return NextResponse.json({ error: { code: 'SERVER_CONFIGURATION', message: err instanceof Error ? err.message : 'Database error' } }, { status: 503 });
  }
}
