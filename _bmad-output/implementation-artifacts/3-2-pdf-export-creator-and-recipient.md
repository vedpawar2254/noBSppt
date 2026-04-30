# Story 3.2: PDF Export (Creator & Recipient)

Status: ready-for-dev

## Story

As a user (creator or recipient),
I want to export a deck as a PDF,
so that I can share or present it offline.

## Acceptance Criteria

1. Given I am the creator viewing my deck, when I click "Export PDF", then a PDF is generated and downloaded to my device (FR15).
2. Given I am a recipient viewing a shared deck, when I click "Export PDF", then a PDF is generated and downloaded without requiring me to log in (FR16).
3. Given a PDF export is triggered, when the export completes, then it finishes in under 10 seconds (NFR4).
4. Given a PDF is exported, when I open it, then all slides render with correct layout, fonts, and theming — no formatting degradation.

## Tasks / Subtasks

- [ ] Add "Export PDF" button to creator deck viewer (`/deck/:id`) (AC: 1)
- [ ] Add "Export PDF" button to public deck viewer (`/s/:id`) — no auth required (AC: 2)
- [ ] Build PDF generation endpoint `GET /api/decks/:id/export` (AC: 1, 2, 3, 4)
  - [ ] Auth check: either owner OR deck is_public — allow export either way
  - [ ] Generate PDF from slides data using PDF library (see Dev Notes)
  - [ ] Apply same theme/styles as viewer
  - [ ] Return as `application/pdf` download
  - [ ] Target: complete in <10 seconds (NFR4) — log latency
- [ ] PDF quality (AC: 4)
  - [ ] Correct fonts, layout, and theme colors rendered in PDF
  - [ ] No text truncation or overflow in exported slides
  - [ ] One slide per PDF page
- [ ] Loading state during export (AC: 3)
  - [ ] Show spinner/progress while PDF generates
  - [ ] Disable export button during generation to prevent double-click
- [ ] Write tests: creator export, recipient export (no auth), PDF within 10s, quality check (AC: 1–4)

## Dev Notes

- **CRITICAL:** Read Stories 2.2, 2.3, 3.1 Dev Agent Records — use the exact deck schema, theme system, and public viewer setup documented there.
- **NFR4:** <10 seconds. Server-side PDF generation is the most reliable approach (client-side canvas/print has browser inconsistencies). Use a well-supported library (e.g., Puppeteer, Playwright headless, pdfkit, jspdf — pick one and document it).
- **No auth for public deck export:** If `is_public = true`, any user (including unauthenticated) can export. Auth check: `deck.is_public OR deck.user_id === request.user.id`.
- **Theme consistency:** The PDF must look like the slide viewer — same fonts, colors, spacing. If using headless browser (Puppeteer/Playwright), render the viewer page and capture. If using a PDF library, replicate styles programmatically.
- **Recommended MVP approach:** Puppeteer/Playwright headless screenshot of each slide → combine into PDF. Reliable and theme-consistent. Note: adds a dependency and cold start cost.
- **Alternative:** Server-side templating with pdfkit — lighter but requires manually replicating styles.
- Document your PDF library choice — it affects Story 5.3 (export quality issues in logs).

### Project Structure Notes

- Export endpoint: `GET /api/decks/:id/export` — document this for Story 5.3 (admin logs).
- PDF generation service: extract to a standalone module for testability.

### References

- [Source: _bmad-output/planning-artifacts/prd.md#Functional Requirements] FR15, FR16
- [Source: _bmad-output/planning-artifacts/prd.md#Non-Functional Requirements] NFR4
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 3] Story 3.2
- [Source: _bmad-output/implementation-artifacts/2-2-ai-restraint-engine-deck-generation.md] Deck/slide schema
- [Source: _bmad-output/implementation-artifacts/3-1-public-shareable-link-generation.md] is_public field, public route

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `TS2345` in export route: `Buffer` not assignable to `BodyInit` in `new NextResponse(pdfBuffer, ...)`. Fixed by wrapping: `new Uint8Array(pdfBuffer)`.
- Pre-existing Story 4.x TS errors in subscription routes (`current_period_end` on Stripe type) — not Story 3.2 scope.

### Completion Notes List

- **PDF library**: `pdfkit` v0.18.0 (pure Node.js, no browser binary, no cold-start penalty). Story 5.3 can correlate export errors with `[pdf-export]` console log lines (`deckId`, `slides`, `latency`).
- **Export endpoint**: `GET /api/decks/[id]/export?token=<shareToken>` — `src/app/api/decks/[id]/export/route.ts`. `runtime = "nodejs"` required (pdfkit + db). Auth: owner session OR matching `shareToken` query param. Logs latency for NFR4 monitoring.
- **PDF generation module**: `src/lib/pdf/generator.ts` — `generateDeckPdf(title, slides)` returns `Promise<Buffer>`. Page size 1190×669 (16:9). Styles match DeckViewer default theme (Helvetica-Bold titles, #111827; bullet text #374151; dot #D1D5DB). One slide per page.
- **ExportButton**: `src/components/decks/ExportButton.tsx` — `deckId` + optional `shareToken`. Fetch → blob → programmatic `<a>` download. Loading state disables button during export (AC3).
- **Public export** (AC2): `ExportButton` in `/s/[token]` passes `shareToken` prop → endpoint verifies token, no session needed.
- **Creator export** (AC1): `ExportButton` in `/deck/[id]` with no shareToken → endpoint verifies ownership via session.

### File List

- `src/lib/pdf/generator.ts` — PDF generation module (pdfkit)
- `src/app/api/decks/[id]/export/route.ts` — GET export endpoint (owner + public)
- `src/components/decks/ExportButton.tsx` — export button client component
- `src/app/deck/[id]/page.tsx` — updated: ExportButton added to headerActions
- `src/app/s/[token]/page.tsx` — updated: disabled stub → real ExportButton with shareToken
- `tests/decks/export.test.ts` — 5 tests (401, 404, owner 200, public 200, bad token 404)
