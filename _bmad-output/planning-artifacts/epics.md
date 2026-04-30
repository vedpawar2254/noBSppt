---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments: ['_bmad-output/planning-artifacts/prd.md']
---

# nobsppt - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for nobsppt, decomposing the requirements from the PRD into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: User can submit free text as input for deck generation
FR2: User can submit a structured outline as input for deck generation
FR3: User can see how many free decks they have remaining before hitting the limit
FR4: *(Growth)* User can upload a document (PDF, .docx) as input for deck generation
FR5: *(Growth)* User can connect a Google Drive or Notion document as input
FR6: System generates a slide deck from user input applying hard structural constraints (max bullets per slide, max words per bullet, max slide count)
FR7: System evaluates and filters content by signal density, removing low-signal content before output
FR8: System applies a clean auto-theme to every generated deck
FR9: *(Growth)* User can select from multiple visual themes for a deck
FR10: *(Growth)* User can upload brand assets (logo, colors) to apply to generated decks
FR11: User can view their generated deck in-browser
FR12: User can generate a public shareable link for their deck
FR13: Any recipient can view a shared deck in-browser without an account
FR14: Shared deck links are publicly indexable with title, description, and thumbnail metadata
FR15: User can export their deck as a PDF
FR16: Recipient can export a PDF from the shared deck viewer
FR17: Shared deck viewer is accessible and functional on mobile browsers
FR18: *(Growth)* User can make limited edits to a generated deck after creation
FR19: User can create an account with email and password
FR20: User can log in and log out
FR21: User can view their deck history
FR22: User can delete a previously generated deck
FR23: System tracks the number of decks generated per user account
FR24: System enforces the 3-deck free limit and blocks further generation until subscription is active
FR25: User is presented with a subscription upgrade prompt upon reaching the free limit
FR26: User can subscribe to a paid plan via checkout flow
FR27: User can view and cancel their active subscription
FR28: Admin can view total decks generated across all users
FR29: Admin can view paid subscription count and free-to-paid conversion metrics
FR30: Admin can view individual user account details and deck activity
FR31: Admin can access deck generation logs for error diagnosis and quality review

### NonFunctional Requirements

NFR1: Deck generation from text/outline input returns completed result in <30 seconds; target <15 seconds for typical input
NFR2: Shared deck viewer achieves <2 second first contentful paint
NFR3: SPA initial load completes in <3 seconds on standard broadband
NFR4: PDF export completes in <10 seconds
NFR5: All data transmitted over HTTPS/TLS — no exceptions
NFR6: User passwords stored using industry-standard hashing (bcrypt or equivalent); plaintext storage is prohibited
NFR7: Payment processing delegated entirely to a PCI-compliant provider (Stripe or equivalent); no card data stored or transmitted through nobsppt servers
NFR8: User accounts protected against brute-force login attempts (rate limiting on auth endpoints)
NFR9: Shared deck URLs use non-guessable identifiers (UUID or equivalent); sequential IDs are prohibited
NFR10: System targets 99.5% uptime during normal operations (excludes planned maintenance)
NFR11: Deck generation failures surface a clear error state to the user — no silent failures or blank outputs
NFR12: User input is preserved on generation failure, allowing immediate retry without re-entering content
NFR13: Deck generation pipeline is architected to support horizontal scaling — increased concurrent generation load handled by adding capacity, not rewriting

### Additional Requirements

- No Architecture.md document found. Architecture requirements will be added once that document is created.

### UX Design Requirements

- UX Design Specification exists but contains no completed content (placeholder only). UX design requirements will be added once that document is completed.

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR1 | Epic 2 | Free text input |
| FR2 | Epic 2 | Structured outline input |
| FR3 | Epic 2 | Free deck counter visible |
| FR6 | Epic 2 | Hard structural constraints |
| FR7 | Epic 2 | Signal-density filtering |
| FR8 | Epic 2 | Auto-theming |
| FR11 | Epic 2 | In-browser deck viewer |
| FR12 | Epic 3 | Shareable link generation |
| FR13 | Epic 3 | No-auth viewer for recipients |
| FR14 | Epic 3 | SEO-indexable deck URLs |
| FR15 | Epic 3 | Creator PDF export |
| FR16 | Epic 3 | Recipient PDF export from shared view |
| FR17 | Epic 3 | Mobile-responsive shared viewer |
| FR19 | Epic 1 | Account creation |
| FR20 | Epic 1 | Login / logout |
| FR21 | Epic 1 | Deck history |
| FR22 | Epic 1 | Delete deck |
| FR23 | Epic 4 | Per-user deck count tracking |
| FR24 | Epic 4 | 3-deck limit enforcement |
| FR25 | Epic 4 | Upgrade prompt at paywall |
| FR26 | Epic 4 | Subscription checkout |
| FR27 | Epic 4 | View/cancel subscription |
| FR28 | Epic 5 | Admin: deck volume |
| FR29 | Epic 5 | Admin: conversion metrics |
| FR30 | Epic 5 | Admin: user details |
| FR31 | Epic 5 | Admin: generation logs |

*Growth-phase FRs deferred (not in MVP epics): FR4, FR5, FR9, FR10, FR18*

---

## Epic 1: Project Foundation & User Authentication

Users can create an account, log in/out, and manage their profile. The app skeleton is stood up with routing, auth, and session management in place.
**FRs covered:** FR19, FR20, FR21, FR22
**NFRs addressed:** NFR3 (SPA load <3s), NFR5 (HTTPS), NFR6 (password hashing), NFR8 (rate limiting on auth)

### Story 1.1: User Registration

As a new visitor,
I want to create an account with email and password,
So that I can start generating decks.

**Acceptance Criteria:**

**Given** I am on the registration page
**When** I submit a valid email and password
**Then** my account is created, I am logged in, and redirected to my dashboard

**Given** I submit a password
**When** the account is created
**Then** the password is stored using bcrypt hashing — plaintext storage is prohibited (NFR6)

**Given** I submit an email address that is already registered
**When** I attempt to register
**Then** I see a clear error message indicating the email is already in use

**Given** I submit an invalid email format or a password below minimum length
**When** I attempt to submit
**Then** inline validation errors appear and the form is not submitted

### Story 1.2: User Login & Logout

As a registered user,
I want to log in and log out of my account,
So that I can access my decks securely.

**Acceptance Criteria:**

**Given** I enter valid credentials
**When** I submit the login form
**Then** I am authenticated and redirected to my dashboard

**Given** I enter invalid credentials
**When** I submit the login form
**Then** I see a clear error message and remain unauthenticated

**Given** the login endpoint receives excessive requests from the same IP within a short window
**When** the rate limit is exceeded
**Then** further login attempts are blocked with a 429 response (NFR8)

**Given** I am logged in
**When** I click logout
**Then** my session is terminated and I am redirected to the home/landing page

### Story 1.3: Deck History & Account Management

As a logged-in user,
I want to view my deck history and delete decks I no longer need,
So that I can manage my generated content.

**Acceptance Criteria:**

**Given** I am logged in
**When** I navigate to my dashboard
**Then** I see a list of all my previously generated decks, ordered by creation date (newest first)

**Given** I have no decks yet
**When** I view my dashboard
**Then** I see an empty state with a clear prompt to create my first deck

**Given** I am viewing my deck history
**When** I click delete on a deck
**Then** I am shown a confirmation prompt before any deletion occurs

**Given** I confirm the deletion
**When** the operation completes
**Then** the deck is permanently removed and no longer appears in my history

---

## Epic 2: Deck Generation — Restraint Engine

Authenticated users can submit text or outline input, receive a generated deck applying hard structural constraints and signal-density filtering, with auto-theming. Users see their remaining free deck count and can view the result in-browser.
**FRs covered:** FR1, FR2, FR3, FR6, FR7, FR8, FR11
**NFRs addressed:** NFR1 (generation <30s), NFR9 (non-guessable deck IDs), NFR11 (error state on failure), NFR12 (preserve input on failure), NFR13 (horizontally scalable pipeline)

### Story 2.1: Text & Outline Input Interface

As a logged-in user,
I want to submit free text or a structured outline as input for deck generation,
So that I can start creating a deck from my raw content.

**Acceptance Criteria:**

**Given** I am logged in and on the creation page
**When** I view the input interface
**Then** I see a text area supporting free-form text input and an outline input mode (toggle or tab)

**Given** I have entered content
**When** I switch between input modes
**Then** my content is preserved and not discarded

**Given** I submit with an empty input
**When** I attempt to generate
**Then** I see a validation error and generation does not begin

**Given** I am on the creation page
**When** the page loads
**Then** I can see how many free decks I have remaining (FR3)

### Story 2.2: AI Restraint Engine — Deck Generation

As a logged-in user,
I want to generate a slide deck from my input using the restraint engine,
So that I receive a clean, signal-dense deck with no filler.

**Acceptance Criteria:**

**Given** I have submitted valid input
**When** generation begins
**Then** I see a loading state indicating generation is in progress

**Given** generation is in progress
**When** the deck is produced
**Then** every slide contains only one point, respects hard constraints (max bullets per slide, max words per bullet, max slide count), and low-signal content has been filtered out (FR6, FR7)

**Given** a deck is generated
**When** I view the output
**Then** a clean auto-theme is applied consistently across all slides (FR8)

**Given** typical input length
**When** generation completes
**Then** the result is returned in under 30 seconds; target under 15 seconds (NFR1)

**Given** generation fails due to an API or system error
**When** the failure occurs
**Then** I see a clear error message — no silent failure or blank output (NFR11)
**And** my original input is preserved so I can retry without re-entering content (NFR12)

### Story 2.3: In-Browser Deck Viewer

As a logged-in user,
I want to view my generated deck in the browser,
So that I can review the output immediately after generation.

**Acceptance Criteria:**

**Given** generation has completed successfully
**When** the result is ready
**Then** I am shown the deck in a full in-browser slide viewer (FR11)

**Given** I am viewing my deck
**When** I navigate between slides
**Then** slide transitions work correctly and all content is rendered clearly

**Given** a deck is created
**When** the deck ID is assigned
**Then** it uses a non-guessable identifier (UUID or equivalent) — sequential IDs are prohibited (NFR9)

**Given** I navigate away and return to the deck via my dashboard
**When** I open the deck
**Then** the deck loads and renders correctly from its stored state

---

## Epic 3: Deck Sharing & Export

Users can generate a public shareable link. Recipients can view the deck in-browser without an account, on any device. Both creator and recipient can export PDF. Shared deck URLs carry SEO metadata.
**FRs covered:** FR12, FR13, FR14, FR15, FR16, FR17
**NFRs addressed:** NFR2 (viewer FCP <2s), NFR4 (PDF export <10s)

### Story 3.1: Public Shareable Link Generation

As a logged-in user,
I want to generate a public shareable link for my deck,
So that anyone can view it without needing an account.

**Acceptance Criteria:**

**Given** I am viewing my generated deck
**When** I click "Share"
**Then** a unique public URL is generated for the deck and displayed/copied to my clipboard (FR12)

**Given** a shareable link has been generated
**When** anyone opens the link in a browser
**Then** they can view the full deck without being prompted to log in or create an account (FR13)

**Given** a shared deck URL is accessed
**When** a search engine crawler or social platform fetches the URL
**Then** the response includes a page title, description, and og:image thumbnail for the deck (FR14)

**Given** a shared deck URL is indexed
**When** the deck is visited via organic search or social share
**Then** the deck renders correctly as a publicly accessible page

### Story 3.2: PDF Export (Creator & Recipient)

As a user (creator or recipient),
I want to export a deck as a PDF,
So that I can share or present it offline.

**Acceptance Criteria:**

**Given** I am the creator viewing my deck
**When** I click "Export PDF"
**Then** a PDF is generated and downloaded to my device (FR15)

**Given** I am a recipient viewing a shared deck
**When** I click "Export PDF"
**Then** a PDF is generated and downloaded without requiring me to log in (FR16)

**Given** a PDF export is triggered
**When** the export completes
**Then** it finishes in under 10 seconds (NFR4)

**Given** a PDF is exported
**When** I open it
**Then** all slides render with correct layout, fonts, and theming — no formatting degradation

### Story 3.3: Mobile-Responsive Shared Deck Viewer

As a recipient opening a shared deck on a mobile device,
I want the deck to be fully viewable on my phone,
So that I can review it without needing a desktop.

**Acceptance Criteria:**

**Given** a shared deck link is opened on a mobile browser (375px viewport)
**When** the page loads
**Then** slides render correctly, text is legible, and no content is clipped or overflowing (FR17)

**Given** the shared deck viewer loads
**When** measured via performance tooling
**Then** first contentful paint occurs in under 2 seconds on a standard mobile connection (NFR2)

**Given** I am on mobile and viewing a shared deck
**When** I swipe or tap to navigate between slides
**Then** navigation works correctly without requiring zoom or horizontal scroll

---

## Epic 4: Monetization & Subscription

System enforces the 3-deck free limit. On reaching the limit, user is shown an upgrade prompt. User can subscribe via checkout, view their plan, and cancel. System tracks deck count per user.
**FRs covered:** FR23, FR24, FR25, FR26, FR27
**NFRs addressed:** NFR7 (PCI-compliant payment — Stripe delegation)

### Story 4.1: Free Deck Limit Enforcement & Paywall

As a user who has used all free decks,
I want to be clearly notified when I hit the limit and shown an upgrade path,
So that I understand my options before I can generate more decks.

**Acceptance Criteria:**

**Given** a user generates a deck
**When** generation completes successfully
**Then** the system increments the deck count for that user's account (FR23)

**Given** a user has used all 3 free decks
**When** they attempt to generate a new deck
**Then** generation is blocked and they are shown a subscription upgrade prompt (FR24, FR25)

**Given** a user is shown the paywall prompt
**When** they view it
**Then** it clearly communicates the value of upgrading and provides a direct path to the checkout flow

**Given** a subscribed user
**When** they attempt to generate a deck
**Then** the free deck limit does not apply and generation proceeds normally

### Story 4.2: Subscription Checkout

As a user who has reached the free limit,
I want to subscribe to a paid plan,
So that I can continue generating decks.

**Acceptance Criteria:**

**Given** I am on the upgrade/paywall prompt
**When** I click to subscribe
**Then** I am taken to a checkout flow powered by a PCI-compliant provider (Stripe or equivalent) — no card data passes through nobsppt servers (NFR7)

**Given** I complete checkout successfully
**When** payment is confirmed
**Then** my account is immediately upgraded to paid status and I can generate decks without restriction

**Given** I abandon checkout or payment fails
**When** I return to the app
**Then** my account remains on the free tier and I see the paywall again on next generation attempt

### Story 4.3: Subscription Management

As a subscribed user,
I want to view and cancel my active subscription,
So that I have full control over my billing.

**Acceptance Criteria:**

**Given** I am a subscribed user
**When** I navigate to my account/billing settings
**Then** I can see my current plan, billing status, and renewal date (FR27)

**Given** I am viewing my subscription details
**When** I click cancel subscription
**Then** I am shown a confirmation prompt before cancellation is processed

**Given** I confirm cancellation
**When** the cancellation is processed
**Then** my subscription is cancelled, I retain paid access until the end of the current billing period, and I see a confirmation message

---

## Epic 5: Admin Dashboard

Admin can view platform-wide deck volume, conversion metrics (free-to-paid), individual user activity, and generation logs for error diagnosis and quality review.
**FRs covered:** FR28, FR29, FR30, FR31

### Story 5.1: Platform Metrics Dashboard

As an admin,
I want to view total deck generation volume and subscription conversion metrics,
So that I can monitor product health and business performance.

**Acceptance Criteria:**

**Given** I am logged in as an admin
**When** I navigate to the admin dashboard
**Then** I see total decks generated across all users (FR28)

**Given** I am viewing the admin dashboard
**When** I check conversion metrics
**Then** I see total paid subscribers and free-to-paid conversion count (FR29)

**Given** the dashboard loads
**When** data is displayed
**Then** all metrics reflect the current state of the system without requiring a manual refresh

### Story 5.2: User Account & Activity Inspection

As an admin,
I want to view individual user account details and their deck activity,
So that I can investigate issues and support users.

**Acceptance Criteria:**

**Given** I am on the admin dashboard
**When** I search or browse to a specific user
**Then** I can see their account details (email, registration date, subscription status) (FR30)

**Given** I am viewing a user's profile
**When** I inspect their activity
**Then** I can see a list of all decks they have generated, with creation dates and current status

**Given** a user has been reported for an issue
**When** I view their account
**Then** I have enough context (account details + deck activity) to investigate and respond

### Story 5.3: Generation Log Access & Error Diagnosis

As an admin,
I want to access deck generation logs,
So that I can diagnose errors and review output quality.

**Acceptance Criteria:**

**Given** I am on the admin dashboard
**When** I navigate to generation logs
**Then** I can see a filterable log of deck generation events, including timestamps, user IDs, and status (success/failure) (FR31)

**Given** a generation event failed
**When** I inspect its log entry
**Then** I can see the error details sufficient to identify the root cause

**Given** I want to review output quality for a specific deck
**When** I access its log entry
**Then** I can see the input submitted and the generation outcome

## Epic List

### Epic 1: Project Foundation & User Authentication
Users can create an account, log in/out, and manage their profile. The app skeleton is stood up with routing, auth, and session management in place.
**FRs covered:** FR19, FR20, FR21, FR22
**NFRs addressed:** NFR3 (SPA load <3s), NFR5 (HTTPS), NFR6 (password hashing), NFR8 (rate limiting on auth)

### Epic 2: Deck Generation — Restraint Engine
Authenticated users can submit text or outline input, receive a generated deck applying hard structural constraints and signal-density filtering, with auto-theming. Users see their remaining free deck count and can view the result in-browser.
**FRs covered:** FR1, FR2, FR3, FR6, FR7, FR8, FR11
**NFRs addressed:** NFR1 (generation <30s), NFR9 (non-guessable deck IDs), NFR11 (error state on failure), NFR12 (preserve input on failure), NFR13 (horizontally scalable pipeline)

### Epic 3: Deck Sharing & Export
Users can generate a public shareable link. Recipients can view the deck in-browser without an account, on any device. Both creator and recipient can export PDF. Shared deck URLs carry SEO metadata.
**FRs covered:** FR12, FR13, FR14, FR15, FR16, FR17
**NFRs addressed:** NFR2 (viewer FCP <2s), NFR4 (PDF export <10s)

### Epic 4: Monetization & Subscription
System enforces the 3-deck free limit. On reaching the limit, user is shown an upgrade prompt. User can subscribe via checkout, view their plan, and cancel. System tracks deck count per user.
**FRs covered:** FR23, FR24, FR25, FR26, FR27
**NFRs addressed:** NFR7 (PCI-compliant payment — Stripe delegation)

### Epic 5: Admin Dashboard
Admin can view platform-wide deck volume, conversion metrics (free-to-paid), individual user activity, and generation logs for error diagnosis and quality review.
**FRs covered:** FR28, FR29, FR30, FR31
