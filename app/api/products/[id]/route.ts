import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-helpers';
import { requireStaff, requireUser } from '@/lib/auth/guards';
import { mapProduct } from '@/lib/supabase/mappers';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { updateProductSchema } from '@/lib/validation/schemas';

type Context = { params: Promise<{ id: string }> };
export async function GET(_request: NextRequest, { params }: Context) {
  const auth = await requireUser();
  if ('response' in auth) return auth.response;
  const { id } = await params;
  const staff = auth.role === 'admin' || auth.role === 'staff';
  try {
    const db = staff ? createSupabaseAdminClient() : auth.supabase;
    const columns = staff ? 'id,name,type,sale_price_minor,cost_price_minor,notes,is_active,created_at,updated_at' : 'id,name,type,sale_price_minor,notes,is_active,created_at,updated_at';
    const { data, error } = await db.from('products').select(columns).eq('id', id).maybeSingle();
    if (error) return apiError('DATABASE_ERROR', 'Failed to fetch product', 500);
    if (!data) return apiError('NOT_FOUND', 'Product not found', 404);
    return apiSuccess(mapProduct(data as unknown as Record<string, unknown>, staff));
  } catch {
    return apiError('SERVER_CONFIGURATION', 'Staff product access is not configured', 503);
  }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const auth = await requireStaff();
  if ('response' in auth) return auth.response;
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError('VALIDATION_ERROR', 'A JSON request body is required'); }
  const parsed = updateProductSchema.safeParse(body);
  if (!parsed.success) return apiError('VALIDATION_ERROR', parsed.error.issues.map((issue) => issue.message).join(', '));
  try {
    const values = { ...parsed.data, ...(parsed.data.salePriceMinor !== undefined ? { sale_price_minor: parsed.data.salePriceMinor } : {}), ...(parsed.data.costPriceMinor !== undefined ? { cost_price_minor: parsed.data.costPriceMinor } : {}), ...(parsed.data.isActive !== undefined ? { is_active: parsed.data.isActive } : {}) } as Record<string, unknown>;
    delete values.salePriceMinor; delete values.costPriceMinor; delete values.isActive;
    const { data, error } = await createSupabaseAdminClient().from('products').update(values).eq('id', id).select('id,name,type,sale_price_minor,cost_price_minor,notes,is_active,created_at,updated_at').maybeSingle();
    if (error) return apiError('DATABASE_ERROR', 'Failed to update product', 400);
    if (!data) return apiError('NOT_FOUND', 'Product not found', 404);
    return apiSuccess(mapProduct(data as unknown as Record<string, unknown>, true));
  } catch {
    return apiError('SERVER_CONFIGURATION', 'Staff product access is not configured', 503);
  }
}
