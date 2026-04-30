# Story 5.3: Generation Log Access & Error Diagnosis

Status: done

## Story

As an admin,
I want to access deck generation logs,
so that I can diagnose errors and review output quality.

## Acceptance Criteria

1. Given I am on the admin dashboard, when I navigate to generation logs, then I can see a filterable log of deck generation events, including timestamps, user IDs, and status (success/failure) (FR31).
2. Given a generation event failed, when I inspect its log entry, then I can see the error details sufficient to identify the root cause.
3. Given I want to review output quality for a specific deck, when I access its log entry, then I can see the input submitted and the generation outcome.

## Tasks / Subtasks

- [ ] Generation log storage (AC: 1, 2, 3)
  - [ ] Create `generation_logs` table: id, user_id, deck_id (nullable on failure), input_text (truncated), input_mode, status (success/failure), error_message, ai_provider, model_used, latency_ms, created_at
  - [ ] Write log entry in generation endpoint (Story 2.2) — add logging call after generation attempt (success or failure)
  - [ ] If Story 2.2 already has logging: verify schema matches; extend if needed
- [ ] Admin logs view `/admin/logs` (AC: 1)
  - [ ] Paginated list of generation events: timestamp, user email, status, latency
  - [ ] Filters: status (success/failure), date range, user email
- [ ] Log detail view `/admin/logs/:id` (AC: 2, 3)
  - [ ] Full log entry: input (truncated to reasonable length), AI model, latency, error message
  - [ ] Link to deck if generation succeeded (deck_id → `/deck/:id`)
  - [ ] Link to user account (`/admin/users/:user_id`)
- [ ] Logs API `GET /api/admin/logs` (AC: 1)
  - [ ] Paginated, filterable
  - [ ] Admin-only
- [ ] Log detail API `GET /api/admin/logs/:id` (AC: 2, 3)
  - [ ] Full log record
  - [ ] Admin-only
- [ ] Write tests: log created on generation, error log has message, admin-only access, filters work (AC: 1–3)

## Dev Notes

- **CRITICAL:** Read Stories 5.1, 5.2, and 2.2 Dev Agent Records — admin infrastructure from 5.1/5.2, generation endpoint from 2.2 (where log writes happen).
- **This story runs in PARALLEL with Story 5.2** — no shared files. 5.3 owns `/admin/logs`, 5.2 owns `/admin/users`.
- **Log writes happen in Story 2.2's generation endpoint.** If 2.2 already logs: extend the schema. If not: add the log write call to that endpoint.
- **Input truncation:** Store first 500 chars of input — enough for diagnosis without excessive storage.
- **Error message:** On AI API failure, log the error type, HTTP status, and provider error message (do NOT log user data beyond input text).
- **latency_ms:** Log generation time — this is the primary performance monitoring signal for NFR1.
- **PDF export errors:** Story 3.2's PDF export endpoint should also log failures here (use the same generation_logs table or a separate export_logs table — document your choice).
- **ai_provider + model_used:** These come from Story 2.2's AI configuration — log them per-request for model comparison later.

### Project Structure Notes

- Admin routes extend `/admin/*` from Story 5.1.
- Log write: inject into Story 2.2's generation endpoint — modify that file.
- Document generation_logs schema — future analytics work reads it.

### References

- [Source: _bmad-output/planning-artifacts/prd.md#Functional Requirements] FR31
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 5] Story 5.3
- [Source: _bmad-output/implementation-artifacts/2-2-ai-restraint-engine-deck-generation.md] Generation endpoint (where log writes go)
- [Source: _bmad-output/implementation-artifacts/5-1-platform-metrics-dashboard.md] Admin middleware, admin route structure
- [Source: _bmad-output/implementation-artifacts/5-2-user-account-and-activity-inspection.md] Admin pattern established

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `tests/admin/logs.test.ts` TS2322/TS2352: `FAILURE_LOG` had `deckId: null` / `latencyMs: null` conflicting with `SAMPLE_LOG`'s inferred non-null types. Fixed by introducing explicit `TestLog` type with nullable fields.

176/176 tests passed, 0 TS errors in my files.

### Completion Notes List

**`generation_logs` schema (future analytics agents reference this):**

```
generation_logs
────────────────────────────────────────────────────────────
id               UUID PRIMARY KEY DEFAULT random_uuid()
user_id          UUID REFERENCES users(id) ON DELETE SET NULL — nullable
deck_id          UUID REFERENCES decks(id) ON DELETE SET NULL — null on failure
input_text       VARCHAR(500)   — first 500 chars of user input
input_mode       VARCHAR(10)    — "text" | "outline"
status           ENUM('success','failure') NOT NULL
error_message    TEXT           — null on success; error type + message on failure
ai_provider      VARCHAR(50)    NOT NULL DEFAULT 'anthropic'
model_used       VARCHAR(100)   — e.g. "claude-haiku-4-5-20251001"
latency_ms       INTEGER        — null when failure before AI call; NFR1 monitoring
created_at       TIMESTAMP      NOT NULL DEFAULT NOW()
```

**Log write (generation endpoint `src/app/api/decks/generate/route.ts`):**
- `writeGenerationLog()` — async helper, fire-and-forget (`void`), never blocks or throws to caller
- Logs on **AI failure** (before 502 return): `status=failure`, `errorMessage=err.message`, `deckId=null`
- Logs on **success** (after transaction commits): `status=success`, `deckId=deckId!`, `latencyMs=result.latencyMs`
- Input truncated to 500 chars at write time

**Admin routes (no shared files with Story 5.2):**

| Route | File | Purpose |
|-------|------|---------|
| `GET /api/admin/logs` | `src/app/api/admin/logs/route.ts` | Paginated list; filters: status, start, end, email |
| `GET /api/admin/logs/:id` | `src/app/api/admin/logs/[id]/route.ts` | Full log detail |
| `/admin/logs` | `src/app/admin/logs/page.tsx` | List UI with filter form, pagination |
| `/admin/logs/:id` | `src/app/admin/logs/[id]/page.tsx` | Detail UI — links to /deck/:id and /admin/users/:id |

**Auth:** All routes use `getAdminSession()` / `requireAdmin()` from Story 5.1's `src/lib/auth/admin-guard.ts`.

**PDF export errors (Story 3.2 note):** Used the same `generation_logs` table is for generation events only. If Story 3.2 wants to log PDF export failures, recommend a separate `export_logs` table to avoid polluting the generation signal.

### File List

**New files created:**

```
src/app/api/admin/logs/route.ts
src/app/api/admin/logs/[id]/route.ts
src/app/admin/logs/page.tsx
src/app/admin/logs/[id]/page.tsx
tests/admin/logs.test.ts         — 16 tests
```

**Files modified:**

```
src/lib/db/schema.ts                        — generationLogStatusEnum + generationLogs table
src/app/api/decks/generate/route.ts         — writeGenerationLog helper + log calls (success + failure)
_bmad-output/implementation-artifacts/5-3-generation-log-access-and-error-diagnosis.md
```
