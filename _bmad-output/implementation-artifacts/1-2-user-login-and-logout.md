# Story 1.2: User Login & Logout

Status: ready-for-dev

## Story

As a registered user,
I want to log in and log out of my account,
so that I can access my decks securely.

## Acceptance Criteria

1. Given I enter valid credentials, when I submit the login form, then I am authenticated and redirected to my dashboard.
2. Given I enter invalid credentials, when I submit the login form, then I see a clear error message and remain unauthenticated.
3. Given the login endpoint receives excessive requests from the same IP within a short window, when the rate limit is exceeded, then further login attempts are blocked with a 429 response (NFR8).
4. Given I am logged in, when I click logout, then my session is terminated and I am redirected to the home/landing page.

## Tasks / Subtasks

- [ ] Build login UI (AC: 1, 2)
  - [ ] Email + password fields
  - [ ] Submit with loading state
  - [ ] Clear error message on invalid credentials (do NOT reveal whether email or password was wrong — generic "invalid credentials" message)
- [ ] Build login API endpoint (AC: 1, 2)
  - [ ] Verify email exists + bcrypt compare password hash
  - [ ] On success: issue session token / set auth cookie
  - [ ] On failure: return 401 with generic error
- [ ] Implement rate limiting on login endpoint (AC: 3)
  - [ ] Per-IP rate limit — configurable threshold
  - [ ] Return 429 with Retry-After header when exceeded
- [ ] Build logout (AC: 4)
  - [ ] Invalidate session server-side
  - [ ] Clear auth cookie / token client-side
  - [ ] Redirect to home/landing page
- [ ] Auth guard middleware for protected routes (AC: 1)
  - [ ] Redirect unauthenticated users to /login
- [ ] Write tests: login happy path, invalid creds, rate limit, logout (AC: 1–4)

## Dev Notes

- **CRITICAL:** Read Story 1.1 Dev Agent Record first — use the exact same tech stack, auth library, and session/token approach established there.
- **NFR8:** Rate limiting must be on the auth endpoint. Use the same library/middleware you set up (or note what to set up if 1.1 didn't include it).
- **Security:** Generic error messages on failed login — never reveal whether the email exists. This prevents user enumeration attacks.
- **Session strategy:** Whether you use JWTs or server-side sessions was decided in Story 1.1 — be consistent.
- **Auth guard:** Implement a reusable auth middleware/guard that all protected routes (dashboard, deck creation, etc.) will use. Epic 2 agents will rely on this.

### Project Structure Notes

- Auth middleware created here is referenced by ALL future epics. Place it in a shared/middleware location and document the path.
- Login route (`/login`) is not SEO-indexed.

### References

- [Source: _bmad-output/planning-artifacts/prd.md#Non-Functional Requirements] NFR8
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 1] Story 1.2
- [Source: _bmad-output/implementation-artifacts/1-1-user-registration.md] Tech stack decisions from Story 1.1

## Dev Agent Record

### Agent Model Used

_to be filled_

### Debug Log References

### Completion Notes List

- Document session/token invalidation approach used — Epic 4 (subscription) agent needs this.
- Document auth middleware path — all subsequent epics use it.

### File List
