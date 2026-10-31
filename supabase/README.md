# Supabase backend setup

This package adds Supabase Auth, Postgres/RLS, and persistent customer, product, variant, and plan APIs to the existing Subscript One app. It keeps the published entities in `types/database.ts` and request contracts in `types/api.ts`. Existing billing services are not rewritten here; their tables and snapshots are ready for the billing workstream's persistence adapter.

## Configure a project

1. Create a Supabase project and copy `.env.example` to `.env.local`. Set the project URL and anon key there. Set `SUPABASE_SERVICE_ROLE_KEY` only in server-side runtime settings; it is used in `lib/supabase/admin.ts` for staff product reads/writes and admin account provisioning.
2. Set Supabase Auth site URL and redirect allowlist to include `/auth/callback` and `/auth/reset-password` for local and deployed origins.
3. In Supabase Dashboard > Auth > Password security, require at least 9 characters, uppercase, lowercase, digits, and symbols. The API validates the same requirement. Configure a verified SMTP provider before treating confirmation/reset email as working.
4. For local development, run `supabase start` and `supabase db reset`. For a linked project, review the migration first, then use `supabase db push`. `supabase/seed.sql` inserts synthetic catalogue and billing demo rows only; it contains no accounts or credentials.

To bootstrap the first administrator, create a synthetic Auth user, then run this once from the trusted Supabase SQL editor as project owner, replacing the address:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = lower('admin@example.invalid'));
```

After that, staff accounts can be created only with `POST /api/auth/staff` by an administrator. Public sign-up metadata never assigns a role. A synthetic customer can sign up, then a staff member can link that user through `POST /api/customers` or `PATCH /api/customers/:id` with `authUserId`.

## API additions

- `POST /api/auth/signup` `{email,password,displayName}`; role is always customer.
- `POST /api/auth/login` `{email,password}`; Supabase session cookies are set server-side.
- `POST /api/auth/logout` ends the current session.
- `POST /api/auth/reset-password` `{email}` sends a configured Supabase recovery email.
- `GET /auth/reset-password?code=...` exchanges the one-time code; submit `{password}` to `POST /api/auth/update-password`.
- `POST /api/auth/staff` `{email,password,displayName,role?}` is admin-only; role defaults to staff.
- `GET/POST /api/customers`; `GET/PATCH /api/customers/:id`.
- `GET/POST /api/products`; `GET/PATCH /api/products/:id`.
- `GET/POST /api/products/:id/variants`; `PATCH /api/products/variants/:variantId`.
- `GET/POST /api/plans`; `GET/PATCH /api/plans/:id`.

All responses use the existing `{data: ...}` / `{error:{code,message}}` helper. List APIs keep the existing array response when no page parameters are supplied; callers can pass `page` and `pageSize` to receive the shared `PaginatedResponse` shape. Cost price is omitted from customer product reads and column grants; staff product routes fetch it through a server-only service client after role verification.

## Schema handoff

Migration tables use `snake_case`: `profiles`, `customers`, `products`, `product_variants`, `plans`, `quotation_templates`, `quotation_template_items`, `quotations`, `quotation_items`, `subscriptions`, `subscription_items`, `tax_rules`, `discounts`, `discount_usages`, `invoices`, `invoice_items`, `payments`, `audit_logs`, and `billing_runs`.

Money columns use integer paise (`*_minor`). Rates use basis points in the database (`18% = 1800 bps`); current `TaxRule.rate` DTO values are percentages and must be converted by any database adapter. Fixed discount values use paise; percentage discounts use `value_percent`. Invoice/customer/product/tax/discount snapshot columns preserve issued detail. The partial unique index `invoices_subscription_billing_period_uidx` enforces one subscription invoice per non-null period. Confirm these invoice/payment columns with Navaneed before applying to a shared database.

RLS ties customer access to `customers.auth_user_id` and limits quotations, subscriptions, invoices, lines, and payments to that customer. The existing billing and reporting handlers now require staff roles for writes and finance views; customer reads are filtered to their linked customer ID. The billing calculations and in-memory service adapters remain owned by the billing workstream and are not converted to database persistence in this branch. Staff/admin can perform operational writes; audit logs are admin-readable. Public catalogue access is limited to active records, with product cost excluded by column privileges.

## Verification status

`tests/permissions/roles.test.ts` verifies only admins can create staff. `supabase/tests/rls_and_integrity.sql` covers customer isolation, role elevation, anon access, column privacy, unique profile email, and money constraints. Run `npm test`, `npm run lint`, `npm run build`, and `supabase test db` from the repository. A Supabase project, verified email provider, and Navaneed's invoice contract confirmation are required for live integration validation.
