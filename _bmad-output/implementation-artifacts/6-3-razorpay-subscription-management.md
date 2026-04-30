# Story 6.3: Razorpay Subscription Management

Status: ready-for-dev

## Story

As a subscribed user,
I want to view and cancel my Razorpay subscription,
so that I have full billing control using the same payment provider I subscribed through.

## Acceptance Criteria

1. Given I am a subscribed user, when I navigate to billing settings, then I see my current plan, billing status, and next billing date — pulled from Razorpay.
2. Given I click cancel subscription, when I confirm, then I am shown the cancellation result and retain paid access until the current billing period ends.
3. Given my subscription is cancelled, when the period ends and Razorpay fires the cancellation webhook, then my account is downgraded to free.

## Tasks / Subtasks

- [ ] Update billing settings page `src/app/account/billing/BillingPanel.tsx` (AC: 1)
  - [ ] Fetch subscription details from Razorpay API using `razorpaySubscriptionId`
  - [ ] Display: plan name, status (active/cancelled), charge amount (INR), next charge date
  - [ ] If no `razorpaySubscriptionId`: show "Free plan" + upgrade CTA
- [ ] Subscription status API `GET /api/subscription/status` (AC: 1)
  - [ ] Replace Stripe fetch with `razorpay.subscriptions.fetch(razorpaySubscriptionId)`
  - [ ] Map Razorpay subscription status → display status
  - [ ] Razorpay subscription statuses: `created`, `authenticated`, `active`, `pending`, `halted`, `cancelled`, `completed`, `expired`
  - [ ] `active` → "Active", `cancelled`/`completed`/`expired` → "Cancelled/Ended"
- [ ] Cancel endpoint `POST /api/subscription/cancel` (AC: 2)
  - [ ] Replace Stripe `cancel_at_period_end` with Razorpay: `razorpay.subscriptions.cancel(id, { cancel_at_cycle_end: 1 })`
  - [ ] `cancel_at_cycle_end: 1` = cancel at end of current billing cycle (user keeps access)
  - [ ] `cancel_at_cycle_end: 0` = cancel immediately (DO NOT use)
  - [ ] Update local `subscription_cancel_at` from Razorpay response `current_end` timestamp
  - [ ] Show confirmation: "Subscription cancelled. Access until [date]."
- [ ] Webhook handler update (AC: 3)
  - [ ] `subscription.cancelled` / `subscription.completed` / `subscription.expired` events in `POST /api/webhooks/razorpay` (created in Story 6.2)
  - [ ] On these events: set `subscription_status = 'free'`, clear `razorpaySubscriptionId`, clear `subscription_cancel_at`
  - [ ] Verify this was partially implemented in Story 6.2 — extend if needed
- [ ] Remove Stripe subscription management code (AC: 1)
  - [ ] `src/app/api/subscription/status/route.ts` — replace Stripe `stripe.subscriptions.retrieve()` with Razorpay equivalent
  - [ ] `src/app/api/subscription/cancel/route.ts` — replace Stripe `cancel_at_period_end` logic
  - [ ] Remove `stripe` package if 6.2 confirmed it's no longer needed (check Story 6.2 Dev Agent Record first)
- [ ] Write tests: billing status fetch, cancel with cycle-end, webhook downgrade (AC: 1–3)

## Dev Notes

- **CRITICAL:** Read Stories 4.3 and 6.2 Dev Agent Records — 4.3 has the Stripe implementation being replaced; 6.2 has the Razorpay client, `razorpaySubscriptionId` field, and webhook skeleton.
- **Razorpay cancel_at_cycle_end:** Razorpay uses `cancel_at_cycle_end: 1` (integer, not boolean). This is equivalent to Stripe's `cancel_at_period_end: true`. User keeps access until current billing cycle ends.
- **Subscription status mapping from Razorpay:**
  - `active` → show "Active, renews [date]"
  - `cancelled` → show "Cancelled, access until [date]"
  - `halted` → show "Payment issue — please update payment method"
  - `expired` / `completed` → show "Expired" (should trigger free downgrade via webhook)
- **current_end timestamp:** Razorpay returns Unix timestamps. Convert to readable date for display.
- **Stripe removal:** Only remove `stripe` SDK if Story 6.2's Dev Agent Record confirms it was removed or is safe to remove. If in doubt, leave it — an unused dependency is better than a broken cancellation flow.

### Project Structure Notes

- Modify: `src/app/api/subscription/status/route.ts`, `src/app/api/subscription/cancel/route.ts`, `src/app/account/billing/BillingPanel.tsx`
- Extend: `src/app/api/webhooks/razorpay/route.ts` (from Story 6.2)

### References

- [Source: _bmad-output/implementation-artifacts/4-3-subscription-management.md] Stripe implementation being replaced
- [Source: _bmad-output/implementation-artifacts/6-2-razorpay-checkout.md] Razorpay client, razorpaySubscriptionId, webhook setup

## Dev Agent Record

### Agent Model Used

_to be filled_

### Debug Log References

### Completion Notes List

### File List
