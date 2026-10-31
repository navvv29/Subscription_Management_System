import { apiError, apiSuccess } from '@/lib/api-helpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) return apiError('LOGOUT_FAILED', error.message, 400);
  return apiSuccess({ signedOut: true });
}
