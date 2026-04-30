# Story 2.1: Text & Outline Input Interface

Status: done

## Story

As a logged-in user,
I want to submit free text or a structured outline as input for deck generation,
so that I can start creating a deck from my raw content.

## Acceptance Criteria

1. Given I am logged in and on the creation page, when I view the input interface, then I see a text area supporting free-form text input and an outline input mode (toggle or tab).
2. Given I have entered content, when I switch between input modes, then my content is preserved and not discarded.
3. Given I submit with an empty input, when I attempt to generate, then I see a validation error and generation does not begin.
4. Given I am on the creation page, when the page loads, then I can see how many free decks I have remaining (FR3).

## Tasks / Subtasks

- [ ] Create deck creation page at `/create` (auth-protected) (AC: 1)
  - [ ] Text area for free-form input (FR1)
  - [ ] Outline input mode: structured list entry (FR2)
  - [ ] Toggle/tab to switch between modes
- [ ] Implement mode switching with content preservation (AC: 2)
  - [ ] Store both mode inputs in local state independently
  - [ ] Switching modes does not clear the other mode's content
- [ ] Input validation (AC: 3)
  - [ ] Disable/block "Generate" button if input is empty
  - [ ] Show inline validation error on empty submit attempt
- [ ] Free deck counter display (AC: 4)
  - [ ] Fetch remaining free decks for authenticated user (FR3)
  - [ ] Display: "X of 3 free decks remaining" (or equivalent)
  - [ ] Counter updates reflect current state (not cached stale data)
- [ ] Wire "Generate" button to trigger Story 2.2 generation flow (stub — just the button and handler)
- [ ] Write tests: both input modes, mode switch preserves content, empty validation, counter display (AC: 1–4)

## Dev Notes

- **CRITICAL:** Read Story 1.1 + 1.2 Dev Agent Records — use established tech stack, auth guard, and API patterns.
- **This story runs in PARALLEL with Story 1.3** — no file conflicts. 1.3 owns the dashboard/decks list. This story owns `/create`.
- **Deck counter:** Query `deck_count` from the user record (established in Story 1.1 schema). Do NOT count from the decks table on every request — use the pre-computed counter.
- **Outline mode:** A structured list input (e.g., bullet-point style) that maps to a hierarchy. Keep it simple at MVP — a textarea with line-by-line parsing is acceptable; a rich outline editor is not needed.
- **Content preservation on mode switch:** Both inputs live in local component state simultaneously. Switching just changes which is shown. Do not reset or clear the hidden input.
- **Generate button:** Wire to Story 2.2's API endpoint once that story is complete. For now, create the handler stub.

### Project Structure Notes

- Route: `/create` — auth-protected (use auth middleware from Story 1.2).
- Input component likely reusable — place in a shared components folder.

### References

- [Source: _bmad-output/planning-artifacts/prd.md#Functional Requirements] FR1, FR2, FR3
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2] Story 2.1
- [Source: _bmad-output/implementation-artifacts/1-1-user-registration.md] User schema (deck_count field)
- [Source: _bmad-output/implementation-artifacts/1-2-user-login-and-logout.md] Auth middleware

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — all 57 tests passed on first run, 0 TypeScript errors.

### Completion Notes List

- **Route:** `/create` — auth-protected via `requireAuth()` (same pattern as dashboard).
- **Counter:** Pre-computed `deck_count` from users table — `getFreeDecksRemaining(deckCount)` in `src/lib/decks/validation.ts`. `FREE_DECK_LIMIT = 3`. Paid users see no counter (null).
- **Mode switch:** Both `textContent` and `outlineContent` live as independent `useState` values in `DeckInputForm`. Switching mode only changes which textarea renders — the other retains its value.
- **Validation:** `validateDeckInput(content)` — trims and checks non-empty. Called on generate click; inline error shown via `role="alert"` paragraph.

**CRITICAL — GenerationPayload sent to POST /api/decks/generate (Story 2.2 must match exactly):**

```typescript
// src/lib/decks/validation.ts
export interface GenerationPayload {
  mode: "text" | "outline";
  content: string;
  // "text" mode: freeform prose / pasted notes (raw string)
  // "outline" mode: newline-separated lines, hierarchy via leading dashes/spaces
  //   e.g. "Intro\n- Background\nMain\n- Point 1"
  //   Story 2.2 parses outline structure server-side.
}
```

Story 2.2 wires `handleGenerate()` in `DeckInputForm` — the stub is at `src/components/decks/DeckInputForm.tsx:35` (replace the `console.log` with the real `fetch` call to `/api/decks/generate`).

### File List

**New files created:**

```
src/app/create/page.tsx
src/components/decks/DeckInputForm.tsx
src/lib/decks/validation.ts
tests/decks/validation.test.ts
```
