# Story 6.2: Razorpay Subscription Checkout

Status: ready-for-dev

## Story

As a user who has reached the free limit,
I want to subscribe via Razorpay,
so that I can pay in INR using Indian payment methods (UPI, cards, netbanking) without being routed to a foreign payment processor.

## Acceptance Criteria

1. Given I am on the upgrade prompt, when I click subscribe, then I am taken to a Razorpay checkout experience — no card data passes through nobsppt servers.
2. Given I complete payment successfully, when Razorpay confirms via webhook, then my account is immediately upgraded to paid status and I can generate decks without restriction.
3. Given I abandon checkout or payment fails, when I return to the app, then my account remains on the free tier and I see the paywall again.
4. Given a subscription is active, when Razorpay fires a subscription renewal event, then the system correctly processes it and keeps the user on paid status.

## Tasks / Subtasks

- [ ] Install Razorpay Node SDK: `npm install razorpay` (AC: 1)
- [ ] Add env vars to `.env.example` (AC: 1)
  - [ ] `RAZORPAY_KEY_ID` — public key (safe to expose in frontend)
  - [ ] `RAZORPAY_KEY_SECRET` — secret key (server-side only)
  - [ ] `RAZORPAY_PLAN_ID` — subscription plan ID from Razorpay dashboard
- [ ] Create Razorpay Plan in dashboard (AC: 1)
  - [ ] Interval: monthly, currency: INR
  - [ ] Store plan ID as `RAZORPAY_PLAN_ID`
- [ ] Replace Stripe checkout endpoint `POST /api/subscription/checkout` (AC: 1, 2)
  - [ ] Create a Razorpay Subscription object: `razorpay.subscriptions.create({ plan_id, total_count, ... })`
  - [ ] Return `{ subscriptionId, keyId }` to frontend (NOT a redirect URL — Razorpay uses client-side JS checkout)
- [ ] Frontend checkout flow (AC: 1)
  - [ ] Load Razorpay Checkout.js script (`https://checkout.razorpay.com/v1/checkout.js`)
  - [ ] Open Razorpay modal with `{ key: RAZORPAY_KEY_ID, subscription_id, ... }`
  - [ ] On payment success: Razorpay calls `handler(response)` with `{ razorpay_payment_id, razorpay_subscription_id, razorpay_signature }`
  - [ ] POST these 3 values to `/api/subscription/verify` for signature verification
- [ ] Signature verification endpoint `POST /api/subscription/verify` (AC: 2)
  - [ ] Verify: `HMAC-SHA256(razorpay_payment_id + "|" + razorpay_subscription_id, RAZORPAY_KEY_SECRET) === razorpay_signature`
  - [ ] On valid signature: set `subscription_status = 'paid'`, store `razorpaySubscriptionId` on user
  - [ ] On invalid signature: return 400 — do NOT upgrade user
- [ ] Razorpay webhook handler `POST /api/webhooks/razorpay` (AC: 4)
  - [ ] Verify webhook signature: `HMAC-SHA256(body, RAZORPAY_WEBHOOK_SECRET)`
  - [ ] Handle events:
    - `subscription.activated` → set `subscription_status = 'paid'` (idempotent)
    - `subscription.charged` → renewal confirmation, log it
    - `subscription.cancelled` / `subscription.completed` → set `subscription_status = 'free'`
    - `payment.failed` → optionally notify user
  - [ ] Add `RAZORPAY_WEBHOOK_SECRET` to `.env.example`
- [ ] Update user schema: replace Stripe fields (AC: 2)
  - [ ] Remove (or keep alongside): `stripeCustomerId`, `stripeSubscriptionId`
  - [ ] Add: `razorpaySubscriptionId VARCHAR(255)` nullable
  - [ ] Decision: migrate existing Stripe users or just add new column alongside (recommended: add alongside for backwards compat)
- [ ] Remove Stripe SDK dependency if no longer needed (AC: 1)
  - [ ] Check Story 4.3 (subscription management) — if cancellation still uses Stripe, keep it
  - [ ] Story 6.3 will handle cancellation migration — leave Stripe in place for now
- [ ] Write tests: checkout session creation, signature verification (valid + invalid), webhook events (AC: 1–4)

## Dev Notes

- **CRITICAL:** Read Stories 4.1, 4.2, 4.3 Dev Agent Records — this story replaces 4.2's checkout. Story 4.3's cancellation is handled in Story 6.3 — do NOT touch `src/app/account/billing/` in this story.
- **Razorpay vs Stripe key difference:** Razorpay checkout opens a modal on the client side (not a redirect to a hosted page). The flow is:
  1. Server creates a Subscription → returns `subscriptionId` to client
  2. Client opens Razorpay modal with that `subscriptionId`
  3. User pays in modal
  4. Razorpay calls your `handler(response)` with signature
  5. Client POSTs signature to your server for verification
  6. Server verifies and upgrades user
- **Signature verification is the source of truth** — same principle as Stripe webhooks. Never trust the client-side success callback alone.
- **Checkout.js loading:** Load `https://checkout.razorpay.com/v1/checkout.js` dynamically in the upgrade page component. Do NOT import statically — it's an external script.
- **INR currency:** Razorpay plans are in INR paise (₹1 = 100 paise). Amount in plan: e.g., ₹199/month = `19900` in plan config.
- **`RAZORPAY_KEY_ID` is public** — it can be exposed in the frontend. Only `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` must stay server-side.
- **Webhook endpoint:** Must be excluded from CSRF protection. Add to `src/middleware.ts` exclusions (same as Stripe webhook was).

### Project Structure Notes

- New files: `src/lib/razorpay/client.ts`, `src/app/api/subscription/verify/route.ts`, `src/app/api/webhooks/razorpay/route.ts`
- Replace: `src/app/api/subscription/checkout/route.ts` (was Stripe — rewrite for Razorpay)
- Update: `src/app/upgrade/CheckoutButton.tsx` or `src/app/upgrade/page.tsx` — open Razorpay modal instead of redirecting

### References

- [Source: _bmad-output/implementation-artifacts/4-1-free-deck-limit-enforcement-and-paywall.md] Paywall flow, subscription_status field
- [Source: _bmad-output/implementation-artifacts/4-2-subscription-checkout.md] Stripe implementation being replaced
- [Source: _bmad-output/implementation-artifacts/1-1-user-registration.md] User schema

## Dev Agent Record

### Agent Model Used

_to be filled_

### Debug Log References

### Completion Notes List

- Document `razorpaySubscriptionId` field added to schema — Story 6.3 uses it for cancellation.
- Document webhook endpoint path — Story 5.3 admin logs may reference it.
- Document whether Stripe SDK was removed or kept — Story 6.3 needs to know.

### File List
