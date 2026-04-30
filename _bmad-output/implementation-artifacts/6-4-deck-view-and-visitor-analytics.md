# Story 6.4: Deck View & Visitor Analytics

Status: ready-for-dev

## Story

As a deck creator and as an admin,
I want to see how many times my shared decks have been viewed and by how many unique visitors,
so that I can understand whether my decks are reaching their audience.

## Acceptance Criteria

1. Given a shared deck is viewed via its public URL, when the page loads, then a view event is recorded (deck ID, timestamp, anonymous visitor ID).
2. Given I am a creator viewing my deck at `/deck/:id`, when I check deck stats, then I can see total view count and unique visitor count for that deck.
3. Given I am an admin, when I view the admin dashboard, then I see platform-wide total deck views and the top 5 most-viewed decks.
4. Given a deck is viewed multiple times by the same visitor in quick succession (e.g. page refresh), when events are recorded, then they are deduplicated — repeat views within 30 minutes from the same visitor do not count as new unique visits.

## Tasks / Subtasks

- [ ] Create `deck_views` table (AC: 1, 4)
  - [ ] Schema: `id UUID`, `deck_id UUID REFERENCES decks(id) ON DELETE CASCADE`, `visitor_id VARCHAR(64)`, `viewed_at TIMESTAMP DEFAULT NOW()`
  - [ ] Index: `(deck_id, visitor_id, viewed_at)` for deduplication queries
- [ ] Record view on public deck page load (AC: 1, 4)
  - [ ] In `/s/[token]/page.tsx` server component: fire view event after deck fetch
  - [ ] `visitor_id`: derive from a short-lived cookie (`nobsppt_vid`) — generate UUID if not present, 30-day expiry
  - [ ] Deduplication: before inserting, check if same `(deck_id, visitor_id)` exists within last 30 minutes — if yes, skip insert
  - [ ] View recording is fire-and-forget — do NOT block page render on it
  - [ ] Do NOT record views from the deck owner (check if `session.userId === deck.userId`)
- [ ] Creator deck stats (AC: 2)
  - [ ] Add stats panel to creator deck view `/deck/:id`
  - [ ] Stats: total views (all time), unique visitors (distinct visitor_id), views last 7 days
  - [ ] API: `GET /api/decks/:id/stats` — auth-required, owner only
- [ ] Admin analytics update (AC: 3)
  - [ ] Extend `GET /api/admin/metrics` to include: total deck views (all time), top 5 most-viewed decks (deck title + view count)
  - [ ] Display on admin dashboard alongside existing metrics from Story 5.1
- [ ] Write tests: view recorded on public load, owner view not recorded, deduplication window, creator stats API, admin metrics extension (AC: 1–4)

## Dev Notes

- **CRITICAL:** Read Stories 2.3, 3.1, 5.1 Dev Agent Records — public viewer (`/s/[token]`), creator viewer (`/deck/:id`), and admin dashboard are the pages being extended.
- **visitor_id cookie:** Short-lived anonymous identifier. NOT a user ID. Not linked to accounts. Purpose: deduplication only. Set as httpOnly cookie to prevent JS tampering.
- **Fire-and-forget view recording:** Use `waitUntil()` (Vercel/Edge) or just do an async insert without awaiting in the server component. Page load speed must NOT be impacted by view logging — this is not on the critical path.
- **Deduplication query:** `SELECT 1 FROM deck_views WHERE deck_id = $1 AND visitor_id = $2 AND viewed_at > NOW() - INTERVAL '30 minutes'` — if any row returned, skip insert.
- **Creator stats are approximate:** UUID-based visitor tracking is inherently imprecise (shared devices, cleared cookies). Present as "~X visitors" or just "X visits" — don't overstate precision.
- **Do not track creators viewing their own deck:** `session?.userId === deck.userId` check before recording. No self-view inflation.
- **Admin top-5 query:** `SELECT deck_id, COUNT(*) as views FROM deck_views GROUP BY deck_id ORDER BY views DESC LIMIT 5` — join with decks for title. Consider caching this if it becomes slow.
- **Privacy:** No PII stored in deck_views. `visitor_id` is a random UUID, not linked to user accounts.
- **Story 6.1 (OpenRouter) is independent** — these stories can run in parallel.

### Project Structure Notes

- New table: `deck_views` in `src/lib/db/schema.ts`
- New API: `GET /api/decks/[id]/stats`
- Modify: `src/app/s/[token]/page.tsx` (add view recording), `src/app/deck/[id]/page.tsx` (add stats panel), `src/app/api/admin/metrics/route.ts` (extend with view totals)

### References

- [Source: _bmad-output/planning-artifacts/prd.md#Post-MVP Features] Usage analytics (Phase 2)
- [Source: _bmad-output/implementation-artifacts/3-1-public-shareable-link-generation.md] Public viewer
- [Source: _bmad-output/implementation-artifacts/2-3-in-browser-deck-viewer.md] Creator viewer
- [Source: _bmad-output/implementation-artifacts/5-1-platform-metrics-dashboard.md] Admin metrics

## Dev Agent Record

### Agent Model Used

_to be filled_

### Debug Log References

### Completion Notes List

- Document deck_views table schema — future analytics stories extend it.
- Document visitor_id cookie name and strategy.

### File List
