# Work Package 2 — Shehruz
## Frontend & UX: Admin Workspace, Customer Portal and Operational Screens

**Primary objective:** Build the polished, consistent user experience for Subscript One. Your pages should use shared typed DTOs and be ready to switch from mock data to real APIs without rewriting the UI.

### What you own

- Design system and reusable UI primitives for the product.
- Admin/staff navigation and responsive page layouts.
- Customer, product, variant, plan and quotation screens.
- Subscription, billing, invoice and payment screens that call Navaneed’s agreed operations.
- Customer portal views for the authenticated customer’s own quotations, subscriptions and invoices.
- Loading, empty, error, validation and success states.

### Files/modules you may own

- `components/ui/` and `components/forms/` (coordinate with Navaneed before global layout changes).
- `components/tables/`, `components/feedback/`, `components/navigation/` page-level pieces.
- `app/(dashboard)/customers/`, `products/`, `plans/`, `quotations/`, `subscriptions/`, `billing/`, `invoices/`, `payments/`.
- `app/portal/` customer-facing screens.
- Page-specific hooks and UI adapters under `features/*/components/` only where ownership is agreed.
- Use shared `types/` contracts; do not redefine the same entities locally.

**Do not own/edit:** Supabase migrations, auth/RLS policy, server billing calculations, payment balance logic, shared DTO definitions, or Saarishma’s `docs/` files. Do not change `package.json`, lockfile or global CSS without agreement.

### Required implementation tasks

#### A. UI foundation (0:00–1:00)
- Agree route structure and navigation with Navaneed.
- Establish restrained navy/indigo + neutral enterprise SaaS styling, clear typography, accessible contrast and consistent spacing.
- Use Tailwind + shadcn/ui + Lucide, React Hook Form and Zod where already configured.
- Build reusable page header, cards, table, status badge, search/filter row, form field, dialog/drawer, toast/alert and empty/error/loading states.
- Keep layouts responsive. Do not spend time on decorative animations.

#### B. Catalogue and customer screens (1:00–2:30)
- Customers: searchable list, create/edit form and detail view.
- Products: name, type, sale price, cost price, notes and active status.
- Variants: variant name/value and price adjustment; show price preview so the user can see the adjustment.
- Plans: daily/weekly/monthly/yearly interval, minimum quantity, availability dates and pause/early-close/renewal policy flags.
- Use client-side validation for helpful UX and rely on server-side validation for enforcement.
- Do not expose cost price to customer-facing pages.

#### C. Quotations and subscriptions (2:00–3:30)
- Quotation list/detail/form with template, product/plan lines, quantity, agreed unit price, validity period and status.
- Clearly show expired quotations and prevent presenting them as accept-ready.
- Subscription list/detail with number, customer, plan, start/end/next billing date, payment terms, line items and lifecycle status.
- Provide action buttons only for transitions allowed by the current status/permissions. Server remains authoritative.

#### D. Billing, invoice and payment screens (3:00–4:30)
- Billing Center: due subscriptions, “Process due invoices” action, batch summary and per-record failures.
- Invoice register/detail: customer snapshot, line items, tax/discount breakdown, subtotal, total, paid and balance.
- Confirm/cancel/print actions; show send-email status honestly. Do not label an email as sent unless backend/provider confirms success.
- Payment form: method, amount, date, note and selected invoice. Display remaining balance and validation feedback.
- Do not calculate invoice totals or discount eligibility as the source of truth in the browser; render server-returned values.

#### E. Customer portal and polish (4:00–5:30)
- Customer portal has reduced navigation and shows only the signed-in customer’s quotations, subscriptions and invoices.
- Never rely on hiding a UI link for security; API/RLS must enforce ownership.
- Add filters/search/pagination where endpoints support them.
- Ensure responsive states, useful empty states and clear success/error messages.

#### F. Integration (5:00–6:00)
- Replace mocks with real endpoints as they become available. Keep the same DTO shape.
- Test all forms and main navigation manually.
- Fix broken routes, console errors and obvious responsive issues.
- Provide Navaneed a short list of UI gaps/risks before the demo.

### UI acceptance criteria

- [ ] Admin/staff can navigate all core modules from a consistent shell.
- [ ] Customer, product, variant and plan forms include every required field.
- [ ] Quotation form supports template, lines and validity.
- [ ] Subscription detail exposes all required fields and lifecycle status.
- [ ] Billing Center exposes due work and batch outcomes.
- [ ] Invoice view shows customer, lines, taxes, totals and actions.
- [ ] Payment form captures method, amount, date and note.
- [ ] Customer portal has reduced navigation and displays only API-authorized records.
- [ ] Loading, empty, validation, success and error states exist on key screens.
- [ ] Pages are responsive and do not expose product cost data to customers.
- [ ] Integrated app builds and main workflow can be demonstrated.

### Six-hour schedule

| Time | Your deliverable |
|---|---|
| 0:00–1:00 | UI foundation, navigation, shared components |
| 1:00–2:00 | Customer/product/variant/plan screens |
| 2:00–3:00 | Quotation/subscription screens |
| 3:00–4:00 | Billing/invoice/payment screens |
| 4:00–5:00 | Customer portal, API wiring, filters |
| 5:00–6:00 | Responsive polish, integration fixes, demo QA |

### AI coding-agent prompt

> You are implementing only Shehruz’s Subscript One frontend work package. Read the README, shared DTOs and API contracts before coding. Work only in Shehruz-owned UI/page files. Do not edit migrations, auth/RLS, billing calculations, payment reconciliation, shared DTOs, package configuration or Saarishma’s docs without approval. Build responsive Next.js pages using the existing Tailwind/shadcn conventions. Use typed API adapters and mock data only where endpoints are not ready; mock shapes must match the shared DTOs exactly. Do not calculate authoritative tax, discount, invoice or payment totals in the browser. Include loading/empty/error/success states, form validation and accessibility basics. Run lint/build if available and report exact results and remaining mock integrations.


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
