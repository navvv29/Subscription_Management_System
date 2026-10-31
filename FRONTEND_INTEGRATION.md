# Frontend integration notes

This branch merges the Work Package 2 frontend (admin workspace + customer
portal) into the shared application. The lead's API routes, validation schemas,
billing services, in-memory store and tests are unchanged in behaviour; the UI
now runs inside `app/` and talks to those endpoints instead of mock fixtures.

## Structure

| Path | Purpose |
| --- | --- |
| `app/(dashboard)/*` | Staff/admin pages under one shell. URLs are `/dashboard`, `/customers`, `/products`, `/plans`, `/quotations`, `/subscriptions`, `/billing`, `/invoices`, `/payments`. |
| `app/portal/*` | Customer portal (`/portal`, `/portal/subscriptions`, `/portal/invoices`). |
| `components/ui/` | Shared primitives: buttons, cards, tables, badges, dialogs, alerts, empty/loading/error states, pagination. |
| `components/layout/` | Admin and portal shells. |
| `lib/api/` | Typed adapters plus `mappers.ts`, which converts canonical server DTOs into the view models the pages render. |
| `lib/hooks/use-api-resource.ts` | Loading/error/reload state for list and detail pages. |
| `types/database.ts` | Canonical server entities (unchanged, plus optional quotation-line `planId`/`planName`). |
| `types/ui.ts`, `types/ui-api.ts` | Frontend view models and API envelope/pagination helpers. |

## Running

```bash
npm install
npm run dev        # http://localhost:3000
npm run build
npm run lint
npm test
```

The admin UI calls the real route handlers by default. To run the UI without a
server (isolated component work), set `NEXT_PUBLIC_API_MODE=mock`; the fixtures
in `lib/mock-data.ts` then back the pages.

## Wiring choices

- Server-returned money is rendered as-is. No tax, discount, invoice or payment
  arithmetic happens in the browser.
- Subscription lifecycle buttons translate the requested target status into the
  server's explicit actions (`submit_quotation` → `confirm` → `activate`,
  `pause`, `resume`, `close`). The server still validates every transition.
- Invoice `overdue` is a display state derived from `dueDate` and `balanceMinor`;
  stored statuses remain the server's.
- Quotations can carry a plan per line (optional field added to the schema and
  canonical item type). Conversion prefers that plan and falls back to the first
  plan whose minimum quantity the quotation satisfies.
- Email is never reported as sent: no provider is configured, and the UI says so.
- The portal remains a labelled demo session. There is no authentication or
  customer-scoped API in this build, so it reads local sample records. Do not
  treat any portal hiding of links as authorization.

## REST routes added for the UI

- `GET/PATCH/DELETE /api/customers/:id`
- `GET/PATCH /api/products/:id`
- `GET/POST /api/products/variants`, `PATCH /api/products/variants/:id`
- `GET/PATCH/DELETE /api/plans/:id`
- `GET/PATCH /api/quotations/:id`

Small additive changes: quotation lines accept `planId`, conversion prefers the
line plan, and billing batch results include `subscriptionNumber`.

## Known gaps

- The store is in memory: restarting the server resets customers, quotations,
  subscriptions, invoices and payments to the seed data.
- No Supabase auth/RLS, so portal data is not server-authorized yet.
- No email provider; "Send email" reports the demo fallback.
- The frontend keeps its own view models with display joins; keep them aligned
  with `types/database.ts` when the contracts change.
