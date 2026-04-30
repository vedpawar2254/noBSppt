# Story 3.1: Public Shareable Link Generation

Status: ready-for-dev

## Story

As a logged-in user,
I want to generate a public shareable link for my deck,
so that anyone can view it without needing an account.

## Acceptance Criteria

1. Given I am viewing my generated deck, when I click "Share", then a unique public URL is generated for the deck and displayed/copied to my clipboard (FR12).
2. Given a shareable link has been generated, when anyone opens the link in a browser, then they can view the full deck without being prompted to log in or create an account (FR13).
3. Given a shared deck URL is accessed, when a search engine crawler or social platform fetches the URL, then the response includes a page title, description, and og:image thumbnail for the deck (FR14).
4. Given a shared deck URL is indexed, when the deck is visited via organic search or social share, then the deck renders correctly as a publicly accessible page.

## Tasks / Subtasks

- [ ] Add `is_public` / `share_id` to deck record (AC: 1)
  - [ ] Generate share URL using existing UUID deck ID (or a separate share token)
  - [ ] Mark deck as publicly accessible on share action
- [ ] Share button in deck viewer (AC: 1)
  - [ ] "Share" button in creator view (`/deck/:id`)
  - [ ] On click: generate/activate public link, copy URL to clipboard
  - [ ] Show confirmation: "Link copied!" feedback
- [ ] Public deck route `/s/:id` or `/deck/:id` (no-auth) (AC: 2, 4)
  - [ ] Publicly accessible — no authentication required
  - [ ] Renders deck using viewer component (from Story 2.3)
  - [ ] Returns 404 for non-existent or non-public decks
- [ ] SEO metadata (AC: 3)
  - [ ] Server-side render or static generation for `/s/:id` route
  - [ ] `<title>`: deck title or first slide title
  - [ ] `<meta name="description">`: brief summary (first bullet or generated summary)
  - [ ] `<meta property="og:title">`, `og:description>`, `og:image` (deck thumbnail)
  - [ ] Generate og:image: screenshot or static slide thumbnail (simplest approach at MVP)
- [ ] Public viewer: no auth prompt, no login CTA in viewer UI (AC: 2)
- [ ] PDF export button visible in public viewer (stub for Story 3.2)
- [ ] Write tests: share link generation, public access without auth, SEO tags present (AC: 1–4)

## Dev Notes

- **CRITICAL:** Read Story 2.3 Dev Agent Record — reuse the deck viewer component. Public view = same component, different route, no auth requirement.
- **SEO is non-negotiable:** `/s/:id` must be SSR or statically generated — a client-side-only SPA route will NOT be crawled (PRD: "server-side rendered or statically generated for crawlability").
- **og:image:** MVP approach: generate a simple SVG/canvas thumbnail of the first slide, or use a headless screenshot service. Document your approach — keep it simple.
- **Public vs creator route:** Creator sees `/deck/:id` (auth-required). Public sees `/s/:id` (no auth). They render the same content but with different chrome (no user nav in public view).
- **Share toggle:** Deck starts private. Clicking Share makes it public (sets `is_public = true`). This is one-way at MVP — no "unshare" requirement.
- **Clipboard API:** Use `navigator.clipboard.writeText()` with a fallback for older browsers.
- **Story 3.3 (mobile viewer) extends this public route** — design the public viewer component to be responsive-ready.

### Project Structure Notes

- Public route must be in SSR/static generation scope (not excluded from server rendering).
- og:image generation: document the approach and any additional dependencies added.

### References

- [Source: _bmad-output/planning-artifacts/prd.md#Functional Requirements] FR12, FR13, FR14
- [Source: _bmad-output/planning-artifacts/prd.md#Web Application Specific Requirements] SEO strategy
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 3] Story 3.1
- [Source: _bmad-output/implementation-artifacts/2-3-in-browser-deck-viewer.md] Viewer component

## Dev Agent Record

### Agent Model Used

_to be filled_

### Debug Log References

### Completion Notes List

- Document public route path — Stories 3.2 and 3.3 extend it.
- Document og:image generation approach — may need deps update.
- Document share token / `is_public` DB field — Story 3.2 reads it.

### File List
