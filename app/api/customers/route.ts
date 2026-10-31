import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-helpers';
import { requireStaff, requireUser } from '@/lib/auth/guards';
import { createCustomerSchema, paginationSchema } from '@/lib/validation/schemas';
import { mapCustomer } from '@/lib/supabase/mappers';

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ('response' in auth) return auth.response;
  const { searchParams } = request.nextUrl;
  const parsedPagination = paginationSchema.safeParse({ page: searchParams.get('page') ?? '1', pageSize: searchParams.get('pageSize') ?? '20', sortBy: 'createdAt', sortOrder: 'desc' });
  if (!parsedPagination.success) return apiError('VALIDATION_ERROR', parsedPagination.error.message);
  const { page, pageSize } = parsedPagination.data;
  let query = auth.supabase.from('customers').select('id,name,email,phone,company,auth_user_id,created_at,updated_at', { count: 'exact' }).order('created_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
  if (auth.role === 'customer') query = query.eq('auth_user_id', auth.user.id);
  const search = searchParams.get('search')?.trim();
  if (search) query = query.ilike('name', `%${search}%`);
  const { data, count, error } = await query;
  if (error) return apiError('DATABASE_ERROR', 'Failed to fetch customers', 500);
  const items = (data ?? []).map((row) => mapCustomer(row));
  if (searchParams.has('page') || searchParams.has('pageSize')) return apiSuccess({ data: items, pagination: { page, pageSize, totalCount: count ?? 0, totalPages: Math.ceil((count ?? 0) / pageSize) } });
  return apiSuccess(items);
}

export async function POST(request: NextRequest) {
  const auth = await requireStaff();
  if ('response' in auth) return auth.response;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError('VALIDATION_ERROR', 'A JSON request body is required'); }
  const parsed = createCustomerSchema.safeParse(body);
  if (!parsed.success) return apiError('VALIDATION_ERROR', parsed.error.issues.map((issue) => issue.message).join(', '));
  if (parsed.data.authUserId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(parsed.data.authUserId)) return apiError('VALIDATION_ERROR', 'authUserId must be a Supabase Auth UUID');
  const { data, error } = await auth.supabase.from('customers').insert({ name: parsed.data.name, email: parsed.data.email, phone: parsed.data.phone ?? null, company: parsed.data.company ?? null, auth_user_id: parsed.data.authUserId ?? null }).select('id,name,email,phone,company,auth_user_id,created_at,updated_at').single();
  if (error?.code === '23505') return apiError('DUPLICATE_EMAIL', 'Customer email or Auth account is already in use', 409);
  if (error || !data) return apiError('DATABASE_ERROR', 'Failed to create customer', 400);
  return apiSuccess(mapCustomer(data), 201);
}
