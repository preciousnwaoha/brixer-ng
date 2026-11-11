# Brixer web application

Production-facing marketing, checkout, authentication, and operations dashboards for `brixer.ng`. Everything required by the app lives in this directory.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS
- TanStack Query and TanStack Table
- Supabase PostgreSQL and Auth
- Paystack payments
- Cloudflare R2 private document storage
- Resend transactional email
- Optional Meta WhatsApp Cloud API, disabled by default

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Keep `NEXT_PUBLIC_DEMO_MODE=true` to review all screens without service credentials.
3. Run `npm install` and `npm run dev`.
4. Open `http://localhost:3000`.

Production must set `NEXT_PUBLIC_DEMO_MODE=false`. Missing production credentials fail closed for protected operations.

## Supabase

1. Create a Supabase project and run the SQL files in `supabase/migrations` in filename order.
2. Enable Email/Password and Google Auth.
3. Add local, Vercel preview, and `https://brixer.ng/auth/callback` URLs to the Auth redirect allowlist.
4. Create the first account, then promote it once in the SQL editor:

```sql
update public.profiles set role = 'admin' where id = '<auth-user-id>';
```

Internal staff accounts can be invited from the admin dashboard. The server-side invitation flow assigns `role = 'staff'` and a unique `staff_code`.

## Paystack

- Set `PAYSTACK_SECRET_KEY` in `.env.local` locally and in the Vercel server environment. Do not prefix this key with `NEXT_PUBLIC_` or commit it. Hosted checkout does not require a public key.
- All payment buttons open Paystack hosted checkout, including full payments, 50% deposits, and balances. Without a secret key, payment fails with a clear error instead of simulating success.
- Dashboard demo mode can still use real Paystack **test** transactions. It requires an `sk_test_` key, and the success screen always verifies reference, amount, currency, and status on the server.
- Set `NEXT_PUBLIC_SITE_URL` to the deployed site origin. If omitted, payment callbacks use the current request origin, including the local development port.
- Set the webhook URL to `https://brixer.ng/api/webhooks/paystack`.
- Use test keys until guest full-payment, deposit, balance, duplicate webhook, invalid signature, and amount mismatch cases pass.
- Paystack amounts are always calculated on the server from `src/config/services.ts`.

## Cloudflare R2

1. Create a private bucket matching `R2_BUCKET`.
2. Create an object read/write API token and add the S3-compatible credentials.
3. Apply `config/r2-cors.json`, adding exact Vercel preview origins when needed.
4. Do not make the bucket public. Upload and download access is issued through short-lived presigned URLs after Supabase authorization.

## Resend and WhatsApp

- Verify `brixer.ng` in Resend and set `RESEND_FROM_EMAIL`.
- Vercel Cron calls `/api/cron/notifications` daily with `CRON_SECRET`. The schedule is `0 0 * * *` (UTC), compatible with Vercel Hobby; invocation may occur anywhere within the midnight UTC hour.
- Administrators can also select **Send queued notifications** in the admin dashboard's Notifications section. This uses their signed-in admin session; staff and clients cannot trigger delivery.
- Each daily or manual run attempts up to 25 due email/WhatsApp deliveries, oldest first. Additional messages wait for another run, and retry backoff still applies. Overlapping runs reserve messages before sending; interrupted reservations become available after five minutes.
- The manual control is a no-op in demo mode and reports that no notifications were sent. Production requires `NEXT_PUBLIC_DEMO_MODE=false` and configured Supabase credentials, including the server-side service role key.
- Leave `WHATSAPP_ENABLED=false` until a Meta Business sender number and approved templates are configured.

## Editable content

- Marketing, reviews, banks, features, FAQs: `src/config/site.ts`
- Services, prices, rewards, staff rates, requirements: `src/config/services.ts`
- Add approved video reviews to `videoReviews`; the section hides while the array is empty.
- Legal pages contain owner-review copy and must be approved before production.

## Verification

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

The Playwright command requires its browser binary. The remaining checks require no external credentials in demo mode.
