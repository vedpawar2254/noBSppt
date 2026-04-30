# Story 1.2: User Login & Logout

Status: done

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

- [x] Build login UI (AC: 1, 2)
  - [x] Email + password fields
  - [x] Submit with loading state
  - [x] Clear error message on invalid credentials (generic "Invalid email or password." — no enumeration)
- [x] Build login API endpoint (AC: 1, 2)
  - [x] Verify email exists + bcrypt compare password hash
  - [x] Constant-time comparison (dummy hash path when user not found — prevents timing attacks)
  - [x] On success: issue session token / set auth cookie
  - [x] On failure: return 401 with generic error
- [x] Implement rate limiting on login endpoint (AC: 3)
  - [x] Per-IP sliding window (5 attempts / 15 minutes)
  - [x] Return 429 with Retry-After header when exceeded
- [x] Build logout (AC: 4)
  - [x] Clear auth cookie (httpOnly cookie deletion)
  - [x] Client redirects to home/landing page
- [x] Auth guard middleware for protected routes (AC: 1)
  - [x] `requireAuth()` helper in `src/lib/auth/guard.ts`
  - [x] Edge middleware in `src/middleware.ts` (from Story 1.1, unchanged)
- [x] Write tests: login happy path, invalid creds, rate limit, logout (AC: 1–4)

## Dev Notes

- **Security:** Login always returns the same generic message ("Invalid email or password.") regardless of whether the email exists or the password was wrong — prevents user enumeration attacks.
- **Timing attack mitigation:** When a user is not found, bcrypt comparison is still run against a dummy hash to keep response time consistent.
- **NFR8 — rate limiting:** In-memory sliding window, 5 failed attempts per IP per 15 minutes. Returns 429 + `Retry-After` header. **Production note:** In-memory store is per-process. For multi-instance or serverless deployments, swap `src/lib/auth/rate-limit.ts` for Upstash Redis rate limiter — the interface is stable and callers don't change.
- **Session termination (logout):** Stateless JWT — deletion of httpOnly cookie effectively terminates the session. The JWT token remains cryptographically valid until expiry (7 days) but cannot be sent without the cookie. **Epic 4 note:** If subscription cancellation requires immediate access revocation, add a `token_version` integer to the users table and embed it in the JWT — increment on logout to invalidate issued tokens.

### Project Structure Notes

- Auth guard at two levels:
  1. **Edge middleware** (`src/middleware.ts`) — runs before every request, redirects unauthenticated users from protected paths to `/login`
  2. **Server component helper** (`src/lib/auth/guard.ts` → `requireAuth()`) — call in any Server Component that needs auth; throws redirect if no session
- Every subsequent epic's server components should call `requireAuth()` from `src/lib/auth/guard.ts`
- Login route `/login` set `robots: { index: false, follow: false }` (already done in page.tsx)

### References

- [Source: _bmad-output/planning-artifacts/prd.md#Non-Functional Requirements] NFR8
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 1] Story 1.2
- [Source: _bmad-output/implementation-artifacts/1-1-user-registration.md] Tech stack decisions from Story 1.1

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- TS2802 in `rate-limit.ts`: `for...of Map.entries()` — fixed with `Array.from(store.entries())`
- TS7006: implicit `any` on filter callback param — fixed with explicit `: number` annotation

All 39 tests passed after fixes.

### Completion Notes List

**Session/Token Strategy (for Epic 4 — subscription agent):**

| Aspect | Implementation |
|--------|---------------|
| Token type | Stateless JWT (HS256), signed with `JWT_SECRET` |
| Storage | httpOnly cookie `nobsppt_session`, `SameSite=lax` |
| Expiry | 7 days (`SESSION_DURATION_SECONDS = 604800`) |
| Payload | `{ userId, email }` |
| Session creation | `createSessionToken()` + `setSessionCookie()` in `src/lib/auth/session.ts` |
| Session read (server) | `getSession()` — calls `cookies()` from `next/headers` |
| Session read (middleware) | `getSessionFromRequest(req)` — reads from `NextRequest.cookies` |
| Session termination | `clearSessionCookie()` — deletes the cookie; JWT remains valid until expiry |
| Subscription revocation | Not yet needed — when required, add `tokenVersion` to user record and validate in `verifySessionToken()` |

**Auth middleware / guard paths (ALL subsequent epics use these):**

| Layer | File | Use case |
|-------|------|----------|
| Edge middleware | `src/middleware.ts` | Redirect-level protection for entire route groups |
| Server Component guard | `src/lib/auth/guard.ts` → `requireAuth()` | Fine-grained auth in individual server components |

**Rate limiter path:** `src/lib/auth/rate-limit.ts`
- Export `checkRateLimit(ip)`, `recordFailedAttempt(ip)`, `resetAttempts(ip)`, `getClientIp(req)`
- Config: 5 attempts / 15 min window — change `MAX_ATTEMPTS` and `WINDOW_MS` constants to tune

### File List

**New files created:**

```
src/lib/auth/rate-limit.ts
src/lib/auth/guard.ts
src/app/api/auth/login/route.ts
src/app/api/auth/logout/route.ts
src/components/auth/LoginForm.tsx
src/components/auth/LogoutButton.tsx
tests/auth/login.test.ts
tests/auth/rate-limit.test.ts
```

**Files modified:**

```
src/app/(auth)/login/page.tsx   — replaced stub with real LoginForm
src/app/dashboard/page.tsx      — switched to requireAuth(), added LogoutButton
```
