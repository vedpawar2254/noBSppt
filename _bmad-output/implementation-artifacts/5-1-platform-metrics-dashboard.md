# Story 5.1: Platform Metrics Dashboard

Status: ready-for-dev

## Story

As an admin,
I want to view total deck generation volume and subscription conversion metrics,
so that I can monitor product health and business performance.

## Acceptance Criteria

1. Given I am logged in as an admin, when I navigate to the admin dashboard, then I see total decks generated across all users (FR28).
2. Given I am viewing the admin dashboard, when I check conversion metrics, then I see total paid subscribers and free-to-paid conversion count (FR29).
3. Given the dashboard loads, when data is displayed, then all metrics reflect the current state of the system without requiring a manual refresh.

## Tasks / Subtasks

- [ ] Admin role / access control (AC: 1)
  - [ ] Add `role` field to user schema (values: 'user', 'admin')
  - [ ] Seed admin account (or document how to promote a user to admin)
  - [ ] Admin middleware: block non-admins from `/admin` routes with 403
- [ ] Admin dashboard page `/admin` (AC: 1, 2, 3)
  - [ ] Auth-protected + admin-role-protected
- [ ] Metrics API `GET /api/admin/metrics` (AC: 1, 2, 3)
  - [ ] Total decks generated (count of all deck records)
  - [ ] Total registered users
  - [ ] Total paid subscribers (users where subscription_status = 'paid')
  - [ ] Free-to-paid conversions (users who ever had deck_count >= 1 AND subscription_status = 'paid')
- [ ] Dashboard UI (AC: 1, 2, 3)
  - [ ] Metric cards: total decks, total users, paid subscribers, conversion count
  - [ ] Data fetched fresh on page load (no stale cache)
- [ ] Write tests: admin access control (non-admin blocked), metrics accuracy (AC: 1–3)

## Dev Notes

- **CRITICAL:** Read ALL previous epic story Dev Agent Records — this story queries data across the entire system (users, decks, subscriptions).
- **Admin role:** Simple role-based access at MVP. Add `role VARCHAR` to users table (default 'user'). Admin account: document how Vedpawar2254 promotes himself to admin (direct DB update or seed script).
- **Conversion metric definition:** A conversion = user has `subscription_status = 'paid'`. Simpler is better at MVP — don't over-engineer analytics.
- **No caching needed at MVP:** Admin dashboard is low-traffic. Fetch live data on each request.
- **This story runs AFTER all Epic 1–4 stories are complete** — it needs the full data model in place.
- **Stories 5.2 and 5.3 run in parallel AFTER this story** — they extend the admin section. Do not create user detail or log views in this story.

### Project Structure Notes

- Admin routes: `/admin/*` — all protected by admin middleware.
- Admin API: `/api/admin/*` — all protected server-side.
- Document the admin middleware path — Stories 5.2 and 5.3 reuse it.

### References

- [Source: _bmad-output/planning-artifacts/prd.md#Functional Requirements] FR28, FR29
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 5] Story 5.1
- [Source: _bmad-output/implementation-artifacts/1-1-user-registration.md] User schema
- [Source: _bmad-output/implementation-artifacts/2-2-ai-restraint-engine-deck-generation.md] Deck schema
- [Source: _bmad-output/implementation-artifacts/4-2-subscription-checkout.md] Subscription status fields

## Dev Agent Record

### Agent Model Used

_to be filled_

### Debug Log References

### Completion Notes List

- Document admin middleware path — Stories 5.2 and 5.3 reuse it.
- Document admin role field and how to promote user to admin.
- Document metrics API endpoint — Stories 5.2 and 5.3 extend the admin API.

### File List
