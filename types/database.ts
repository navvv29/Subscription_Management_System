// All money fields use integer minor units (paise for INR)
// Never use floating-point for financial amounts

export type UserRole = 'admin' | 'staff' | 'customer';
export type BillingInterval = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type SubscriptionStatus = 'draft' | 'quotation' | 'confirmed' | 'active' | 'paused' | 'expired' | 'closed';
export type InvoiceStatus = 'draft' | 'confirmed' | 'paid' | 'cancelled' | 'partially_paid';
export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'upi' | 'card' | 'cheque' | 'other';
export type DiscountType = 'fixed' | 'percentage';
export type TaxBehavior = 'exclusive' | 'inclusive';

export interface Profile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  authUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  type: string;
  salePriceMinor: number;  // in paise
  costPriceMinor: number;  // in paise
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  priceAdjustmentMinor: number;  // in paise, can be positive or negative
  createdAt: string;
  updatedAt: string;
}

export interface Plan {
  id: string;
  name: string;
  interval: BillingInterval;
  minimumQuantity: number;
  availableFrom?: string;
  availableUntil?: string;
  allowPause: boolean;
  allowEarlyClose: boolean;
  allowRenewal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationItem {
  id: string;
  quotationId: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  unitPriceMinor: number;
  taxRuleId?: string;
  taxRate?: number;
  taxAmountMinor: number;
  discountAmountMinor: number;
  totalMinor: number;
}

export interface Quotation {
  id: string;
  number: string;
  customerId: string;
  status: QuotationStatus;
  validUntil: string;
  items: QuotationItem[];
  subtotalMinor: number;
  discountTotalMinor: number;
  taxTotalMinor: number;
  totalMinor: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionItem {
  id: string;
  subscriptionId: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  unitPriceMinor: number;
  taxRuleId?: string;
  taxRate?: number;
  taxAmountMinor: number;
  discountAmountMinor: number;
  totalMinor: number;
}

export interface Subscription {
  id: string;
  number: string;
  customerId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate?: string;
  nextBillingDate: string;
  paymentTerms: string;
  items: SubscriptionItem[];
  subtotalMinor: number;
  taxTotalMinor: number;
  discountTotalMinor: number;
  totalMinor: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  productDescription: string;
  quantity: number;
  unitPriceMinor: number;
  taxRate: number;
  taxAmountMinor: number;
  discountAmountMinor: number;
  lineTotalMinor: number;
}

export interface Invoice {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  subscriptionId?: string;
  status: InvoiceStatus;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  dueDate: string;
  subtotalMinor: number;
  discountTotalMinor: number;
  taxTotalMinor: number;
  totalMinor: number;
  paidMinor: number;
  balanceMinor: number;
  items: InvoiceItem[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amountMinor: number;
  method: PaymentMethod;
  paymentDate: string;
  note?: string;
  recordedBy: string;
  transactionRef?: string;
  isRefund?: boolean;
  refundReason?: string;
  originalPaymentId?: string;
  createdAt: string;
}

export interface TaxRule {
  id: string;
  name: string;
  rate: number; // percentage e.g. 18 for 18%
  behavior: TaxBehavior;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Discount {
  id: string;
  name: string;
  type: DiscountType;
  value: number; // minor units for fixed, percentage for percentage
  minimumPurchaseMinor?: number;
  minimumQuantity?: number;
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  usageCount: number;
  productScope?: string[]; // product IDs, empty = all products
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  activeSubscriptions: number;
  collectedMinor: number;
  outstandingMinor: number;
  overdueMinor: number;
  dueForBillingCount: number;
}

export interface BillingRun {
  id: string;
  asOfDate?: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  duplicateCount: number;
  totalBilledMinor: number;
  status: 'running' | 'completed' | 'failed';
  triggeredBy?: string;
  errors: BillingRunError[];
}

export interface BillingRunError {
  subscriptionId: string;
  subscriptionNumber: string;
  error: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
