import type {
  Subscription,
  Invoice,
  InvoiceItem,
  TaxRule,
  Discount,
  BillingInterval,
  BillingRunError,
} from '@/types/database';
import {
  calculateNextBillingDate,
  calculateBillingPeriodEnd,
  isDueForBilling,
  generateUniqueNumber,
} from '@/lib/billing/date-utils';
import { calculateLineItemTax } from '@/lib/billing/tax-service';
import { evaluateDiscount } from '@/lib/billing/discount-service';
import { canBeBilled } from '@/features/subscriptions/subscription-service';
import { parseISO, isAfter, startOfDay } from 'date-fns';

export interface BillingContext {
  asOfDate: string; // YYYY-MM-DD
  taxRules: Map<string, TaxRule>;
  discounts: Discount[];
  existingInvoices?: Invoice[];
}

export interface InvoiceGenerationResult {
  success: boolean;
  invoice?: Invoice;
  error?: string;
  isDuplicate?: boolean;
  subscriptionId: string;
  newNextBillingDate?: string;
}

/**
 * Generate an invoice for a subscription with line snapshots, discounts, and taxes.
 * Enforces duplicate protection by checking existing invoices for the same subscription and period.
 */
export function generateInvoiceForSubscription(
  subscription: Subscription & { plan?: { interval: BillingInterval; name: string } },
  customer: { id: string; name: string; email: string },
  context: BillingContext
): InvoiceGenerationResult {
  if (!canBeBilled(subscription.status)) {
    return {
      success: false,
      error: `Subscription ${subscription.number} has status '${subscription.status}' and cannot be billed`,
      subscriptionId: subscription.id,
    };
  }

  // Check if subscription has ended
  if (subscription.endDate) {
    const end = startOfDay(parseISO(subscription.endDate));
    const nextBill = startOfDay(parseISO(subscription.nextBillingDate));
    if (isAfter(nextBill, end)) {
      return {
        success: false,
        error: `Subscription ${subscription.number} has reached its contractual end date (${subscription.endDate})`,
        subscriptionId: subscription.id,
      };
    }
  }

  if (!isDueForBilling(subscription.nextBillingDate, context.asOfDate)) {
    return {
      success: false,
      error: `Subscription ${subscription.number} is not due for billing (next billing date: ${subscription.nextBillingDate})`,
      subscriptionId: subscription.id,
    };
  }

  const interval = subscription.plan?.interval ?? 'monthly';
  const originalStartDay = new Date(subscription.startDate).getDate();
  const billingPeriodStart = subscription.nextBillingDate;
  const billingPeriodEnd = calculateBillingPeriodEnd(billingPeriodStart, interval, originalStartDay);

  // Check idempotency - unique (subscriptionId, billingPeriodStart, billingPeriodEnd)
  if (context.existingInvoices) {
    const duplicate = context.existingInvoices.find(
      (inv) =>
        inv.subscriptionId === subscription.id &&
        inv.billingPeriodStart === billingPeriodStart &&
        inv.billingPeriodEnd === billingPeriodEnd &&
        inv.status !== 'cancelled'
    );
    if (duplicate) {
      return {
        success: true,
        invoice: duplicate,
        isDuplicate: true,
        subscriptionId: subscription.id,
      };
    }
  }

  const invoiceItems: InvoiceItem[] = [];
  let invoiceSubtotal = 0;
  let invoiceTaxTotal = 0;
  let invoiceDiscountTotal = 0;

  for (const item of subscription.items) {
    const lineSubtotal = item.unitPriceMinor * item.quantity;

    // Evaluate discounts
    let lineDiscount = 0;
    for (const discount of context.discounts) {
      const discountResult = evaluateDiscount(
        discount,
        lineSubtotal,
        item.quantity,
        item.productId,
        context.asOfDate
      );
      if (discountResult.isEligible) {
        lineDiscount += discountResult.discountAmountMinor;
        // Track usage
        discount.usageCount += 1;
        break; // First eligible discount applies
      }
    }
    lineDiscount = Math.min(lineDiscount, lineSubtotal);
    const discountedSubtotal = lineSubtotal - lineDiscount;

    // Evaluate tax
    const taxRule = item.taxRuleId ? context.taxRules.get(item.taxRuleId) ?? null : null;
    const unitPriceAfterDiscount = item.quantity > 0 ? Math.round(discountedSubtotal / item.quantity) : 0;
    const taxResult = calculateLineItemTax(unitPriceAfterDiscount, item.quantity, taxRule);

    const invoiceItem: InvoiceItem = {
      id: crypto.randomUUID(),
      invoiceId: '',
      productDescription: `${item.productName}${item.variantName ? ` (${item.variantName})` : ''}`,
      quantity: item.quantity,
      unitPriceMinor: item.unitPriceMinor,
      taxRate: taxResult.taxRate,
      taxAmountMinor: taxResult.taxAmountMinor,
      discountAmountMinor: lineDiscount,
      lineTotalMinor: taxResult.totalWithTaxMinor,
    };

    invoiceItems.push(invoiceItem);
    invoiceSubtotal += lineSubtotal;
    invoiceTaxTotal += taxResult.taxAmountMinor;
    invoiceDiscountTotal += lineDiscount;
  }

  const invoiceTotal = Math.max(0, invoiceSubtotal - invoiceDiscountTotal + invoiceTaxTotal);
  const dueDate = billingPeriodEnd;

  const invoice: Invoice = {
    id: crypto.randomUUID(),
    number: generateUniqueNumber('INV'),
    customerId: customer.id,
    customerName: customer.name,
    customerEmail: customer.email,
    subscriptionId: subscription.id,
    status: 'draft',
    billingPeriodStart,
    billingPeriodEnd,
    dueDate,
    subtotalMinor: invoiceSubtotal,
    discountTotalMinor: invoiceDiscountTotal,
    taxTotalMinor: invoiceTaxTotal,
    totalMinor: invoiceTotal,
    paidMinor: 0,
    balanceMinor: invoiceTotal,
    items: invoiceItems,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  for (const item of invoice.items) {
    item.invoiceId = invoice.id;
  }

  const newNextBillingDate = calculateNextBillingDate(billingPeriodStart, interval, originalStartDay);

  return {
    success: true,
    invoice,
    subscriptionId: subscription.id,
    newNextBillingDate,
  };
}

export interface BillingBatchResult {
  results: InvoiceGenerationResult[];
  summary: {
    totalProcessed: number;
    successCount: number;
    failureCount: number;
    skippedCount: number;
    duplicateCount: number;
    totalBilledMinor: number;
  };
  errors: BillingRunError[];
}

/**
 * Process billing for a list of subscriptions.
 */
export function processBillingBatch(
  subscriptions: Array<Subscription & { plan?: { interval: BillingInterval; name: string } }>,
  customers: Map<string, { id: string; name: string; email: string }>,
  context: BillingContext
): BillingBatchResult {
  const results: InvoiceGenerationResult[] = [];
  const errors: BillingRunError[] = [];
  let successCount = 0;
  let failureCount = 0;
  let skippedCount = 0;
  let duplicateCount = 0;
  let totalBilledMinor = 0;

  for (const subscription of subscriptions) {
    const customer = customers.get(subscription.customerId) ?? {
      id: subscription.customerId,
      name: `Customer ${subscription.customerId.slice(0, 8)}`,
      email: `customer-${subscription.customerId.slice(0, 8)}@example.com`,
    };

    const result = generateInvoiceForSubscription(subscription, customer, context);
    results.push(result);

    if (result.success) {
      if (result.isDuplicate) {
        duplicateCount++;
      } else {
        successCount++;
        if (result.invoice) {
          totalBilledMinor += result.invoice.totalMinor;
        }
      }
    } else if (
      result.error?.includes('not due') ||
      result.error?.includes('cannot be billed') ||
      result.error?.includes('reached its contractual end date')
    ) {
      skippedCount++;
    } else {
      failureCount++;
      errors.push({
        subscriptionId: subscription.id,
        subscriptionNumber: subscription.number,
        error: result.error || 'Unknown billing error',
      });
    }
  }

  return {
    results,
    summary: {
      totalProcessed: subscriptions.length,
      successCount,
      failureCount,
      skippedCount,
      duplicateCount,
      totalBilledMinor,
    },
    errors,
  };
}
