# Story 1.1: User Registration

Status: done

## Story

As a new visitor,
I want to create an account with email and password,
so that I can start generating decks.

## Acceptance Criteria

1. Given I am on the registration page, when I submit a valid email and password, then my account is created, I am logged in, and redirected to my dashboard.
2. Given I submit a password, when the account is created, then the password is stored using bcrypt hashing — plaintext storage is prohibited (NFR6).
3. Given I submit an email address that is already registered, when I attempt to register, then I see a clear error message indicating the email is already in use.
4. Given I submit an invalid email format or a password below minimum length, when I attempt to submit, then inline validation errors appear and the form is not submitted.

## Tasks / Subtasks

- [x] Set up project skeleton: SPA framework, routing, HTTPS config (AC: all)
  - [x] Initialize project repo structure
  - [x] Configure HTTPS / TLS (NFR5 — handled at infra/Vercel level; security headers added in next.config.ts)
  - [x] Set up base routing (auth routes not indexed by SEO crawlers)
- [x] Create users DB table/schema (AC: 1, 2)
  - [x] Fields: id (UUID), email (unique), password_hash, created_at, subscription_status, deck_count
- [x] Build registration UI (AC: 1, 3, 4)
  - [x] Email field with format validation
  - [x] Password field with minimum length enforcement
  - [x] Submit button — disabled until fields are valid
  - [x] Inline validation errors (client-side, before submission)
- [x] Build registration API endpoint (AC: 1, 2, 3)
  - [x] Check for duplicate email → return clear error
  - [x] Hash password with bcrypt before storing (NFR6)
  - [x] Create user record
  - [x] Return session token / set auth cookie
- [x] Post-registration: redirect to dashboard (AC: 1)
- [x] Write tests: registration happy path, duplicate email, invalid inputs (AC: 1–4)

## Dev Notes

- **NFR5:** HTTPS/TLS handled at deployment layer (Vercel auto-provides HTTPS). Security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy) applied in `next.config.ts`.
- **NFR6:** bcrypt via `bcryptjs` (12 rounds). Password never logged or transmitted plaintext. Hash verified in `tests/auth/password.test.ts`.
- **NFR3:** Next.js 14 App Router with Tailwind — lean bundle, no runtime CSS overhead.
- **Dashboard stub:** `/dashboard` exists, auth-protected, redirects unauthenticated users to `/login`. Content added in Story 1.3.

### Project Structure Notes

- Feature-based folder convention adopted: `src/app/(auth)/`, `src/app/dashboard/`, `src/components/auth/`, `src/lib/auth/`, `src/lib/db/`
- Auth routes `/register` and `/login` set `robots: { index: false, follow: false }` via Next.js metadata API
- All subsequent agents follow this folder structure

### References

- [Source: _bmad-output/planning-artifacts/prd.md#Functional Requirements] FR19
- [Source: _bmad-output/planning-artifacts/prd.md#Non-Functional Requirements] NFR3, NFR5, NFR6, NFR8
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 1] Story 1.1

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — all 21 tests passed on first run.

### Completion Notes List

**Tech Stack Decisions (ALL subsequent agents must follow these):**

| Concern | Choice | Rationale |
|---------|--------|-----------|
| **Framework** | Next.js 14 (App Router) | SSR for deck viewer SEO (FR14), SPA-like navigation for creator flow, built-in API routes, Vercel deployment |
| **Language** | TypeScript (strict mode) | Type safety across full stack |
| **Database** | PostgreSQL | UUID native support (NFR9), production-grade, Vercel Postgres / Supabase / Railway compatible |
| **DB driver** | `postgres` (postgres.js v3) | Lighter than `pg`, better TypeScript types, async-first |
| **ORM** | Drizzle ORM v0.30 | Type-safe, close-to-SQL, migrations via `drizzle-kit`, zero runtime overhead |
| **Password hashing** | `bcryptjs` (12 rounds) | Pure JS (no native bindings), bcrypt per NFR6 |
| **Session/JWT** | `jose` + httpOnly cookie | XSS-resistant session storage, stateless JWT, 7-day expiry |
| **Styling** | Tailwind CSS v3 | Lean bundle, no runtime CSS (supports NFR3 <3s load) |
| **Test runner** | Vitest v1.6 | Fast, Jest-compatible, native ESM, works with tsconfigPaths |
| **Validation** | Custom (src/lib/auth/validation.ts) | Zero-dep, shared client/server, reusable in subsequent stories |
| **Auth routes** | `src/app/(auth)/` route group | Route group keeps auth pages clean, noindex metadata applied |
| **Folder convention** | Feature-based: `auth/`, `decks/`, `admin/` | Scales cleanly across all 5 epics |
| **Middleware** | `src/middleware.ts` | Centralized auth guard for protected routes, runs on Edge |
| **Min password length** | 8 characters | Standard minimum; defined as `PASSWORD_MIN_LENGTH` constant in validation.ts |
| **Email normalization** | lowercase + trim | Prevents duplicate accounts from case variation |

**DB Schema (users table):**
```
id               UUID PRIMARY KEY DEFAULT random_uuid()
email            VARCHAR(255) UNIQUE NOT NULL
password_hash    TEXT NOT NULL
created_at       TIMESTAMP DEFAULT NOW() NOT NULL
subscription_status  ENUM('free','paid') DEFAULT 'free' NOT NULL
deck_count       INTEGER DEFAULT 0 NOT NULL
```

**Environment Variables required:**
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — minimum 32 chars, for session signing

**HTTPS/NFR5:** Handled at infrastructure level. Vercel auto-provisions HTTPS. For other deployments, set up a reverse proxy (nginx/Caddy) with TLS termination. Security headers applied at app level in `next.config.ts`.

**NFR8 (Rate limiting):** Not implemented in Story 1.1 — applies to login endpoint (Story 1.2). Note in story 1.2 to add rate limiting middleware on `/api/auth/login`.

### File List

**New files created:**

```
package.json
tsconfig.json
next.config.ts
postcss.config.mjs
tailwind.config.ts
drizzle.config.ts
vitest.config.ts
.env.example
drizzle/migrations/           (directory — migrations generated via drizzle-kit)
src/app/globals.css
src/app/layout.tsx
src/app/page.tsx
src/app/(auth)/register/page.tsx
src/app/(auth)/login/page.tsx  (stub for Story 1.2)
src/app/dashboard/page.tsx     (stub for Story 1.3)
src/app/api/auth/register/route.ts
src/components/auth/RegisterForm.tsx
src/lib/db/schema.ts
src/lib/db/index.ts
src/lib/auth/password.ts
src/lib/auth/session.ts
src/lib/auth/validation.ts
src/middleware.ts
tests/setup.ts
tests/auth/validation.test.ts
tests/auth/password.test.ts
tests/auth/register.test.ts
```
