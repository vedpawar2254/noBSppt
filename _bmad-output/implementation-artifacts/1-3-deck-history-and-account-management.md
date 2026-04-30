# Story 1.3: Deck History & Account Management

Status: done

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

- [x] Build dashboard / deck history page (AC: 1, 2)
  - [x] Fetch user's decks server-side ordered by created_at DESC
  - [x] Render deck list: title, creation date
  - [x] Empty state: friendly message + CTA to create first deck
- [x] Build deck list API endpoint (AC: 1)
  - [x] GET /api/decks — returns decks owned by authenticated user
  - [x] Ordered by created_at DESC
- [x] Build delete flow (AC: 3, 4)
  - [x] Delete button on each deck card
  - [x] Inline confirmation prompt before deletion (AC3)
  - [x] DELETE /api/decks/[id] — AND condition (deckId + userId) enforces ownership
  - [x] On confirm: optimistic removal from list + router.refresh() for server sync
- [x] Write tests: deck list, empty state, delete with confirmation, ownership check (AC: 1–4)

## Dev Notes

- **Ownership check:** `DELETE /api/decks/[id]` uses `AND(eq(decks.id, id), eq(decks.userId, session.userId))`. Deck belonging to a different user returns 404 — same response as not-found to avoid info leak.
- **Dashboard fetch pattern:** Decks are fetched server-side in the Server Component (no API call from client on load). After deletion, `router.refresh()` re-runs the server component to stay in sync.
- **Delete confirmation:** Inline on the card — no modal library needed. Clicking "Delete" reveals "Delete this deck? [Cancel] [Delete]" on the same card.
- **Empty state CTA:** Links to `/create` — this route is owned by Story 2.1 (running in parallel). No file conflict.

### Project Structure Notes

- Deck list API: `GET /api/decks` — returns `{ decks: DeckSummary[] }`
- Delete API: `DELETE /api/decks/[id]` — returns `{ success: true }` or 404
- `DeckSummary` type exported from `src/components/decks/DeckList.tsx` — Epic 3 sharing agent may reference for display

### References

- [Source: _bmad-output/planning-artifacts/prd.md#Functional Requirements] FR21, FR22
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 1] Story 1.3

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — 48/48 tests passed on first run, TypeScript clean.

### Completion Notes List

**Decks table schema (Epic 2 agents MUST extend this):**

```
decks
─────────────────────────────────────────────────────
id           UUID PRIMARY KEY DEFAULT random_uuid()
user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
title        VARCHAR(500) NOT NULL
created_at   TIMESTAMP DEFAULT NOW() NOT NULL
```

**Epic 2 (Story 2.2) must ADD these columns:**
```
slides       JSONB NOT NULL              -- array of { heading, bullets[] } objects
input_text   TEXT                        -- raw user input; preserved for NFR12 retry
share_token  VARCHAR(255) UNIQUE         -- set on first share; null until shared
status       ENUM('generating','done','failed') DEFAULT 'done'
```

**Deck list API endpoint (Epic 3 sharing agent reference):**
- `GET /api/decks` → `{ decks: [{ id, title, createdAt }] }` — auth required
- `DELETE /api/decks/[id]` → `{ success: true }` — auth + ownership required

**File: `src/lib/db/schema.ts`** — `decks` table exported as `decks`, types `Deck` and `NewDeck` available.

### File List

**New files created:**

```
src/app/api/decks/route.ts
src/app/api/decks/[id]/route.ts
src/components/decks/DeckList.tsx
tests/decks/deck-list.test.ts
tests/decks/deck-delete.test.ts
```

**Files modified:**

```
src/lib/db/schema.ts        — added decks table + Deck/NewDeck types
src/app/dashboard/page.tsx  — replaced stub with live deck fetch + DeckList
```
