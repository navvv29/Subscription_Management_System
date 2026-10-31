# Work Package 4 — Saarishma
## Mobile-First Contributor: QA, Requirements Traceability, Documentation & GitHub Coordination

> **Phone-first assignment:** You do not need a laptop, terminal, local development environment or IDE. Your work is valuable and has clear ownership: keep requirements visible, make the repo understandable, review changes, and catch missing/unsafe behavior before the demo.

### Your role and contribution

You are the **QA and documentation owner** for Subscript One. You will contribute through the GitHub mobile app (or GitHub website on phone). Your deliverables are committed Markdown files, issue/PR reviews, acceptance checklists and demo content.

You are not expected to run the app or execute tests locally. Do not accept tasks that require terminal commands, local builds, database setup or editing large source files from a phone. Ask a laptop member to run tests and paste the results into the relevant PR or issue; you verify that evidence against the checklist.

### What you own

- `docs/REQUIREMENTS_TRACEABILITY.md`
- `docs/QA_TEST_PLAN.md`
- `docs/DEMO_SCRIPT.md`
- `docs/KNOWN_LIMITATIONS.md`
- GitHub Issues for requirements/bugs and labels/milestones if enabled.
- Reviewing PR descriptions against acceptance criteria and leaving comments when behavior/evidence is missing.
- Final demo narration/checklist and honest disclosure of unverified capabilities.

**Do not edit application code, database migrations, shared DTOs, package files or global styles.** These files are hard to review safely on a phone and belong to the laptop owners. If you find a defect, create an issue with exact steps rather than patching code.

### Phone-friendly workflow

1. Open the shared repository in the GitHub mobile app.
2. Open `docs/`; use **Add file → Create new file** to create each document listed above. Commit to a branch such as `docs/saarishma-qa` and open a PR.
3. For a typo or small checklist change, use the file’s edit (pencil) option, commit to a new branch, and open a PR.
4. Open each teammate’s PR and read the changed-files summary and description.
5. Use PR comments to ask: What requirement does this satisfy? Which test was run? What was the result? Are there screenshots or sample outputs?
6. Use Issues to record missing requirements and bugs with clear reproduction steps.
7. Never approve a security/financial change just because the code looks plausible. Ask Afeeela/Navaneed to state the test evidence.

### Your tasks and deliverables

#### A. Requirements traceability (0:00–1:30)
Create `docs/REQUIREMENTS_TRACEABILITY.md` with one row per requirement:
- F01–F36 (functional requirements)
- N01–N06 (non-functional requirements)

Use the requirement descriptions below and add columns: `Owner`, `Implementation location/PR`, `Evidence/status`, `Open question`. Suggested statuses: `Not started`, `In progress`, `Implemented—needs test`, `Verified`, `Deferred with reason`.

Make sure the following are represented:
- F01–F04: registration, unique email, password rule, reset email.
- F05–F07: roles, admin-only staff creation, customer data isolation.
- F08–F12: products, variants, billing plans, quantity/availability, lifecycle policies.
- F13–F18: quotation templates/validity, subscription fields/lines/lifecycle/status visibility.
- F19–F23: invoice generation/content/states/actions and no duplicate/skipped billing.
- F24–F29: fixed/percentage discounts, thresholds, dates, usage caps, scope and automatic application/expiry.
- F30–F32: payments and paid/outstanding/overdue invoice visibility.
- F33–F36: active subscriptions, revenue/payments, outstanding/overdue metrics and filters.
- N01–N06: performance, billing reliability, security, financial correctness, usability and maintainability.
- Do not mark something `Verified` without a test result, PR/commit reference or screenshot/output that supports it.


### Requirement ID coverage reference (include every ID in your traceability table)

| ID | Requirement summary | Default owner |
|---|---|---|
| F01 | Customer registration | Afeeela |
| F02 | Unique email per account | Afeeela |
| F03 | Password length/uppercase/lowercase/special-character rule | Afeeela |
| F04 | Password reset link/email | Afeeela |
| F05 | Admin, staff and customer roles | Afeeela |
| F06 | Only admin can add staff | Afeeela |
| F07 | Customers can access only their own records | Afeeela |
| F08 | Product name, type, sale price, cost price and notes | Afeeela |
| F09 | Product variants and price additions | Afeeela |
| F10 | Daily, weekly, monthly and yearly billing plans | Afeeela |
| F11 | Plan minimum quantity and availability dates | Afeeela |
| F12 | Plan pause, early-close, auto-close and renewal behavior | Navaneed + Afeeela |
| F13 | Quotation templates with plan/product lines | Shehruz + Afeeela |
| F14 | Quotation validity period | Navaneed + Shehruz |
| F15 | Subscription number, customer, plan, dates and payment terms | Navaneed + Afeeela |
| F16 | Subscription lines, quantity, unit price, taxes and amount | Navaneed + Afeeela |
| F17 | Draft → Quotation → Confirmed → Active → Closed lifecycle | Navaneed |
| F18 | Team visibility of subscription status | Shehruz + Navaneed |
| F19 | Invoice generated from subscription | Navaneed |
| F20 | Invoice customer details, lines, taxes and totals | Navaneed + Afeeela |
| F21 | Draft → Confirmed → Paid invoice lifecycle and payment balance | Navaneed |
| F22 | Confirm, cancel, send and print invoices | Navaneed + Shehruz |
| F23 | No duplicate or skipped billing | Navaneed + Afeeela |
| F24 | Admin-managed fixed/percentage discounts | Navaneed + Afeeela |
| F25 | Discount minimum purchase or quantity | Navaneed |
| F26 | Discount validity dates and usage limits | Navaneed + Afeeela |
| F27 | Discount product/subscription scope | Navaneed + Afeeela |
| F28 | Eligible discount automatically applied to next invoice | Navaneed |
| F29 | Discount stops when expired/exhausted | Navaneed |
| F30 | Payment method, amount, date and note against invoice | Navaneed |
| F31 | Paid and outstanding invoice visibility | Navaneed + Shehruz |
| F32 | Overdue invoice follow-up | Navaneed + Shehruz |
| F33 | Active subscription finance view | Navaneed |
| F34 | Revenue and payment finance view | Navaneed |
| F35 | Outstanding and overdue finance view | Navaneed |
| F36 | Filters and summary view | Shehruz + Navaneed |
| N01 | Under-two-second pages with thousands of subscriptions (must benchmark) | Afeeela + Navaneed |
| N02 | Reliable billing with no duplicate/skipped invoices | Navaneed + Afeeela |
| N03 | Role and customer-data security | Afeeela |
| N04 | Correct deterministic financial calculations | Navaneed + Afeeela |
| N05 | Usable, unified, responsive system | Shehruz |
| N06 | Maintainable/scalable architecture and indexes | Navaneed + Afeeela |

Do not treat this ownership map as proof that an item is implemented. The PR owner must provide test evidence; update the `Owner`, `Implementation location/PR`, `Evidence/status` and `Open question` columns as work progresses.

#### B. QA test plan (1:00–3:00)
Create `docs/QA_TEST_PLAN.md` with phone-readable numbered cases. For each test include: ID, preconditions, steps, expected result, evidence requested, tester and status.

Minimum test cases:
1. Duplicate email registration is rejected.
2. Password rejects missing length/uppercase/lowercase/special-character rule.
3. Only admin can create staff.
4. Customer A cannot access Customer B’s quotation/subscription/invoice.
5. Variant price adjustment is applied exactly once.
6. Daily/weekly/monthly/yearly billing periods are correct; month-end/leap-year behavior is defined.
7. Expired quotation cannot be accepted.
8. Invalid subscription transition is rejected.
9. Paused/closed/expired subscription is skipped by billing.
10. Running billing twice does not create a duplicate invoice.
11. Failed invoice creation does not advance next billing date.
12. Discount fails when expired, below threshold or usage limit exhausted.
13. Discount usage cap cannot be exceeded by concurrent requests (if concurrency test is not feasible, mark unverified).
14. Tax and discount calculations match deterministic test fixtures.
15. Partial payment reduces balance; full payment marks invoice paid; overpayment is rejected or handled by explicit policy.
16. Overdue list excludes paid/cancelled invoices.
17. Dashboard metrics reconcile with invoices/payments.
18. Print view contains customer, lines, tax and totals.
19. Password reset and invoice email are tested with a verified email provider.
20. Pagination/performance is measured with thousands of representative subscriptions.

#### C. Demo script (2:30–4:00)
Create `docs/DEMO_SCRIPT.md` with a three-minute sequence:
- Introduce manual subscription/billing pain and Subscript One.
- Admin configures product, price-adjusting variant, plan, tax and discount.
- Staff creates/opens a quotation and converts an accepted offer.
- Run Process Due Invoices and show the generated invoice breakdown.
- Run billing a second time to demonstrate duplicate protection.
- Record payment and show invoice balance/status change.
- Return to dashboard and show active subscriptions, collected, outstanding and overdue figures reconcile.
- Prepare a clear fallback if email, scheduler or deployment is unavailable.
- Never claim a feature works if it has not been demonstrated/tested.

#### D. Known limitations and open decisions (3:30–4:30)
Create `docs/KNOWN_LIMITATIONS.md`. Track:
- Email delivery needs a verified provider and redirect configuration.
- Scheduled production billing is not proven by a manually triggered batch.
- Under-two-second performance at thousands of records needs measurement.
- Tax jurisdiction/rates and inclusive/exclusive behavior are not defined by the source.
- Payment gateway, refunds and currency conversion are not specified.
- Any incomplete role, lifecycle, discount or concurrency behavior.
- For every limitation: impact, current workaround/demo treatment, owner and next step.

#### E. GitHub coordination and review (throughout)
- Create issues for each unowned requirement or failing test. Assign the relevant member: Navaneed for subscription/billing/invoice/payment/dashboard; Shehruz for UI/portal; Afeeela for schema/auth/RLS/catalogue APIs.
- Review PRs for clear scope, linked requirement IDs, screenshots for UI, test evidence for financial/security logic, and whether the change touches another owner’s files.
- Keep a simple “must fix before demo” issue list. Do not block a PR for cosmetic polish if the core workflow is at risk; do block it for data leakage, duplicate billing or incorrect totals.
- At hour 5, ask each owner for a one-line verified/unverified status and capture it in `KNOWN_LIMITATIONS.md`.

### Phone-friendly commit plan

| Time | Phone task |
|---|---|
| 0:00–1:00 | Create docs branch and requirements traceability file |
| 1:00–2:00 | Add QA test plan; open issues for uncovered requirements |
| 2:00–3:00 | Review UI/backend PRs; request test evidence |
| 3:00–4:00 | Add three-minute demo script and demo data checklist |
| 4:00–5:00 | Record limitations/open decisions; run requirement coverage review |
| 5:00–6:00 | Final PR review, verify statuses, prepare demo narration |

### Acceptance criteria for your contribution

- [ ] Four documentation files exist under `docs/`.
- [ ] All F01–F36 and N01–N06 are present in the traceability document.
- [ ] No requirement is marked verified without evidence.
- [ ] The QA plan contains all 20 mandatory test scenarios and expected results.
- [ ] The demo script demonstrates the persisted vertical slice and duplicate-billing guard.
- [ ] Known limitations distinguish implemented, tested, configured and unverified behavior.
- [ ] Relevant issues are assigned to the correct owner.
- [ ] PR reviews identify missing requirement IDs/test evidence and any ownership conflict.
- [ ] You can complete the work using GitHub mobile; no laptop-only task is assigned to you.

### Ready-to-use PR review comment

> I reviewed this PR against the Subscript One requirements. Please add (1) the requirement IDs covered, (2) the exact test command or manual steps run, (3) the actual result, and (4) a screenshot/sample response if this changes UI or API behavior. If this changes auth/RLS, billing dates, tax, discounts, invoice totals or payment balances, please include the relevant negative/edge-case test evidence. I will mark the requirement verified only after evidence is available.

### Ready-to-use issue template

> **Requirement ID(s):**
> **Area/owner:**
> **Precondition:**
> **Steps to reproduce:**
> **Expected result:**
> **Actual result:**
> **Evidence (screenshot, response, test output):**
> **Severity:** Blocker / High / Medium / Low

### AI assistance prompt (phone-friendly)

> Help me review this Subscript One GitHub PR or issue against the supplied requirement IDs. Do not assume code works. Identify which requirements are addressed, what evidence is present, what evidence is missing, whether the change conflicts with another member’s ownership, and concise questions I should ask the author. Prioritize security, duplicate billing and financial correctness over cosmetic issues. Do not mark any requirement verified without test evidence.


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
