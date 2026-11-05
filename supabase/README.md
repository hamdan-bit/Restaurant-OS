# Supabase backend

The initial FairPrice backend schema is in
`migrations/20261105170000_initial_fairprice_schema.sql`.

It establishes:

- Restaurant tenants and tenant-scoped users
- Separate platform users and platform permissions
- Restaurant registration applications
- Subscription plans, entitlements, invoices and payments
- Menus, tables, seats, QR codes, orders and restaurant payments
- Audit logs and notifications
- Row Level Security policies for platform and tenant access

## Applying the schema

Use the Supabase CLI from an authenticated development environment:

```powershell
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

Apply the starter plan data after the migration:

```powershell
npx supabase db query --remote --yes --file supabase/seed.sql
```

Alternatively, run `seed.sql` in the Supabase SQL Editor after the migration.

The `SUPABASE_SERVICE_ROLE_KEY` must only be used by trusted server-side tooling.
Never prefix it with `VITE_`, import it into browser code, or commit it to the
repository. The browser should use only the publishable Supabase URL and anon
key with RLS enabled.

## Registration approval RPCs

Authenticated platform administrators call these hosted functions through
Supabase RPC:

- `create_registration_application(business_name, public_slug, owner_name, contact_email, contact_phone)`
- `submit_registration_application(application_id)`
- `approve_registration_application(application_id, selected_plan_id, trial_days)`
- `reject_registration_application(application_id, reason)`
- `request_registration_information(application_id, reason)`

Applicants can only create a pending verification application and submit it
after their Supabase contact is verified. Approval atomically creates the
restaurant tenant, owner role, owner membership, and optional subscription.
The functions enforce platform permissions and write audit records.

## Manager onboarding

The hosted `manager-onboarding` Edge Function accepts an authenticated owner
request and sends a Supabase Auth invitation. It creates the invitation through
the owner-scoped `create_manager_invitation` RPC, so the service-role key is
never exposed to the browser.

After the invited user signs in through the Auth invite, the client calls
`accept_manager_invitation(invitation_id)`. The hosted function assigns the
selected manager preset and creates the tenant membership atomically.

Available presets:

- `FLOOR_MANAGER`
- `SHIFT_LEAD`
- `SENIOR_MANAGER`

Set the optional hosted function secret `MANAGER_INVITE_REDIRECT_URL` when the
frontend has a dedicated invite-acceptance route. Without it, Supabase uses its
configured default redirect behavior.

## Public order creation

The hosted `public-order` Edge Function is intentionally unauthenticated for
customer checkout. Its database RPC is the source of truth and:

- Resolves only an active restaurant by public slug.
- Requires a matching active QR/table/seat context for dine-in orders.
- Requires a valid subscription entitlement for remote ordering.
- Accepts only published, available menu items from the same tenant.
- Rejects duplicate items, invalid quantities and unavailable items.
- Calculates totals from current database prices.
- Stores immutable item name and price snapshots.
- Creates a pending payment row for remote orders.

Request:

```json
{
  "restaurantSlug": "savanna-table",
  "orderType": "DINE_IN",
  "items": [{ "menuItemId": "uuid", "quantity": 2 }],
  "qrToken": "raw-qr-token",
  "tableId": "uuid",
  "seatId": "uuid",
  "notes": "No onions"
}
```

Remote orders use `orderType: "REMOTE"` and must include `customerName` and
`customerPhone`. The endpoint is:

`/functions/v1/public-order`

## Remote payment reconciliation

The hosted `payment-webhook` Edge Function receives provider callbacks at:

`/functions/v1/payment-webhook`

Callbacks must include an `x-payment-signature` HMAC-SHA256 header calculated
over the exact raw JSON body using the hosted `PAYMENT_WEBHOOK_SECRET`.
Payload shape:

```json
{
  "eventId": "provider-event-id",
  "providerReference": "provider-payment-id",
  "orderReference": "FP-ABC12345",
  "status": "succeeded",
  "amount": 48000,
  "currency": "UGX"
}
```

The hosted database transaction is idempotent by provider event ID, resolves
the pending payment through the stored order relationship, checks the exact
amount and restaurant currency, rejects provider-reference reuse, and records
the raw event for auditability. Remote orders cannot advance into preparation
without a confirmed payment, and confirmed payments cannot overpay an order.

Configure the provider secret only after choosing the payment provider:

```powershell
npx supabase secrets set --remote=pqitndxgxdshmfvvtcvv PAYMENT_WEBHOOK_SECRET=<provider-signing-secret>
```

Do not put this secret in `.env.local`, frontend code, or a committed file.

## Frontend typed services

`src/lib/database.types.ts` is generated from the hosted production schema.
`src/lib/data-services.ts` is the browser-safe service layer for registration,
tenant lookup, manager onboarding, published menus, and public orders. It uses
the anon key and hosted RPCs/Edge Functions with RLS; it does not contain or
require the service-role key.
