import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-helpers';
import { requireStaff, requireUser } from '@/lib/auth/guards';
import { mapPlan } from '@/lib/supabase/mappers';
import { createPlanSchema, paginationSchema } from '@/lib/validation/schemas';

const columns = 'id,name,billing_interval,minimum_quantity,available_from,available_until,allow_pause,allow_early_close,allow_renewal,created_at,updated_at';
export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ('response' in auth) return auth.response;
  const { searchParams } = request.nextUrl;
  const parsed = paginationSchema.safeParse({ page: searchParams.get('page') ?? '1', pageSize: searchParams.get('pageSize') ?? '20', sortBy: 'createdAt', sortOrder: 'desc' });
  if (!parsed.success) return apiError('VALIDATION_ERROR', parsed.error.message);
  const { page, pageSize } = parsed.data;
  let query = auth.supabase.from('plans').select(`${columns},is_active`, { count: 'exact' }).order('created_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
  if (auth.role === 'customer' || searchParams.get('active') === 'true') query = query.eq('is_active', true);
  const interval = searchParams.get('interval');
  if (interval && ['daily','weekly','monthly','yearly'].includes(interval)) query = query.eq('billing_interval', interval);
  const { data, count, error } = await query;
  if (error) return apiError('DATABASE_ERROR', 'Failed to fetch plans', 500);
  const items = (data ?? []).map(mapPlan);
  if (searchParams.has('page') || searchParams.has('pageSize')) return apiSuccess({ data: items, pagination: { page, pageSize, totalCount: count ?? 0, totalPages: Math.ceil((count ?? 0) / pageSize) } });
  return apiSuccess(items);
}

export async function POST(request: NextRequest) {
  const auth = await requireStaff();
  if ('response' in auth) return auth.response;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError('VALIDATION_ERROR', 'A JSON request body is required'); }
  const parsed = createPlanSchema.safeParse(body);
  if (!parsed.success) return apiError('VALIDATION_ERROR', parsed.error.issues.map((issue) => issue.message).join(', '));
  const p = parsed.data;
  const { data, error } = await auth.supabase.from('plans').insert({ name: p.name, billing_interval: p.interval, minimum_quantity: p.minimumQuantity, available_from: p.availableFrom ?? null, available_until: p.availableUntil ?? null, allow_pause: p.allowPause, allow_early_close: p.allowEarlyClose, allow_renewal: p.allowRenewal }).select(`${columns},is_active`).single();
  if (error || !data) return apiError('DATABASE_ERROR', 'Failed to create plan', 400);
  return apiSuccess(mapPlan(data), 201);
}
