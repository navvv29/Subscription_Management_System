# Work Package 3 — Afeeela
## Backend & Database: Supabase, Authentication, Roles, RLS and Catalogue APIs

**Primary objective:** Build the secure relational foundation and the backend operations needed by the app. Your work protects customer data and supplies reliable catalogue/customer data to the UI and billing workflow.

### What you own

1. Supabase project configuration guidance and environment variable template.
2. PostgreSQL schema/migrations and seed data.
3. Supabase Auth integration, profile creation and password validation/reset configuration.
4. Admin/staff/customer role checks and row-level security (RLS).
5. Customer, product, variant and plan APIs/services.
6. Database constraints and indexes, including invoice billing-period idempotency constraint (coordinate with Navaneed).
7. Permission and data-integrity tests.

### Files/modules you may own

- `supabase/migrations/`, `supabase/seed.sql`, `supabase/tests/`.
- `lib/supabase/` server/browser clients and server-only helpers.
- `lib/auth/`, `lib/permissions/`, `lib/validation/` for shared backend authorization.
- `app/api/auth/`, `app/api/customers/`, `app/api/products/`, `app/api/plans/` or equivalent server actions.
- `features/customers/`, `features/products/`, `features/plans/` server-side services.
- `.env.example` (variable names/placeholders only).
- `tests/permissions/` and database integration tests.

**Do not own/edit:** UI page components, billing/subscription business logic, dashboard design, shared DTO definitions after they are published, or Saarishma’s docs. Coordinate any schema change that affects Navaneed’s billing/invoice/payment code before migration.

### Required implementation tasks

#### A. Database schema (0:00–1:30)
Create normalized migrations for the agreed minimum tables:
- `profiles` linked to Supabase Auth user ID, email, display name, role.
- `customers` with contact/company details and optional linked auth user.
- `products` with name, type, sale price, cost price, notes and active state.
- `product_variants` with product ID, name/value and price adjustment.
- `plans` with billing interval, minimum quantity, availability dates and lifecycle policy flags.
- `quotation_templates` and `quotation_template_items`.
- `quotations` and `quotation_items`.
- `subscriptions` and `subscription_items`.
- `tax_rules`, `discounts`, `discount_usages`.
- `invoices`, `invoice_items`, `payments`.
- `audit_logs` and `billing_runs` if time permits; prioritize core foreign keys and invoice idempotency first.

Use integer minor units for INR amounts (paise) or a carefully tested decimal type. Add foreign keys, non-negative/positive checks, valid date-range checks and unique numbers. Use consistent snake_case column names and publish them to Navaneed.

#### B. Auth and roles (1:00–2:30)
- Implement sign-up/login using Supabase Auth.
- Enforce password longer than eight characters with uppercase, lowercase and special character (client validation can assist, server/Auth policy must enforce).
- Ensure email uniqueness through Auth and database constraints as appropriate.
- Create/link `profiles` safely when an Auth user registers.
- Implement password reset redirect flow. Actual email delivery must be tested with a verified provider.
- Roles: `admin`, `staff`, `customer`. Only admin can add staff.
- Finance lead is treated as staff with finance/reporting permissions unless organizers require a separate role.
- Never allow a user to assign themselves an admin/staff role through public registration or a browser payload.

#### C. Authorization and RLS (1:30–3:00)
- Protect privileged operations with server-side role checks.
- Enable RLS on user/customer-sensitive tables.
- Customers must see only their own quotations, subscriptions and invoices.
- Staff/admin access is permission-checked; do not assume every staff member should access every sensitive action unless the app’s role model says so.
- Never put service-role credentials in client bundles.
- Add negative tests: Customer A cannot read Customer B’s records; staff/customer cannot create staff; unauthenticated user cannot read private records.

#### D. Catalogue/customer APIs (2:30–4:00)
- Customer create/list/detail/update with authorization and validation.
- Product create/list/detail/update including sale price, cost price, type and notes.
- Variant create/update/list and price adjustment.
- Plan create/update/list with interval, minimum quantity, availability and lifecycle flags.
- Use server-side pagination and filters; avoid returning unnecessary columns. Do not return cost price to customer-facing endpoints.
- Keep response shape aligned with the shared integration contract.

#### E. Financial schema handoff and integrity (3:30–5:00)
- Coordinate invoice and payment columns with Navaneed before finalizing migrations.
- Add the critical unique key for subscription invoice billing period: `(subscription_id, billing_period_start, billing_period_end)` (or an agreed equivalent including invoice source/type).
- Add indexes: `subscriptions(status, next_billing_date)`, `invoices(status, due_date)`, `invoices(customer_id, created_at)`, `payments(invoice_id, payment_date)` and foreign-key/filter columns.
- Invoice line/customer/product/tax/discount snapshots must be stored so later catalogue changes do not rewrite issued invoices.
- Ensure payment foreign keys point to the correct invoice. Avoid destructive cascade rules for financial records; use restrictive behavior or soft-delete as agreed.

#### F. Seed, tests and integration (5:00–6:00)
- Seed synthetic admin/staff/customer accounts, products, variant, plans, quotation and sample invoice/payment records as safe demo data.
- Do not commit real user data or secrets.
- Run migrations from a clean database if possible.
- Test role denial, customer isolation, unique email, constraints and API validation.
- Send Navaneed and Shehruz exact table names, columns, endpoints and any limitations.

### Acceptance criteria

- [ ] Auth sign-up/login and password validation are wired.
- [ ] Password reset flow is configured; email delivery status is honestly reported.
- [ ] Roles cannot be self-assigned; only admin can create staff.
- [ ] RLS/authorization prevent cross-customer access.
- [ ] Customer/product/variant/plan CRUD APIs persist and validate data.
- [ ] Database schema supports quotations, subscriptions, invoices, discounts, taxes, payments and audit.
- [ ] Billing-period unique constraint and critical indexes exist.
- [ ] Invoice snapshots preserve issued financial details.
- [ ] Seed data supports the demo.
- [ ] Permission/integrity tests pass and no secrets are committed.

### Six-hour schedule

| Time | Your deliverable |
|---|---|
| 0:00–1:00 | Supabase connection, initial schema, profiles/customers |
| 1:00–2:00 | Auth, roles, products/variants/plans tables |
| 2:00–3:00 | RLS and customer/product/plan APIs |
| 3:00–4:00 | Quotations/subscriptions/invoices/payment schema and API foundations |
| 4:00–5:00 | Idempotency/indexes, validation, permission tests |
| 5:00–6:00 | Seed data, clean migration check, integration support |

### AI coding-agent prompt

> You are implementing only Afeeela’s Subscript One backend/database work package. Read the README, agreed DTOs and API contracts first. Work only in Afeeela-owned migrations, Supabase/auth/permissions modules and catalogue/customer APIs. Before changing invoice/subscription/payment schema, coordinate exact columns and constraints with Navaneed. Create safe reversible migrations, enforce roles server-side and use RLS for customer isolation. Never expose service-role secrets in browser code or commit credentials. Use integer minor units for money. Add negative authorization tests and data-integrity constraints. Do not build UI or alter Saarishma’s docs. Run migrations/tests where possible and report exact results, assumptions and unresolved configuration (especially email provider and tax policy).


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
