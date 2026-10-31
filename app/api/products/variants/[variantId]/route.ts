import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiSuccess } from '@/lib/api-helpers';
import { requireStaff } from '@/lib/auth/guards';
import { mapVariant } from '@/lib/supabase/mappers';

const updateSchema = z.object({ name: z.string().trim().min(1).max(255).optional(), priceAdjustmentMinor: z.number().int().optional() }).refine((value) => Object.keys(value).length > 0, 'At least one field is required');
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ variantId: string }> }) {
  const auth = await requireStaff();
  if ('response' in auth) return auth.response;
  const { variantId } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError('VALIDATION_ERROR', 'A JSON request body is required'); }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError('VALIDATION_ERROR', parsed.error.issues.map((issue) => issue.message).join(', '));
  const values = { ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}), ...(parsed.data.priceAdjustmentMinor !== undefined ? { price_adjustment_minor: parsed.data.priceAdjustmentMinor } : {}) };
  const { data, error } = await auth.supabase.from('product_variants').update(values).eq('id', variantId).select('id,product_id,name,price_adjustment_minor,created_at,updated_at').maybeSingle();
  if (error) return apiError('DATABASE_ERROR', error.code === '23514' ? 'Variant adjustment would make the effective price negative' : 'Failed to update product variant', 400);
  if (!data) return apiError('NOT_FOUND', 'Product variant not found', 404);
  return apiSuccess(mapVariant(data));
}
