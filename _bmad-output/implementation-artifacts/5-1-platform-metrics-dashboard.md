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

claude-sonnet-4-6

### Debug Log References

No debug issues — clean pass.

### Completion Notes List

**Admin guard (Stories 5.2 and 5.3 MUST use this):**

| Function | File | Purpose |
|----------|------|---------|
| `requireAdmin()` | `src/lib/auth/admin-guard.ts` | Server component guard — redirects to `/login` (no session) or `/dashboard` (not admin). Returns `SessionPayload`. |
| `getAdminSession()` | `src/lib/auth/admin-guard.ts` | API route guard — returns `{ session, status: "ok" }` or `{ session: null, status: 401\|403 }`. Stories 5.2 and 5.3 call this at the top of every `/api/admin/*` handler. |

**Admin role field:**
- Column: `role` (`user_role` enum: `"user"` | `"admin"`) on `users` table, default `"user"`, NOT NULL
- Added in `src/lib/db/schema.ts` as `userRoleEnum` + `users.role` field
- Role is NOT stored in the JWT session (avoids stale-role in 7-day tokens). Role is fetched fresh from DB on each admin request.
- **To promote to admin:** `UPDATE users SET role = 'admin' WHERE email = 'you@example.com';` (direct DB). User must re-login for any session-cached data to refresh (role is not cached in session, so re-login not strictly required here).

**Metrics API (Stories 5.2 and 5.3 extend `/api/admin/*`):**
- `GET /api/admin/metrics` → `{ metrics: { totalDecks, totalUsers, totalPaid, conversions } }`
- `conversions` definition: paid users with `deck_count >= 1` (MVP — simpler than cohort analysis)
- All 4 queries run in `Promise.all()` for sub-100ms response
- `force-dynamic` on admin page — no caching, live data every load (AC3)

**Middleware:** `/admin` added to `PROTECTED_PATHS` in `src/middleware.ts`. Edge middleware redirects unauthenticated users to `/login`. Role check (admin vs user) is NOT in Edge middleware (cannot do DB in Edge) — it happens in `requireAdmin()` / `getAdminSession()` at page/API level.

### File List

- `src/lib/db/schema.ts` — added `userRoleEnum` + `users.role` column
- `src/lib/auth/admin-guard.ts` — `requireAdmin()` (server components) + `getAdminSession()` (API routes)
- `src/app/api/admin/metrics/route.ts` — GET metrics endpoint
- `src/app/admin/page.tsx` — admin dashboard (4 metric cards, live data)
- `src/middleware.ts` — `/admin` added to PROTECTED_PATHS
- `tests/admin/metrics.test.ts` — 5 metrics API tests
- `tests/admin/admin-guard.test.ts` — 4 admin-guard unit tests
