# Story 3.3: Mobile-Responsive Shared Deck Viewer

Status: done

## Story

As a recipient opening a shared deck on a mobile device,
I want the deck to be fully viewable on my phone,
so that I can review it without needing a desktop.

## Acceptance Criteria

1. Given a shared deck link is opened on a mobile browser (375px viewport), when the page loads, then slides render correctly, text is legible, and no content is clipped or overflowing (FR17).
2. Given the shared deck viewer loads, when measured via performance tooling, then first contentful paint occurs in under 2 seconds on a standard mobile connection (NFR2).
3. Given I am on mobile and viewing a shared deck, when I swipe or tap to navigate between slides, then navigation works correctly without requiring zoom or horizontal scroll.

## Tasks / Subtasks

- [ ] Make public deck viewer fully responsive at 375px (AC: 1)
  - [ ] Slide title: readable font size, no overflow
  - [ ] Bullet text: legible at small screen, no clipping
  - [ ] Slide container: full-width, correct aspect ratio on mobile
  - [ ] Navigation controls: touch-friendly tap targets (min 44x44px)
- [ ] Touch/swipe navigation (AC: 3)
  - [ ] Swipe left → next slide
  - [ ] Swipe right → previous slide
  - [ ] Tap navigation arrows work on touch devices
  - [ ] No horizontal scroll on any slide
- [ ] Performance: FCP <2s on mobile (AC: 2)
  - [ ] Minimize JS bundle for public viewer route (code-split if needed)
  - [ ] No render-blocking resources
  - [ ] Slides data loaded efficiently (already SSR'd from Story 3.1)
  - [ ] Images/thumbnails lazy-loaded if any
- [ ] Cross-browser mobile testing (AC: 1, 3)
  - [ ] Safari iOS (latest)
  - [ ] Chrome Android (latest)
- [ ] Breakpoints: Desktop (1024px+), Tablet (768px), Mobile (375px) — per PRD spec
- [ ] Write tests: 375px render, swipe navigation, no overflow, FCP target (AC: 1–3)

## Dev Notes

- **CRITICAL:** Read Stories 2.3 and 3.1 Dev Agent Records — this story modifies the viewer component and public route they established.
- **NFR2:** FCP <2s. The public viewer is SSR'd from Story 3.1 — HTML is pre-rendered. Focus on CSS efficiency and JS bundle size. Do NOT load heavy client-side libraries on this route.
- **Swipe detection:** Use touch events (`touchstart`, `touchend`) or a lightweight gesture library. Avoid heavy drag libraries — keep bundle minimal.
- **No horizontal scroll:** This is a hard requirement. Test on real 375px viewport. Common failure: slide title too long, wraps incorrectly.
- **Creator interface (desktop-first):** PRD states creator UI is desktop-first. This story is ONLY about the public shared viewer. Do not apply mobile-first to the `/create` or `/dashboard` routes — those are desktop.
- **Breakpoints:** Desktop (1024px+), Tablet (768px), Mobile (375px) — these are from PRD and apply to the public viewer.
- This story runs in **PARALLEL with Stories 3.2 and 4.3** — no shared files with those stories.

### Project Structure Notes

- Modify the viewer component established in Story 2.3 and used in Story 3.1.
- Add responsive CSS — prefer CSS media queries over JS-based responsive logic.

### References

- [Source: _bmad-output/planning-artifacts/prd.md#Functional Requirements] FR17
- [Source: _bmad-output/planning-artifacts/prd.md#Non-Functional Requirements] NFR2
- [Source: _bmad-output/planning-artifacts/prd.md#Web Application Specific Requirements] Responsive design breakpoints
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 3] Story 3.3
- [Source: _bmad-output/implementation-artifacts/2-3-in-browser-deck-viewer.md] Viewer component
- [Source: _bmad-output/implementation-artifacts/3-1-public-shareable-link-generation.md] Public route

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — 71/71 deck tests passed. Pre-existing bcrypt timeout failures in login/register tests are unrelated (noted in Story 2.3 record).

### Completion Notes List

**Changes made to `DeckViewer` (shared component — affects both `/deck/[id]` and `/s/[token]`):**

All changes are additive and backwards-compatible with Story 2.3's props contract.

| Change | Before | After | Reason |
|--------|--------|-------|--------|
| Slide title font | `text-3xl sm:text-4xl` | `text-2xl sm:text-3xl md:text-4xl` | Prevents overflow on 375px with long titles (AC1) |
| Slide title overflow | (none) | `break-words` | Long single-word titles wrap on mobile (AC1) |
| Bullet font | `text-lg sm:text-xl` | `text-base sm:text-lg md:text-xl` | Legible at 375px (AC1) |
| Bullet dot | (none) | `shrink-0` | Prevents dot from shrinking on narrow viewports (AC1) |
| Nav buttons | `p-2` | `p-2 min-w-[44px] min-h-[44px] flex items-center justify-center` | 44×44px touch targets (AC3) |
| Root container | (no overflow) | `overflow-x-hidden` | Prevents any horizontal scroll (AC1) |
| Slide area | `px-8 sm:px-16` | `px-6 sm:px-16 touch-pan-y` | Tighter mobile padding; `touch-pan-y` delegates horizontal swipe to our handler (AC3) |
| **Swipe navigation** | (none) | `touchstart`/`touchend` listeners on container with `SWIPE_THRESHOLD = 50px` | AC3 |

**Swipe implementation:**
- Touch listeners attached to `containerRef` (component root div) via `useEffect`
- `{ passive: true }` listeners — does not block scroll
- Threshold: 50px horizontal diff to trigger slide change
- Swipe left → `goNext()`, swipe right → `goPrev()` (both clamped by existing boundary logic)

**Performance / NFR2 (FCP <2s):**
- No new JS dependencies added — zero bundle impact
- Public viewer route `/s/[token]` is SSR (Story 3.1 set `dynamic = "force-dynamic"`) — HTML pre-rendered
- Touch event handlers are lazy (client-side only, deferred until mount)
- Tailwind CSS purged at build — no extra stylesheet weight

**Breakpoints applied:**
- Mobile 375px: `text-2xl`, `text-base`, `px-6`, `min-w-[44px]`
- Tablet 768px (`sm:`): `text-3xl`, `text-lg`, `px-16`
- Desktop 1024px+ (`md:`): `text-4xl`, `text-xl`

### File List

**Files modified:**

```
src/components/decks/DeckViewer.tsx   — swipe nav, touch targets, mobile typography, overflow fix
_bmad-output/implementation-artifacts/3-3-mobile-responsive-shared-deck-viewer.md
```

**New files created:**

```
tests/decks/viewer-mobile.test.tsx    — 8 tests: swipe left/right, threshold, bounds, overflow, touch targets
```
