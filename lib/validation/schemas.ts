import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email address'),
  phone: z.string().max(30).optional(),
  company: z.string().max(255).optional(),
  authUserId: z.string().uuid().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255),
  type: z.string().min(1, 'Type is required').max(100),
  salePriceMinor: z.number().int().min(0, 'Sale price must be non-negative'),
  costPriceMinor: z.number().int().min(0, 'Cost price must be non-negative'),
  notes: z.string().max(2000).optional(),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial();

export const createProductVariantSchema = z.object({
  productId: z.string().uuid(),
  name: z.string().min(1, 'Variant name is required').max(255),
  priceAdjustmentMinor: z.number().int(),
});

export const createPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required').max(255),
  interval: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  minimumQuantity: z.number().int().min(1).default(1),
  availableFrom: z.string().optional(),
  availableUntil: z.string().optional(),
  allowPause: z.boolean().default(false),
  allowEarlyClose: z.boolean().default(false),
  allowRenewal: z.boolean().default(true),
});

export const updatePlanSchema = createPlanSchema.partial();

export const createQuotationSchema = z.object({
  customerId: z.string().uuid(),
  validUntil: z.string().min(1, 'Validity date is required'),
  items: z.array(z.object({
    productId: z.string().uuid(),
    variantId: z.string().uuid().optional(),
    quantity: z.number().int().min(1),
    unitPriceMinor: z.number().int().min(0),
    taxRuleId: z.string().uuid().optional(),
    discountId: z.string().uuid().optional(),
  })).min(1, 'At least one item is required'),
  notes: z.string().max(2000).optional(),
});

export const createSubscriptionSchema = z.object({
  customerId: z.string().uuid(),
  planId: z.string().uuid(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  paymentTerms: z.string().min(1, 'Payment terms are required').max(500),
  items: z.array(z.object({
    productId: z.string().uuid(),
    variantId: z.string().uuid().optional(),
    quantity: z.number().int().min(1),
    unitPriceMinor: z.number().int().min(0),
    taxRuleId: z.string().uuid().optional(),
  })).min(1, 'At least one item is required'),
});

export const subscriptionTransitionSchema = z.object({
  action: z.enum(['submit_quotation', 'confirm', 'activate', 'pause', 'resume', 'close', 'expire']),
});

export const createPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amountMinor: z.number().int().min(1, 'Payment amount must be at least 1 paise'),
  method: z.enum(['cash', 'bank_transfer', 'upi', 'card', 'cheque', 'other']),
  paymentDate: z.string().min(1, 'Payment date is required'),
  note: z.string().max(500).optional(),
});

export const createTaxRuleSchema = z.object({
  name: z.string().min(1, 'Tax rule name is required').max(255),
  rate: z.number().min(0).max(100),
  behavior: z.enum(['exclusive', 'inclusive']),
  isActive: z.boolean().default(true),
});

export const createDiscountSchema = z.object({
  name: z.string().min(1, 'Discount name is required').max(255),
  type: z.enum(['fixed', 'percentage']),
  value: z.number().min(0),
  minimumPurchaseMinor: z.number().int().min(0).optional(),
  minimumQuantity: z.number().int().min(0).optional(),
  validFrom: z.string().min(1),
  validUntil: z.string().min(1),
  usageLimit: z.number().int().min(1).optional(),
  productScope: z.array(z.string().uuid()).optional(),
  isActive: z.boolean().default(true),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const processBillingSchema = z.object({
  asOfDate: z.string().optional(),
});
