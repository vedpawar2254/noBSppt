# Story 5.2: User Account & Activity Inspection

Status: ready-for-dev

## Story

As an admin,
I want to view individual user account details and their deck activity,
so that I can investigate issues and support users.

## Acceptance Criteria

1. Given I am on the admin dashboard, when I search or browse to a specific user, then I can see their account details (email, registration date, subscription status) (FR30).
2. Given I am viewing a user's profile, when I inspect their activity, then I can see a list of all decks they have generated, with creation dates and current status.
3. Given a user has been reported for an issue, when I view their account, then I have enough context (account details + deck activity) to investigate and respond.

## Tasks / Subtasks

- [ ] User list view in admin `/admin/users` (AC: 1)
  - [ ] Paginated list of all users: email, registration date, subscription status, deck count
  - [ ] Search by email
- [ ] User detail page `/admin/users/:id` (AC: 1, 2, 3)
  - [ ] Account details: email, created_at, subscription_status, deck_count, stripe_customer_id (masked)
  - [ ] Deck activity list: deck ID, created_at, is_public, slide count
- [ ] User list API `GET /api/admin/users` (AC: 1)
  - [ ] Paginated, searchable by email
  - [ ] Admin-only middleware
- [ ] User detail API `GET /api/admin/users/:id` (AC: 2, 3)
  - [ ] User record + all their decks
  - [ ] Admin-only middleware
- [ ] Write tests: user list, search, user detail, deck activity, admin-only access (AC: 1–3)

## Dev Notes

- **CRITICAL:** Read Story 5.1 Dev Agent Record — reuse admin middleware and admin route patterns established there. Read Story 1.1 for user schema, Story 2.2 for deck schema.
- **This story runs in PARALLEL with Story 5.3** — no shared files. 5.2 owns `/admin/users`, 5.3 owns `/admin/logs`.
- **Pagination:** User list could grow large. Use limit/offset or cursor-based pagination. 20 users per page at MVP.
- **stripe_customer_id:** Show masked (last 4 chars) for reference — useful for Stripe dashboard lookups. Never show full key.
- **Deck activity:** Show deck ID, creation date, public status. Do NOT show slide content in admin (privacy at MVP).
- **Search:** Basic email prefix/contains search. No fuzzy matching needed at MVP.

### Project Structure Notes

- Admin routes extend `/admin/*` from Story 5.1.
- Admin API extends `/api/admin/*` from Story 5.1.

### References

- [Source: _bmad-output/planning-artifacts/prd.md#Functional Requirements] FR30
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 5] Story 5.2
- [Source: _bmad-output/implementation-artifacts/5-1-platform-metrics-dashboard.md] Admin middleware, admin route structure

## Dev Agent Record

### Agent Model Used

_to be filled_

### Debug Log References

### Completion Notes List

### File List
