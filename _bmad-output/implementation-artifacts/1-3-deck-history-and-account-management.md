# Story 1.3: Deck History & Account Management

Status: ready-for-dev

## Story

As a logged-in user,
I want to view my deck history and delete decks I no longer need,
so that I can manage my generated content.

## Acceptance Criteria

1. Given I am logged in, when I navigate to my dashboard, then I see a list of all my previously generated decks, ordered by creation date (newest first).
2. Given I have no decks yet, when I view my dashboard, then I see an empty state with a clear prompt to create my first deck.
3. Given I am viewing my deck history, when I click delete on a deck, then I am shown a confirmation prompt before any deletion occurs.
4. Given I confirm the deletion, when the operation completes, then the deck is permanently removed and no longer appears in my history.

## Tasks / Subtasks

- [ ] Build dashboard / deck history page (AC: 1, 2)
  - [ ] Fetch user's decks from API ordered by created_at DESC
  - [ ] Render deck list: title, creation date, share link status
  - [ ] Empty state: friendly message + CTA to create first deck
- [ ] Build deck list API endpoint (AC: 1)
  - [ ] GET /decks — returns decks owned by authenticated user
  - [ ] Ordered by created_at DESC
- [ ] Build delete flow (AC: 3, 4)
  - [ ] Delete button on each deck card
  - [ ] Confirmation modal/dialog before deletion
  - [ ] DELETE /decks/:id endpoint — verifies ownership before deleting
  - [ ] On confirmation: delete deck, remove from list (optimistic or refetch)
- [ ] Write tests: deck list, empty state, delete with confirmation, ownership check (AC: 1–4)

## Dev Notes

- **CRITICAL:** Read Story 1.1 Dev Agent Record — use the same DB, ORM, and table conventions established there.
- **Ownership check is non-negotiable:** DELETE /decks/:id must verify the deck belongs to the authenticated user. Never allow deletion of another user's deck.
- **Deck table:** May not exist yet if Epic 2 hasn't run. Create a stub decks table here (id, user_id, title, created_at) — Epic 2 Story 2.2 will extend it. Coordinate: don't conflict with what Epic 2 will add.
- **Dashboard stub:** Story 1.1 created the dashboard route. This story fills it with real content.
- **Empty state:** A user with 0 decks should see a clear CTA — this is the main conversion point for new users.
- This story runs in PARALLEL with Story 2.1 — both use the auth system from 1.1/1.2. No shared files between 1.3 and 2.1.

### Project Structure Notes

- Dashboard page likely at `/dashboard` — already routed in 1.1. Fill the component here.
- Deck list API: `GET /api/decks` or equivalent per your API pattern.

### References

- [Source: _bmad-output/planning-artifacts/prd.md#Functional Requirements] FR21, FR22
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 1] Story 1.3
- [Source: _bmad-output/implementation-artifacts/1-1-user-registration.md] DB schema, tech stack
- [Source: _bmad-output/implementation-artifacts/1-2-user-login-and-logout.md] Auth middleware

## Dev Agent Record

### Agent Model Used

_to be filled_

### Debug Log References

### Completion Notes List

- Document decks table schema used — Epic 2 agents will extend it.
- Document deck list API endpoint path — Epic 3 sharing agent references it.

### File List
