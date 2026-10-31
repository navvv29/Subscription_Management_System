import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { store } from '@/lib/store';
import { generateUniqueNumber, isDateExpired } from '@/lib/billing/date-utils';
import { recordAuditLog } from '@/lib/audit/audit-service';
import type { Subscription, SubscriptionItem } from '@/types/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const quotation = store.quotations.get(id);

    if (!quotation) {
      return apiError('NOT_FOUND', 'Quotation not found', 404);
    }

    // Check validity date
    if (isDateExpired(quotation.validUntil)) {
      quotation.status = 'expired';
      quotation.updatedAt = new Date().toISOString();
      store.persist();
      return apiError('EXPIRED_QUOTATION', 'Cannot convert an expired quotation.', 400);
    }

    if (quotation.status !== 'accepted' && quotation.status !== 'draft') {
      return apiError(
        'INVALID_STATUS',
        `Quotation status '${quotation.status}' cannot be converted. Status must be accepted or draft.`,
        400
      );
    }

    if (!quotation.items || quotation.items.length === 0) {
      return apiError('INVALID_QUOTATION', 'Quotation has no line items to convert.', 400);
    }

    const customer = store.customers.get(quotation.customerId);
    if (!customer) {
      return apiError('NOT_FOUND', `Customer '${quotation.customerId}' associated with this quotation does not exist`, 404);
    }

    const body = await request.json().catch(() => ({}));
    const planId =
      body.planId ||
      quotation.items.find((item) => item.planId)?.planId ||
      Array.from(store.plans.keys())[0] ||
      'plan-monthly-core';
    const plan = store.plans.get(planId);
    if (!plan) {
      return apiError('NOT_FOUND', `Plan '${planId}' does not exist`, 404);
    }

    const totalQuantity = quotation.items.reduce((sum, it) => sum + it.quantity, 0);
    if (totalQuantity < plan.minimumQuantity) {
      return apiError(
        'MINIMUM_QUANTITY_NOT_MET',
        `Quotation items total quantity (${totalQuantity}) does not satisfy plan minimum quantity (${plan.minimumQuantity}).`,
        400
      );
    }

    const startDate = body.startDate || new Date().toISOString().split('T')[0];
    const paymentTerms = body.paymentTerms || 'Net 30';

    const subscriptionId = crypto.randomUUID();

    // Preserve agreed quotation line prices deterministically
    const items: SubscriptionItem[] = quotation.items.map((qItem) => ({
      id: crypto.randomUUID(),
      subscriptionId,
      productId: qItem.productId,
      productName: qItem.productName,
      variantId: qItem.variantId,
      variantName: qItem.variantName,
      quantity: qItem.quantity,
      unitPriceMinor: qItem.unitPriceMinor, // Preserved agreed price
      taxRuleId: qItem.taxRuleId,
      taxRate: qItem.taxRate,
      taxAmountMinor: qItem.taxAmountMinor,
      discountAmountMinor: qItem.discountAmountMinor,
      totalMinor: qItem.totalMinor,
    }));

    const subscription: Subscription = {
      id: subscriptionId,
      number: generateUniqueNumber('SUB'),
      customerId: quotation.customerId,
      planId,
      status: 'confirmed',
      startDate,
      nextBillingDate: startDate,
      paymentTerms,
      items,
      subtotalMinor: quotation.subtotalMinor,
      discountTotalMinor: quotation.discountTotalMinor,
      taxTotalMinor: quotation.taxTotalMinor,
      totalMinor: quotation.totalMinor,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    quotation.status = 'accepted';
    quotation.updatedAt = new Date().toISOString();

    store.subscriptions.set(subscription.id, subscription);
    store.quotations.set(quotation.id, quotation);

    // Record audit log
    recordAuditLog({
      actorId: (body.actorId as string) || 'sales_rep',
      action: 'quotation.converted_to_subscription',
      entityType: 'subscription',
      entityId: subscription.id,
      metadata: {
        quotationId: quotation.id,
        quotationNumber: quotation.number,
        subscriptionNumber: subscription.number,
        totalMinor: subscription.totalMinor,
      },
    });

    // Atomic disk persistence
    store.persist();

    return apiSuccess(subscription, 201);
  } catch (err: unknown) {
    return apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Conversion failed', 500);
  }
}
