-- =============================================================================
-- Subscript One — Core Billing & Subscription Lifecycle Schema Migration
-- Designed for PostgreSQL 15+ / Supabase
-- Currency Standard: All monetary amounts stored as INTEGER minor units (paise)
-- Duplicate Guard: UNIQUE (subscription_id, billing_period_start, billing_period_end)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'staff', 'customer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE billing_interval AS ENUM ('daily', 'weekly', 'monthly', 'yearly');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('draft', 'quotation', 'confirmed', 'active', 'paused', 'expired', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('draft', 'confirmed', 'paid', 'cancelled', 'partially_paid');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE quotation_status AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('cash', 'bank_transfer', 'upi', 'card', 'cheque', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE discount_type AS ENUM ('fixed', 'percentage');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE tax_behavior AS ENUM ('exclusive', 'inclusive');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE billing_run_status AS ENUM ('running', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'customer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 2. Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  auth_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- 3. Products Table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'service',
  sale_price_minor BIGINT NOT NULL CHECK (sale_price_minor >= 0),
  cost_price_minor BIGINT NOT NULL CHECK (cost_price_minor >= 0),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 4. Product Variants Table
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_adjustment_minor BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);

-- 5. Plans Table
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  interval billing_interval NOT NULL DEFAULT 'monthly',
  minimum_quantity INT NOT NULL DEFAULT 1 CHECK (minimum_quantity >= 1),
  available_from DATE,
  available_until DATE,
  allow_pause BOOLEAN NOT NULL DEFAULT true,
  allow_early_close BOOLEAN NOT NULL DEFAULT true,
  allow_renewal BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT chk_plan_date_range CHECK (available_until IS NULL OR available_from IS NULL OR available_until >= available_from)
);

-- 6. Tax Rules Table
CREATE TABLE IF NOT EXISTS tax_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rate NUMERIC(5, 2) NOT NULL CHECK (rate >= 0 AND rate <= 100),
  behavior tax_behavior NOT NULL DEFAULT 'exclusive',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 7. Discounts Table
CREATE TABLE IF NOT EXISTS discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type discount_type NOT NULL,
  value BIGINT NOT NULL CHECK (value >= 0),
  minimum_purchase_minor BIGINT DEFAULT 0 CHECK (minimum_purchase_minor >= 0),
  minimum_quantity INT DEFAULT 0 CHECK (minimum_quantity >= 0),
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  usage_limit INT,
  usage_count INT NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  product_scope TEXT[] DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT chk_discount_date_range CHECK (valid_until >= valid_from),
  CONSTRAINT chk_discount_percentage CHECK (type != 'percentage' OR value <= 100)
);

-- 8. Quotations Table
CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  status quotation_status NOT NULL DEFAULT 'draft',
  valid_until DATE NOT NULL,
  subtotal_minor BIGINT NOT NULL DEFAULT 0 CHECK (subtotal_minor >= 0),
  discount_total_minor BIGINT NOT NULL DEFAULT 0 CHECK (discount_total_minor >= 0),
  tax_total_minor BIGINT NOT NULL DEFAULT 0 CHECK (tax_total_minor >= 0),
  total_minor BIGINT NOT NULL DEFAULT 0 CHECK (total_minor >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
CREATE INDEX IF NOT EXISTS idx_quotations_customer ON quotations(customer_id);

-- 9. Quotation Items Table
CREATE TABLE IF NOT EXISTS quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  variant_name TEXT,
  quantity INT NOT NULL CHECK (quantity >= 1),
  unit_price_minor BIGINT NOT NULL CHECK (unit_price_minor >= 0),
  tax_rule_id UUID REFERENCES tax_rules(id) ON DELETE SET NULL,
  tax_rate NUMERIC(5, 2) DEFAULT 0,
  tax_amount_minor BIGINT NOT NULL DEFAULT 0 CHECK (tax_amount_minor >= 0),
  discount_amount_minor BIGINT NOT NULL DEFAULT 0 CHECK (discount_amount_minor >= 0),
  total_minor BIGINT NOT NULL DEFAULT 0 CHECK (total_minor >= 0)
);

-- 10. Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  status subscription_status NOT NULL DEFAULT 'draft',
  start_date DATE NOT NULL,
  end_date DATE,
  next_billing_date DATE NOT NULL,
  payment_terms TEXT NOT NULL DEFAULT 'Net 30',
  subtotal_minor BIGINT NOT NULL DEFAULT 0 CHECK (subtotal_minor >= 0),
  tax_total_minor BIGINT NOT NULL DEFAULT 0 CHECK (tax_total_minor >= 0),
  discount_total_minor BIGINT NOT NULL DEFAULT 0 CHECK (discount_total_minor >= 0),
  total_minor BIGINT NOT NULL DEFAULT 0 CHECK (total_minor >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT chk_subscription_date_range CHECK (end_date IS NULL OR end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_billing ON subscriptions(status, next_billing_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(customer_id);

-- 11. Subscription Items Table
CREATE TABLE IF NOT EXISTS subscription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  variant_name TEXT,
  quantity INT NOT NULL CHECK (quantity >= 1),
  unit_price_minor BIGINT NOT NULL CHECK (unit_price_minor >= 0),
  tax_rule_id UUID REFERENCES tax_rules(id) ON DELETE SET NULL,
  tax_rate NUMERIC(5, 2) DEFAULT 0,
  tax_amount_minor BIGINT NOT NULL DEFAULT 0 CHECK (tax_amount_minor >= 0),
  discount_amount_minor BIGINT NOT NULL DEFAULT 0 CHECK (discount_amount_minor >= 0),
  total_minor BIGINT NOT NULL DEFAULT 0 CHECK (total_minor >= 0)
);

-- 12. Invoices Table (with Idempotency Unique Constraint)
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  status invoice_status NOT NULL DEFAULT 'draft',
  billing_period_start DATE,
  billing_period_end DATE,
  due_date DATE NOT NULL,
  subtotal_minor BIGINT NOT NULL DEFAULT 0 CHECK (subtotal_minor >= 0),
  discount_total_minor BIGINT NOT NULL DEFAULT 0 CHECK (discount_total_minor >= 0),
  tax_total_minor BIGINT NOT NULL DEFAULT 0 CHECK (tax_total_minor >= 0),
  total_minor BIGINT NOT NULL DEFAULT 0 CHECK (total_minor >= 0),
  paid_minor BIGINT NOT NULL DEFAULT 0 CHECK (paid_minor >= 0),
  balance_minor BIGINT NOT NULL DEFAULT 0 CHECK (balance_minor >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  -- Idempotency protection constraint: prevents duplicate invoices for the same interval
  CONSTRAINT uq_invoice_subscription_period UNIQUE (subscription_id, billing_period_start, billing_period_end),
  CONSTRAINT chk_invoice_balance CHECK (paid_minor + balance_minor = total_minor)
);
CREATE INDEX IF NOT EXISTS idx_invoices_due ON invoices(status, due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);

-- 13. Invoice Items Table
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_description TEXT NOT NULL,
  quantity INT NOT NULL CHECK (quantity >= 1),
  unit_price_minor BIGINT NOT NULL CHECK (unit_price_minor >= 0),
  tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  tax_amount_minor BIGINT NOT NULL DEFAULT 0 CHECK (tax_amount_minor >= 0),
  discount_amount_minor BIGINT NOT NULL DEFAULT 0 CHECK (discount_amount_minor >= 0),
  line_total_minor BIGINT NOT NULL DEFAULT 0 CHECK (line_total_minor >= 0)
);

-- 14. Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  method payment_method NOT NULL,
  payment_date DATE NOT NULL,
  note TEXT,
  recorded_by TEXT NOT NULL DEFAULT 'system',
  transaction_ref TEXT,
  is_refund BOOLEAN NOT NULL DEFAULT false,
  refund_reason TEXT,
  original_payment_id UUID REFERENCES payments(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id, payment_date);

-- 15. Billing Runs Table
CREATE TABLE IF NOT EXISTS billing_runs (
  id TEXT PRIMARY KEY,
  as_of_date DATE,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_ms INT,
  total_processed INT NOT NULL DEFAULT 0,
  success_count INT NOT NULL DEFAULT 0,
  failure_count INT NOT NULL DEFAULT 0,
  skipped_count INT NOT NULL DEFAULT 0,
  duplicate_count INT NOT NULL DEFAULT 0,
  total_billed_minor BIGINT NOT NULL DEFAULT 0,
  status billing_run_status NOT NULL DEFAULT 'running',
  triggered_by TEXT DEFAULT 'api',
  errors JSONB DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_billing_runs_status ON billing_runs(status, started_at DESC);

-- 16. Audit Logs Table (Append-Only)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Enable Row Level Security (RLS) on all core tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Standard Policies: Service role and Staff/Admin full access
CREATE POLICY "Admins have full access on all entities" ON profiles FOR ALL USING (true);
CREATE POLICY "Public products view" ON products FOR SELECT USING (is_active = true);
CREATE POLICY "Public plans view" ON plans FOR SELECT USING (true);

