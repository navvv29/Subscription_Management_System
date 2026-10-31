# Subscript One backend foundation

This checkout started without an application scaffold or published DTO/API contract. It now contains a Next.js App Router + Supabase backend slice for Auth, roles, RLS, catalogue/customer APIs, and normalized billing-ready database tables. Monetary columns use integer paise (`*_minor`) in INR.

## Supabase setup

1. Create a Supabase project and install the Supabase CLI.
2. Copy `.env.example` to `.env.local`; fill the project URL and public anon key. Set `SUPABASE_SERVICE_ROLE_KEY` only in the server environment. It is imported exclusively by `lib/supabase/admin.ts` and must never use a `NEXT_PUBLIC_` prefix.
3. Link the project, then run `supabase db push` or apply `supabase/migrations/202610310001_core_schema.sql`; load demo records with `supabase db reset` or `supabase/seed.sql`.
4. In the [Supabase Dashboard Auth password policy](https://supabase.com/docs/guides/auth/password-security), set a minimum of 9 characters and require lowercase, uppercase, digits, and symbols. Supabase's managed Auth policy is configured in the project dashboard; `config.toml` covers the local Auth URLs/confirmation behavior. The API also validates this policy before calling Auth.
5. Configure and verify an SMTP/email provider before treating confirmation or password reset emails as delivered. This repository has no provider credentials, so email delivery is unverified.

For the first administrator, create a synthetic Auth user through Supabase Auth, then promote only that known user in the SQL editor as the project owner: `update public.profiles set role='admin' where id=(select id from auth.users where email=lower('your-admin@example.invalid'));`. After that, provision staff only through the admin-only API. The seed intentionally includes no passwords or Auth identities; sign up a synthetic customer and link its user ID to the seeded demo customer row to exercise customer isolation.

RLS grants customers access only to their linked customer record and their quotations, subscriptions, invoices, lines and payments. Staff/admin have shared operational read/write access; only admin can provision staff via `POST /api/auth/staff`. Public registration always creates a customer profile, regardless of submitted metadata. Finance/reporting has no separate role and is treated as staff. Public product reads are column-limited so cost price cannot be selected directly by an anon/authenticated browser key.

## API contract

Successful responses use `{ "data": ... }`; errors use `{ "error": { "code", "message", "details?" } }`. Paginated list responses carry `items`, `page`, `pageSize`, and `total`; `pageSize` is capped at 100.

| Endpoint | Access | Request/data notes |
|---|---|---|
| `POST /api/auth/signup` | Public | `{email,password,displayName}`; role is always customer |
| `POST /api/auth/login` | Public | `{email,password}`; sets Supabase session cookies |
| `POST /api/auth/logout` | Signed in | Ends current session |
| `POST /api/auth/reset-password` | Public | `{email}`; sends configured Supabase reset email |
| `GET /auth/reset-password?code=...` | Reset email link | Exchanges the one-time code for a session; then submit `{password}` to `/api/auth/update-password` |
| `POST /api/auth/update-password` | Reset session | `{password}`; validates and updates the password |
| `POST /api/auth/staff` | Admin | `{email,password,displayName,role?}`; role defaults to staff; requires server service key |
| `GET/POST /api/customers` | Signed in / staff | Query: `page,pageSize`; create `{name,email,phone?,company?,auth_user_id?}`; customer sees their linked record only |
| `GET/PATCH /api/customers/:id` | Own customer / staff | Detail/update; only staff may update |
| `GET/POST /api/products` | Signed in / staff | Query: `page,pageSize,active,type`; create `{name,type,sale_price_minor,cost_price_minor?,notes?,is_active?}`; cost is never returned to customer |
| `GET/PATCH /api/products/:id` | Signed in / staff | Detail/update; cost only returned to staff |
| `GET/POST /api/products/:id/variants` | Signed in / staff | List/create `{name,value?,price_adjustment_minor}` |
| `PATCH /api/products/variants/:variantId` | Staff | Update name/value/price adjustment |
| `GET/POST /api/plans` | Signed in / staff | Query: `page,pageSize,active,interval`; create/update uses billing interval, quantity, availability and lifecycle flags |
| `GET/PATCH /api/plans/:id` | Signed in / staff | Detail/update |

Catalogue request bodies use the database-style snake_case keys shown above. Response entities use the shared DTO camelCase fields (`salePriceMinor`, `isActive`, `authUserId`, `priceAdjustmentMinor`, `minimumQuantity`, and so on); product cost is included only for staff responses.

Catalogue amounts are integer minor units, not decimal rupees. Sale prices and costs are authoritative server-side values; future quotation/subscription/invoice write endpoints must re-read catalogue and tax/discount rules rather than trust browser prices. The shared billing endpoints in the brief are not implemented here because that logic belongs to the billing workstream.

## Tables and handoff

`profiles`, `customers`, `products`, `product_variants`, `plans`, `quotation_templates`, `quotation_template_items`, `quotations`, `quotation_items`, `subscriptions`, `subscription_items`, `tax_rules`, `discounts`, `discount_usages`, `invoices`, `invoice_items`, `payments`, `audit_logs`, `billing_runs`.

Key invoice handoff columns: `invoices(id,number,customer_id,subscription_id,status,billing_period_start,billing_period_end,due_date,currency,customer_name_snapshot,customer_email_snapshot,subtotal_minor,tax_minor,discount_minor,total_minor,paid_minor,tax_rule_snapshot,discount_snapshot,issued_at)`. Invoice line snapshots are `product_name_snapshot`, `description_snapshot`, `quantity`, `unit_price_minor`, `tax_rate_bps`, `tax_name_snapshot`, `tax_jurisdiction_snapshot`, `tax_minor`, `discount_code_snapshot`, `discount_description_snapshot`, `discount_minor`, `line_total_minor`. Payments reference invoices restrictively. The partial unique index `invoices_subscription_billing_period_uidx` enforces one non-null invoice per subscription and period. This is a proposed contract because no Navaneed integration contract or collaborator channel was present in the workspace; confirm compatibility before applying to a shared database.

Tax rules are configurable in basis points. Demo seed uses a 0% rule for an unspecified jurisdiction and does not encode legal tax behavior. Payment gateway, refunds, conversion, and scheduling are not configured. No production billing scheduler is claimed.

## Verification

`tests/permissions/validation.test.ts` covers admin-only staff creation, password rules, and catalogue value constraints. `supabase/tests/rls_and_integrity.sql` is a pgTAP suite for customer isolation, role elevation denial, unique profile email, unauthenticated reads, negative money checks, and critical indexes. `npm test` (4 tests), `npm run typecheck`, and `npm run build` passed. `supabase test db` could not run because the Supabase CLI/local database runtime and project credentials are absent. Migrations and live Auth email delivery have not been applied/tested; the password reset/confirmation email flow needs a configured, verified provider.
