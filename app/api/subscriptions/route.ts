import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { createSubscriptionSchema, paginationSchema } from '@/lib/validation/schemas';
import { generateUniqueNumber } from '@/lib/billing/date-utils';
import { store } from '@/lib/store';
import { recordAuditLog } from '@/lib/audit/audit-service';
import type { Subscription, SubscriptionItem } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = paginationSchema.safeParse({
      page: searchParams.get('page') ?? '1',
      pageSize: searchParams.get('pageSize') ?? '20',
      sortBy: searchParams.get('sortBy') ?? 'createdAt',
      sortOrder: searchParams.get('sortOrder') ?? 'desc',
    });

    if (!params.success) {
      return apiError('VALIDATION_ERROR', params.error.message);
    }

    const status = searchParams.get('status');
    const customerId = searchParams.get('customerId');

    let list = Array.from(store.subscriptions.values());
    if (status) {
      list = list.filter((s) => s.status === status);
    }
    if (customerId) {
      list = list.filter((s) => s.customerId === customerId);
    }

    list.sort((a, b) => {
      const order = params.data.sortOrder === 'asc' ? 1 : -1;
      return order * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });

    const { page, pageSize } = params.data;
    const totalCount = list.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const startIdx = (page - 1) * pageSize;
    const paginated = list.slice(startIdx, startIdx + pageSize);

    return apiSuccess({
      data: paginated,
      pagination: { page, pageSize, totalCount, totalPages },
    });
  } catch (err: unknown) {
    return apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Failed to fetch subscriptions', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createSubscriptionSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join(', '));
    }

    const data = parsed.data;

    // Validate Customer exists
    const customer = store.customers.get(data.customerId);
    if (!customer) {
      return apiError('NOT_FOUND', `Customer with ID '${data.customerId}' does not exist`, 404);
    }

    // Validate Plan exists
    const plan = store.plans.get(data.planId);
    if (!plan) {
      return apiError('NOT_FOUND', `Plan with ID '${data.planId}' does not exist`, 404);
    }

    // Validate plan minimum quantity
    const totalQuantity = data.items.reduce((sum, it) => sum + it.quantity, 0);
    if (totalQuantity < plan.minimumQuantity) {
      return apiError(
        'MINIMUM_QUANTITY_NOT_MET',
        `Plan '${plan.name}' requires a minimum quantity of ${plan.minimumQuantity}, but only ${totalQuantity} was provided.`,
        400
      );
    }

    // Validate products exist
    for (const it of data.items) {
      const prod = store.products.get(it.productId);
      if (!prod) {
        return apiError('NOT_FOUND', `Product with ID '${it.productId}' does not exist`, 404);
      }
      if (it.variantId) {
        const variant = store.variants.get(it.variantId);
        if (!variant || variant.productId !== it.productId) {
          return apiError('NOT_FOUND', `Variant '${it.variantId}' does not belong to product '${it.productId}'`, 404);
        }
      }
    }

    const subscriptionId = crypto.randomUUID();
    let subtotalMinor = 0;
    let taxTotalMinor = 0;

    const items: SubscriptionItem[] = data.items.map((item) => {
      const product = store.products.get(item.productId);
      const productName = product?.name ?? `Product ${item.productId.slice(0, 8)}`;
      let variantName: string | undefined;
      if (item.variantId) {
        variantName = store.variants.get(item.variantId)?.name;
      }

      const lineSubtotal = item.unitPriceMinor * item.quantity;
      subtotalMinor += lineSubtotal;

      const taxRule = item.taxRuleId ? store.taxRules.get(item.taxRuleId) : undefined;
      const taxRate = taxRule ? taxRule.rate : 0;
      const taxAmountMinor = taxRule ? Math.round((lineSubtotal * taxRate) / 100) : 0;
      taxTotalMinor += taxAmountMinor;

      return {
        id: crypto.randomUUID(),
        subscriptionId,
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
        totalMinor: lineSubtotal + taxAmountMinor,
      };
    });

    const totalMinor = subtotalMinor + taxTotalMinor;

    const subscription: Subscription = {
      id: subscriptionId,
      number: generateUniqueNumber('SUB'),
      customerId: data.customerId,
      planId: data.planId,
      status: 'draft',
      startDate: data.startDate,
      endDate: data.endDate,
      nextBillingDate: data.startDate,
      paymentTerms: data.paymentTerms,
      items,
      subtotalMinor,
      taxTotalMinor,
      discountTotalMinor: 0,
      totalMinor,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.subscriptions.set(subscription.id, subscription);

    // Record audit log
    recordAuditLog({
      actorId: (body.actorId as string) || 'system',
      action: 'subscription.created',
      entityType: 'subscription',
      entityId: subscription.id,
      metadata: {
        subscriptionNumber: subscription.number,
        customerId: data.customerId,
        planId: data.planId,
        totalMinor,
      },
    });

    // Atomic disk persistence
    store.persist();

    return apiSuccess(subscription, 201);
  } catch (err: unknown) {
    return apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Failed to create subscription', 500);
  }
}
