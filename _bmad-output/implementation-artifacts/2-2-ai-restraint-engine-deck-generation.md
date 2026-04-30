# Story 2.2: AI Restraint Engine — Deck Generation

Status: ready-for-dev

## Story

As a logged-in user,
I want to generate a slide deck from my input using the restraint engine,
so that I receive a clean, signal-dense deck with no filler.

## Acceptance Criteria

1. Given I have submitted valid input, when generation begins, then I see a loading state indicating generation is in progress.
2. Given generation is in progress, when the deck is produced, then every slide contains only one point, respects hard constraints (max bullets per slide, max words per bullet, max slide count), and low-signal content has been filtered out (FR6, FR7).
3. Given a deck is generated, when I view the output, then a clean auto-theme is applied consistently across all slides (FR8).
4. Given typical input length, when generation completes, then the result is returned in under 30 seconds; target under 15 seconds (NFR1).
5. Given generation fails due to an API or system error, when the failure occurs, then I see a clear error message — no silent failure or blank output (NFR11). My original input is preserved so I can retry without re-entering content (NFR12).

## Tasks / Subtasks

- [ ] Build generation API endpoint `POST /api/decks/generate` (AC: 1–5)
  - [ ] Accept input: `{ mode: 'text'|'outline', content: string }`
  - [ ] Call AI provider with restraint engine system prompt (see Dev Notes)
  - [ ] Parse AI response into structured slide objects
  - [ ] Persist generated deck to DB with UUID (NFR9)
  - [ ] Increment user's `deck_count` on successful generation
  - [ ] Return deck ID + slide data
- [ ] Restraint engine system prompt (AC: 2)
  - [ ] Hard constraints: max 3 bullets/slide, max 10 words/bullet, max 10 slides/deck
  - [ ] Signal-scoring instruction: "Remove any content that doesn't earn its place. Each bullet must carry one distinct, non-redundant point."
  - [ ] Tone: terse, professional, no filler phrases
- [ ] Auto-theme application (AC: 3)
  - [ ] Single theme at MVP — apply consistently to all generated decks
  - [ ] Theme stored with deck record; viewer reads it from there
- [ ] Loading state on frontend (AC: 1)
  - [ ] Show spinner/progress indicator while awaiting generation
  - [ ] Disable input and generate button during generation
- [ ] Error handling (AC: 5)
  - [ ] On API failure: display clear error message
  - [ ] Preserve user input in component state — do not reset on error
  - [ ] Allow immediate retry without re-entering content
- [ ] Performance target (AC: 4)
  - [ ] Log generation latency server-side for monitoring
  - [ ] If using streaming: complete result delivery (not streaming display) is the UX contract
- [ ] Deck schema extension (AC: 2, 3)
  - [ ] Extend decks table: slides (JSON array), theme, status, generated_at
- [ ] Write tests: generation happy path, constraint enforcement, error handling, input preservation (AC: 1–5)

## Dev Notes

- **CRITICAL:** Read Story 2.1 Dev Agent Record — use exact input format it documented. Read Story 1.1 for DB schema and tech stack.
- **NFR1:** Generation <30s hard requirement, <15s target. AI provider latency is the bottleneck. Use async/streaming server-side but deliver completed result to client.
- **NFR9:** Deck IDs must be UUIDs (or equivalent non-guessable). NEVER use sequential integer IDs for decks.
- **NFR11/12:** No silent failures. Input preservation is critical — users who hit errors must not lose their work.
- **Restraint engine is the core product differentiator.** The system prompt is the most important code in this story. Hard constraints (max bullets, max words, max slides) are enforced at prompt level — not post-processed. Signal scoring is also prompt-level instruction.
- **deck_count increment:** Happens on successful generation only. Ties into Epic 4 paywall (Story 4.1). Atomic operation — if deck save fails, do NOT increment count.
- **Architecture note:** This story creates the pipeline skeleton. NFR13 (horizontal scaling) means the generation handler should be stateless and detachable — avoid storing generation state in memory.
- **AI provider:** Choose and document your provider (OpenAI, Anthropic, etc.) and model. Log this in Dev Agent Record for all future agents to know.

### Restraint Engine Prompt Design (MVP starting point)

```
You are a presentation distiller. Your only job is subtraction.

Rules (non-negotiable):
- Maximum 10 slides per deck
- Maximum 3 bullets per slide
- Maximum 10 words per bullet
- Each bullet must carry exactly one distinct point
- Remove any bullet that could be cut without losing meaning
- No filler: no "In conclusion", no "As we can see", no padding

Output format: JSON array of slides:
[{ "title": "...", "bullets": ["...", "..."] }]
```

### Project Structure Notes

- Generation endpoint: `POST /api/decks/generate` (or equivalent per your API convention).
- Deck storage: extend the stub decks table created in Story 1.3.
- Store slides as JSON column or separate slides table — document choice.

### References

- [Source: _bmad-output/planning-artifacts/prd.md#Functional Requirements] FR6, FR7, FR8
- [Source: _bmad-output/planning-artifacts/prd.md#Non-Functional Requirements] NFR1, NFR9, NFR11, NFR12, NFR13
- [Source: _bmad-output/planning-artifacts/prd.md#Innovation] Two-layer restraint engine design
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2] Story 2.2
- [Source: _bmad-output/implementation-artifacts/2-1-text-and-outline-input-interface.md] Input format

## Dev Agent Record

### Agent Model Used

_to be filled_

### Debug Log References

### Completion Notes List

- Document AI provider + model chosen — all future agents and Epic 5 logs depend on this.
- Document deck DB schema (slides JSON structure) — Stories 2.3, 3.1, 3.2 all read this.
- Document generation endpoint signature — 2.3 viewer and 4.1 paywall both reference generation.

### File List
