import type { Product, ProductVariant, ListQueryParams, PaginatedResponse } from '@/types';
import { apiFetch, toQuery, isMockApiEnabled, ApiRequestError } from './client';
import { matches, paginateRows } from './mappers';
import { db, mockDelay, matchesSearch, nextId, paginate } from './mock-store';

export interface ProductInput {
  name: string;
  type: string;
  salePriceMinor: number;
  costPriceMinor: number;
  notes?: string;
  isActive: boolean;
}

export interface VariantInput {
  productId: string;
  name: string;
  priceAdjustmentMinor: number;
}

export async function listProducts(
  params: ListQueryParams & { isActive?: boolean } = {}
): Promise<PaginatedResponse<Product>> {
  if (!isMockApiEnabled()) {
    const rows = await apiFetch<Product[]>('/api/products');
    const filtered = rows.filter((product) => {
      const matchesActive = params.isActive === undefined || product.isActive === params.isActive;
      return matchesActive && matches([product.name, product.type], params.search);
    });
    return paginateRows(filtered, params, 100);
  }
  const rows = db.products.filter((p) => {
    const matchesActive = params.isActive === undefined || p.isActive === params.isActive;
    return matchesActive && matchesSearch(params.search, p.name, p.type);
  });
  return mockDelay(paginate(rows, params.page ?? 1, params.pageSize ?? 100));
}

export async function createProduct(input: ProductInput): Promise<Product> {
  if (!isMockApiEnabled()) {
    return apiFetch('/api/products', { method: 'POST', body: JSON.stringify(input) });
  }
  const product: Product = {
    id: nextId('prod'),
    ...input,
    createdAt: new Date().toISOString(),
  };
  db.products.unshift(product);
  return mockDelay(product);
}

export async function updateProduct(id: string, input: ProductInput): Promise<Product> {
  if (!isMockApiEnabled()) {
    return apiFetch(`/api/products/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
  }
  const product = db.products.find((p) => p.id === id);
  if (!product) throw new ApiRequestError({ code: 'NOT_FOUND', message: 'Product not found.' });
  Object.assign(product, input, { updatedAt: new Date().toISOString() });
  return mockDelay(product);
}

export async function listVariants(productId?: string): Promise<ProductVariant[]> {
  if (!isMockApiEnabled()) {
    return apiFetch<ProductVariant[]>(`/api/products/variants${toQuery({ productId })}`);
  }
  const rows = db.variants.filter((v) => !productId || v.productId === productId);
  return mockDelay(rows);
}

export async function createVariant(input: VariantInput): Promise<ProductVariant> {
  if (!isMockApiEnabled()) {
    try {
      return await apiFetch<ProductVariant>('/api/products/variants', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'INVALID_PRICE') {
        throw new ApiRequestError({ code: err.code, message: err.message, field: 'adjustment' });
      }
      throw err;
    }
  }
  const product = db.products.find((p) => p.id === input.productId);
  if (!product) throw new ApiRequestError({ code: 'NOT_FOUND', message: 'Product not found.' });
  if (product.salePriceMinor + input.priceAdjustmentMinor < 0) {
    throw new ApiRequestError({
      code: 'INVALID_PRICE',
      message: 'Adjustment would make the variant price negative.',
      field: 'adjustment',
    });
  }
  const variant: ProductVariant = { id: nextId('var'), ...input };
  db.variants.push(variant);
  return mockDelay(variant);
}

export async function updateVariant(id: string, input: VariantInput): Promise<ProductVariant> {
  if (!isMockApiEnabled()) {
    try {
      return await apiFetch<ProductVariant>(`/api/products/variants/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: input.name, priceAdjustmentMinor: input.priceAdjustmentMinor }),
      });
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'INVALID_PRICE') {
        throw new ApiRequestError({ code: err.code, message: err.message, field: 'adjustment' });
      }
      throw err;
    }
  }
  const variant = db.variants.find((v) => v.id === id);
  if (!variant) throw new ApiRequestError({ code: 'NOT_FOUND', message: 'Variant not found.' });
  const product = db.products.find((p) => p.id === input.productId);
  if (product && product.salePriceMinor + input.priceAdjustmentMinor < 0) {
    throw new ApiRequestError({
      code: 'INVALID_PRICE',
      message: 'Adjustment would make the variant price negative.',
      field: 'adjustment',
    });
  }
  Object.assign(variant, input);
  return mockDelay(variant);
}
