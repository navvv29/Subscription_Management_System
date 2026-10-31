# Subscript One — Subscription Management & Operations Command Center
**Project Documentation & Status Report**

---

## 1. Project Overview & Architecture
**Subscript One** is a modern Subscription Management & Operations Command Center developed for Brightloop Software.
Built as a modular Next.js application, it provides deterministic lifecycle management for subscriptions, recurring billing automation, invoice generation with line snapshots, payment recording, and real-time financial command center analytics.

### Technical Lead / Member 1 Assignment:
- Technical leadership, bootstrap, shared TypeScript contracts & DTOs
- Subscription lifecycle state machine (guarded transitions)
- Billing period calculations (with month-end pinning & leap-year handling)
- Authorized "Process Due Invoices" batch engine with idempotency & duplicate prevention
- Invoice generation (customer/line/tax/discount snapshots), confirmation & cancellation
- Payment reconciliation (partial/full payments, overpayment rejection, balance tracking)
- Real-time command center dashboard & finance summary API
- Vitest test suite covering all critical business rules, validation schemas, edge cases, and performance benchmarks

---

## 2. Tech Stack & Engineering Standards
- **Framework:** Next.js (App Router, Turbopack, React 19)
- **Language:** TypeScript 5 (Strict Mode)
- **Validation:** Zod (refined schemas for dates, IDs, integer paise, boundary checks)
- **Date Arithmetic:** `date-fns` (explicit policy: month-end clamping & leap-year handling)
- **Styling & UI:** Tailwind CSS, Lucide Icons, clsx, tailwind-merge
- **Testing:** Vitest
- **Financial Arithmetic Policy:**
  - All monetary values are strictly represented in **integer minor units** (paise for INR: 1 INR = 100 paise).
  - Floating-point arithmetic is strictly prohibited for financial calculations.
  - Tax calculation is deterministic (inclusive / exclusive support).
  - Discounts support percentage & fixed amounts with minimum thresholds, validity dates, atomic usage cap enforcement, and product scoping.

---

## 3. Reliability & Validation Hardening

### 3.1. Input & Schema Validation (`lib/validation/schemas.ts`)
- **Flexible & Safe ID Validation:** Normalized `idSchema` with whitespace trimming and bounds checks (1–100 chars).
- **Strict Calendar Date Validation:** `isoDateSchema` validates `YYYY-MM-DD` syntax via regex and asserts valid calendar date values via `Date.parse`.
- **Integer Minor Units:** All monetary values (`salePriceMinor`, `costPriceMinor`, `unitPriceMinor`, `amountMinor`, `minimumPurchaseMinor`) are enforced as positive integers or non-negative integers; decimal floats are rejected.
- **Relational Date Cross-Validation:**
  - Plans: `availableUntil >= availableFrom`
  - Subscriptions: `endDate >= startDate`
  - Discounts: `validUntil >= validFrom` and `value <= 100` for percentage discounts.

### 3.2. Contractual & Relational Validation
- **Subscription Creation (`app/api/subscriptions/route.ts`):**
  - Asserts customer exists in store (404 otherwise).
  - Asserts plan exists in store (404 otherwise).
  - Asserts total item quantity satisfies `plan.minimumQuantity`.
  - Asserts all product and variant references exist and belong to the correct product.
- **Quotation Conversion (`app/api/quotations/[id]/convert/route.ts`):**
  - Validates quotation exists and is not expired (`isDateExpired(validUntil)`).
  - Asserts status is `draft` or `accepted` (expired/rejected cannot convert).
  - Validates customer exists and quotation has non-empty line items.
  - Validates plan minimum quantity is satisfied by converted items.
  - Preserves original agreed quotation line prices into new subscription items.
- **Invoice Cancellation Guard (`app/api/invoices/[id]/cancel/route.ts`):**
  - Prohibits cancelling fully paid invoices.
  - Prohibits cancelling invoices with recorded payments (`paidMinor > 0`).

### 3.3. Billing Engine Reliability & Concurrency Guards (`features/billing/billing-service.ts`)
- **Contractual End-Date Enforcement:** Subscriptions with `endDate` are strictly blocked from generating invoices once `nextBillingDate > endDate`.
- **Atomic Discount Usage Tracking:** Sequential and concurrent invoice generations update `discount.usageCount` atomically, preventing overuse beyond `discount.usageLimit`.
- **Idempotency Guard:** `(subscription_id, billing_period_start, billing_period_end)` prevents duplicate invoices across repeated batch executions.
- **Transaction Safety:** `next_billing_date` advances only after invoice generation succeeds.

### 3.4. Payment Reconciliation (`features/payments/payment-service.ts`)
- Prohibits payments on `draft`, `cancelled`, or `paid` invoices.
- Strict overpayment rejection (`amountMinor > balanceMinor`).
- Deterministic partial payment balance deduction and status transition (`partially_paid` vs `paid`).
- Exact matching: multiple partial payments sum up deterministically to 0 balance and transition to `paid`.

---

## 4. Implemented Modules & Directory Structure

```text
Subsript_one/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx                     # Command Center App Shell & Sidebar Navigation
│   │   ├── dashboard/page.tsx             # Finance Command Center (KPIs, Batch Trigger, Tables)
│   │   ├── subscriptions/page.tsx         # Subscription List & Guarded State Transitions
│   │   ├── billing/page.tsx               # Billing Queue & Execution History
│   │   ├── invoices/page.tsx              # Invoices Register, Confirmation & Cancellation
│   │   ├── payments/page.tsx              # Payment Ledger
│   │   ├── quotations/page.tsx            # Quotations & Conversion to Subscriptions
│   │   ├── customers/page.tsx             # Customer Workspace
│   │   └── products/page.tsx              # Products & Plans Catalogue
│   ├── api/
│   │   ├── billing/process/route.ts       # POST: Authorized Billing Batch Run
│   │   ├── customers/route.ts             # GET, POST: Customer CRUD & Email uniqueness
│   │   ├── dashboard/route.ts             # GET: Real-time Reconciled Financial Metrics
│   │   ├── invoices/
│   │   │   ├── route.ts                   # GET: Invoices Register (with filtering/sorting)
│   │   │   └── [id]/
│   │   │       ├── route.ts               # GET: Invoice Details
│   │   │       ├── confirm/route.ts       # POST: Confirm Draft Invoice
│   │   │       └── cancel/route.ts        # POST: Cancel Unpaid Invoice
│   │   ├── payments/route.ts              # GET, POST: Record Payments against Invoices
│   │   ├── plans/route.ts                 # GET, POST: Plans CRUD
│   │   ├── products/route.ts              # GET, POST: Products CRUD
│   │   ├── quotations/
│   │   │   ├── route.ts                   # GET, POST: Quotation CRUD
│   │   │   └── [id]/convert/route.ts      # POST: Convert Valid Quotation to Subscription
│   │   ├── reports/revenue/route.ts       # GET: Monthly Collected vs Outstanding
│   │   └── subscriptions/
│   │       ├── route.ts                   # GET, POST: Subscriptions CRUD
│   │       └── [id]/route.ts              # GET, PATCH: Guarded State Machine Transitions
│   ├── globals.css                        # Tailwind Design Tokens
│   ├── layout.tsx                         # Root HTML Layout
│   └── page.tsx                           # Root Redirect to /dashboard
├── features/
│   ├── billing/
│   │   └── billing-service.ts             # Invoice Generation & Batch Processor
│   ├── payments/
│   │   └── payment-service.ts             # Payment Validation & Balance Reconciliation
│   └── subscriptions/
│       └── subscription-service.ts        # Guarded State Machine (Draft → Quotation → Confirmed → Active → Closed)
├── lib/
│   ├── billing/
│   │   ├── date-utils.ts                  # Period Calculation, Clamping, Due & Expiry Checks
│   │   ├── discount-service.ts            # Discount Eligibility Evaluator
│   │   └── tax-service.ts                 # Deterministic Tax Calculator
│   ├── validation/
│   │   └── schemas.ts                     # Zod Request Validation Schemas
│   ├── api-helpers.ts                     # Standardized { data: T } and { error: ... } responses
│   ├── store.ts                           # In-Memory Store & Seed Data for Demonstrable MVP
│   └── utils.ts                           # Tailwind CSS class utilities (cn)
├── tests/
│   ├── api-validation.test.ts             # Zod Validation & Schema Boundary Tests
│   ├── benchmark.test.ts                  # N01 Scale Benchmark (5,000 subscriptions)
│   ├── billing-idempotency.test.ts        # Batch Invoicing & Duplicate Prevention Tests
│   ├── dashboard-reconciliation.test.ts   # Finance Metrics Reconciliation Tests
│   ├── date-utils.test.ts                 # Daily/Weekly/Monthly/Yearly & Leap Year Tests
│   ├── discount-concurrency.test.ts       # Usage Cap Exhaustion & End-Date Enforcement Tests
│   ├── edge-cases.test.ts                 # 30-Day Month Ends, 4-Yr Leap Cycles, Multiple Partial Payments
│   ├── payment-reconciliation.test.ts     # Payment Validation & Overpayment Prevention Tests
│   ├── subscription-lifecycle.test.ts     # Guarded State Transition & Policy Tests
│   └── tax-discount.test.ts               # Deterministic Tax & Discount Fixture Tests
├── types/
│   ├── api.ts                             # Shared API Request/Response DTOs
│   ├── common.ts                          # Currency Formatting & Status Color Mappings
│   └── database.ts                        # Canonical Domain Entities & Enums
├── vitest.config.ts                       # Test Configuration
└── package.json                           # Next.js 16, React 19, Vitest, Tailwind
```

---

## 5. Verification & Test Suite Results
Vitest test suite executed and verified:
- **Test Files:** 10 passed (10/10)
- **Total Tests:** 49 passed (49/49)
- **Coverage Areas:**
  1. Billing date intervals (daily, weekly, monthly, yearly)
  2. Month-end 31st pinning (Jan 31 → Feb 28 / Feb 29 leap year)
  3. Leap year yearly rollover (Feb 29 → Feb 28)
  4. 30-day month transitions (April 30 → May 30, May 31 → June 30)
  5. 4-year yearly intervals spanning leap year (Feb 29, 2024 → 2025 → 2026 → 2027 → Feb 29, 2028)
  6. Subscription valid lifecycle progression (`draft` → `quotation` → `confirmed` → `active` → `closed`)
  7. Rejection of invalid subscription state transitions
  8. Plan policy enforcement (`allowPause`, `allowEarlyClose`)
  9. `canBeBilled` guard for subscription states
  10. Deterministic tax calculation fixture matching blueprint specification
  11. Inclusive tax reverse derivation
  12. Discount eligibility (expiry, usage limit exhaustion, minimum purchase, product scoping)
  13. Single subscription invoice generation with line snapshots
  14. Idempotency & duplicate protection when re-running billing batches
  15. Skipping of paused, closed, and expired subscriptions
  16. Batch fault isolation (single failure does not crash batch)
  17. Rejection of payments on draft, cancelled, or paid invoices
  18. Partial payment balance reduction and `partially_paid` status
  19. Full payment zero balance and `paid` status
  20. Exact sum of multiple partial payments resulting in paid status
  21. Strict rejection of overpayments
  22. Rejection of invalid emails, negative prices, floats, and inverted dates
  23. Discount usage cap exhaustion across sequential batch invoices
  24. Contractual end date enforcement (stops billing past `endDate`)
  25. Reconciliation of dashboard financial aggregates with underlying records
  26. **Scale Benchmark (N01):**
      - 5,000 subscriptions filter and sort: **1.45ms** (Requirement: < 2,000ms)
      - 1,000 invoice batch generation: **117.55ms** (Requirement: < 2,000ms)

---

## 6. Build Status
- `npm run build` executed with **0 errors**.
- All 22 routes (Static pages, Server-rendered API Route Handlers) compiled successfully.

---

## 7. Current Project Status & Git Changelog
- **Git Branch:** `feature/navaneed-core-billing`
- **Current Status:** Validated, hardened, benchmarked, and verified.

| Date | Phase | Details | Author |
|------|-------|---------|--------|
| 2026-10-31 | Bootstrap | Scaffolding Next.js 16 + TypeScript + Tailwind | Navaneed |
| 2026-10-31 | Types | Canonical DTOs (`types/database.ts`, `types/api.ts`, `types/common.ts`) | Navaneed |
| 2026-10-31 | Business Logic | Lifecycle state machine, billing period calculator, tax & discount engines | Navaneed |
| 2026-10-31 | API Layer | 17 Route Handlers for Subscriptions, Billing, Invoices, Payments, Reports | Navaneed |
| 2026-10-31 | UI Command Center | App Shell, Navigation, Dashboard with live batch runner & quick pay | Navaneed |
| 2026-10-31 | QA & Verification | 36 Vitest tests passing; Next.js production build passing | Navaneed |
| 2026-10-31 | Reliability Hardening | Zod schema validation, date bounds, end-date guards, discount caps, 49 tests, N01 benchmark | Navaneed |
