# Story 4.3: Subscription Management

Status: ready-for-dev

## Story

As a subscribed user,
I want to view and cancel my active subscription,
so that I have full control over my billing.

## Acceptance Criteria

1. Given I am a subscribed user, when I navigate to my account/billing settings, then I can see my current plan, billing status, and renewal date (FR27).
2. Given I am viewing my subscription details, when I click cancel subscription, then I am shown a confirmation prompt before cancellation is processed.
3. Given I confirm cancellation, when the cancellation is processed, then my subscription is cancelled, I retain paid access until the end of the current billing period, and I see a confirmation message.

## Tasks / Subtasks

- [ ] Billing/account settings page (AC: 1)
  - [ ] Route: `/account/billing` (auth-protected)
  - [ ] Display: current plan name, status (active/cancelled), next renewal date
  - [ ] Fetch subscription details from Stripe API using `stripe_customer_id`
  - [ ] If not subscribed: show "Free plan" + upgrade CTA
- [ ] Cancel subscription flow (AC: 2, 3)
  - [ ] "Cancel subscription" button (only shown if `subscription_status == 'paid'`)
  - [ ] Confirmation modal: "Are you sure? You'll keep access until [date]."
  - [ ] On confirm: call `POST /api/subscription/cancel`
- [ ] Cancellation endpoint (AC: 3)
  - [ ] Call Stripe `subscriptions.update({ cancel_at_period_end: true })`
  - [ ] Do NOT immediately downgrade user — they keep access until period end
  - [ ] Update local record: set `subscription_cancel_at` date
  - [ ] Show confirmation: "Subscription cancelled. Access until [date]."
- [ ] Handle expired subscription (AC: 3)
  - [ ] Stripe webhook `customer.subscription.deleted`: set `subscription_status = 'free'`
  - [ ] This webhook was partially set up in Story 4.2 — verify and extend
- [ ] Write tests: billing page shows correct data, cancel with confirmation, access retained post-cancel, webhook downgrade (AC: 1–3)

## Dev Notes

- **CRITICAL:** Read Stories 1.1, 4.1, 4.2 Dev Agent Records — user schema (`subscription_status`, `stripe_customer_id`, `stripe_subscription_id`) and webhook setup from those stories.
- **cancel_at_period_end = true:** This is the correct Stripe pattern. User retains access until the period ends. DO NOT use `subscriptions.cancel()` immediately — that cuts off access instantly.
- **Fetch from Stripe API:** For renewal date and status, fetch live from Stripe (not cached local DB) to avoid stale data. Use `stripe_subscription_id` to retrieve the subscription object.
- **Webhook for final downgrade:** When subscription actually expires (`customer.subscription.deleted`), Story 4.2's webhook handler should set `subscription_status = 'free'`. Verify this is implemented — extend if not.
- **This story runs in PARALLEL with Stories 3.2 and 3.3** — no shared files with Epic 3 work.
- **Local `subscription_cancel_at` field:** Add to user record so UI can display "access until [date]" without additional Stripe API call.

### Project Structure Notes

- Route: `/account/billing` — linked from user nav/settings.
- Cancellation endpoint: `POST /api/subscription/cancel`.

### References

- [Source: _bmad-output/planning-artifacts/prd.md#Functional Requirements] FR27
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 4] Story 4.3
- [Source: _bmad-output/implementation-artifacts/1-1-user-registration.md] User schema
- [Source: _bmad-output/implementation-artifacts/4-2-subscription-checkout.md] stripe_customer_id, stripe_subscription_id, webhook setup

## Dev Agent Record

### Agent Model Used

_to be filled_

### Debug Log References

### Completion Notes List

### File List
