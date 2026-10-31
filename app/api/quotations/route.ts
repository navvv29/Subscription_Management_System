import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { createQuotationSchema } from '@/lib/validation/schemas';
import { generateUniqueNumber } from '@/lib/billing/date-utils';
import { store } from '@/lib/store';
import type { Quotation, QuotationItem } from '@/types/database';

export async function GET() {
  try {
    const list = Array.from(store.quotations.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return apiSuccess(list);
  } catch (err: unknown) {
    return apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Failed to fetch quotations', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createQuotationSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join(', '));
    }

    const { customerId, validUntil, items: reqItems, notes } = parsed.data;

    const customer = store.customers.get(customerId);
    if (!customer) {
      return apiError('NOT_FOUND', 'Customer not found', 404);
    }

    const quotationId = crypto.randomUUID();
    let subtotalMinor = 0;
    let taxTotalMinor = 0;
    let discountTotalMinor = 0;

    const items: QuotationItem[] = reqItems.map((item) => {
      const product = store.products.get(item.productId);
      const productName = product ? product.name : `Product ${item.productId.slice(0, 8)}`;
      let variantName: string | undefined;
      if (item.variantId) {
        const variant = store.variants.get(item.variantId);
        variantName = variant?.name;
      }

      const lineSubtotal = item.unitPriceMinor * item.quantity;
      subtotalMinor += lineSubtotal;

      const taxRule = item.taxRuleId ? store.taxRules.get(item.taxRuleId) : undefined;
      const taxRate = taxRule ? taxRule.rate : 0;
      const taxAmountMinor = taxRule ? Math.round((lineSubtotal * taxRate) / 100) : 0;
      taxTotalMinor += taxAmountMinor;

      const totalMinor = lineSubtotal + taxAmountMinor;

      return {
        id: crypto.randomUUID(),
        quotationId,
        productId: item.productId,
        productName,
        variantId: item.variantId,
        variantName,
        quantity: item.quantity,
        unitPriceMinor: item.unitPriceMinor,
        taxRuleId: item.taxRuleId,
        taxRate,
        taxAmountMinor,
        discountAmountMinor: 0,
        totalMinor,
      };
    });

    const totalMinor = subtotalMinor - discountTotalMinor + taxTotalMinor;

    const quotation: Quotation = {
      id: quotationId,
      number: generateUniqueNumber('QOT'),
      customerId,
      status: 'draft',
      validUntil,
      items,
      subtotalMinor,
      discountTotalMinor,
      taxTotalMinor,
      totalMinor,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.quotations.set(quotation.id, quotation);
    return apiSuccess(quotation, 201);
  } catch (err: unknown) {
    return apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Failed to create quotation', 500);
  }
}

