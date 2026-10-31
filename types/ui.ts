// ============================================================================
// Subscript One — Canonical Entity Types
// All money fields use integer minor units (paise for INR).
// These match the shared integration contract exactly.
// ============================================================================

export type UserRole = 'admin' | 'staff' | 'customer';

export interface Profile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  authUserId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  type: string;
  salePriceMinor: number;
  costPriceMinor: number;
  notes?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  priceAdjustmentMinor: number;
}

export type PlanInterval = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Plan {
  id: string;
  name: string;
  interval: PlanInterval;
  minimumQuantity: number;
  availableFrom?: string;
  availableUntil?: string;
  allowPause: boolean;
  allowEarlyClose: boolean;
  allowRenewal: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';

export interface QuotationItem {
  id: string;
  productId: string;
  productName: string;
  planId?: string;
  planName?: string;
  quantity: number;
  unitPriceMinor: number;
  totalMinor: number;
}

export interface Quotation {
  id: string;
  number: string;
  customerId: string;
  customerName?: string;
  status: QuotationStatus;
  validUntil: string;
  items: QuotationItem[];
  totalMinor: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type SubscriptionStatus =
  | 'draft'
  | 'confirmed'
  | 'active'
  | 'paused'
  | 'cancelled'
  | 'expired'
  | 'pending_renewal';

export interface SubscriptionItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPriceMinor: number;
  totalMinor: number;
}

export interface Subscription {
  id: string;
  number: string;
  customerId: string;
  customerName?: string;
  planId: string;
  planName?: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate?: string;
  nextBillingDate: string;
  paymentTerms: string;
  items: SubscriptionItem[];
  createdAt?: string;
  updatedAt?: string;
}

export type InvoiceStatus = 'draft' | 'confirmed' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceMinor: number;
  totalMinor: number;
}

export interface Invoice {
  id: string;
  number: string;
  customerId: string;
  customerName?: string;
  subscriptionId?: string;
  subscriptionNumber?: string;
  status: InvoiceStatus;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  issueDate: string;
  dueDate: string;
  lineItems: InvoiceLineItem[];
  subtotalMinor: number;
  taxMinor: number;
  discountMinor: number;
  totalMinor: number;
  paidMinor: number;
  balanceMinor: number;
  notes?: string;
  emailSentAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type PaymentMethod = 'cash' | 'bank_transfer' | 'upi' | 'card' | 'cheque' | 'other';

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber?: string;
  customerName?: string;
  amountMinor: number;
  method: PaymentMethod;
  paymentDate: string;
  note?: string;
  isRefund?: boolean;
  refundReason?: string;
  originalPaymentId?: string;
  createdAt?: string;
}

export interface DashboardSummary {
  activeSubscriptions: number;
  collectedMinor: number;
  outstandingMinor: number;
  overdueMinor: number;
  dueForBillingCount: number;
}

export interface BillingBatchResult {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  results: {
    subscriptionId: string;
    subscriptionNumber: string;
    invoiceId?: string;
    invoiceNumber?: string;
    success: boolean;
    error?: string;
  }[];
}
