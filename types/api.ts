import type {
  Customer, Product, ProductVariant, Plan, Quotation, Subscription,
  Invoice, Payment, TaxRule, Discount, DashboardSummary, BillingRun, Profile
} from './database';

// Standard API response wrapper
export interface ApiSuccess<T> {
  data: T;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// Pagination
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

// Create/Update DTOs (omit auto-generated fields)
export type CreateCustomerDto = Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateCustomerDto = Partial<CreateCustomerDto>;

export type CreateProductDto = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateProductDto = Partial<CreateProductDto>;

export type CreateProductVariantDto = Omit<ProductVariant, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateProductVariantDto = Partial<Omit<CreateProductVariantDto, 'productId'>>;

export type CreatePlanDto = Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdatePlanDto = Partial<CreatePlanDto>;

export type CreateQuotationDto = {
  customerId: string;
  validUntil: string;
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    unitPriceMinor: number;
    taxRuleId?: string;
    discountId?: string;
  }>;
  notes?: string;
};

export type CreateSubscriptionDto = {
  customerId: string;
  planId: string;
  startDate: string;
  endDate?: string;
  paymentTerms: string;
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    unitPriceMinor: number;
    taxRuleId?: string;
  }>;
};

export type SubscriptionTransitionDto = {
  action: 'confirm' | 'activate' | 'pause' | 'resume' | 'close' | 'expire' | 'renew';
};

export type CreatePaymentDto = {
  invoiceId: string;
  amountMinor: number;
  method: string;
  paymentDate: string;
  note?: string;
};

export type CreateTaxRuleDto = Omit<TaxRule, 'id' | 'createdAt' | 'updatedAt'>;
export type CreateDiscountDto = Omit<Discount, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>;

// Dashboard
export interface RevenueReport {
  period: string;
  collectedMinor: number;
  outstandingMinor: number;
  invoiceCount: number;
}
