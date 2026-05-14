# Concerns & Tech Debt
_Last updated: 2026-05-15_

---

## Hard Constraints (must never violate)

From CLAUDE.md — verbatim:

1. **Safety check** must run on every message before the AI call — no exceptions, no feature flags, no dev bypass.
2. **`safety_events` rows are never deleted** — no DELETE policy on that table.
3. **Service role key** (`SUPABASE_SERVICE_ROLE_KEY`) is backend-only. Never put it in `NEXT_PUBLIC_*` env vars.
4. **Rate limiting is server-side only** — client never decides if a message is allowed.
5. **JWT `user_id`** comes from `get_current_user()` (verified token), never from the request body.
6. **`FREE_TIER_DAILY_LIMIT` and `ANON_MSG_LIMIT`** are defined once in `config.py` — never hardcoded.

---

## Security Concerns

- **Safety check is implemented but `safety_events` table does not exist yet** — `log_safety_event()` in `safety.py` will fail with a DB error on every crisis trigger because the table has not been migrated. Crisis responses still stream, but the event is silently lost. This violates audit trail requirements.
- **`anon_session_id` cookie** is set with `SameSite=lax` in `chat.py` (line 135), not `SameSite=strict`. Review whether `lax` is acceptable given the cross-site auth flow.
- **No HTTPS enforcement on the cookie** — the `Set-Cookie` header in `chat.py` does not include the `Secure` flag. In production (Railway), all traffic is HTTPS but the flag is missing from code.
- **Persona fields (`tone`, `expectation`, `open_field`) are free text injected into the system prompt** — the sanitization function (`sanitize_persona_field`) described in `ImplementationPlan_PersonaCustomization.md` is not yet implemented. When persona is built, unsanitized user text could reach the system prompt.
- **JWT secret is optional** — `supabase_jwt_secret` defaults to `""` in `config.py`. If not set in production, every authenticated request falls back to a network call to Supabase `auth.get_user()`, adding latency and a network dependency per request.
- **`lazy-create` in `get_current_user()`** does a SELECT then INSERT without a transaction or upsert — a concurrent first-request race condition could cause a duplicate insert attempt (mitigated by PK uniqueness, but the error would propagate as a 500).
- **No input length validation on `body.content`** in `MessageRequest` — a very long message could be passed directly to both the safety classifier and the AI call, with no max-length guard in the router or schema.

---

## Missing Features (from CLAUDE.md "What's Built vs Docs" table)

| Item | Status | Notes |
|---|---|---|
| Auth page + AuthContext (web) | Not built | Required before real users; chat page currently redirects to `/auth` (route exists) |
| Rate limiter | Built (services/rate_limiter.py exists and is wired in chat.py) | CLAUDE.md says "not built" — this is now OUTDATED in CLAUDE.md |
| Safety layer | Built (services/safety.py exists and is wired in chat.py) | CLAUDE.md says "not built" — this is now OUTDATED in CLAUDE.md |
| Anonymous quota (8 msgs, session cookie) | Built (rate_limiter.py + cookie logic in chat.py) | CLAUDE.md is outdated here too |
| Settings page | Not built | Required for persona edit (Phase 4E) |
| Voice input (Web Speech API) | Not built | Phase 7 |
| Push notifications (Web Push) | Not built | `push.py` file does not exist at all; Phase 7 |
| Schema migrations (users, daily_usage, conversations, safety_events) | Not applied | Blocker for auth + safety audit trail |
| `routers/auth.py` | Must be deleted — auth is via Supabase JS SDK | Not confirmed deleted; not seen in routers/ glob (may already be gone) |
| `notifications.py` router | Referenced in CLAUDE.md but not present in routers/ | Either not built or not registered |

---

## Known Gaps

### Things in the spec but not implemented

- **Persona system (Phases 4B–4E)** — entire feature not started. See section below.
- **`conversations` table** — not created. The `get_or_create_conversation()` function is called in `chat.py` and `messages.py` references it, but the table doesn't exist in the DB yet. This is likely a runtime error for any authenticated chat.
- **`safety_events` table** — not created. `log_safety_event()` in `safety.py` inserts into this table, which will error silently (BackgroundTask, so no 500 to the client, but events are lost).
- **`daily_usage.anon_session_id` column** — not migrated. The rate limiter calls `.eq("anon_session_id", anon_session_id)` on `daily_usage`, which will fail at DB level for anonymous users.
- **`users.email`, `users.web_push_subscription`, `users.notif_time`, `users.notif_enabled`** — not migrated. Any code that touches these columns will fail.
- **`messages.conversation_id` FK** — not migrated. Saves to messages table will fail or silently drop the FK.
- **Settings page** — referenced by the Settings button in `chat/page.tsx` (routes to `/settings`), but the page does not exist.
- **`notifications.py` router** — described in CLAUDE.md architecture but not found in `backend/app/routers/`. Not registered in `main.py`.
- **`push.py` service** — `push.py` file does not exist under `backend/app/services/`.

### Things implemented but incorrectly or diverged from spec

- **CLAUDE.md "What's Built vs Docs" table is stale** — it says rate limiter, safety layer, and anonymous quota are "not built", but all three are now implemented and wired. The table needs updating.
- **`routers/message.py` rename** — CLAUDE.md says rename to `routers/chat.py` is pending, but `chat.py` already exists and `message.py` is gone. Resolved.
- **CLAUDE.md says `POST /api/v1/message` has no `/api/v1/` prefix** — this is resolved; `main.py` registers with `prefix="/api/v1"`. Resolved.
- **CLAUDE.md says CORS is missing `allow_credentials=True`** — `main.py` already has it set. Resolved.
- **CLAUDE.md says `get_current_user` is missing lazy-create** — `dependencies.py` already implements lazy-create. Resolved.
- **Onboarding uses `arjun_intake` localStorage key** — but `ImplementationPlan_PersonaCustomization.md` defines a new unified `onboarding_data` key structure. These are inconsistent; migration logic will be needed when persona steps are added.
- **Onboarding progress dots render 4 dots (indices 0–3) but only 3 steps exist (0–2)** — dot at index 3 is always inactive. Minor UI bug.
- **`chat/page.tsx` fallback welcome message** hardcodes "Main Arjun hoon" — this will need updating when persona is implemented.
- **`onboarding/page.tsx` COPY strings** hardcode "Arjun" and "अर्जुन" in all 3 language variants (e.g., intro copy, step 2 heading "Main Arjun hoon"). These must be parameterized when companion naming is added.

---

## Persona Customization Status

### What `ImplementationPlan_PersonaCustomization.md` requires

Phases 4B → 4C → 4D → 4E must all complete before Phase 5 (Core AI Chat) is considered done.

| Phase | Goal | Status |
|---|---|---|
| 4B — DB Changes | `public.persona` table, `users.companion_name` column, `daily_usage.anon_session_id` | Not started |
| 4C — Backend | `GET/POST /api/v1/persona` router, `get_persona_for_prompt()`, inject persona into `build_system_prompt()` | Not started |
| 4D — Onboarding UI | 6-step onboarding (add Steps 4 Name Companion, 5 Tone, 6 Expectation), sync to DB post-auth | Not started |
| 4E — Chat UI + Settings | Top bar reads companion name from API, avatar initial dynamic, persona edit in Settings | Not started |

### What's already built toward it

- `services/ai.py` has `build_system_prompt(user_id)` — it already accepts `user_id` as a parameter and is structured to be extended (calls `get_memories_for_prompt`). The function signature is ready for persona injection.
- `services/memory.py` contains the `get_memories_for_prompt()` function — the pattern for `get_persona_for_prompt()` (Phase 4C.3) to follow.
- Onboarding has 3 steps with back navigation — the UI scaffolding for adding more steps is in place.

### What's missing

- `public.persona` table — not created
- `users.companion_name` column — not added
- `app/routers/persona.py` — does not exist
- `get_persona_for_prompt()` in `memory.py` — not implemented
- Persona injection into `_SYSTEM_TEMPLATE` in `ai.py` — system prompt still hardcodes "You are Arjun"
- `usePersona` React Query hook — not built
- Steps 4, 5, 6 in onboarding — not built
- `AuthContext.tsx` post-auth persona sync — not built (AuthContext itself is not built)
- Persona sanitization (`sanitize_persona_field()`) — not implemented
- Settings page with persona edit section — not built

---

## Pending DB Migrations

From CLAUDE.md (required before auth + safety go live):

1. **`users` table** — add columns: `email`, `web_push_subscription`, `notif_time`, `notif_enabled`; add FK → `auth.users(id)`
2. **`daily_usage` table** — add `anon_session_id TEXT`; make `user_id` nullable; add partial unique index on `(anon_session_id, date) WHERE anon_session_id IS NOT NULL`
3. **`conversations` table** — create new (blocked by: `messages.conversation_id` FK; `get_or_create_conversation()` calls will fail without it)
4. **`safety_events` table** — create new with no DELETE policy; `log_safety_event()` currently fails silently without it
5. **`messages.conversation_id`** — add FK → `conversations`

From `ImplementationPlan_PersonaCustomization.md` (Phase 4B, additional):

6. **`public.persona` table** — create with RLS, trigger for `updated_at`, index on `user_id`
7. **`users.companion_name` column** — add `TEXT NOT NULL DEFAULT 'Arjun'`

---

## Tech Debt Items

- **`_SYSTEM_TEMPLATE` in `ai.py`** hardcodes "You are Arjun" — must be replaced with dynamic `{companion_name}` injection when persona is implemented. Currently a constant string at module level.
- **`chat/page.tsx` top bar** hardcodes `"Arjun"` as the displayed name and `"A"` as avatar initial — must be replaced with `usePersona()` hook output.
- **`onboarding/page.tsx` COPY object** hardcodes "Arjun"/"अर्जुन" in all intro strings — requires parameterization for persona customization.
- **`fallbackWelcome()` in `chat/page.tsx`** hardcodes "Main Arjun hoon" — needs to use the companion name.
- **`arjun_` prefix on all localStorage keys** (`arjun_onboarding_done`, `arjun_intake`, `arjun_first_sent`, `arjun_onboarding_step`, `arjun_lang_pref`) — these are fine for MVP but will conflict semantically once companion naming is live (the companion may not be called Arjun).
- **`_upsert_row()` in `rate_limiter.py`** is sync (uses synchronous `supabase` client) inside an async handler — consistent with the rest of the DB layer (all supabase-py calls are sync) but worth tracking as a potential bottleneck under load.
- **`get_current_user()` lazy-create** uses SELECT + INSERT in sequence without an upsert — not atomic. Should use `supabase.table("users").upsert(...)` with `on_conflict="id"` to avoid race conditions on concurrent first requests.
- **Rate limiter `_upsert_row()`** also uses SELECT + UPDATE/INSERT pattern — not atomic. A concurrent double-send could bypass the limit by incrementing from the same baseline. Should use a Postgres atomic `INSERT ... ON CONFLICT DO UPDATE SET msg_count = msg_count + 1`.
- **History fetch in `stream_response()`** (`ai.py`) fetches by `user_id` only, not by `conversation_id` — once multi-conversation support is live, history will bleed across conversations. The function signature already accepts `conversation_id` but ignores it.
- **`get_recent_messages()` is called twice** for authenticated chat: once directly in `chat.py` (line 94) and once inside `stream_response()` in `ai.py` (line 70) — duplicate DB reads per request.
- **`maybe_single().execute()` return value** — in `rate_limiter.py` the comment notes "returns None (not APIResponse) when 0 rows found" but the code guards with `row is not None and row.data`. This may be incorrect; `maybe_single()` typically returns an `APIResponse` with `data=None` when no row matches, not `None` itself. Needs verification against supabase-py version in use.
- **No `notifications.py` router** despite being listed in CLAUDE.md architecture — either it was planned and never created, or it was removed. Push notifications are Phase 7 but the router stub should be consistent with the documented architecture.
- **`_MAX_TOKENS = 300`** in `ai.py` — hard-coded constant with no config override. Should move to `config.py` to allow tuning without code changes.
- **Sentry `traces_sample_rate=1.0`** in `main.py` — 100% transaction sampling is expensive at scale. Should be lowered before production load.

---

## Risk Areas

- **Blocking DB migrations** — `conversations` table is missing and `get_or_create_conversation()` is called on every authenticated chat message. This means the entire authenticated chat flow is currently broken at the DB level. This is the highest-priority blocker.
- **`safety_events` table missing** — safety events are silently dropped. If a crisis event is detected, the response is sent correctly but no record is kept. This violates the audit requirement and may have legal/ethical implications.
- **`daily_usage.anon_session_id` column missing** — anonymous rate limiting will fail at DB level for any anonymous user (the `.eq("anon_session_id", ...)` query will return an error or unexpected results).
- **Auth page not built** — `chat/page.tsx` already redirects unauthenticated users to `/auth`, but `/auth` route and `AuthContext` don't exist. Any unauthenticated visit to `/chat` will hit a broken page.
- **Persona customization is a large unstarted feature** — 4 sequential phases (4B → 4E) all blocking Phase 5 in the plan, and Phase 5 (Core AI Chat) is where real user testing begins. This creates a long dependency chain before the product can be properly validated.
- **No prompt injection defense for persona fields** — once persona is built, user-controlled text (`tone`, `expectation`) will be injected into the system prompt. Without `sanitize_persona_field()`, users could attempt prompt injection to alter AI behavior.
- **Non-atomic rate limiting** — a determined user sending burst requests could bypass the daily limit due to the read-then-write pattern in `_upsert_row()`.
- **Supabase sync client in async handlers** — all DB operations use the synchronous supabase-py client inside async FastAPI routes. Under concurrent load, these block the event loop. Consider `asyncpg` or the async variant of supabase-py for production scale.
