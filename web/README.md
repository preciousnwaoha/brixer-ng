# Brixer web application

Next.js, TypeScript, Tailwind, TanStack Query/Table, Supabase PostgreSQL/Auth, Paystack, private Cloudflare R2, Resend, and Meta WhatsApp Cloud API.

## Local setup

Copy `.env.example` to `.env.local`, then run `npm install` and `npm run dev`. Preview mode (`NEXT_PUBLIC_DEMO_MODE=true`) uses sample catalogue/customer-dashboard data. Admin and staff routes always require a signed-in database account with the correct role, even in preview mode. Preview mutations do not pretend to save files, finish jobs, invite staff, or send messages. Paystack test checkout remains available with an `sk_test_` key.

Set `NEXT_PUBLIC_DEMO_MODE=false` for a real installation. Missing production integrations fail closed. Never commit `.env.local`, provider secrets, or service-role credentials. The admin settings page reports configuration presence, not provider connectivity.

## Database and editable operations

Set `DATABASE_URL` to a reachable Supabase PostgreSQL connection (use the Supabase pooler when the direct IPv6 endpoint is unavailable). Supply `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` separately for Auth and the Data API. A database password cannot substitute for these keys.

Run `npm run db:migrate`. This requires `psql`, tracks applied migrations, and applies each upgrade in a transaction. It recognizes an existing complete initial installation without recreating its tables. Existing order/payment/document IDs are preserved. Catalogue seeding never overwrites subsequent admin edits.

The admin settings screen edits service prices, availability, half-payment eligibility, timelines, form fields, referral/staff rates, partner banks, and hard-copy/delivery options. Service snapshots preserve the price and requirements agreed at purchase. New hard-copy/delivery options start unconfigured: add the options the business actually offers. Bank descriptions can contain opening balances and requirements. Marketing content remains in `src/config/site.ts`.

One checkout can contain multiple services and quantities. Every unit has its own order, application, progress, balance, and documents. Half-payment checkout charges 50% per eligible unit and 100% for other units; services under ₦10,000 per unit are always full-payment-only. Work may finish before the remaining balance is paid, but completed outputs remain locked until that individual item is fully paid and marked ready. Optional delivery/copy quotes gate their own fulfillment and do not relock paid digital documents.

## Authentication

Enable Supabase Email, Phone, and Google providers. Configure the Google OAuth client and allow callback URLs for your local, preview, and production origins. Set the Supabase Site URL to your deployed origin and keep `NEXT_PUBLIC_SITE_URL` aligned with it.

Configure signed HTTPS Supabase Auth hooks:

- Send Email: `/api/auth/hooks/email`, with its generated secret in `SUPABASE_EMAIL_HOOK_SECRET`.
- Send SMS: `/api/auth/hooks/sms`, with its generated secret in `SUPABASE_SMS_HOOK_SECRET`. This delivers Supabase phone OTPs through Meta WhatsApp, with Termii SMS fallback.

The email hook sends one-time login, signup, invitation, and recovery links using Resend. These links use `/auth/confirm`, while Google uses `/auth/callback`. First-password setup requires verified email access. Password hashes and OTPs are never returned by method discovery. Short-lived OTP fallback payloads are encrypted with a server-only key and accessible only to the service role.

Client phone login sends an OTP directly, including for first-time users. There is no WhatsApp enrollment or email-verification prerequisite. Either verified checkout contact can grant access to the matching paid guest orders; checkout contact entries never merge entire accounts. Signed-in purchases belong to the authenticated buyer, even when the buyer edits contact details to order for someone else. Those edits do not overwrite their profile or give the recipient account access to buyer-owned orders.

Set `AUTH_OTP_DELIVERY_KEY` to a fresh 32-byte hexadecimal secret (`openssl rand -hex 32`), and `AUTH_OTP_EXPIRY_SECONDS=600`. Configure the Supabase Auth SMS OTP expiry to the same value. The signed hook persists an encrypted delivery payload and dispatches it with Next.js `after`, keeping external provider requests out of the Auth hook's five-second response budget. Expired payloads cannot be used and are purged on subsequent delivery activity; successful SMS sends and verified logins clear the payload immediately. A code received on WhatsApp still uses Supabase's normal SMS OTP verification endpoint.

For SMS fallback, set `TERMII_API_KEY`, the account-specific HTTPS `TERMII_BASE_URL`, and approved `TERMII_SENDER_ID`. Activate Termii's transactional DND route; OTPs use `channel=dnd`. WhatsApp is attempted first when configured. Immediate failures and signed Meta delivery-failure callbacks fall back to SMS once per attempt. A normal resend after an undelivered WhatsApp attempt prefers SMS. Supabase's cooldown and the application's identifier/IP limits still apply. Keep email login available while configuring the providers. Internal phone login only signs in an existing provisioned phone identity and still requires its database staff/admin role.

Create the owner account through login, then provision the initial admin once from the Supabase SQL editor:

```sql
update public.profiles set role = 'admin' where id = '<verified-owner-auth-user-id>';
```

Admins can invite staff, assign jobs, and review payouts. Customers log in at `/login`. `/admin/login` is the shared team entry: database admins go to `/admin`, and database staff go to `/staff`. `/staff/login` accepts only staff accounts. Internal magic-link requests never create new accounts. Google login also requires a previously assigned database role before internal access is granted.

Every entry offers the same authentication methods. Login context is preserved through OAuth, email links, OTPs, recovery, and first-password setup. A login URL, callback parameter, or OAuth profile cannot grant a role. Admin/staff pages and APIs verify the authenticated `profiles.role` value in every environment; no internal preview bypass is available.

## Client dashboard and order details

The client layout covers `/dashboard`, `/dashboard/orders`, `/dashboard/documents`, `/dashboard/referral`, and `/dashboard/new-order`, including nested order detail, application, issue, and balance pages. The dashboard catalogue shares the public cart; checkout prefills the buyer's stored contact details while allowing purchase-specific edits. Statistics count paid service items, not checkout groups. Pending Info counts items awaiting client action, excluding submitted issues under review; completed-document counts include released files still locked by their item's balance.

Order progress is Received → Enter details → Filing → Submitted → Processing → Completed. First payment opens the service details form; valid submission advances atomically to Filing. Staff pick up unassigned Filing jobs. Admins can flag issues at Filing, Submitted, and Processing with typed required/optional fields and file restrictions. Open issues show red progress and an Issue badge; submission restores normal progress with Settling issue. Admin clearance is required before advancing. Reopened requests retain previous submissions and uploaded files in history. All events use the existing outbox; no scheduled job is required.

The `202611120001` enum migration must commit before the following migrations use `enter_details`; the migration runner already applies each file separately. Later-stage legacy orders are preserved. Outstanding legacy requests are grouped at supported issue stages, retaining their file associations.

## Paystack

Set the server-only `PAYSTACK_SECRET_KEY`. Hosted checkout does not require a public key. Set the webhook URL to `https://brixer.ng/api/webhooks/paystack` and enable the desired merchant payment channels (card, transfer, and OPay where available) in Paystack.

Prices and allocations are calculated on the server. Signed webhooks and the success page share idempotent fulfillment, with exact stored amount/reference/currency verification. Cart checkout, item balances, and accepted copy/delivery quotes all use hosted checkout. Concurrent balance requests reuse a single active payment attempt. A browser return URL alone never proves payment. Failed/unknown initialization does not make a job actionable; retry using the same checkout details before starting another payment.

## R2 documents

Create a private bucket and set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET=brixer`, and `R2_REGION=auto`. Apply `config/r2-cors.json`, adding exact development/preview origins as needed.

Uploads use short-lived, single-write staging URLs. Finalization checks size/type against the server-issued upload intent, copies the object to its final private key, and creates document metadata atomically. Configure a bucket lifecycle rule to expire old `staging/` objects. PDF/JPEG/PNG files up to 10 MB are supported. Download URLs expire after five minutes and are issued only after item ownership, role, release, and payment checks.

## Email and WhatsApp notifications

Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL=The Brand Fixer <notifications@mail.brixer.ng>`, and verify that sender in Resend.

For Meta WhatsApp, set `WHATSAPP_ENABLED=true`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_GRAPH_VERSION`, and approved template names:

- `WHATSAPP_AUTH_TEMPLATE`: authentication template accepting the OTP in the body and the copy-code/URL button parameter.
- `WHATSAPP_UPDATE_TEMPLATE`: utility template with two body parameters, in order: notification title, notification body.
- `WHATSAPP_TEMPLATE_LANGUAGE`: language matching the approved templates.

Subscribe Meta to `https://brixer.ng/api/webhooks/whatsapp` for signed delivery status callbacks. Keep WhatsApp disabled until the sender and templates are ready. Authentication OTP requests are explicit; transactional order updates also require checkout consent. A configured token alone does not mean templates or merchant channels have been approved.

There is no cron job. Payment, stage, information-request, document, and fulfillment actions enqueue notification events transactionally and immediately attempt delivery for the relevant event. Provider errors do not undo a completed operation or confirmed payment. The admin Notifications panel shows delivery history and supports manual retries, including failed messages. Queued messages are not retried automatically on a schedule. Resend delivery requests use stable idempotency keys; WhatsApp delivery is best-effort and may duplicate if a process stops after sending but before recording the provider response.

## Verification

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Playwright runs desktop/mobile browser tests with mocked payment redirects and does not charge money or send real messages. It requires a browser binary.

Database acceptance tests require a new, empty **local** database with a name starting `brixer_test_`:

```bash
TEST_DATABASE_URL='postgresql:///brixer_test_commerce?host=/tmp&port=5432' npm run test:db
```

The script refuses remote or non-test database names. It applies the migrations and tests allocations, duplicate confirmations, ownership/role isolation, paid-vs-unpaid progression, document writes, guest attachment, information requests, quotes, and independent item balances. It needs a disposable local PostgreSQL instance and a superuser capable of creating the test Auth roles/schema. Never use the production database for these tests.

Real provider acceptance requires the configured Supabase project, Paystack test merchant, verified Resend sender, approved Meta templates, and R2 bucket. These cannot be verified from placeholder or missing credentials. The original developer brief is in `../docs/01_Developer_Brief.pdf`; the current flow supersedes its login-before-payment and filing balance restrictions.
