import { z } from 'zod';
import { apiError, apiSuccess } from '@/lib/api-helpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return apiError('VALIDATION_ERROR', 'A JSON request body is required'); }
  const parsed = z.object({ email: z.string().trim().email() }).safeParse(body);
  if (!parsed.success) return apiError('VALIDATION_ERROR', 'A valid email address is required');
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password` });
  if (error) return apiError('RESET_REQUEST_FAILED', error.message, 400);
  return apiSuccess({ requested: true });
}
