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
- Vitest test suite covering all critical business rules

---

## 2. Tech Stack & Engineering Standards
- **Framework:** Next.js (App Router, Turbopack, React 19)
- **Language:** TypeScript 5 (Strict Mode)
- **Validation:** Zod
- **Date Arithmetic:** `date-fns` (explicit policy: month-end clamping & leap-year handling)
- **Styling & UI:** Tailwind CSS, Lucide Icons, clsx, tailwind-merge
- **Testing:** Vitest
- **Financial Arithmetic Policy:**
  - All monetary values are strictly represented in **integer minor units** (paise for INR: 1 INR = 100 paise).
  - Floating-point arithmetic is strictly prohibited for financial calculations.
  - Tax calculation is deterministic (inclusive / exclusive support).
  - Discounts support percentage & fixed amounts with minimum thresholds, validity dates, usage limits, and product scoping.

---

## 3. Implemented Modules & Directory Structure

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
│   ├── billing-idempotency.test.ts        # Batch Invoicing & Duplicate Prevention Tests
│   ├── dashboard-reconciliation.test.ts   # Finance Metrics Reconciliation Tests
│   ├── date-utils.test.ts                 # Daily/Weekly/Monthly/Yearly & Leap Year Tests
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

## 4. Key Business Logic & Specifications Implemented

### 4.1. Subscription Lifecycle State Machine
Guarded transitions strictly enforced in `features/subscriptions/subscription-service.ts`:
- **Allowed States:** `Draft` → `Quotation` → `Confirmed` → `Active` → `Closed` (with permitted side transitions to `Paused` and `Expired`).
- **Policy Flags Enforcement:**
  - `allowPause`: Pausing an active subscription is rejected if the plan policy disables it.
  - `allowEarlyClose`: Early closure of an active subscription is rejected if the plan policy disables it.
- **Billing Eligibility:** Only `active` subscriptions are permitted to be billed. Paused, expired, draft, and closed subscriptions are skipped.

### 4.2. Billing Period & Duplicate Invoicing Protection
Implemented in `lib/billing/date-utils.ts` and `features/billing/billing-service.ts`:
- **Interval Support:** Daily, Weekly, Monthly, Yearly.
- **Month-End Policy:** Subscriptions starting on day 29, 30, or 31 are pinned to the last valid day of the target month (e.g. Jan 31 → Feb 28 in regular year, Feb 29 in leap year).
- **Leap Year Policy:** Yearly subscriptions starting Feb 29 roll over to Feb 28 on non-leap years.
- **Idempotency Guard:** Unique key `(subscription_id, billing_period_start, billing_period_end)` prevents duplicate billing. Re-running the billing run for the same period safely returns the existing invoice without creating duplicates.
- **Atomic Advancement:** The subscription's `next_billing_date` is advanced **only after** invoice creation succeeds.

### 4.3. Quotation Conversion
Implemented in `app/api/quotations/[id]/convert/route.ts`:
- Converts accepted quotations into subscriptions.
- **Preserved Pricing:** Re-pricing against current catalogue prices is prohibited; original agreed quotation line items, unit prices, and tax snapshots are preserved into subscription items.
- Expired quotations (past `validUntil`) are strictly rejected.

### 4.4. Payment Reconciliation & Overpayment Protection
Implemented in `features/payments/payment-service.ts`:
- Payments can only be recorded on confirmed, partially paid, or outstanding invoices (draft and cancelled invoices are rejected).
- Overpayment is rejected: Payment amount cannot exceed `balanceMinor`.
- Deterministic Balance Calculation: `balanceMinor = totalMinor - paidMinor`.
- Status Lifecycle: Automatically transitions to `partially_paid` or `paid` (when balance is 0).

### 4.5. Command Center Financial Metrics
Derived deterministically in `app/api/dashboard/route.ts`:
- **Active Subscriptions:** Count of subscriptions in `active` state.
- **Collected Revenue:** Sum of all recorded payments (`amountMinor`).
- **Outstanding Balance:** Sum of `balanceMinor` for all non-cancelled, unpaid invoices.
- **Overdue Amount:** Outstanding balance of invoices past their `dueDate`.
- **Due for Billing:** Count of active subscriptions where `nextBillingDate <= today`.

---

## 5. Verification & Test Suite Results
Vitest test suite executed and verified:
- **Test Files:** 6 passed (6/6)
- **Total Tests:** 36 passed (36/36)
- **Scenarios Covered:**
  1. Billing date intervals (daily, weekly, monthly, yearly)
  2. Month-end 31st pinning (Jan 31 → Feb 28 / Feb 29 leap year)
  3. Leap year yearly rollover (Feb 29 → Feb 28)
  4. Billing period end date calculation
  5. Subscription valid lifecycle progression (`draft` → `quotation` → `confirmed` → `active` → `closed`)
  6. Rejection of invalid subscription state transitions
  7. Plan policy enforcement (`allowPause`, `allowEarlyClose`)
  8. `canBeBilled` guard for subscription states
  9. Deterministic tax calculation fixture matching blueprint specification
  10. Inclusive tax reverse derivation
  11. Discount eligibility (expiry, usage limit exhaustion, minimum purchase, product scoping)
  12. Single subscription invoice generation with line snapshots
  13. Idempotency & duplicate protection when re-running billing batches
  14. Skipping of paused, closed, and expired subscriptions
  15. Batch fault isolation (single failure does not crash batch)
  16. Rejection of payments on draft, cancelled, or paid invoices
  17. Partial payment balance reduction and `partially_paid` status
  18. Full payment zero balance and `paid` status
  19. Strict rejection of overpayments
  20. Reconciliation of dashboard financial aggregates with underlying records

---

## 6. Build Status
- `npm run build` executed with **0 errors**.
- All 22 routes (Static pages, Server-rendered API Route Handlers) compiled successfully.

---

## 7. Current Project Status & Git Changelog
- **Git Branch:** `feature/navaneed-core-billing`
- **Current Status:** Work Package 1 (Navaneed - Technical Lead) fully implemented, tested, and verified. Ready to push to remote repository.

| Date | Phase | Details | Author |
|------|-------|---------|--------|
| 2026-10-31 | Bootstrap | Scaffolding Next.js 16 + TypeScript + Tailwind | Navaneed |
| 2026-10-31 | Types | Canonical DTOs (`types/database.ts`, `types/api.ts`, `types/common.ts`) | Navaneed |
| 2026-10-31 | Business Logic | Lifecycle state machine, billing period calculator, tax & discount engines | Navaneed |
| 2026-10-31 | API Layer | 17 Route Handlers for Subscriptions, Billing, Invoices, Payments, Reports | Navaneed |
| 2026-10-31 | UI Command Center | App Shell, Navigation, Dashboard with live batch runner & quick pay | Navaneed |
| 2026-10-31 | QA & Verification | 36 Vitest tests passing; Next.js production build passing | Navaneed |
