import { z } from 'zod';

export const idSchema = z.string().trim().min(1, 'ID must not be empty').max(100);

export const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid calendar date' });

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255),
  email: z.string().trim().email('Invalid email address').max(255),
  phone: z.string().trim().max(30).optional(),
  company: z.string().trim().max(255).optional(),
  authUserId: idSchema.optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const createProductSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(255),
  type: z.string().trim().min(1, 'Type is required').max(100),
  salePriceMinor: z.number().int('Sale price must be an integer').min(0, 'Sale price must be non-negative'),
  costPriceMinor: z.number().int('Cost price must be an integer').min(0, 'Cost price must be non-negative'),
  notes: z.string().trim().max(2000).optional(),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial();

export const createProductVariantSchema = z.object({
  productId: idSchema,
  name: z.string().trim().min(1, 'Variant name is required').max(255),
  priceAdjustmentMinor: z.number().int('Price adjustment must be an integer (paise)'),
});

export const basePlanSchema = z.object({
  name: z.string().trim().min(1, 'Plan name is required').max(255),
  interval: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  minimumQuantity: z.number().int().min(1, 'Minimum quantity must be at least 1').default(1),
  availableFrom: isoDateSchema.optional(),
  availableUntil: isoDateSchema.optional(),
  allowPause: z.boolean().default(false),
  allowEarlyClose: z.boolean().default(false),
  allowRenewal: z.boolean().default(true),
});

export const updatePlanSchema = basePlanSchema.partial();

export const createPlanSchema = basePlanSchema.refine(
  (data) => {
    if (data.availableFrom && data.availableUntil) {
      return data.availableUntil >= data.availableFrom;
    }
    return true;
  },
  {
    message: 'availableUntil must be on or after availableFrom',
    path: ['availableUntil'],
  }
);

export const createQuotationSchema = z.object({
  customerId: idSchema,
  validUntil: isoDateSchema,
  items: z
    .array(
      z.object({
        productId: idSchema,
        variantId: idSchema.optional(),
        planId: idSchema.optional(),
        quantity: z.number().int('Quantity must be an integer').min(1, 'Quantity must be at least 1'),
        unitPriceMinor: z.number().int('Unit price must be an integer').min(0, 'Unit price cannot be negative'),
        taxRuleId: idSchema.optional(),
        discountId: idSchema.optional(),
      })
    )
    .min(1, 'At least one item is required'),
  notes: z.string().trim().max(2000).optional(),
});

export const createSubscriptionSchema = z
  .object({
    customerId: idSchema,
    planId: idSchema,
    startDate: isoDateSchema,
    endDate: isoDateSchema.optional(),
    paymentTerms: z.string().trim().min(1, 'Payment terms are required').max(500),
    items: z
      .array(
        z.object({
          productId: idSchema,
          variantId: idSchema.optional(),
          quantity: z.number().int('Quantity must be an integer').min(1, 'Quantity must be at least 1'),
          unitPriceMinor: z.number().int('Unit price must be an integer').min(0, 'Unit price cannot be negative'),
          taxRuleId: idSchema.optional(),
        })
      )
      .min(1, 'At least one item is required'),
  })
  .refine(
    (data) => {
      if (data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    {
      message: 'endDate must be on or after startDate',
      path: ['endDate'],
    }
  );

export const subscriptionTransitionSchema = z.object({
  action: z.enum(['submit_quotation', 'confirm', 'activate', 'pause', 'resume', 'close', 'expire']),
});

export const createPaymentSchema = z.object({
  invoiceId: idSchema,
  amountMinor: z.number().int('Payment amount must be an integer in paise').min(1, 'Payment amount must be at least 1 paise'),
  method: z.enum(['cash', 'bank_transfer', 'upi', 'card', 'cheque', 'other']),
  paymentDate: isoDateSchema,
  note: z.string().trim().max(500).optional(),
});

export const createTaxRuleSchema = z.object({
  name: z.string().trim().min(1, 'Tax rule name is required').max(255),
  rate: z.number().min(0, 'Tax rate cannot be negative').max(100, 'Tax rate cannot exceed 100%'),
  behavior: z.enum(['exclusive', 'inclusive']),
  isActive: z.boolean().default(true),
});

export const createDiscountSchema = z
  .object({
    name: z.string().trim().min(1, 'Discount name is required').max(255),
    type: z.enum(['fixed', 'percentage']),
    value: z.number().min(0, 'Discount value cannot be negative'),
    minimumPurchaseMinor: z.number().int().min(0).optional(),
    minimumQuantity: z.number().int().min(0).optional(),
    validFrom: isoDateSchema,
    validUntil: isoDateSchema,
    usageLimit: z.number().int().min(1).optional(),
    productScope: z.array(idSchema).optional(),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.type === 'percentage' && data.value > 100) {
        return false;
      }
      return true;
    },
    {
      message: 'Percentage discount cannot exceed 100%',
      path: ['value'],
    }
  )
  .refine(
    (data) => data.validUntil >= data.validFrom,
    {
      message: 'validUntil must be on or after validFrom',
      path: ['validUntil'],
    }
  );

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().trim().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const processBillingSchema = z.object({
  asOfDate: isoDateSchema.optional(),
});
