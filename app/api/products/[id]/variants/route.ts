import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-helpers';
import { requireStaff, requireUser } from '@/lib/auth/guards';
import { mapVariant } from '@/lib/supabase/mappers';
import { createProductVariantSchema } from '@/lib/validation/schemas';

type Context = { params: Promise<{ id: string }> };
export async function GET(_request: NextRequest, { params }: Context) {
  const auth = await requireUser();
  if ('response' in auth) return auth.response;
  const { id } = await params;
  const { data, error } = await auth.supabase.from('product_variants').select('id,product_id,name,price_adjustment_minor,created_at,updated_at').eq('product_id', id).order('name');
  if (error) return apiError('DATABASE_ERROR', 'Failed to fetch product variants', 500);
  return apiSuccess((data ?? []).map(mapVariant));
}
export async function POST(request: NextRequest, { params }: Context) {
  const auth = await requireStaff();
  if ('response' in auth) return auth.response;
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError('VALIDATION_ERROR', 'A JSON request body is required'); }
  const parsed = createProductVariantSchema.safeParse({ ...(body && typeof body === 'object' ? body : {}), productId: id });
  if (!parsed.success) return apiError('VALIDATION_ERROR', parsed.error.issues.map((issue) => issue.message).join(', '));
  const { data, error } = await auth.supabase.from('product_variants').insert({ product_id: id, name: parsed.data.name, price_adjustment_minor: parsed.data.priceAdjustmentMinor }).select('id,product_id,name,price_adjustment_minor,created_at,updated_at').single();
  if (error) return apiError('DATABASE_ERROR', error.code === '23514' ? 'Variant adjustment would make the effective price negative' : 'Failed to create product variant', 400);
  return apiSuccess(mapVariant(data), 201);
}
