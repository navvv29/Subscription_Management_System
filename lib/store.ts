import fs from 'node:fs';
import path from 'node:path';
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
  BillingRun,
  AuditLog,
} from '@/types/database';

export interface SerializedStoreData {
  customers: Customer[];
  products: Product[];
  variants: ProductVariant[];
  plans: Plan[];
  quotations: Quotation[];
  subscriptions: Subscription[];
  invoices: Invoice[];
  payments: Payment[];
  taxRules: TaxRule[];
  discounts: Discount[];
  billingRuns: BillingRun[];
  auditLogs: AuditLog[];
}

export class PersistentStore {
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
  billingRuns = new Map<string, BillingRun>();
  auditLogs = new Map<string, AuditLog>();

  private storageFilePath: string;
  private isPersistingEnabled: boolean = true;

  constructor(customStoragePath?: string) {
    const defaultDir = path.join(process.cwd(), '.data');
    this.storageFilePath = customStoragePath || path.join(defaultDir, 'store.json');

    // In unit tests, disk persistence can be disabled if desired, or point to a custom file
    if (process.env.DISABLE_STORE_PERSISTENCE === 'true') {
      this.isPersistingEnabled = false;
    }

    // Try loading existing state from disk, otherwise seed
    const loaded = this.loadFromDisk();
    if (!loaded) {
      this.seed();
      this.persist();
    }
  }

  setPersistence(enabled: boolean) {
    this.isPersistingEnabled = enabled;
  }

  setStoragePath(newPath: string) {
    this.storageFilePath = newPath;
  }

  /**
   * Reset the store to default seed data and persist to disk.
   */
  reset() {
    this.customers.clear();
    this.products.clear();
    this.variants.clear();
    this.plans.clear();
    this.quotations.clear();
    this.subscriptions.clear();
    this.invoices.clear();
    this.payments.clear();
    this.taxRules.clear();
    this.discounts.clear();
    this.billingRuns.clear();
    this.auditLogs.clear();

    this.seed();
    this.persist();
  }

  seed() {
    // 1. Tax Rule: 18% Exclusive
    const gst18: TaxRule = {
      id: 'tax-gst-18',
      name: 'GST 18%',
      rate: 18,
      behavior: 'exclusive',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    this.taxRules.set(gst18.id, gst18);

    // 2. Customers
    const customer1: Customer = {
      id: 'cust-101',
      name: 'Brightloop Technologies',
      email: 'contact@brightloop.io',
      phone: '+91-9876543210',
      company: 'Brightloop Technologies Pvt Ltd',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const customer2: Customer = {
      id: 'cust-102',
      name: 'Apex Innovations',
      email: 'billing@apexinno.com',
      phone: '+91-9876543211',
      company: 'Apex Innovations LLP',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
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
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const prod2: Product = {
      id: 'prod-saas-pro',
      name: 'Cloud Infrastructure Pro',
      type: 'service',
      salePriceMinor: 2500000, // 25,000 INR
      costPriceMinor: 1000000,
      notes: 'Dedicated compute instance with 64GB RAM and NVMe',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    this.products.set(prod1.id, prod1);
    this.products.set(prod2.id, prod2);

    // 4. Variants
    const var1: ProductVariant = {
      id: 'var-sla-24x7',
      productId: prod1.id,
      name: '24x7 Dedicated Support SLA',
      priceAdjustmentMinor: 56000, // 560 INR
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
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
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const planYearly: Plan = {
      id: 'plan-yearly-enterprise',
      name: 'Yearly Enterprise',
      interval: 'yearly',
      minimumQuantity: 1,
      allowPause: false,
      allowEarlyClose: false,
      allowRenewal: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
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
      usageCount: 0,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    this.discounts.set(discount10.id, discount10);

    // 7. Seed one active subscription
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
          unitPriceMinor: prod1.salePriceMinor + var1.priceAdjustmentMinor, // 10,560 INR per unit = 1,056,000 paise
          taxRuleId: gst18.id,
          taxRate: 18,
          taxAmountMinor: 342144,
          discountAmountMinor: 211200,
          totalMinor: 2242944,
        },
      ],
      subtotalMinor: 2112000,
      taxTotalMinor: 342144,
      discountTotalMinor: 211200,
      totalMinor: 2242944,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    this.subscriptions.set(sub1.id, sub1);

    // 8. Seed one valid Quotation ready to convert for demo
    const quo1: Quotation = {
      id: 'quo-demo-001',
      number: 'QUO-2610-DEMO1',
      customerId: customer2.id,
      status: 'accepted',
      validUntil: '2026-12-31',
      items: [
        {
          id: 'quo-item-1',
          quotationId: 'quo-demo-001',
          productId: prod2.id,
          productName: prod2.name,
          quantity: 1,
          unitPriceMinor: prod2.salePriceMinor, // 25,000 INR = 2,500,000 paise
          taxRuleId: gst18.id,
          taxRate: 18,
          taxAmountMinor: 450000,
          discountAmountMinor: 0,
          totalMinor: 2950000,
        },
      ],
      subtotalMinor: 2500000,
      discountTotalMinor: 0,
      taxTotalMinor: 450000,
      totalMinor: 2950000,
      notes: 'Dedicated compute cluster quotation for Apex Innovations LLP',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    this.quotations.set(quo1.id, quo1);
  }

  /**
   * Persist current store state to disk using atomic temporary file write and rename.
   */
  persist(): boolean {
    if (!this.isPersistingEnabled) return true;

    try {
      const data: SerializedStoreData = {
        customers: Array.from(this.customers.values()),
        products: Array.from(this.products.values()),
        variants: Array.from(this.variants.values()),
        plans: Array.from(this.plans.values()),
        quotations: Array.from(this.quotations.values()),
        subscriptions: Array.from(this.subscriptions.values()),
        invoices: Array.from(this.invoices.values()),
        payments: Array.from(this.payments.values()),
        taxRules: Array.from(this.taxRules.values()),
        discounts: Array.from(this.discounts.values()),
        billingRuns: Array.from(this.billingRuns.values()),
        auditLogs: Array.from(this.auditLogs.values()),
      };

      const dir = path.dirname(this.storageFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const tempFile = `${this.storageFilePath}.${Date.now()}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempFile, this.storageFilePath);
      return true;
    } catch (err) {
      console.error('[PersistentStore] Error writing to disk:', err);
      return false;
    }
  }

  /**
   * Load store state from disk if exists.
   */
  loadFromDisk(): boolean {
    if (!this.isPersistingEnabled) return false;

    try {
      if (!fs.existsSync(this.storageFilePath)) {
        return false;
      }

      const raw = fs.readFileSync(this.storageFilePath, 'utf-8');
      const data: Partial<SerializedStoreData> = JSON.parse(raw);

      this.customers.clear();
      data.customers?.forEach((c) => this.customers.set(c.id, c));

      this.products.clear();
      data.products?.forEach((p) => this.products.set(p.id, p));

      this.variants.clear();
      data.variants?.forEach((v) => this.variants.set(v.id, v));

      this.plans.clear();
      data.plans?.forEach((p) => this.plans.set(p.id, p));

      this.quotations.clear();
      data.quotations?.forEach((q) => this.quotations.set(q.id, q));

      // Ensure seed quotation exists if empty
      if (this.quotations.size === 0) {
        const prod2 = this.products.get('prod-saas-pro');
        const cust2 = this.customers.get('cust-102');
        const gst18 = this.taxRules.get('tax-gst-18');
        if (prod2 && cust2) {
          const quo1: Quotation = {
            id: 'quo-demo-001',
            number: 'QUO-2610-DEMO1',
            customerId: cust2.id,
            status: 'accepted',
            validUntil: '2026-12-31',
            items: [
              {
                id: 'quo-item-1',
                quotationId: 'quo-demo-001',
                productId: prod2.id,
                productName: prod2.name,
                quantity: 1,
                unitPriceMinor: prod2.salePriceMinor,
                taxRuleId: gst18?.id,
                taxRate: gst18?.rate ?? 18,
                taxAmountMinor: 450000,
                discountAmountMinor: 0,
                totalMinor: 2950000,
              },
            ],
            subtotalMinor: 2500000,
            discountTotalMinor: 0,
            taxTotalMinor: 450000,
            totalMinor: 2950000,
            notes: 'Dedicated compute cluster quotation for Apex Innovations LLP',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          };
          this.quotations.set(quo1.id, quo1);
        }
      }

      this.subscriptions.clear();
      data.subscriptions?.forEach((s) => this.subscriptions.set(s.id, s));

      this.invoices.clear();
      data.invoices?.forEach((i) => this.invoices.set(i.id, i));

      this.payments.clear();
      data.payments?.forEach((p) => this.payments.set(p.id, p));

      this.taxRules.clear();
      data.taxRules?.forEach((t) => this.taxRules.set(t.id, t));

      this.discounts.clear();
      data.discounts?.forEach((d) => this.discounts.set(d.id, d));

      this.billingRuns.clear();
      data.billingRuns?.forEach((b) => this.billingRuns.set(b.id, b));

      this.auditLogs.clear();
      data.auditLogs?.forEach((a) => this.auditLogs.set(a.id, a));

      return true;
    } catch (err) {
      console.error('[PersistentStore] Failed to load from disk, will fallback to seed:', err);
      return false;
    }
  }
}

// Global singleton to persist state across Next.js module reloads in dev mode
const globalForStore = globalThis as unknown as { store: PersistentStore };
export const store = globalForStore.store || new PersistentStore();
if (process.env.NODE_ENV !== 'production') globalForStore.store = store;
