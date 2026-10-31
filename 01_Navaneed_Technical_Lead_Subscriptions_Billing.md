# Work Package 1 — Navaneed
## Technical Lead, Subscription Lifecycle, Billing & Finance Command Center

**Primary objective:** Own the product’s central business workflow and keep all branches integrating into one working application. You are responsible for the subscription-to-invoice-to-payment path and the command-center metrics.

### What you own

1. Technical leadership, repository bootstrap/integration and shared TypeScript contracts.
2. Subscription lifecycle service and quotation-to-subscription conversion.
3. Billing-period calculation and authorized “Process due invoices” batch.
4. Invoice generation/confirmation/cancellation behavior and payment reconciliation (coordinate DB schema with Afeeela).
5. Dashboard/finance summary API and integration of the end-to-end demo.
6. Final deployment/demo coordination.

### Files/modules you may own

- `app/layout.tsx`, `app/(dashboard)/layout.tsx` and top-level navigation/app shell.
- `types/` or `lib/contracts/` shared DTOs (publish early; do not change casually).
- `features/subscriptions/` business service and lifecycle transitions.
- `features/billing/` billing period and invoice-generation orchestration.
- `features/invoices/` invoice actions/services, only in coordination with Afeeela’s schema.
- `features/payments/` payment reconciliation service.
- `app/api/billing/`, `app/api/subscriptions/`, `app/api/dashboard/`, `app/api/reports/` or equivalent server actions.
- Dashboard page composition and data wiring; coordinate UI components with Shehruz.
- `docs/` is owned by Saarishma; do not edit it without asking her.

**Protected/shared files:** `package.json`, lockfile, global CSS, Supabase migrations, auth/RLS modules and Shehruz’s page/component files. You may make a necessary change only after messaging the owner and including it in a focused PR.

### Required implementation tasks

#### A. Repository and contracts (0:00–0:45)
- Confirm Next.js + TypeScript app boots; establish branch `feature/navaneed-core-billing`.
- Create or confirm app shell and route structure with Shehruz.
- Publish DTOs and API response conventions from the shared integration contract.
- Agree with Afeeela on exact table/column names before writing queries.
- Add a minimal health/home page if needed so the repo always runs.

#### B. Subscription lifecycle (0:45–2:00)
- Implement guarded transitions: `Draft → Quotation → Confirmed → Active → Closed`, with allowed `Paused` and `Expired` states and renewal behavior.
- Reject invalid transitions. A paused/closed/expired subscription must not be billed.
- Convert only a valid, non-expired accepted quotation. Preserve agreed line prices/terms; do not silently reprice from current catalogue values.
- Use plan policy flags for pause, early close and renewal; document any edge case deferred due to time.
- Generate a unique human-readable subscription number.

#### C. Billing and invoice generation (2:00–4:00)
- Implement one shared date utility for daily, weekly, monthly and yearly periods. Explicitly handle month-end and leap-year cases; do not rely on JavaScript date overflow.
- Process due active subscriptions in a server-side batch initiated by an authorized admin/staff user.
- Generate invoice and invoice-line snapshots (customer/product descriptions, unit price, tax/discount breakdown, totals).
- Apply configured tax rules and eligible discounts deterministically. Coordinate inclusive/exclusive behavior with the team; the source does not specify it.
- Prevent duplicate invoices with the unique `(subscription_id, billing_period_start, billing_period_end)` constraint agreed with Afeeela. The transaction must not advance `next_billing_date` unless invoice creation succeeds.
- A repeated batch must return an existing/already-processed result rather than create a duplicate.
- Record per-subscription failures; one bad subscription must not silently abort the whole run.
- Implement confirm/cancel/print-ready invoice output. Sending email only counts as working if a verified provider is configured and tested.

#### D. Payments and dashboard (3:30–5:15)
- Record a payment against the correct invoice with method, amount, date and note.
- Prevent overpayment for the MVP unless the team explicitly implements credit/overpayment behavior.
- Derive `paidMinor` and `balanceMinor` from valid payments. Partial payment must not mark an invoice fully paid.
- Dashboard summary must derive from persisted records: active subscriptions, collected amount, outstanding amount, overdue amount, due billing count and recent activity if time permits.
- Ensure the dashboard and finance report use the same definitions and reconcile to invoice/payment rows.

#### E. Integration and demo (5:00–6:00)
- Merge only after local build/tests pass. Resolve conflicts with owners; do not overwrite others’ work.
- Run the full demo path: customer → quotation → subscription → process billing → invoice → payment → dashboard update.
- Deploy only after a clean build; preserve a known-good commit and a local/demo fallback.
- Do not claim email delivery, scheduled billing or performance targets unless verified.

### Tests you must write or coordinate

- Each billing interval; month-end and leap-year date fixtures.
- Invalid subscription transitions rejected.
- Paused/closed/expired subscriptions skipped by billing.
- Expired quotation conversion rejected.
- Re-running the same billing batch does not duplicate invoices.
- Failed invoice creation does not advance the subscription billing date.
- Discount threshold/date/usage-cap cases and deterministic tax fixture.
- Partial payment reduces balance; full payment marks paid; overpayment rejected.
- Dashboard aggregates reconcile with source invoice/payment rows.

### Acceptance criteria

- [ ] A valid quotation can become a subscription with its agreed line prices preserved.
- [ ] Subscription lifecycle transitions are guarded and visible.
- [ ] A due active subscription produces one invoice for the correct period.
- [ ] Re-running billing does not duplicate that invoice.
- [ ] Invoice lines preserve product/customer/price/tax snapshots.
- [ ] Payment updates invoice balance and paid/outstanding state correctly.
- [ ] Dashboard numbers reconcile with persisted records.
- [ ] All business calculations are server-side and use integer minor units/decimal-safe arithmetic.
- [ ] `npm run build` and relevant tests pass on the integrated branch.

### Six-hour schedule

| Time | Your deliverable |
|---|---|
| 0:00–1:00 | App shell, branch, shared DTOs, schema agreement |
| 1:00–2:00 | Subscription lifecycle and quotation conversion |
| 2:00–3:00 | Billing period utility and invoice generator |
| 3:00–4:00 | Tax/discount integration, idempotency and payment service |
| 4:00–5:00 | Dashboard aggregates and integration |
| 5:00–6:00 | Critical tests, bug fixes, deploy/demo |

### AI coding-agent prompt

> You are implementing only Navaneed’s Subscript One work package. First inspect the repository README, shared DTOs, database schema and current branch. Work only in the files assigned to Navaneed in this work package. Do not change Supabase migrations, RLS/auth, Shehruz’s UI components or Saarishma’s docs without explicit approval. Implement deterministic subscription lifecycle, billing, invoice and payment behavior. Use integer minor units for money; never use floating-point financial arithmetic. Never use an LLM for dates, tax, discounts or totals. Add tests for every state transition and financial edge case. Preserve existing conventions, run tests/build, and report changed files, assumptions, unimplemented requirements and exact test results. Do not claim a test passed unless you ran it.


## Shared project rules (apply to everyone)

- Product: **Subscript One — Subscription Management & Operations Command Center**.
- Timebox: **6 hours**. Build a demonstrable, persisted vertical slice before optional polish.
- Stack from the team blueprint: Next.js App Router, TypeScript, Tailwind + shadcn/ui + Lucide, React Hook Form + Zod, Supabase PostgreSQL/Auth, server-side authorization + RLS, Recharts, date-fns, Vitest, Vercel.
- One shared GitHub repository is the source of truth. Each laptop contributor uses a separate feature branch and local working copy/worktree. Do not have multiple agents edit the same working directory.
- `main` must remain runnable. Open small PRs; integrate every 30–45 minutes. Pull/rebase before pushing. Tell the owner before touching a protected/shared file.
- AI coding agents may help, but each agent must read the project README and agreed contracts first. Review all generated code. Humans must verify auth/RLS, SQL migrations, billing dates, tax, discounts, invoice totals and payment balances.
- Do not expose Supabase service-role keys in browser code. Keep secrets out of commits; commit `.env.example` with names/placeholders only.
- Money must use integer minor units (paise for INR) or a carefully tested decimal type, never JavaScript floating-point arithmetic for financial totals.
- Billing dates, tax, discounts, invoice totals and payment balances must be deterministic server-side code. **Never delegate financial calculations to an LLM.**
- The problem statement does not specify tax jurisdiction/rates, inclusive-vs-exclusive tax, payment gateway, refund policy or currency conversion. Do not invent legal tax behavior; use configurable tax rules and document the chosen demo assumption.
- Password reset and invoice email are real requirements only when a verified email provider is configured and tested. A demo fallback must be labelled as such.
- For the six-hour demo, billing can be an authorized server-side “Process due invoices” batch. Do not claim scheduled production billing unless a scheduler is configured and verified.
- The target of under two seconds with thousands of subscriptions is a requirement to measure, not a result to assume. Use indexes, server-side pagination and aggregation; report only measured timings.
- AI summaries are optional and come after core workflows. AI may summarize permission-filtered, server-computed data only.


## Shared integration contract — freeze this before parallel implementation

The technical lead creates these minimal interfaces in `types/` or `lib/contracts/` and posts them in the team chat before the end of hour 1. If the repository already has equivalent names, keep the existing names and update this document rather than creating duplicates.

### Canonical entities (minimum fields; extend only by agreement)

- `Profile`: `id`, `email`, `displayName`, `role: 'admin' | 'staff' | 'customer'`.
- `Customer`: `id`, `name`, `email`, `phone?`, `company?`, `authUserId?`.
- `Product`: `id`, `name`, `type`, `salePriceMinor`, `costPriceMinor`, `notes?`, `isActive`.
- `ProductVariant`: `id`, `productId`, `name`, `priceAdjustmentMinor`.
- `Plan`: `id`, `name`, `interval: 'daily' | 'weekly' | 'monthly' | 'yearly'`, `minimumQuantity`, `availableFrom?`, `availableUntil?`, `allowPause`, `allowEarlyClose`, `allowRenewal`.
- `Quotation`: `id`, `number`, `customerId`, `status`, `validUntil`, `items`, `totalMinor`.
- `Subscription`: `id`, `number`, `customerId`, `planId`, `status`, `startDate`, `endDate?`, `nextBillingDate`, `paymentTerms`, `items`.
- `Invoice`: `id`, `number`, `customerId`, `subscriptionId?`, `status`, `billingPeriodStart?`, `billingPeriodEnd?`, `dueDate`, `totalMinor`, `paidMinor`, `balanceMinor`.
- `Payment`: `id`, `invoiceId`, `amountMinor`, `method`, `paymentDate`, `note?`.
- `DashboardSummary`: `activeSubscriptions`, `collectedMinor`, `outstandingMinor`, `overdueMinor`, `dueForBillingCount`.

### API shape (adapt to server actions if the app uses them, but keep equivalent typed operations)

- `GET/POST /api/customers`
- `GET/POST /api/products`
- `GET/POST /api/plans`
- `GET/POST /api/quotations`
- `POST /api/quotations/:id/convert`
- `GET/POST /api/subscriptions`
- `PATCH /api/subscriptions/:id` for guarded state transitions
- `POST /api/billing/process`
- `GET/POST /api/invoices`
- `POST /api/invoices/:id/confirm`
- `POST /api/invoices/:id/cancel`
- `POST /api/payments`
- `GET /api/dashboard`
- `GET /api/reports/revenue`

Every API returns a predictable shape, e.g. `{ data: T }` on success and `{ error: { code, message } }` on failure. Validate inputs with Zod on the server. Never trust a customer ID, role or price supplied by the browser without checking authorization and authoritative records.

### Cross-workstream handoff rules

1. Member 3 publishes migration/table names and role/RLS behavior to Members 1 and 2 as soon as the first migration is stable.
2. Member 1 publishes billing/subscription DTOs and endpoint behavior to Members 2 and 3 before UI/API wiring.
3. Member 2 uses mock data matching the shared DTOs until real endpoints are ready; do not invent a second data model.
4. Member 4 owns `docs/`, issue tracking, requirement traceability and acceptance-test evidence. She does not edit application code or migrations.
5. Any breaking change to a shared contract requires a message, a small PR and updates to both consumer work packages before merge.
