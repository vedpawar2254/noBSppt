# Story 6.1: OpenRouter AI Integration

Status: done

## Story

As a developer,
I want the restraint engine to route AI requests through OpenRouter,
so that I can switch models, compare costs, and avoid single-provider lock-in without rewriting generation logic.

## Acceptance Criteria

1. Given the generation endpoint is called, when a deck is generated, then the request is routed through OpenRouter's API instead of Anthropic directly — output quality and format are identical.
2. Given OpenRouter is configured, when the model is changed via environment variable, then generation uses the new model with no code changes required.
3. Given an OpenRouter API call fails, when the failure occurs, then the same error handling behaviour from Story 2.2 applies — clear error, input preserved (NFR11, NFR12).
4. Given a deck is generated, when the generation log is written (Story 5.3), then it records the model used via OpenRouter (not just "Anthropic").

## Tasks / Subtasks

- [ ] Replace `@anthropic-ai/sdk` with OpenRouter HTTP client (AC: 1)
  - [ ] OpenRouter uses OpenAI-compatible API — use `openai` SDK or raw `fetch` with `Authorization: Bearer OPENROUTER_API_KEY`
  - [ ] Base URL: `https://openrouter.ai/api/v1`
  - [ ] Update `src/lib/ai/client.ts` — swap provider, keep same interface (`generateDeck(payload)`)
  - [ ] Required headers: `HTTP-Referer` (your app URL), `X-Title` (app name) — OpenRouter requires these
- [ ] Model configuration via env var (AC: 2)
  - [ ] `OPENROUTER_MODEL` env var (default: `anthropic/claude-haiku-4-5` — same model via OpenRouter)
  - [ ] `src/lib/ai/client.ts` reads model from env — no hardcoded model strings
- [ ] Keep engine.ts unchanged (AC: 1)
  - [ ] `src/lib/decks/engine.ts` must not change — only the client layer changes
  - [ ] `enforceConstraints()` still runs as safety net
- [ ] Update env vars (AC: 1)
  - [ ] Add `OPENROUTER_API_KEY` to `.env.example`
  - [ ] Remove or deprecate `ANTHROPIC_API_KEY` (keep in .env.example as comment for reference)
- [ ] Update generation log (AC: 4)
  - [ ] Log `model` field as full OpenRouter model ID (e.g. `anthropic/claude-haiku-4-5`)
  - [ ] Story 5.3 generation_logs table already has `model_used` column — populate it correctly
- [ ] Update tests (AC: 1, 3)
  - [ ] Mock OpenRouter HTTP endpoint instead of Anthropic SDK
  - [ ] Verify same SlideObject output format
  - [ ] Verify error handling on 502/timeout
- [ ] Remove `@anthropic-ai/sdk` dependency from package.json (AC: 1)

## Dev Notes

- **CRITICAL:** Read Story 2.2 Dev Agent Record — `src/lib/ai/client.ts` and `src/lib/decks/engine.ts` are the only files that change. The engine interface (`generateDeck`) stays identical — callers don't change.
- **OpenRouter API format:** OpenAI-compatible. Use `openai` SDK pointed at OpenRouter base URL, or raw fetch. Recommended: raw fetch to avoid adding OpenAI SDK dependency.
- **Required OpenRouter headers (non-optional):**
  ```
  Authorization: Bearer OPENROUTER_API_KEY
  HTTP-Referer: https://nobsppt.com (or NEXT_PUBLIC_APP_URL)
  X-Title: nobsppt
  Content-Type: application/json
  ```
- **Model naming on OpenRouter:** `anthropic/claude-haiku-4-5-20251001` — use the exact OpenRouter model ID. Full list at openrouter.ai/models.
- **Why OpenRouter?** Single API key → access to any model. Cost comparison across providers. Automatic fallback routing. Useful when Anthropic has rate limits or outages.
- **Engine constants:** `CONSTRAINTS.MODEL` in `engine.ts` was `"claude-haiku-4-5-20251001"`. This constant is now just the default for the env var — update it to `"anthropic/claude-haiku-4-5-20251001"` (OpenRouter format) or better, remove the hardcoded value and read from `OPENROUTER_MODEL` env var only.
- **Story 5.3 impact:** `model_used` in generation logs should now log the full OpenRouter model ID. No schema change needed — it's already a VARCHAR.

### Project Structure Notes

- Only touch: `src/lib/ai/client.ts`, `.env.example`, `package.json`, tests mocking the AI client.
- `src/lib/decks/engine.ts` — READ but do NOT modify.
- `src/app/api/decks/generate/route.ts` — READ but do NOT modify (unless model_used logging needs wiring).

### References

- [Source: _bmad-output/implementation-artifacts/2-2-ai-restraint-engine-deck-generation.md] AI client, engine, generation endpoint
- [Source: _bmad-output/implementation-artifacts/5-3-generation-log-access-and-error-diagnosis.md] model_used field in generation_logs

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Rewrote `src/lib/ai/client.ts` as raw-fetch adapter; exports `anthropic` (same name/interface) + `OPENROUTER_MODEL` constant so engine.ts and generate/route.ts need zero changes.
- Used `beforeAll` with `vi.stubEnv` + `vi.resetModules` + dynamic `await import("@/lib/ai/client")` to work around module-level constant evaluation (TS1378 top-level await).
- Removed `@anthropic-ai/sdk` from package.json; no other SDK added.

### Completion Notes List

- OpenRouter model: `anthropic/claude-haiku-4-5-20251001` (default via `OPENROUTER_MODEL` env var).
- New env var: `OPENROUTER_API_KEY`. Old `ANTHROPIC_API_KEY` kept in `.env.example` as deprecated comment.
- `generate/route.ts` logs `OPENROUTER_MODEL` as `modelUsed` on both success and failure paths (AC4).
- `engine.ts` untouched — only `src/lib/ai/client.ts` changed.

### File List

- `src/lib/ai/client.ts` — complete rewrite; OpenRouter fetch adapter
- `.env.example` — added OPENROUTER_API_KEY/OPENROUTER_MODEL, deprecated ANTHROPIC_API_KEY
- `package.json` / `package-lock.json` — removed @anthropic-ai/sdk, added razorpay (Story 6.2)
- `tests/ai/openrouter-client.test.ts` — 5 tests: URL/headers, message format, model override, response shape, error handling
