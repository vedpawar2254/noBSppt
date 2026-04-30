# Story 4.1: Free Deck Limit Enforcement & Paywall

Status: done

## Story

As a user who has used all free decks,
I want to be clearly notified when I hit the limit and shown an upgrade path,
so that I understand my options before I can generate more decks.

## Acceptance Criteria

1. Given a user generates a deck, when generation completes successfully, then the system increments the deck count for that user's account (FR23).
2. Given a user has used all 3 free decks, when they attempt to generate a new deck, then generation is blocked and they are shown a subscription upgrade prompt (FR24, FR25).
3. Given a user is shown the paywall prompt, when they view it, then it clearly communicates the value of upgrading and provides a direct path to the checkout flow.
4. Given a subscribed user, when they attempt to generate a deck, then the free deck limit does not apply and generation proceeds normally.

## Tasks / Subtasks

- [ ] Paywall check in generation flow (AC: 2, 4)
  - [ ] Before calling AI: check user's `deck_count` vs limit (3) AND `subscription_status`
  - [ ] If `deck_count >= 3` AND `subscription_status != 'paid'`: block generation, return paywall response
  - [ ] If `subscription_status == 'paid'`: bypass limit entirely
- [ ] deck_count increment (AC: 1)
  - [ ] Increment `deck_count` atomically after successful deck save (already started in Story 2.2 — verify it's implemented correctly)
  - [ ] If Story 2.2 did NOT implement this: add it here
- [ ] Paywall UI (AC: 2, 3)
  - [ ] Modal or full-page paywall shown when generation is blocked
  - [ ] Clear message: "You've used your 3 free decks"
  - [ ] Value proposition: why upgrade (no limit, same quality)
  - [ ] CTA: "Upgrade" button → links to checkout (Story 4.2)
  - [ ] Option to dismiss/close (they stay on the page with their input preserved)
- [ ] Input preservation on paywall (AC: 2)
  - [ ] User's input must NOT be lost when paywall appears
  - [ ] After subscribing, user can generate immediately without re-entering
- [ ] Write tests: free user blocked at 3, subscribed user not blocked, count increment, paywall UI (AC: 1–4)

## Dev Notes

- **CRITICAL:** Read Stories 1.1, 2.2 Dev Agent Records — user schema (`deck_count`, `subscription_status`) and generation endpoint are established there.
- **This story runs in PARALLEL with Story 2.3** — it modifies the generation endpoint (Story 2.2), not the viewer. No conflict with Story 2.3 (viewer).
- **deck_count:** Should already be incremented in Story 2.2. Verify and don't duplicate. If 2.2 missed it, add it here. Atomicity matters — use a DB transaction.
- **subscription_status field:** Introduced in Story 1.1 schema (default: 'free'). Story 4.2 will set it to 'paid' on successful checkout. This story reads it.
- **Paywall placement:** Check happens BEFORE the AI call to avoid wasting tokens/credits on a blocked user.
- **3 decks = hard limit:** This is a business rule. Don't make it configurable at MVP — just hard-code 3.
- **Input preservation:** After paywall shown → user subscribes → returns to create page, their input should still be there. Preserve in component state (not re-fetched).
- **Story 4.2 (checkout) is the next step:** Paywall CTA links to checkout flow. Make sure the link/route is wired correctly once 4.2 is built.

### Project Structure Notes

- Paywall check: add to generation API endpoint (Story 2.2 code).
- Paywall UI: reusable modal component — may be needed elsewhere.

### References

- [Source: _bmad-output/planning-artifacts/prd.md#Functional Requirements] FR23, FR24, FR25
- [Source: _bmad-output/planning-artifacts/prd.md#Project Scoping] 3-deck free limit
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 4] Story 4.1
- [Source: _bmad-output/implementation-artifacts/1-1-user-registration.md] User schema (deck_count, subscription_status)
- [Source: _bmad-output/implementation-artifacts/2-2-ai-restraint-engine-deck-generation.md] Generation endpoint

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — 94/94 tests passed, 0 TypeScript errors.

### Completion Notes List

**Backend enforcement (Story 2.2 already implemented — verified correct):**

- Paywall check in `src/app/api/decks/generate/route.ts` lines 36–53:
  - Reads `users.deckCount` and `users.subscriptionStatus` before calling AI
  - `isFree && deckCount >= FREE_DECK_LIMIT (3)` → 402 `{ error, code: "PAYWALL" }`
  - Paid users bypass entirely (any deck_count)
- `deck_count` increment in `src/app/api/decks/generate/route.ts` lines 77–97:
  - Atomic DB transaction: deck insert + `deck_count + 1` in one tx
  - If either fails, neither commits (no phantom increments)

**Paywall UI (Story 4.1 added):**

- `src/components/decks/PaywallModal.tsx` — modal component
  - Backdrop click dismisses (input still in component state — AC2 preservation)
  - "Upgrade now" CTA → `/upgrade` (Story 4.2 creates this route)
  - "Maybe later" dismiss → returns to create page, input intact
- `DeckInputForm` wired: 402 response → `setShowPaywall(true)` instead of inline error

**Story 4.2 note:** Paywall CTA links to `/upgrade`. Story 4.2 must create that route/page.

**deck_count behavior (Story 4.2 and 5.1 must know):**
- Incremented atomically on EVERY successful generation (free and paid users)
- For free users: enforced at `>= 3` (hard-coded `FREE_DECK_LIMIT` in `src/lib/decks/validation.ts`)
- For paid users: incremented but limit not enforced — purely for analytics

### File List

**New files created:**

```
src/components/decks/PaywallModal.tsx
tests/decks/paywall.test.ts
```

**Files modified:**

```
src/components/decks/DeckInputForm.tsx  — import PaywallModal, showPaywall state, wire 402 → modal
_bmad-output/implementation-artifacts/4-1-free-deck-limit-enforcement-and-paywall.md
```
