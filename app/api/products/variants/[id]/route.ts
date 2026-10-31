import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { createProductVariantSchema } from '@/lib/validation/schemas';

const updateProductVariantSchema = createProductVariantSchema
  .omit({ productId: true })
  .partial();
import { store } from '@/lib/store';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const variant = store.variants.get(id);
    if (!variant) {
      return apiError('NOT_FOUND', 'Variant not found', 404);
    }

    const body = await request.json();
    const parsed = updateProductVariantSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join(', '));
    }

    const product = store.products.get(variant.productId);
    const adjustment = parsed.data.priceAdjustmentMinor ?? variant.priceAdjustmentMinor;
    if (product && product.salePriceMinor + adjustment < 0) {
      return apiError('INVALID_PRICE', 'Adjustment would make the variant price negative', 400);
    }

    const updated = {
      ...variant,
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    };
    store.variants.set(id, updated);
    return apiSuccess(updated);
  } catch (err: unknown) {
    return apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Failed to update variant', 500);
  }
}
