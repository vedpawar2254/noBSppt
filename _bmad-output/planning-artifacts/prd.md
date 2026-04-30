---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
releaseMode: phased
inputDocuments: ['_bmad-output/brainstorming/brainstorming-session-2026-04-30-0000.md']
workflowType: 'prd'
briefCount: 0
researchCount: 0
brainstormingCount: 1
projectDocsCount: 0
classification:
  projectType: web_app
  domain: productivity_content_creation
  complexity: low
  projectContext: greenfield
  outputModes: ['in-browser shareable deck', 'PDF download']
  inputModes: ['text input', 'outline', 'doc upload']
  stylingLayer: auto-theming
  targetUser: solo professionals
  businessModel: B2C
---

# Product Requirements Document - nobsppt

**Author:** Vedpawar2254
**Date:** 2026-04-30

## Executive Summary

nobsppt is a web-based AI presentation tool built on a single principle: signal over noise. Solo professionals submit content — as free text or a structured outline — and receive a clean, point-driven slide deck with auto-applied theming. Output is shareable directly in the browser or exportable as PDF.

The product targets a specific frustration: existing AI slide tools (Gamma, Tome, Beautiful.ai) optimize for output that looks impressive — dense text, elaborate layouts, excessive slides. Users spend more time editing out AI additions than they would have building from scratch. nobsppt inverts this: the AI's job is to distill, not to decorate.

### What Makes This Special

nobsppt's differentiator is deliberate restraint. Where competitors treat "more" as a feature, nobsppt treats "less" as the product. The intelligence layer operates as an editor, not a designer — cutting filler, collapsing redundant points, surfacing only what the audience needs to understand. Auto-theming applies a clean visual layer without ornamentation overhead.

The core insight: AI slop in slides comes from tools optimizing to look capable. Real capability is knowing what to cut. Solo professionals who create decks to communicate — not to impress — are underserved by tools that conflate volume with value.

**Position:** *Old AI slides = slop. nobsppt slides = signal.*

## Project Classification

- **Project Type:** Web Application — SPA, B2C
- **Domain:** Productivity / Content Creation
- **Complexity:** Low — no regulated domain concerns
- **Project Context:** Greenfield — net-new product, no legacy constraints

## Success Criteria

### User Success

- User generates a shareable deck requiring zero post-generation edits
- User feels confident presenting output without modification
- Core quality bar: every slide contains only what is necessary to convey the point — no filler text, no redundant bullets, no decorative padding

### Business Success

- **3-month target:** ₹1L total revenue
- **12-month target:** ₹10L cumulative revenue
- **Primary metric:** Paid subscription conversions (freemium → paid after 3 decks)
- **Model:** Freemium — 3 decks free, subscription required beyond that
- Success signal: conversion rate from free users to paid subscribers

### Technical Success

- AI output consistently passes the "no BS" bar — dense, point-driven, zero slop
- Deck generation completes within acceptable latency for interactive use
- In-browser sharing works without login for recipients
- PDF export is presentation-ready without formatting degradation

### Measurable Outcomes

| Metric | 3-Month | 12-Month |
|--------|---------|---------|
| Revenue | ₹1L | ₹10L |
| Free → Paid conversion | First paid cohort established | Sustainable conversion rate |
| Deck quality (no-edit rate) | Validated with early users | Core product guarantee |

## User Journeys

### Journey 1: The Creator — Happy Path

**Arjun** is a management consultant. It's 10pm. He has a client pitch tomorrow at 9am and a brain full of ideas but no deck. He's been burned before — pasted his notes into Gamma, got 14 slides of padded AI prose he spent an hour trimming. Tonight he tries nobsppt.

He pastes his raw notes into the text input. Hits generate. In under 30 seconds: 7 slides. Each one carries exactly one point. No word wasted. The auto-theme is clean — professional without trying. He clicks the share link, sends it to himself for a final check on his phone, then closes his laptop.

He presents it the next morning without touching a single slide.

**Capabilities revealed:** text input, AI distillation, auto-theming, shareable link, fast generation latency.

---

### Journey 2: The Creator — Paywall Conversion

**Priya** is a startup founder. She used nobsppt last week — twice for investor updates, once for a team standup. All three were clean. Today she's preparing a fundraising deck. She pastes her outline in.

The tool starts to process. Then: a paywall. She's used her 3 free decks. She pauses — but only for a second. The last three decks delivered. She upgrades. The fundraising deck generates. It's exactly what she needed.

**Capabilities revealed:** free deck counter, paywall trigger at deck 4, subscription checkout, conversion flow.

---

### Journey 3: The Viewer

**Rahul** receives a link from Arjun — "here's the deck before tomorrow." He opens it on his phone during his commute. No login prompt. No app to download. The deck loads in browser, slides through cleanly. He leaves a quick WhatsApp reply: "looks sharp."

Later, the client asks for a PDF copy. Arjun exports it from the share view in one click. Sends it over.

**Capabilities revealed:** public share link (no auth), mobile-responsive viewer, PDF export accessible from viewer.

---

### Journey 4: The Operator (Founder/Admin)

**Vedpawar2254** checks the admin dashboard on a Sunday morning. 47 decks generated this week. 6 new paid subscribers. One user hit the paywall and bounced — no conversion. One support ticket: "my PDF export had weird fonts."

He looks at the failed export, identifies a font-rendering issue with a specific uploaded file type, and flags it for a fix. He replies to the support ticket with a workaround.

**Capabilities revealed:** admin dashboard (deck volume, conversion metrics), user management, support ticket handling, error investigation tools.

---

### Journey Requirements Summary

| Capability | Revealed By |
|-----------|------------|
| Text input + AI distillation | Journey 1 |
| Auto-theming | Journey 1 |
| Shareable deck link | Journey 1, 3 |
| Fast generation (<30s) | Journey 1 |
| Doc upload input | Journey 2 *(Growth phase)* |
| Free deck counter + paywall | Journey 2 |
| Subscription checkout | Journey 2 |
| No-auth viewer | Journey 3 |
| Mobile-responsive viewer | Journey 3 |
| PDF export | Journey 3 |
| Admin dashboard + metrics | Journey 4 |
| Support tools | Journey 4 |

## Innovation & Novel Patterns

### Detected Innovation Areas

**Inverted AI Model — Subtraction as the Core Intelligence**

Every existing AI presentation tool optimizes for generation: more content, more slides, more design. nobsppt inverts this. The AI's primary function is removal — distilling input down to the minimum viable signal per slide.

This is implemented as a two-layer restraint engine:
- **Layer 1 — Hard Constraints (System Prompt):** Structural rules enforced at generation time — maximum bullets per slide, maximum words per bullet, maximum slide count per deck. These are non-negotiable guardrails, not suggestions.
- **Layer 2 — Signal Scoring:** AI evaluates each candidate point for information density and relevance. Low-signal content is cut before output. Only what earns its place makes it through.

No mainstream AI presentation tool uses subtraction as the primary optimization target.

### Market Context & Competitive Landscape

Existing tools (Gamma, Tome, Beautiful.ai, Canva AI) compete on generation richness — more templates, more AI-generated content, more design variety. The market has optimized uniformly in one direction. nobsppt occupies the vacated opposite position: less as a feature, restraint as a product promise.

The gap exists because most tools are built to impress during demos. nobsppt is built to perform in boardrooms.

### Validation Approach

- **Qualitative:** Early users given decks with zero editing instruction — track whether they present without modification
- **Quantitative:** Measure "edit rate" post-generation (edits made before sharing = failure signal)
- **Benchmark:** Compare output slide count and word count against Gamma/Tome outputs on identical input — nobsppt should consistently produce fewer, denser slides

### Risk Mitigation

- **Risk:** Constraints too aggressive — output loses context, misses key points → **Mitigation:** User can specify context priority in input; system prompt tunable per use case
- **Risk:** Signal scoring cuts something the user wanted → **Mitigation:** 3-free-deck trial gives low-stakes validation before commitment; feedback loop for model improvement
- **Risk:** Competitors copy the approach → **Mitigation:** Brand positioning ("no BS") is easier to defend than features; first-mover trust with early user base

## Web Application Specific Requirements

### Project-Type Overview

nobsppt is a Single Page Application (SPA) targeting modern browsers only. The public-facing deck viewer is SEO-indexed for organic discovery. Core interaction model: input → generate → view/share, with no real-time streaming — fast completed-result delivery is the UX contract.

### Browser Matrix

| Browser | Minimum Version |
|---------|----------------|
| Chrome | Latest |
| Firefox | Latest |
| Safari | Latest (macOS + iOS) |
| Edge | Latest |

No legacy browser support (IE, older Chromium forks). Mobile browsers covered via Safari iOS and Chrome Android.

### Responsive Design

- **Creator interface:** Desktop-first (professionals creating decks on laptop/desktop)
- **Deck viewer:** Mobile-responsive (recipients open shared links on any device)
- **Breakpoints:** Desktop (1024px+), Tablet (768px), Mobile (375px)

### SEO Strategy

- **Shared deck links** (`/deck/[id]`) are publicly accessible and indexable — server-side rendered or statically generated for crawlability
- **Meta tags per deck:** title, description, og:image (deck thumbnail) for social sharing previews
- **Creator/auth routes:** not indexed
- Deck discoverability is a passive growth lever — no active SEO effort required at MVP

### Accessibility Level

- WCAG 2.1 AA baseline — standard best practice, not a sprint priority
- Core requirements: keyboard navigation, sufficient color contrast, alt text on images, screen reader compatibility for viewer
- Not a blocker for MVP launch; address in growth phase

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Quality-gated launch — product does not ship until the restraint engine consistently produces zero-edit-needed output. Speed to market is secondary to quality of promise.

**Resource Requirements:** Solo founder. MVP scope sized accordingly — no features that require sustained backend ops or complex integrations.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- Journey 1: Creator happy path (text input + outline input)
- Journey 2: Paywall conversion
- Journey 3: Viewer (public share link + PDF export)

**Must-Have Capabilities:**
- Text input and outline input → AI two-layer restraint engine → slide deck
- Auto-theming (single clean theme at MVP)
- In-browser shareable deck (public, no auth for viewer)
- PDF export
- User auth (account creation, login)
- Free deck counter (3 decks) → subscription paywall + checkout
- Basic admin visibility (deck volume, conversion metrics — console/simple dashboard)

### Post-MVP Features

**Phase 2 — Growth:**
- Doc upload (PDF, .docx → input)
- Multiple theme options
- Custom brand kit / logo upload
- Minimal deck editing (for edge cases)
- Usage analytics (decks created, shared, viewed)
- Google Drive / Notion input integrations

**Phase 3 — Vision:**
- Team workspaces
- Deck performance analytics (viewer engagement)
- API access for developers
- White-label / agency tier

### Risk Mitigation Strategy

**Technical Risks:** Restraint engine quality is the primary risk — gated launch means no public release until output consistently clears the zero-edit bar. Private alpha testing with a small group to validate before opening.

**Market Risks:** Users may want more control than the restraint engine allows → 3-free-deck trial surfaces this early at zero cost; edit rate post-generation is the key signal to watch.

**Resource Risks (Solo):** Doc upload deferred to Growth — removes the most complex backend parsing work from MVP. Admin tooling kept minimal (console access sufficient for early stage). No ticketing system — email support at MVP.

## Functional Requirements

### Content Input

- **FR1:** User can submit free text as input for deck generation
- **FR2:** User can submit a structured outline as input for deck generation
- **FR3:** User can see how many free decks they have remaining before hitting the limit
- **FR4:** *(Growth)* User can upload a document (PDF, .docx) as input for deck generation
- **FR5:** *(Growth)* User can connect a Google Drive or Notion document as input

### Deck Generation — Restraint Engine

- **FR6:** System generates a slide deck from user input applying hard structural constraints (max bullets per slide, max words per bullet, max slide count)
- **FR7:** System evaluates and filters content by signal density, removing low-signal content before output
- **FR8:** System applies a clean auto-theme to every generated deck
- **FR9:** *(Growth)* User can select from multiple visual themes for a deck
- **FR10:** *(Growth)* User can upload brand assets (logo, colors) to apply to generated decks

### Deck Presentation & Sharing

- **FR11:** User can view their generated deck in-browser
- **FR12:** User can generate a public shareable link for their deck
- **FR13:** Any recipient can view a shared deck in-browser without an account
- **FR14:** Shared deck links are publicly indexable with title, description, and thumbnail metadata
- **FR15:** User can export their deck as a PDF
- **FR16:** Recipient can export a PDF from the shared deck viewer
- **FR17:** Shared deck viewer is accessible and functional on mobile browsers
- **FR18:** *(Growth)* User can make limited edits to a generated deck after creation

### User Account Management

- **FR19:** User can create an account with email and password
- **FR20:** User can log in and log out
- **FR21:** User can view their deck history
- **FR22:** User can delete a previously generated deck

### Monetization

- **FR23:** System tracks the number of decks generated per user account
- **FR24:** System enforces the 3-deck free limit and blocks further generation until subscription is active
- **FR25:** User is presented with a subscription upgrade prompt upon reaching the free limit
- **FR26:** User can subscribe to a paid plan via checkout flow
- **FR27:** User can view and cancel their active subscription

### Administration

- **FR28:** Admin can view total decks generated across all users
- **FR29:** Admin can view paid subscription count and free-to-paid conversion metrics
- **FR30:** Admin can view individual user account details and deck activity
- **FR31:** Admin can access deck generation logs for error diagnosis and quality review

## Non-Functional Requirements

### Performance

- **NFR1:** Deck generation from text/outline input returns completed result in <30 seconds; target <15 seconds for typical input
- **NFR2:** Shared deck viewer achieves <2 second first contentful paint
- **NFR3:** SPA initial load completes in <3 seconds on standard broadband
- **NFR4:** PDF export completes in <10 seconds

### Security

- **NFR5:** All data transmitted over HTTPS/TLS — no exceptions
- **NFR6:** User passwords stored using industry-standard hashing (bcrypt or equivalent); plaintext storage is prohibited
- **NFR7:** Payment processing delegated entirely to a PCI-compliant provider (Stripe or equivalent); no card data stored or transmitted through nobsppt servers
- **NFR8:** User accounts protected against brute-force login attempts (rate limiting on auth endpoints)
- **NFR9:** Shared deck URLs use non-guessable identifiers (UUID or equivalent); sequential IDs are prohibited

### Reliability

- **NFR10:** System targets 99.5% uptime during normal operations (excludes planned maintenance)
- **NFR11:** Deck generation failures surface a clear error state to the user — no silent failures or blank outputs
- **NFR12:** User input is preserved on generation failure, allowing immediate retry without re-entering content

### Scalability

- **NFR13:** Deck generation pipeline is architected to support horizontal scaling — increased concurrent generation load handled by adding capacity, not rewriting
