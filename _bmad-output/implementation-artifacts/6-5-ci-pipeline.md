# Story 6.5: CI Pipeline

Status: ready-for-dev

## Story

As a developer,
I want automated checks to run on every push and pull request,
so that broken code never reaches main without being caught first.

## Acceptance Criteria

1. Given a push or pull request to any branch, when the pipeline runs, then it executes: type check, lint, and full test suite — all must pass for the pipeline to succeed.
2. Given a push to main, when the pipeline runs, then it additionally runs a production build check (`next build`) to verify the app compiles without errors.
3. Given a test or build fails, when the pipeline reports, then the failure message clearly identifies which check failed and why — not just "CI failed."
4. Given the pipeline passes all checks, when it completes, then status badges are visible on the repo README.

## Tasks / Subtasks

- [ ] Create `.github/workflows/ci.yml` (AC: 1, 2, 3)
  - [ ] Triggers: `push` to any branch, `pull_request` targeting `main`
  - [ ] Runner: `ubuntu-latest`
  - [ ] Node.js version: match `package.json` engines or use `20.x`
- [ ] CI steps (AC: 1, 2)
  - [ ] Checkout: `actions/checkout@v4`
  - [ ] Setup Node: `actions/setup-node@v4` with `cache: 'npm'`
  - [ ] Install: `npm ci` (not `npm install` — reproducible installs in CI)
  - [ ] Type check: `npx tsc --noEmit`
  - [ ] Lint: `npm run lint`
  - [ ] Test: `npm run test` (Vitest — already configured)
  - [ ] Build (main branch only): `npm run build`
- [ ] Environment variables for CI (AC: 1)
  - [ ] Tests that hit DB: mock DB in tests (confirm existing tests already mock — check vitest setup)
  - [ ] `DATABASE_URL`: set as GitHub Actions secret (`secrets.DATABASE_URL`) if any tests require real DB
  - [ ] `JWT_SECRET`: set as GitHub Actions secret
  - [ ] `ANTHROPIC_API_KEY` / `OPENROUTER_API_KEY`: set as secret (AI calls should be mocked in tests — verify)
  - [ ] `STRIPE_SECRET_KEY` / Razorpay keys: set as secrets (should be mocked — verify)
  - [ ] Add step to create `.env.test` from secrets if needed
- [ ] README status badges (AC: 4)
  - [ ] Add CI badge to README.md: `[![CI](https://github.com/vedpawar2254/noBSppt/actions/workflows/ci.yml/badge.svg)](https://github.com/vedpawar2254/noBSppt/actions/workflows/ci.yml)`
  - [ ] Place badge in README near the top, after the tagline
- [ ] Verify all existing tests pass in clean environment (AC: 1)
  - [ ] Check: do any tests require live DB / live AI / live Stripe/Razorpay? If yes, ensure mocks exist or add them.
  - [ ] Pre-existing bcrypt 12-round timeout noted in Story 2.3 dev notes — consider reducing rounds in test environment (`process.env.NODE_ENV === 'test' ? 4 : 12`)

## Dev Notes

- **No architecture changes.** This story only adds `.github/workflows/ci.yml` and updates `README.md`. No source code changes except potentially bcrypt rounds fix.
- **`npm ci` vs `npm install`:** Always use `npm ci` in CI — uses package-lock.json exactly, fails if lock file is out of sync. Faster and reproducible.
- **Node cache:** `actions/setup-node@v4` with `cache: 'npm'` caches `~/.npm` — significantly speeds up subsequent runs.
- **Build only on main:** Running `next build` on every PR is slow and consumes GitHub Actions minutes. Gate it to main pushes. PRs get type check + tests only.
- **Secret management:** Review each test file to confirm external services are mocked. From Story 2.2, Anthropic client is mocked in engine tests. From Story 4.2, Stripe is mocked in webhook tests. If all external calls are mocked, no secrets needed in CI — use dummy values.
- **bcrypt rounds in test:** 12 rounds causes ~300ms per hash in tests. In `src/lib/auth/password.ts`, use `parseInt(process.env.BCRYPT_ROUNDS ?? '12')`. Set `BCRYPT_ROUNDS=4` in CI env. This is safe — test speed optimization only.
- **Vitest config:** Check `vitest.config.ts` — if it reads from `.env.local`, CI needs either a `.env.test` file or inline env vars in the workflow.

### Workflow file structure

```yaml
name: CI

on:
  push:
    branches: ['**']
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm run lint
      - run: npm test
        env:
          DATABASE_URL: ${{ secrets.CI_DATABASE_URL }}
          JWT_SECRET: ${{ secrets.CI_JWT_SECRET }}
          OPENROUTER_API_KEY: dummy-for-tests
          RAZORPAY_KEY_ID: dummy-for-tests
          RAZORPAY_KEY_SECRET: dummy-for-tests

  build:
    runs-on: ubuntu-latest
    needs: check
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
        env:
          DATABASE_URL: ${{ secrets.CI_DATABASE_URL }}
          # ... other required build-time env vars
```

### Project Structure Notes

- New file: `.github/workflows/ci.yml`
- Modify: `README.md` (add badge), optionally `src/lib/auth/password.ts` (bcrypt rounds env var)

### References

- [Source: _bmad-output/implementation-artifacts/1-1-user-registration.md] Vitest setup, bcrypt config
- [Source: _bmad-output/implementation-artifacts/2-2-ai-restraint-engine-deck-generation.md] AI mock patterns in tests

## Dev Agent Record

### Agent Model Used

_to be filled_

### Debug Log References

### Completion Notes List

- Document which secrets need to be set in GitHub Actions (Settings → Secrets).
- Note if any tests required real external services.

### File List
