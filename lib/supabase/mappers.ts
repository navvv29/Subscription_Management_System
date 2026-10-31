import type { Customer, Plan, Product, ProductVariant } from '@/types/database';

type Row = Record<string, unknown>;
export function mapCustomer(row: Row): Customer {
  return { id: String(row.id), name: String(row.name), email: String(row.email), phone: (row.phone as string | null) ?? undefined, company: (row.company as string | null) ?? undefined, authUserId: (row.auth_user_id as string | null) ?? undefined, createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
}
export function mapProduct(row: Row, includeCost = false): Product | Omit<Product, 'costPriceMinor'> {
  const common = { id: String(row.id), name: String(row.name), type: String(row.type), salePriceMinor: Number(row.sale_price_minor), notes: (row.notes as string | null) ?? undefined, isActive: Boolean(row.is_active), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
  return includeCost ? { ...common, costPriceMinor: Number(row.cost_price_minor) } : common;
}
export function mapVariant(row: Row): ProductVariant {
  return { id: String(row.id), productId: String(row.product_id), name: String(row.name), priceAdjustmentMinor: Number(row.price_adjustment_minor), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
}
export function mapPlan(row: Row): Plan {
  return { id: String(row.id), name: String(row.name), interval: row.billing_interval as Plan['interval'], minimumQuantity: Number(row.minimum_quantity), availableFrom: (row.available_from as string | null) ?? undefined, availableUntil: (row.available_until as string | null) ?? undefined, allowPause: Boolean(row.allow_pause), allowEarlyClose: Boolean(row.allow_early_close), allowRenewal: Boolean(row.allow_renewal), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
}
