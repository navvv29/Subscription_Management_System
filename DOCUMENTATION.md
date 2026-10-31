# Subscript One — Subscription Management & Operations Command Center
**Project Documentation & Status Report**

---

## 1. Project Overview & Architecture
**Subscript One** is an enterprise-grade Subscription Management & Operations Command Center engineered for Brightloop Software.
Built as a robust, production-ready Next.js application, it provides deterministic lifecycle management for subscriptions, recurring billing automation, atomic persistence, distributed concurrency protection, invoice generation with line snapshots, payment and refund reconciliation, immutable audit logging, role-based access control with Supabase authentication, futuristic light/dark theming, and real-time financial command center analytics.

### Team Work Packages Unified:
- **Member 1 (Navaneed - Technical Lead):** Technical leadership, core billing engine, subscription lifecycle state machine, month-end pinning & leap-year handling, batch billing mutex with lease expiration, formal `BillingRun` records, crash-safe disk persistence, corporate printable/PDF tax invoice, payment reconciliation with refund handling, RFC 2822 email dispatch, append-only audit trail, and 62 automated Vitest tests.
- **Member 2 (Shehruz - Frontend / UX):** Enterprise workspace UI (`/dashboard`, `/customers`, `/products`, `/plans`, `/quotations`, `/subscriptions`, `/billing`, `/invoices`, `/payments`), Customer Portal (`/portal`), semantic futuristic light/dark theming, glass surfaces, and responsive modals.
- **Member 3 (Afeela - Backend / DB / Auth):** Supabase SSR cookie authentication (`/api/auth/signup`, `/api/auth/login`, `/api/auth/logout`), password reset flow (`/api/auth/reset-password`, `/api/auth/update-password`), admin staff provisioning (`/api/auth/staff`), role guards (`requireUser`, `requireStaff`, `requireAdmin`), pgTAP RLS test suite (`supabase/tests/rls_and_integrity.sql`), and SQL schema migration (`supabase/migrations/202610310001_core_schema.sql`).
- **Member 4 (Saarishma - QA & Documentation):** QA Test Plan (`QA_TEST_PLAN`), Requirements Traceability Matrix (`REQUIREMENTS_TRACEABILITY.md`), 3-minute video demo script (`DEMO_SCRIPT.md`), and known limitations register (`KNOWN_LIMITATIONS.md`).

---

## 2. Multi-Member Repository Coordination
The shared GitHub repository (`https://github.com/navvv29/Subscription_Management_System`) coordinates all work packages:
- **`feature/navaneed-core-billing` (Member 1 - Navaneed):** Unified integration branch containing the full end-to-end working system, tested and verified.
- **`origin/feature/frontend-integration` (Member 2 - Shehruz):** Admin workspace views, futuristic light/dark theme toggle, customer portal.
- **`origin/feat/backend-foundation` (Member 3 - Afeela):** Supabase SSR authentication, role authorization, RLS schemas, seed data.
- **`origin/docs/saarishma-qa` (Member 4 - Saarishma):** QA Test Plan updated with automated test run evidence (TC05–TC18 & TC20 PASSED).

---

## 3. Tech Stack & Engineering Standards
- **Framework:** Next.js 16 (App Router, Turbopack, React 19)
- **Language:** TypeScript 5 (Strict Mode)
- **Authentication & Database:** Supabase SSR (`@supabase/ssr`, `@supabase/supabase-js`, PostgreSQL 15+)
- **Validation:** Zod (refined schemas for dates, IDs, integer paise, boundary checks, password complexity)
- **Date Arithmetic:** `date-fns` (explicit policy: month-end clamping & leap-year handling)
- **Styling & UI:** Tailwind CSS v4, Lucide Icons, semantic light/dark mode CSS tokens
- **Testing:** Vitest (16 test suites, 62 automated unit/integration tests)
- **Financial Arithmetic Policy:**
  - All monetary values are strictly represented in **integer minor units** (paise for INR: 1 INR = 100 paise).
  - Floating-point arithmetic is strictly prohibited for financial calculations.
  - Tax calculation is deterministic (inclusive / exclusive support).
  - Discounts support percentage & fixed amounts with minimum thresholds, validity dates, atomic usage cap enforcement, and product scoping.

---

## 4. Real-World Reliability & Architecture Hardening

### 4.1. Crash-Safe Atomic Disk Persistence (`lib/store.ts`)
- **`PersistentStore`:** In-memory store coupled with an atomic disk-backed persistence engine writing to `.data/store.json`.
- **Atomic File Swapping:** Writes to temporary file (`store.json.<timestamp>.tmp`) followed by atomic rename (`fs.renameSync`), completely eliminating corruption from sudden termination.
- **Warm Reload:** Automatically reloads persisted state on server boot and hot-reloads without data loss.

### 4.2. Distributed Concurrency Lock / Mutex (`lib/billing/billing-lock.ts`)
- **Batch Concurrency Mutex:** Prevents simultaneous overlapping billing runs across parallel cron executions or duplicate admin triggers.
- **Lease Expiration (TTL):** Automatically reclaims locks after 60 seconds if a worker terminates abruptly.
- **Conflict Rejection (HTTP 409):** Returns informative `LOCK_CONFLICT` errors with active lock ID, actor, and timestamp.

### 4.3. Formal `BillingRun` Tracking & History (`/api/billing/runs`)
- **Execution Records:** Every billing run produces a formal `BillingRun` entity (`RUN-YYMM-XXXXX`) recording start time, completion time, duration in milliseconds, total evaluated, success, skipped, duplicate, and total billed minor amounts.
- **Audit History API:** Dedicated endpoint `GET /api/billing/runs` and `GET /api/billing/runs/[id]` enables operators to inspect historical batches and detailed errors.

### 4.4. Immutable Append-Only Audit Trail (`lib/audit/audit-service.ts`)
- **Comprehensive Audit Trail:** Logs state changes, payments, refunds, invoice confirmations, email dispatches, and batch runs to an append-only `audit_logs` store.
- **Audit Query API:** Route `GET /api/audit-logs` provides query capabilities filtered by `entityType`, `entityId`, `actorId`, and `action`.

### 4.5. Real-World Payment Refunds & Reversals (`features/payments/payment-service.ts`)
- **`validateAndApplyRefund`:** Enforces over-refund protection (refund amount cannot exceed original payment or remaining invoice paid balance).
- **Balance Recalculation:** Reduces `paidMinor`, increases `balanceMinor`, and dynamically adjusts invoice status (`paid` -> `partially_paid` or `confirmed`).
- **Dedicated Route:** `POST /api/payments/refund` records refund payments with audit trails.

### 4.6. Corporate Printable / PDF Tax Invoice & Email Dispatch
- **Printable Tax Invoice (`/invoices/[id]/print`):** Full corporate tax invoice layout featuring company GSTIN, recipient billing address, itemized line items with HSN/SAC codes, tax breakdown (CGST/SGST/IGST), discount deductions, and payment ledger receipts.
- **Email Dispatch Service (`lib/notifications/email-service.ts`):** Formats RFC 2822 email metadata with live SMTP/API hook and transparent audit logging (`POST /api/invoices/[id]/send`).

### 4.7. Supabase Authentication, RLS & Role Guards (`lib/auth/guards.ts`)
- **Cookie-Based SSR Auth:** Implemented using `@supabase/ssr` with async Next.js cookie jars.
- **Role Hierarchy:** Distinct privileges for `admin`, `staff`, and `customer`. Only admins can provision new staff accounts.
- **Row Level Security:** Customer data isolation verified by pgTAP tests (`supabase/tests/rls_and_integrity.sql`).

---

## 5. Implemented Modules & Directory Structure

```text
Subsript_one/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx                     # Command Center App Shell, Sidebar & Theme Toggle
│   │   ├── dashboard/page.tsx             # Finance Command Center (KPIs, Batch Trigger, Tables)
│   │   ├── subscriptions/page.tsx         # Subscription List & Guarded State Transitions
│   │   ├── billing/page.tsx               # Billing Queue & Execution Audit History
│   │   ├── invoices/page.tsx              # Invoices Register, Print Links & Email Dispatch
│   │   ├── payments/page.tsx              # Payment Ledger & Refund Modal
│   │   ├── quotations/page.tsx            # Quotations & Conversion to Subscriptions
│   │   ├── customers/page.tsx             # Customer Workspace
│   │   └── products/page.tsx              # Products & Plans Catalogue
│   ├── portal/
│   │   ├── layout.tsx                     # Customer Portal Layout with Nav & Theme Toggle
│   │   ├── page.tsx                       # Customer Portal Dashboard & Quotation Acceptance
│   │   ├── invoices/page.tsx              # Customer Invoices & Payment Receipts
│   │   └── subscriptions/page.tsx         # Customer Active Subscriptions
│   ├── invoices/[id]/print/
│   │   └── page.tsx                       # Corporate Printable / PDF Tax Invoice Document
│   ├── auth/
│   │   ├── callback/route.ts              # Supabase OAuth / Email confirmation callback
│   │   └── reset-password/route.ts        # Supabase password reset callback
│   ├── api/
│   │   ├── auth/
│   │   │   ├── signup/route.ts            # POST: Register user with password validation
│   │   │   ├── login/route.ts             # POST: Sign in with password
│   │   │   ├── logout/route.ts            # POST: Sign out
│   │   │   ├── reset-password/route.ts    # POST: Initiate email password reset
│   │   │   ├── update-password/route.ts   # POST: Update password with validation
│   │   │   └── staff/route.ts             # POST: Admin-only staff account provisioning
│   │   ├── audit-logs/route.ts            # GET: Query Immutable Audit Trail
│   │   ├── billing/
│   │   │   ├── process/route.ts           # POST: Authorized Billing Batch Run with Mutex Lock
│   │   │   └── runs/
│   │   │       ├── route.ts               # GET: Historical Billing Runs
│   │   │       └── [id]/route.ts          # GET: Single Billing Run with Error Details
│   │   ├── customers/route.ts             # GET, POST: Customer CRUD & Email uniqueness
│   │   ├── dashboard/route.ts             # GET: Real-time Reconciled Financial Metrics
│   │   ├── invoices/
│   │   │   ├── route.ts                   # GET: Invoices Register (with filtering/sorting)
│   │   │   └── [id]/
│   │   │       ├── route.ts               # GET: Invoice Details
│   │   │       ├── confirm/route.ts       # POST: Confirm Draft Invoice
│   │   │       ├── cancel/route.ts        # POST: Cancel Unpaid Invoice
│   │   │       └── send/route.ts          # POST: Dispatch Invoice Email
│   │   ├── payments/
│   │   │   ├── route.ts                   # GET, POST: Record Payments against Invoices
│   │   │   └── refund/route.ts            # POST: Record Payment Refund & Adjust Balances
│   │   ├── plans/route.ts                 # GET, POST: Plans CRUD
│   │   ├── products/route.ts              # GET, POST: Products CRUD
│   │   ├── quotations/
│   │   │   ├── route.ts                   # GET, POST: Quotation CRUD
│   │   │   └── [id]/convert/route.ts      # POST: Convert Valid Quotation to Subscription
│   │   ├── reports/revenue/route.ts       # GET: Monthly Collected vs Outstanding
│   │   └── subscriptions/
│   │       ├── route.ts                   # GET, POST: Subscriptions CRUD
│   │       └── [id]/route.ts              # GET, PATCH: Guarded State Machine Transitions
│   ├── globals.css                        # Futuristic semantic light/dark design tokens
│   ├── layout.tsx                         # Root HTML Layout with theme hydration script
│   └── page.tsx                           # Root Redirect to /dashboard
├── components/
│   ├── layout/
│   │   ├── dashboard-layout.tsx           # Admin layout with theme toggle & collapsible nav
│   │   └── portal-layout.tsx              # Customer portal layout
│   ├── theme-toggle.tsx                   # Accessible Light / Dark theme switch button
│   └── ui/index.tsx                       # Reusable design system primitives (Badge, Card, Dialog, Table)
├── features/
│   ├── billing/
│   │   └── billing-service.ts             # Invoice Generation & Batch Processor with Run Metrics
│   ├── payments/
│   │   └── payment-service.ts             # Payment Validation, Refunds & Multi-Payment Reconciliation
│   └── subscriptions/
│       └── subscription-service.ts        # Guarded State Machine (Draft → Quotation → Confirmed → Active → Closed)
├── lib/
│   ├── api/                               # Frontend Typed API Adapter
│   │   ├── index.ts                       # Master API export
│   │   ├── client.ts                      # Base fetch wrapper with error handling
│   │   ├── customers.ts, products.ts, plans.ts, quotations.ts, subscriptions.ts, invoices.ts, payments.ts, billing.ts, dashboard.ts, portal.ts
│   │   └── response.ts                    # Server API response helpers (badRequest, databaseError, success, parseJson)
│   ├── auth/
│   │   └── guards.ts                      # Role guards (requireUser, requireStaff, requireAdmin)
│   ├── permissions/
│   │   └── roles.ts                       # Role capability predicates
│   ├── supabase/
│   │   ├── server.ts                      # Async SSR Supabase client
│   │   └── admin.ts                       # Service-role admin client
│   ├── audit/
│   │   └── audit-service.ts               # Append-Only Audit Trail Recording & Query Service
│   ├── billing/
│   │   ├── billing-lock.ts                # Concurrency Mutex with Lease TTL
│   │   ├── date-utils.ts                  # Period Calculation, Clamping, Due & Expiry Checks
│   │   ├── discount-service.ts            # Discount Eligibility Evaluator
│   │   └── tax-service.ts                 # Deterministic Tax Calculator
│   ├── notifications/
│   │   └── email-service.ts               # RFC 2822 Email Dispatch Service
│   ├── validation/
│   │   └── schemas.ts                     # Zod Request Validation Schemas (Auth, Billing, Catalog)
│   ├── store.ts                           # Crash-Safe PersistentStore with Atomic Disk Sync
│   └── utils.ts                           # Tailwind CSS class utilities & currency/date formatting
├── supabase/
│   ├── config.toml                        # Supabase CLI configuration
│   ├── seed.sql                           # Initial test seed fixtures
│   ├── migrations/
│   │   ├── 20261031000000_core_billing_schema.sql # Navaneed's core billing schema
│   │   └── 202610310001_core_schema.sql           # Afeela's unified core schema with RLS
│   └── tests/
│       └── rls_and_integrity.sql          # pgTAP RLS assertions (customer isolation, role constraints)
├── tests/
│   ├── api-validation.test.ts             # Zod Validation & Schema Boundary Tests
│   ├── audit-trail.test.ts                # Immutable Audit Trail & Compliance Logging Tests
│   ├── benchmark.test.ts                  # N01 Scale Benchmark (5,000 subscriptions)
│   ├── billing-idempotency.test.ts        # Batch Invoicing & Duplicate Prevention Tests
│   ├── billing-lock.test.ts               # Distributed Billing Mutex & Lease Expiration Tests
│   ├── billing-runs.test.ts               # Billing Run Formalization & Error Capture Tests
│   ├── dashboard-reconciliation.test.ts   # Finance Metrics Reconciliation Tests
│   ├── date-utils.test.ts                 # Daily/Weekly/Monthly/Yearly & Leap Year Tests
│   ├── discount-concurrency.test.ts       # Usage Cap Exhaustion & End-Date Enforcement Tests
│   ├── edge-cases.test.ts                 # 30-Day Month Ends, 4-Yr Leap Cycles, Multiple Partial Payments
│   ├── payment-reconciliation.test.ts     # Payment Validation & Overpayment Prevention Tests
│   ├── permissions/
│   │   └── validation.test.ts             # Password complexity, role creation, negative money validation
│   ├── persistence.test.ts                # Crash-Safe Atomic Persistence & Warm Reload Tests
│   ├── refund-reconciliation.test.ts      # Partial/Full Refunds & Status Regression Tests
│   ├── subscription-lifecycle.test.ts     # Guarded State Transition & Policy Tests
│   └── tax-discount.test.ts               # Deterministic Tax & Discount Fixture Tests
├── types/
│   ├── api.ts                             # Shared API Request/Response DTOs
│   ├── common.ts                          # Currency Formatting & Status Color Mappings
│   └── database.ts                        # Canonical Domain Entities, BillingRuns, AuditLogs & Enums
├── REQUIREMENTS_TRACEABILITY.md           # Requirements Traceability Matrix (F01–F36, N01–N06)
├── QA_TEST_PLAN                           # QA Test Plan with verified test results
├── DEMO_SCRIPT.md                         # 3-Minute Video Demo Script
├── KNOWN_LIMITATIONS.md                   # Known Limitations & Honest Disclosure Register
├── vitest.config.ts                       # Test Configuration
└── package.json                           # Next.js 16, React 19, Vitest, Tailwind 4
```

---

## 6. Verification & Test Suite Results
Vitest test suite executed and verified:
- **Test Files:** 16 passed (16/16)
- **Total Tests:** 62 passed (62/62)
- **Duration:** ~5.0 seconds
- **Scale Benchmark (N01):**
  - 5,000 subscriptions filter and sort: **1.15ms** (Requirement: < 2,000ms)
  - 1,000 invoice batch generation: **104.09ms** (Requirement: < 2,000ms)

### QA Scenario Coverage Summary:
- **TC01 & TC02:** Password complexity (min 9 chars, upper, lower, digit, special char) verified in `tests/permissions/validation.test.ts`. Duplicate email rejection enforced by profiles uniqueness in `supabase/tests/rls_and_integrity.sql`.
- **TC03:** Staff account creation privilege restricted to admin verified in `tests/permissions/validation.test.ts` & `supabase/tests/rls_and_integrity.sql`.
- **TC04:** Customer data isolation verified by pgTAP test cases in `supabase/tests/rls_and_integrity.sql`.
- **TC05:** Product variant price adjustment verified in `tests/tax-discount.test.ts`.
- **TC06:** Daily, weekly, monthly, yearly billing periods with month-end pinning verified in `tests/date-utils.test.ts`.
- **TC07:** Rejection of expired quotation acceptance verified in `tests/date-utils.test.ts` & `tests/api-validation.test.ts`.
- **TC08:** Guarded subscription lifecycle state machine transitions verified in `tests/subscription-lifecycle.test.ts`.
- **TC09:** Billing engine skips paused/closed/expired subscriptions verified in `tests/subscription-lifecycle.test.ts` & `tests/billing-idempotency.test.ts`.
- **TC10:** Duplicate invoice prevention verified in `tests/billing-idempotency.test.ts` & `tests/billing-lock.test.ts`.
- **TC11:** Unbilled next billing date preservation on failure verified in `tests/billing-idempotency.test.ts`.
- **TC12:** Expired/below-threshold discount rejection verified in `tests/tax-discount.test.ts`.
- **TC13:** Concurrent discount usage cap enforcement verified in `tests/discount-concurrency.test.ts`.
- **TC14:** Deterministic tax (exclusive/inclusive) and discount calculation verified in `tests/tax-discount.test.ts`.
- **TC15:** Partial, full, overpayment rejection and refund/reversal handling verified in `tests/payment-reconciliation.test.ts` & `tests/refund-reconciliation.test.ts`.
- **TC16 & TC17:** Overdue invoice filtering and finance command center metric reconciliation verified in `tests/dashboard-reconciliation.test.ts`.
- **TC18:** Corporate printable/PDF tax invoice layout verified with GSTIN, line snapshots, and tax breakdowns (`/invoices/[id]/print`).
- **TC19:** RFC 2822 email metadata structure, audit logs, and Supabase password reset routes verified.
- **TC20:** Scale benchmark for 5,000 subscriptions verified in `tests/benchmark.test.ts`.

---

## 7. Build Status
- `npm run build` executed with **0 errors**.
- All **43 routes** (Static pages, Server-rendered API Route Handlers, Partial Prerender) compiled successfully with Turbopack.

---

## 8. Current Project Status & Git Changelog
- **Git Branch:** `feature/navaneed-core-billing`
- **Remote Tracking:** `origin/feature/navaneed-core-billing`
- **Collaborator Branches Integrated:** `origin/docs/saarishma-qa` (PR #1 & PR #3), `origin/feature/frontend-integration` (PR #2 + Light/Dark theming), `origin/feat/backend-foundation` (Supabase auth & RLS slice).

| Date | Phase | Details | Author |
|------|-------|---------|--------|
| 2026-10-31 | Bootstrap | Scaffolding Next.js 16 + TypeScript + Tailwind | Navaneed |
| 2026-10-31 | Types | Canonical DTOs (`types/database.ts`, `types/api.ts`, `types/common.ts`) | Navaneed |
| 2026-10-31 | Business Logic | Lifecycle state machine, billing period calculator, tax & discount engines | Navaneed |
| 2026-10-31 | API Layer | 17 Route Handlers for Subscriptions, Billing, Invoices, Payments, Reports | Navaneed |
| 2026-10-31 | UI Command Center | App Shell, Navigation, Dashboard with live batch runner & quick pay | Navaneed |
| 2026-10-31 | QA & Verification | 36 Vitest tests passing; Next.js production build passing | Navaneed |
| 2026-10-31 | Reliability Hardening | Zod schema validation, date bounds, end-date guards, discount caps, 49 tests, N01 benchmark | Navaneed |
| 2026-10-31 | Multi-Branch Integration | Synced with `docs/saarishma-qa` (PR #1), updated `REQUIREMENTS_TRACEABILITY.md` with verified evidence | Navaneed |
| 2026-10-31 | Real-World Enterprise Hardening | Atomic disk persistence (`PersistentStore`), distributed concurrency mutex (`BillingLock`), formal `BillingRun` history (`/api/billing/runs`), append-only audit trail (`/api/audit-logs`), payment refunds & reversals (`/api/payments/refund`), corporate printable/PDF tax invoice (`/invoices/[id]/print`), RFC email dispatch (`/api/invoices/[id]/send`), PostgreSQL migration schema (`supabase/migrations/`), 15 test files (58 tests passing), 0 build errors | Navaneed |
| 2026-10-31 | Demo Flow Hardening & Refund UI | Added demo quotation seed (`QUO-2610-DEMO1`) for instant quotation-to-subscription demo, fixed payments array parsing, interactive refund modal on payment ledger | Navaneed |
| 2026-10-31 | Full Collaborator Integration | Integrated Shehruz's futuristic light/dark theme toggle, customer portal & UI polish; integrated Afeela's Supabase auth, RLS tests, password schemas & role guards; updated Saarishma's QA test plan (62 tests passing, 43 routes built with 0 errors) | Navaneed |
