import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-helpers';
import { requireStaff, requireUser } from '@/lib/auth/guards';
import { mapProduct } from '@/lib/supabase/mappers';
import { createProductSchema, paginationSchema } from '@/lib/validation/schemas';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const publicColumns = 'id,name,type,sale_price_minor,notes,is_active,created_at,updated_at';
const staffColumns = `${publicColumns},cost_price_minor`;
export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ('response' in auth) return auth.response;
  const { searchParams } = request.nextUrl;
  const parsed = paginationSchema.safeParse({ page: searchParams.get('page') ?? '1', pageSize: searchParams.get('pageSize') ?? '20', sortBy: 'createdAt', sortOrder: 'desc' });
  if (!parsed.success) return apiError('VALIDATION_ERROR', parsed.error.message);
  const { page, pageSize } = parsed.data;
  const staff = auth.role === 'admin' || auth.role === 'staff';
  try {
    const db = staff ? createSupabaseAdminClient() : auth.supabase;
    let query = db.from('products').select(staff ? staffColumns : publicColumns, { count: 'exact' }).order('created_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
    if (!staff || searchParams.get('active') === 'true') query = query.eq('is_active', true);
    const type = searchParams.get('type');
    if (type) query = query.eq('type', type);
    const search = searchParams.get('search')?.trim();
    if (search) query = query.ilike('name', `%${search}%`);
    const { data, count, error } = await query;
    if (error) return apiError('DATABASE_ERROR', 'Failed to fetch products', 500);
    const items = (data ?? []).map((row) => mapProduct(row as unknown as Record<string, unknown>, staff));
    if (searchParams.has('page') || searchParams.has('pageSize')) return apiSuccess({ data: items, pagination: { page, pageSize, totalCount: count ?? 0, totalPages: Math.ceil((count ?? 0) / pageSize) } });
    return apiSuccess(items);
  } catch {
    return apiError('SERVER_CONFIGURATION', 'Staff product access is not configured', 503);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireStaff();
  if ('response' in auth) return auth.response;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError('VALIDATION_ERROR', 'A JSON request body is required'); }
  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) return apiError('VALIDATION_ERROR', parsed.error.issues.map((issue) => issue.message).join(', '));
  try {
    const { data, error } = await createSupabaseAdminClient().from('products').insert({ name: parsed.data.name, type: parsed.data.type, sale_price_minor: parsed.data.salePriceMinor, cost_price_minor: parsed.data.costPriceMinor, notes: parsed.data.notes ?? null, is_active: parsed.data.isActive }).select(staffColumns).single();
    if (error || !data) return apiError('DATABASE_ERROR', 'Failed to create product', 400);
    return apiSuccess(mapProduct(data as unknown as Record<string, unknown>, true), 201);
  } catch {
    return apiError('SERVER_CONFIGURATION', 'Staff product access is not configured', 503);
  }
}
