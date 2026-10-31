import type {
  Customer,
  Product,
  ProductVariant,
  Plan,
  Quotation,
  Subscription,
  Invoice,
  Payment,
  TaxRule,
  Discount,
} from '@/types/database';

class InMemoryStore {
  customers = new Map<string, Customer>();
  products = new Map<string, Product>();
  variants = new Map<string, ProductVariant>();
  plans = new Map<string, Plan>();
  quotations = new Map<string, Quotation>();
  subscriptions = new Map<string, Subscription>();
  invoices = new Map<string, Invoice>();
  payments = new Map<string, Payment>();
  taxRules = new Map<string, TaxRule>();
  discounts = new Map<string, Discount>();

  constructor() {
    this.seed();
  }

  seed() {
    // 1. Tax Rule: 18% Exclusive
    const gst18: TaxRule = {
      id: 'tax-gst-18',
      name: 'GST 18%',
      rate: 18,
      behavior: 'exclusive',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.taxRules.set(gst18.id, gst18);

    // 2. Customers
    const customer1: Customer = {
      id: 'cust-101',
      name: 'Brightloop Technologies',
      email: 'contact@brightloop.io',
      phone: '+91-9876543210',
      company: 'Brightloop Technologies Pvt Ltd',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const customer2: Customer = {
      id: 'cust-102',
      name: 'Apex Innovations',
      email: 'billing@apexinno.com',
      phone: '+91-9876543211',
      company: 'Apex Innovations LLP',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.customers.set(customer1.id, customer1);
    this.customers.set(customer2.id, customer2);

    // 3. Products
    const prod1: Product = {
      id: 'prod-saas-basic',
      name: 'Cloud Infrastructure Basic',
      type: 'service',
      salePriceMinor: 1000000, // 10,000 INR = 1,000,000 paise
      costPriceMinor: 400000,  // 4,000 INR
      notes: 'Standard virtual compute instance with 16GB RAM',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const prod2: Product = {
      id: 'prod-saas-pro',
      name: 'Cloud Infrastructure Pro',
      type: 'service',
      salePriceMinor: 2500000, // 25,000 INR
      costPriceMinor: 1000000,
      notes: 'Dedicated compute instance with 64GB RAM and NVMe',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.products.set(prod1.id, prod1);
    this.products.set(prod2.id, prod2);

    // 4. Variants
    const var1: ProductVariant = {
      id: 'var-sla-24x7',
      productId: prod1.id,
      name: '24x7 Dedicated Support SLA',
      priceAdjustmentMinor: 56000, // 560 INR
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.variants.set(var1.id, var1);

    // 5. Plans
    const planMonthly: Plan = {
      id: 'plan-monthly-core',
      name: 'Monthly Standard',
      interval: 'monthly',
      minimumQuantity: 1,
      allowPause: true,
      allowEarlyClose: true,
      allowRenewal: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const planYearly: Plan = {
      id: 'plan-yearly-enterprise',
      name: 'Yearly Enterprise',
      interval: 'yearly',
      minimumQuantity: 1,
      allowPause: false,
      allowEarlyClose: false,
      allowRenewal: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.plans.set(planMonthly.id, planMonthly);
    this.plans.set(planYearly.id, planYearly);

    // 6. Discount: 10% Early Bird
    const discount10: Discount = {
      id: 'disc-early-10',
      name: 'Early Bird 10%',
      type: 'percentage',
      value: 10,
      validFrom: '2026-01-01',
      validUntil: '2026-12-31',
      usageLimit: 100,
      usageCount: 2,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.discounts.set(discount10.id, discount10);

    // 7. Seed one active subscription due for billing today
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const sub1: Subscription = {
      id: 'sub-demo-001',
      number: 'SUB-2610-DEMO1',
      customerId: customer1.id,
      planId: planMonthly.id,
      status: 'active',
      startDate: todayStr,
      nextBillingDate: todayStr,
      paymentTerms: 'Net 15',
      items: [
        {
          id: 'sub-item-1',
          subscriptionId: 'sub-demo-001',
          productId: prod1.id,
          productName: prod1.name,
          variantId: var1.id,
          variantName: var1.name,
          quantity: 2,
          unitPriceMinor: prod1.salePriceMinor + var1.priceAdjustmentMinor, // 10,560 INR per unit
          taxRuleId: gst18.id,
          taxRate: 18,
          taxAmountMinor: 380160,
          discountAmountMinor: 211200,
          totalMinor: 2280960,
        },
      ],
      subtotalMinor: 2112000,
      taxTotalMinor: 380160,
      discountTotalMinor: 211200,
      totalMinor: 2280960,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.subscriptions.set(sub1.id, sub1);
  }
}

// Global singleton to persist state in Next.js dev server
const globalForStore = globalThis as unknown as { store: InMemoryStore };
export const store = globalForStore.store || new InMemoryStore();
if (process.env.NODE_ENV !== 'production') globalForStore.store = store;
