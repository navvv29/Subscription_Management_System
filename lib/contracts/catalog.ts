export type AppRole = 'admin' | 'staff' | 'customer';
export type Profile = { id: string; email: string; displayName: string; role: AppRole };
export type Customer = { id: string; name: string; email: string; phone?: string | null; company?: string | null; authUserId?: string | null };
export type Product = { id: string; name: string; type: 'physical' | 'service' | 'digital'; salePriceMinor: number; costPriceMinor?: number; notes?: string | null; isActive: boolean };
export type ProductVariant = { id: string; productId: string; name: string; priceAdjustmentMinor: number; value?: string | null };
export type Plan = { id: string; name: string; interval: 'daily' | 'weekly' | 'monthly' | 'yearly'; minimumQuantity: number; availableFrom?: string | null; availableUntil?: string | null; allowPause: boolean; allowEarlyClose: boolean; allowRenewal: boolean };

type DbRow = Record<string, unknown>;
export const customerDto = (r: DbRow): Customer => ({ id: r.id as string, name: r.name as string, email: r.email as string, phone: r.phone as string | null, company: r.company as string | null, authUserId: r.auth_user_id as string | null });
export const productDto = (value: unknown, includeCost = false): Product => {
  const r = value as DbRow;
  return { id: r.id as string, name: r.name as string, type: r.type as Product['type'], salePriceMinor: Number(r.sale_price_minor), ...(includeCost ? { costPriceMinor: Number(r.cost_price_minor) } : {}), notes: r.notes as string | null, isActive: Boolean(r.is_active) };
};
export const variantDto = (r: DbRow): ProductVariant => ({ id: r.id as string, productId: r.product_id as string, name: r.name as string, priceAdjustmentMinor: Number(r.price_adjustment_minor), value: r.value as string | null });
export const planDto = (r: DbRow): Plan => ({ id: r.id as string, name: r.name as string, interval: r.billing_interval as Plan['interval'], minimumQuantity: Number(r.minimum_quantity), availableFrom: r.available_from as string | null, availableUntil: r.available_until as string | null, allowPause: Boolean(r.allow_pause), allowEarlyClose: Boolean(r.allow_early_close), allowRenewal: Boolean(r.allow_renewal) });
