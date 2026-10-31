import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { createProductVariantSchema } from '@/lib/validation/schemas';
import { store } from '@/lib/store';
import type { ProductVariant } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    let list = Array.from(store.variants.values());
    if (productId) list = list.filter((v) => v.productId === productId);
    list.sort((a, b) => a.name.localeCompare(b.name));
    return apiSuccess(list);
  } catch (err: unknown) {
    return apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Failed to fetch variants', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createProductVariantSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join(', '));
    }

    const product = store.products.get(parsed.data.productId);
    if (!product) {
      return apiError('NOT_FOUND', 'Product not found', 404);
    }
    if (product.salePriceMinor + parsed.data.priceAdjustmentMinor < 0) {
      return apiError('INVALID_PRICE', 'Adjustment would make the variant price negative', 400);
    }

    const variant: ProductVariant = {
      id: crypto.randomUUID(),
      ...parsed.data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.variants.set(variant.id, variant);
    return apiSuccess(variant, 201);
  } catch (err: unknown) {
    return apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Failed to create variant', 500);
  }
}
