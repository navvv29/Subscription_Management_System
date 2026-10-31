import { z } from 'zod';
import { apiError, apiSuccess } from '@/lib/api-helpers';
import { passwordSchema } from '@/lib/validation/schemas';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return apiError('VALIDATION_ERROR', 'A JSON request body is required'); }
  const parsed = z.object({ password: passwordSchema }).safeParse(body);
  if (!parsed.success) return apiError('VALIDATION_ERROR', parsed.error.issues.map((issue) => issue.message).join(', '));
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return apiError('UNAUTHENTICATED', 'A valid password reset session is required', 401);
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return apiError('PASSWORD_UPDATE_FAILED', error.message, 400);
  return apiSuccess({ updated: true });
}
