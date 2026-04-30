# Story 6.1: OpenRouter AI Integration

Status: ready-for-dev

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

_to be filled_

### Debug Log References

### Completion Notes List

- Document final OpenRouter model ID used — 6.4 analytics and 5.3 logs reference it.
- Document new env var name (`OPENROUTER_API_KEY`) — update .env.example and deployment docs.

### File List
