import { apiError, apiSuccess } from '@/lib/api-helpers';
import { signInSchema } from '@/lib/validation/schemas';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return apiError('VALIDATION_ERROR', 'A JSON request body is required'); }
  const parsed = signInSchema.safeParse(body);
  if (!parsed.success) return apiError('VALIDATION_ERROR', parsed.error.issues.map((issue) => issue.message).join(', '));
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return apiError('LOGIN_FAILED', 'Email or password is incorrect', 401);
  return apiSuccess({ userId: data.user.id, email: data.user.email });
}
