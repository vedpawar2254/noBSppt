# Story 4.2: Subscription Checkout

Status: ready-for-dev

## Story

As a user who has reached the free limit,
I want to subscribe to a paid plan,
so that I can continue generating decks.

## Acceptance Criteria

1. Given I am on the upgrade/paywall prompt, when I click to subscribe, then I am taken to a checkout flow powered by a PCI-compliant provider (Stripe or equivalent) — no card data passes through nobsppt servers (NFR7).
2. Given I complete checkout successfully, when payment is confirmed, then my account is immediately upgraded to paid status and I can generate decks without restriction.
3. Given I abandon checkout or payment fails, when I return to the app, then my account remains on the free tier and I see the paywall again on next generation attempt.

## Tasks / Subtasks

- [ ] Stripe integration setup (AC: 1)
  - [ ] Install and configure Stripe SDK (server-side)
  - [ ] Create Stripe product + price (monthly subscription)
  - [ ] Store Stripe keys in environment variables (never in code)
- [ ] Checkout session creation endpoint `POST /api/subscription/checkout` (AC: 1)
  - [ ] Create Stripe Checkout Session with success_url and cancel_url
  - [ ] Return session URL to client
  - [ ] Associate session with user ID (store in DB for webhook correlation)
- [ ] Redirect to Stripe Checkout (AC: 1)
  - [ ] Client receives session URL → redirect to Stripe-hosted checkout
  - [ ] NO custom payment form — Stripe-hosted only (NFR7 compliance)
- [ ] Stripe webhook handler `POST /api/webhooks/stripe` (AC: 2, 3)
  - [ ] Verify Stripe webhook signature
  - [ ] On `checkout.session.completed`: update user `subscription_status = 'paid'`, store `stripe_customer_id` + `stripe_subscription_id`
  - [ ] On `customer.subscription.deleted` / failed payment: downgrade user (for future use)
- [ ] Success redirect (AC: 2)
  - [ ] After successful checkout: redirect to `/create` or dashboard
  - [ ] User can immediately generate without restriction
- [ ] Cancel/failure handling (AC: 3)
  - [ ] cancel_url returns user to `/create` (input still in page state if not refreshed)
  - [ ] Subscription status NOT changed until webhook confirms
- [ ] Write tests: checkout session creation, webhook signature validation, status upgrade on success, no upgrade on cancel (AC: 1–3)

## Dev Notes

- **CRITICAL:** Read Stories 1.1, 4.1 Dev Agent Records — user schema (`subscription_status`, `stripe_customer_id`) and paywall flow established there.
- **NFR7 is non-negotiable:** No card data through nobsppt servers. Use Stripe Checkout (hosted) — not Stripe Elements or custom forms. This is PCI compliance.
- **Webhook is the source of truth:** Do NOT upgrade user on the success redirect alone — that can be spoofed. Upgrade ONLY on `checkout.session.completed` webhook event after verifying Stripe signature.
- **Stripe keys:** `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in environment variables. Never commit to code.
- **Idempotency:** Webhook may fire multiple times. Check if user is already 'paid' before updating — don't cause errors on duplicate events.
- **stripe_customer_id:** Store on user record for Story 4.3 (subscription management / cancellation via Stripe API).
- **Success URL:** `/create?upgraded=true` or similar — allows showing a success message after redirect back.

### Project Structure Notes

- Webhook endpoint must be excluded from CSRF protection (Stripe sends raw POST).
- Stripe SDK: server-side only. Never expose secret key to client.

### References

- [Source: _bmad-output/planning-artifacts/prd.md#Functional Requirements] FR26
- [Source: _bmad-output/planning-artifacts/prd.md#Non-Functional Requirements] NFR7
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 4] Story 4.2
- [Source: _bmad-output/implementation-artifacts/1-1-user-registration.md] User schema
- [Source: _bmad-output/implementation-artifacts/4-1-free-deck-limit-enforcement-and-paywall.md] Paywall flow, subscription_status field

## Dev Agent Record

### Agent Model Used

_to be filled_

### Debug Log References

### Completion Notes List

- Document stripe_customer_id field added to user schema — Story 4.3 needs it for cancellation.
- Document webhook endpoint path — Story 5.3 (admin logs) may reference webhook events.
- Document subscription plan/price ID — Story 4.3 reads it for display.

### File List
