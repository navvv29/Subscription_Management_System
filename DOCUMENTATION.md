# Subscript One — Subscription Management & Operations Command Center
**Project Documentation & Status Report**

---

## 1. Project Overview & Architecture
**Subscript One** is an enterprise-grade Subscription Management & Operations Command Center engineered for Brightloop Software.
Built as a robust, production-ready Next.js application, it provides deterministic lifecycle management for subscriptions, recurring billing automation, atomic persistence, distributed concurrency protection, invoice generation with line snapshots, payment and refund reconciliation, immutable audit logging, and real-time financial command center analytics.

### Technical Lead / Member 1 Assignment:
- Technical leadership, bootstrap, shared TypeScript contracts & DTOs
- Subscription lifecycle state machine (guarded transitions with policy enforcement)
- Billing period calculations (with month-end pinning & leap-year rollover)
- Authorized "Process Due Invoices" batch engine with concurrency mutex locking & duplicate prevention
- Formal `BillingRun` records with duration tracking, error capturing, and historical auditing
- Invoice generation (customer/line/tax/discount snapshots), confirmation & cancellation
- Corporate printable / PDF tax invoice with GST breakdowns, HSN/SAC codes, and remittance details
- Payment reconciliation (partial/full payments, overpayment rejection, refund/reversal handling, balance tracking)
- Immutable append-only audit trail service (`audit_logs`) tracking all financial and operational mutations
- Crash-safe atomic disk persistence engine (`PersistentStore`) with automatic reload on startup
- Complete PostgreSQL / Supabase migration schema (`supabase/migrations/`) with constraints, composite indexes, and RLS policies
- Vitest test suite covering all critical business rules, validation schemas, edge cases, persistence, concurrency locks, and performance benchmarks

---

## 2. Multi-Member Repository Coordination
The shared GitHub repository (`https://github.com/navvv29/Subscription_Management_System`) coordinates 4 team work packages:
- **`feature/navaneed-core-billing` (Member 1 - Navaneed):** Technical leadership, core billing engine, subscription lifecycle, payment reconciliation, API route handlers, canonical DTOs, Vitest test suite, and command center.
- **`feature/frontend-ux` (Member 2 - Shehruz):** Customer portal, design system primitives, and admin workspace views under `src/`.
- **Backend / DB (Member 3 - Afeeela):** Supabase migrations, auth, and role-based access control.
- **`docs/saarishma-qa` (Member 4 - Saarishma):** QA traceability, test plans, and demo scripts. Merged via PR #1 into `feature/navaneed-core-billing`.
- **Requirements Traceability Matrix:** Synchronized in [`REQUIREMENTS_TRACEABILITY.md`](file:///c:/Users/navan/OneDrive/Desktop/Projects/Subsript_one/REQUIREMENTS_TRACEABILITY.md) with verified test evidence for all Member 1 requirements (F10–F12, F14–F36, N01, N02, N04, N06).

---

## 3. Tech Stack & Engineering Standards
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

## 4. Real-World Reliability & Architecture Hardening

### 4.1. Crash-Safe Atomic Disk Persistence (`lib/store.ts`)
- **`PersistentStore`:** Replaced volatile in-memory storage with an atomic disk-backed persistence engine writing to `.data/store.json`.
- **Atomic File Swapping:** Writes to temporary file (`store.json.<timestamp>.tmp`) followed by atomic rename (`fs.renameSync`), completely eliminating corruption from power termination or server crash.
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

### 4.7. Production PostgreSQL / Supabase Schema (`supabase/migrations/`)
- Migration `20261031000000_core_billing_schema.sql` defines all 16 canonical entities with strict `CHECK` constraints, unique composite constraints for idempotency (`UNIQUE (subscription_id, billing_period_start, billing_period_end)`), composite performance indexes, and Row Level Security (RLS) policies.

---

## 5. Implemented Modules & Directory Structure

```text
Subsript_one/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx                     # Command Center App Shell & Sidebar Navigation
│   │   ├── dashboard/page.tsx             # Finance Command Center (KPIs, Batch Trigger, Tables)
│   │   ├── subscriptions/page.tsx         # Subscription List & Guarded State Transitions
│   │   ├── billing/page.tsx               # Billing Queue & Execution Audit History
│   │   ├── invoices/page.tsx              # Invoices Register, Print Links & Email Dispatch
│   │   ├── payments/page.tsx              # Payment Ledger & Refund Tracking
│   │   ├── quotations/page.tsx            # Quotations & Conversion to Subscriptions
│   │   ├── customers/page.tsx             # Customer Workspace
│   │   └── products/page.tsx              # Products & Plans Catalogue
│   ├── invoices/[id]/print/
│   │   └── page.tsx                       # Corporate Printable / PDF Tax Invoice Document
│   ├── api/
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
│   ├── globals.css                        # Tailwind Design Tokens
│   ├── layout.tsx                         # Root HTML Layout
│   └── page.tsx                           # Root Redirect to /dashboard
├── features/
│   ├── billing/
│   │   └── billing-service.ts             # Invoice Generation & Batch Processor with Run Metrics
│   ├── payments/
│   │   └── payment-service.ts             # Payment Validation, Refunds & Multi-Payment Reconciliation
│   └── subscriptions/
│       └── subscription-service.ts        # Guarded State Machine (Draft → Quotation → Confirmed → Active → Closed)
├── lib/
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
│   │   └── schemas.ts                     # Zod Request Validation Schemas
│   ├── api-helpers.ts                     # Standardized { data: T } and { error: ... } responses
│   ├── store.ts                           # Crash-Safe PersistentStore with Atomic Disk Sync
│   └── utils.ts                           # Tailwind CSS class utilities (cn)
├── supabase/
│   └── migrations/
│       └── 20261031000000_core_billing_schema.sql # PostgreSQL 15+ Production Schema Migration
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
│   ├── persistence.test.ts                # Crash-Safe Atomic Persistence & Warm Reload Tests
│   ├── refund-reconciliation.test.ts      # Partial/Full Refunds & Status Regression Tests
│   ├── subscription-lifecycle.test.ts     # Guarded State Transition & Policy Tests
│   └── tax-discount.test.ts               # Deterministic Tax & Discount Fixture Tests
├── types/
│   ├── api.ts                             # Shared API Request/Response DTOs
│   ├── common.ts                          # Currency Formatting & Status Color Mappings
│   └── database.ts                        # Canonical Domain Entities, BillingRuns, AuditLogs & Enums
├── REQUIREMENTS_TRACEABILITY.md           # Requirements Traceability Matrix (F01–F36, N01–N06)
├── vitest.config.ts                       # Test Configuration
└── package.json                           # Next.js 16, React 19, Vitest, Tailwind
```

---

## 6. Verification & Test Suite Results
Vitest test suite executed and verified:
- **Test Files:** 15 passed (15/15)
- **Total Tests:** 58 passed (58/58)
- **Scale Benchmark (N01):**
  - 5,000 subscriptions filter and sort: **1.42ms** (Requirement: < 2,000ms)
  - 1,000 invoice batch generation: **112.47ms** (Requirement: < 2,000ms)

---

## 7. Build Status
- `npm run build` executed with **0 errors**.
- All 26 routes (Static pages, Server-rendered API Route Handlers, Partial Prerender) compiled successfully.

---

## 8. Current Project Status & Git Changelog
- **Git Branch:** `feature/navaneed-core-billing`
- **Remote Tracking:** `origin/feature/navaneed-core-billing`
- **Collaborator Branches Tracked:** `origin/docs/saarishma-qa` (PR #1 integrated), `origin/feature/frontend-ux`

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
