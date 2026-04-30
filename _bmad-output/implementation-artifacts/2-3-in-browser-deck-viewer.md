# Story 2.3: In-Browser Deck Viewer

Status: ready-for-dev

## Story

As a logged-in user,
I want to view my generated deck in the browser,
so that I can review the output immediately after generation.

## Acceptance Criteria

1. Given generation has completed successfully, when the result is ready, then I am shown the deck in a full in-browser slide viewer (FR11).
2. Given I am viewing my deck, when I navigate between slides, then slide transitions work correctly and all content is rendered clearly.
3. Given a deck is created, when the deck ID is assigned, then it uses a non-guessable identifier (UUID or equivalent) — sequential IDs are prohibited (NFR9).
4. Given I navigate away and return to the deck via my dashboard, when I open the deck, then the deck loads and renders correctly from its stored state.

## Tasks / Subtasks

- [ ] Build deck viewer component (AC: 1, 2)
  - [ ] Full-screen or prominent slide display area
  - [ ] Render slide title + bullets with auto-theme styling
  - [ ] Previous / Next navigation (keyboard + click)
  - [ ] Slide counter: "Slide 3 of 7"
- [ ] Route: `/deck/:id` (authenticated — creator view) (AC: 1, 4)
  - [ ] Fetch deck by UUID from API
  - [ ] Auth check: only deck owner can access creator view
  - [ ] 404 if deck not found
- [ ] Auto-theme rendering (AC: 1, 2)
  - [ ] Apply theme from deck record (set in Story 2.2)
  - [ ] Clean, consistent visual style across all slides
- [ ] Deck ID validation (AC: 3)
  - [ ] Verify UUIDs are used (established in Story 2.2 — confirm here)
- [ ] Navigate back from viewer to dashboard (AC: 4)
  - [ ] "Back to dashboard" link
  - [ ] Dashboard deck list opens correct viewer by deck ID
- [ ] Write tests: viewer renders deck, navigation, UUID routing, owner-only access (AC: 1–4)

## Dev Notes

- **CRITICAL:** Read Story 2.2 Dev Agent Record — use the exact deck schema (slides JSON structure, theme field) it documented.
- **NFR9:** UUID deck IDs are enforced in Story 2.2. Confirm and rely on that — do not introduce any sequential ID exposure in URLs.
- **Creator view vs public view:** This story is the CREATOR view (auth-required). Story 3.1 creates the PUBLIC viewer (no auth). They may share a viewer component — design for reuse.
- **Auto-theme:** Single theme at MVP. Apply the theme class/styles from deck record. Story 3.3 (mobile responsive) will build on this component — design it to be responsive-friendly.
- **Route:** `/deck/:id` for creator. `/share/:id` (or `/s/:id`) will be the public route in Story 3.1. Keep them distinct.
- **Keyboard navigation:** Left/right arrow keys for slide navigation. Improves UX significantly.

### Project Structure Notes

- Viewer component: make it reusable. Story 3.1 (public sharing) and Story 3.3 (mobile responsive) will extend or reuse it.
- Document the viewer component path — Stories 3.1 and 3.3 reference it.

### References

- [Source: _bmad-output/planning-artifacts/prd.md#Functional Requirements] FR11
- [Source: _bmad-output/planning-artifacts/prd.md#Non-Functional Requirements] NFR9
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2] Story 2.3
- [Source: _bmad-output/implementation-artifacts/2-2-ai-restraint-engine-deck-generation.md] Deck schema, UUID implementation

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `tests/decks/viewer-route.test.ts` — `mockDeckNotFound()` did not return `chain`; test for AC3 UUID lookup asserted `chain.where` on `undefined`. Fixed by adding `return chain`.
- `tests/setup.ts` — `@testing-library/jest-dom/vitest` import added so TS recognises extended matchers (`toBeInTheDocument`, `toBeDisabled`).
- `tests/decks/viewer.test.tsx` + `viewer-route.test.ts` — `vi.clearAllMocks()` / `vi.restoreAllMocks()` return `VitestUtils` not `void`; concise arrow bodies caused TS2322. Fixed with block-body arrows `() => { vi.fn(); }`.

### Completion Notes List

- `DeckViewer` component: `src/components/decks/DeckViewer.tsx`. Props interface `DeckViewerProps` exported — stable contract for Stories 3.1 (public viewer) and 3.3 (mobile). Pass `headerActions?: React.ReactNode` for injecting context-specific buttons.
- `THEME_STYLES` map exported — add new theme entries there; component falls back to `"default"` for unknown themes.
- Creator route `/deck/[id]` fetches with `AND(deckId, userId)` ownership check. Story 3.1 public route at `/share/[token]` should use `eq(decks.shareToken, token)` instead (no auth required).
- `GET /api/decks/[id]` added alongside existing `DELETE` in `src/app/api/decks/[id]/route.ts`. Same ownership query pattern.
- `DeckList` title link updated to `<Link href={\`/deck/${deck.id}\`}>` (AC4).
- Pre-existing login/register tests timeout intermittently (bcrypt 12 rounds in CI) — not caused by Story 2.3.

### File List

- `src/app/api/decks/[id]/route.ts` — added `GET` handler
- `src/components/decks/DeckViewer.tsx` — new reusable viewer component
- `src/app/deck/[id]/page.tsx` — new creator viewer route
- `src/components/decks/DeckList.tsx` — deck title now links to `/deck/[id]`
- `tests/decks/viewer-route.test.ts` — API GET route tests (node env)
- `tests/decks/viewer.test.tsx` — DeckViewer component tests (jsdom)
- `tests/setup.ts` — added `@testing-library/jest-dom/vitest` import
