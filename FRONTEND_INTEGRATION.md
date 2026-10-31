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
- Email uses the server dispatch endpoint. When it reports `mock_logged` (no
  SMTP/provider configured) the UI says the invoice was logged, not delivered;
  only an `smtp` dispatch is shown as sent.
- Printing opens the server-rendered invoice document at `/invoices/:id/print`.
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

- No Supabase auth/RLS, so portal data is not server-authorized yet.
- No email provider; server dispatches are logged and the UI reports that
  honestly instead of claiming delivery.
- The UI does not yet expose the newer refund, billing-run history or audit-log
  endpoints; they exist server-side.
- The frontend keeps its own view models with display joins; keep them aligned
  with `types/database.ts` when the contracts change.
