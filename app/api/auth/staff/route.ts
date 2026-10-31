import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/guards';
import { apiError, apiSuccess } from '@/lib/api-helpers';
import { passwordSchema } from '@/lib/validation/schemas';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const staffSchema = z.object({ email: z.string().trim().email(), password: passwordSchema, displayName: z.string().trim().min(1).max(120), role: z.enum(['staff','admin']).default('staff') });
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('response' in auth) return auth.response;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError('VALIDATION_ERROR', 'A JSON request body is required'); }
  const parsed = staffSchema.safeParse(body);
  if (!parsed.success) return apiError('VALIDATION_ERROR', parsed.error.issues.map((issue) => issue.message).join(', '));
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.createUser({ email: parsed.data.email, password: parsed.data.password, email_confirm: false, user_metadata: { display_name: parsed.data.displayName } });
    if (error) return apiError('STAFF_CREATE_FAILED', error.message, 400);
    if (!data.user) return apiError('STAFF_CREATE_FAILED', 'User was not created', 500);
    const { error: profileError } = await admin.from('profiles').update({ role: parsed.data.role, display_name: parsed.data.displayName }).eq('id', data.user.id);
    if (profileError) {
      await admin.auth.admin.deleteUser(data.user.id);
      return apiError('STAFF_CREATE_FAILED', profileError.message, 500);
    }
    return apiSuccess({ id: data.user.id, email: data.user.email, role: parsed.data.role }, 201);
  } catch (error) {
    return NextResponse.json({ error: { code: 'SERVER_CONFIGURATION', message: error instanceof Error ? error.message : 'Supabase admin client is unavailable' } }, { status: 503 });
  }
}
