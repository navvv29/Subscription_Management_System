import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-helpers';
import { requireStaff, requireUser } from '@/lib/auth/guards';
import { mapPlan } from '@/lib/supabase/mappers';
import { updatePlanSchema } from '@/lib/validation/schemas';

type Context = { params: Promise<{ id: string }> };
const columns = 'id,name,billing_interval,minimum_quantity,available_from,available_until,allow_pause,allow_early_close,allow_renewal,created_at,updated_at,is_active';
export async function GET(_request: NextRequest, { params }: Context) {
  const auth = await requireUser();
  if ('response' in auth) return auth.response;
  const { id } = await params;
  const { data, error } = await auth.supabase.from('plans').select(columns).eq('id', id).maybeSingle();
  if (error) return apiError('DATABASE_ERROR', 'Failed to fetch plan', 500);
  if (!data) return apiError('NOT_FOUND', 'Plan not found', 404);
  return apiSuccess(mapPlan(data));
}
export async function PATCH(request: NextRequest, { params }: Context) {
  const auth = await requireStaff();
  if ('response' in auth) return auth.response;
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError('VALIDATION_ERROR', 'A JSON request body is required'); }
  const parsed = updatePlanSchema.safeParse(body);
  if (!parsed.success) return apiError('VALIDATION_ERROR', parsed.error.issues.map((issue) => issue.message).join(', '));
  const p = parsed.data;
  const values = { ...(p.name !== undefined ? { name: p.name } : {}), ...(p.interval !== undefined ? { billing_interval: p.interval } : {}), ...(p.minimumQuantity !== undefined ? { minimum_quantity: p.minimumQuantity } : {}), ...(p.availableFrom !== undefined ? { available_from: p.availableFrom } : {}), ...(p.availableUntil !== undefined ? { available_until: p.availableUntil } : {}), ...(p.allowPause !== undefined ? { allow_pause: p.allowPause } : {}), ...(p.allowEarlyClose !== undefined ? { allow_early_close: p.allowEarlyClose } : {}), ...(p.allowRenewal !== undefined ? { allow_renewal: p.allowRenewal } : {}) };
  const { data, error } = await auth.supabase.from('plans').update(values).eq('id', id).select(columns).maybeSingle();
  if (error) return apiError('DATABASE_ERROR', 'Failed to update plan', 400);
  if (!data) return apiError('NOT_FOUND', 'Plan not found', 404);
  return apiSuccess(mapPlan(data));
}
