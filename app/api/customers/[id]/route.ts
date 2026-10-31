import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-helpers';
import { requireStaff, requireUser } from '@/lib/auth/guards';
import { mapCustomer } from '@/lib/supabase/mappers';
import { updateCustomerSchema } from '@/lib/validation/schemas';

type Context = { params: Promise<{ id: string }> };
export async function GET(_request: NextRequest, { params }: Context) {
  const auth = await requireUser();
  if ('response' in auth) return auth.response;
  const { id } = await params;
  let query = auth.supabase.from('customers').select('id,name,email,phone,company,auth_user_id,created_at,updated_at').eq('id', id);
  if (auth.role === 'customer') query = query.eq('auth_user_id', auth.user.id);
  const { data, error } = await query.maybeSingle();
  if (error) return apiError('DATABASE_ERROR', 'Failed to fetch customer', 500);
  if (!data) return apiError('NOT_FOUND', 'Customer not found', 404);
  return apiSuccess(mapCustomer(data));
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const auth = await requireStaff();
  if ('response' in auth) return auth.response;
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError('VALIDATION_ERROR', 'A JSON request body is required'); }
  const parsed = updateCustomerSchema.safeParse(body);
  if (!parsed.success) return apiError('VALIDATION_ERROR', parsed.error.issues.map((issue) => issue.message).join(', '));
  const { authUserId, ...fields } = parsed.data;
  if (authUserId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(authUserId)) return apiError('VALIDATION_ERROR', 'authUserId must be a Supabase Auth UUID');
  const values = { ...fields, ...(authUserId !== undefined ? { auth_user_id: authUserId } : {}) };
  const { data, error } = await auth.supabase.from('customers').update(values).eq('id', id).select('id,name,email,phone,company,auth_user_id,created_at,updated_at').maybeSingle();
  if (error) return apiError('DATABASE_ERROR', 'Failed to update customer', 400);
  if (!data) return apiError('NOT_FOUND', 'Customer not found', 404);
  return apiSuccess(mapCustomer(data));
}
