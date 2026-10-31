import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { updateProductSchema } from '@/lib/validation/schemas';
import { store } from '@/lib/store';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const product = store.products.get(id);
  if (!product) {
    return apiError('NOT_FOUND', 'Product not found', 404);
  }
  return apiSuccess(product);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const product = store.products.get(id);
    if (!product) {
      return apiError('NOT_FOUND', 'Product not found', 404);
    }

    const body = await request.json();
    const parsed = updateProductSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join(', '));
    }

    const updated = {
      ...product,
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    };
    store.products.set(id, updated);
    return apiSuccess(updated);
  } catch (err: unknown) {
    return apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Failed to update product', 500);
  }
}
