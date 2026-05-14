# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

Monorepo for **Arjun** — a Hinglish AI companion web app. Three top-level directories:

```
backend/   FastAPI (Python 3.11) — AI, memory, auth, rate limiting
web/       Next.js 16 (TypeScript) — chat UI, onboarding, auth page
supabase/  SQL migrations only
```

Hosted on Railway (backend) + Vercel (web). Database + Auth via Supabase (Postgres).

**Source of truth for all decisions:** `docs/` directory — 6 documents. If this file conflicts with those docs, the docs win.

---

## Dev Commands

### Backend
```powershell
cd backend
.venv\Scripts\activate          # Windows venv
uvicorn app.main:app --reload --port 8000
```
Background (Windows, persists across sessions):
```powershell
Start-Process powershell -ArgumentList "-NoProfile -Command `"cd 'D:\CODES\Trionix Projects\companion\backend'; .venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir app`"" -WindowStyle Hidden -PassThru -RedirectStandardOutput ..\backend_out.log -RedirectStandardError ..\backend_err.log
```

### Web
```powershell
cd web
npm run dev    # http://localhost:3000
npm run build
npx tsc --noEmit   # type-check only
```

### Database migrations
Apply new migrations via the Supabase MCP tool (`mcp__supabase__apply_migration`) or Supabase Management REST API.

---

## Architecture

### Request flow (happy path)

```
Browser → POST /api/v1/message  (Authorization: Bearer <jwt> OR anonymous with cookie)
  → CORS middleware (FastAPI) — allow_credentials=True; frontend sends credentials: 'include'
  → get_current_user()          ← returns user UUID (JWT) or None (anonymous)
  → rate_limiter.check()        ← checks daily_usage by user_id or anon_session_id cookie
  → [safety check — not yet built]
  → get_memory_facts()          ← SELECT from memories (skipped if anonymous)
  → get_recent_messages()       ← SELECT last 10 messages (skipped if anonymous)
  → OpenRouter (GPT-4o Mini)    ← openai SDK, base_url = openrouter.ai
  → save_messages()             ← skipped if anonymous
  → BackgroundTask: extract_and_store()   ← updates memories table
  → BackgroundTask: maybe_summarize()     ← fires every 20 msgs
  → JSON response
```

Anonymous requests get an AI reply but nothing is persisted and no memory is injected.

### Backend structure
```
app/
├── main.py          — FastAPI init, CORS (allow_credentials=True), Sentry, router registration
│                      All routers prefixed /api/v1 except /health
├── config.py        — pydantic-settings; single `settings` singleton
│                      FREE_TIER_DAILY_LIMIT = 20, ANON_MSG_LIMIT = 8
├── dependencies.py  — TWO auth dependencies:
│                      get_current_user() → Optional[str]: None for anonymous; lazy-creates
│                        public.users row on first valid JWT (SELECT then INSERT if missing)
│                      require_current_user() → str: wraps above; raises 401 if None
├── db.py            — Supabase client singleton using service role key (bypasses RLS)
│
├── routers/
│   ├── chat.py      — POST /message (uses get_current_user — anonymous allowed)
│   │                  GET /messages/{conversation_id} (uses require_current_user)
│   ├── memories.py  — GET /memories, DELETE /memories/{id} (require_current_user)
│   └── notifications.py — POST /notifications/subscribe (require_current_user)
│
└── services/
    ├── ai.py           — OpenAI call, prompt assembly
    ├── memory.py       — get_memory_facts(): formats memory rows for system prompt injection
    ├── extractor.py    — BackgroundTask: extract facts from last 5 msgs, upsert to memories
    ├── summarizer.py   — BackgroundTask: fires at msg 20/40/60, compresses history
    ├── messages.py     — save_messages(), get_recent_messages(), count_messages()
    ├── safety.py       — [NOT YET BUILT] keyword + semantic check; must run before AI call
    ├── rate_limiter.py — [NOT YET BUILT] checks user_id or anon_session_id against daily_usage
    └── push.py         — [NOT YET BUILT] Web Push via pywebpush
```

### Auth architecture (decided)
- **Frontend calls Supabase JS SDK directly** — `supabase.auth.signInWithOtp()`, `supabase.auth.verifyOtp()`. No backend OTP proxy endpoints.
- `public.users` row is created lazily: `get_current_user()` inserts on first valid JWT if no row exists.
- Anonymous users tracked via `anon_session_id` HttpOnly cookie (UUID, 24h expiry) set by backend on first unauthenticated request.

### Route prefix
All routes use `/api/v1/` prefix, registered once in `main.py` via `app.include_router(..., prefix="/api/v1")`. `/health` is unprefixed.

### AI / OpenRouter
Model: `openai/gpt-4o-mini` via OpenRouter proxy.
```python
_openai = AsyncOpenAI(api_key=settings.openai_api_key, base_url=settings.openai_base_url)
```
`OPENAI_BASE_URL=https://openrouter.ai/api/v1` in `.env`.

### Memory pipeline
After every message (authenticated users only):
1. **Extractor** (`extractor.py`) — parses last 5 messages, upserts to `memories(user_id, category)`. Handles both JSON shapes from model. Deduplicates before upsert.
2. **Summarizer** (`summarizer.py`) — when `(msg_count - 20) % 20 == 0`, compresses full history into memory facts.

### Frontend structure
- `app/page.tsx` — checks `localStorage.arjun_onboarding_done`, redirects to `/onboarding` or `/chat`
- `app/onboarding/page.tsx` — 3-step wizard; stores `arjun_intake` JSON in localStorage
- `app/chat/page.tsx` — reads intake from localStorage for personalised welcome; still uses hardcoded `TEST_USER_ID` (auth page not yet built)
- `lib/api.ts` — `sendMessage()` wrapper; `NEXT_PUBLIC_API_URL` env var (includes `/api/v1`); must use `credentials: 'include'`
- `components/` — `ChatBubble`, `ChatInput`, `MessageList`

---

## Database Schema

Full schema in `docs/BackendSchema_Hinglish_AI_Companion.md`. Key points:

| Table | Notes |
|---|---|
| `users` | `id UUID` FK → `auth.users(id)`. Has `phone`, `email`, `tier`, `web_push_subscription`. **Not yet migrated** from old schema. |
| `messages` | Needs `conversation_id` FK → `conversations`. **Not yet migrated.** |
| `memories` | `UNIQUE(user_id, category)` — one fact per category. Live. |
| `daily_usage` | Now has nullable `user_id` and `anon_session_id TEXT`. Partial unique index for anon. **Not yet migrated.** |
| `conversations` | **Not yet created.** |
| `safety_events` | **Not yet created.** Rows must never be deleted. |

**Pending migrations** (required before auth + safety go live):
- `users` → add `email`, `web_push_subscription`, `notif_time`, `notif_enabled`; FK → `auth.users(id)`
- `daily_usage` → add `anon_session_id`, make `user_id` nullable, add partial unique index
- `conversations` table (new)
- `safety_events` table (new, no DELETE policy)
- `messages.conversation_id` FK

---

## What's Built vs Docs

| Item | Status |
|---|---|
| `POST /api/v1/message` (chat) | ⚠️ Built but route has no `/api/v1/` prefix yet |
| Memory extractor + summarizer | ✅ Done |
| CORS middleware | ⚠️ Built but missing `allow_credentials=True` |
| Onboarding flow (web) | ✅ Done |
| `dependencies.py` — `get_current_user` | ⚠️ Built but missing lazy-create and `require_current_user` |
| `routers/message.py` | ⚠️ Rename to `routers/chat.py` pending |
| `routers/auth.py` | ❌ Must be deleted — auth is via Supabase JS SDK |
| Auth page + AuthContext (web) | ❌ Not built |
| Rate limiter | ❌ Not built |
| Safety layer | ❌ Not built — **required before real users** |
| Anonymous quota (8 msgs, session cookie) | ❌ Not built |
| Settings page | ❌ Not built |
| Voice input (Web Speech API) | ❌ Not built |
| Push notifications (Web Push) | ❌ Not built |
| Schema migrations (users, daily_usage, conversations, safety_events) | ❌ Not applied |

---

## Hard Constraints (never violate)

- **Safety check** must run on every message before the AI call — no exceptions, no feature flags, no dev bypass.
- **`safety_events` rows are never deleted** — no DELETE policy on that table.
- **Service role key** (`SUPABASE_SERVICE_ROLE_KEY`) is backend-only. Never put it in `NEXT_PUBLIC_*` env vars.
- **Rate limiting is server-side only** — client never decides if a message is allowed.
- **JWT `user_id`** comes from `get_current_user()` (verified token), never from the request body.
- **`FREE_TIER_DAILY_LIMIT` and `ANON_MSG_LIMIT`** are defined once in `config.py` — never hardcoded.

---

## CORS

`ALLOWED_ORIGINS` env var (comma-separated) is split at startup:
```
ALLOWED_ORIGINS=http://localhost:3000
```
`allow_credentials=True` is required for the `anon_session_id` cookie. Frontend must use `credentials: 'include'` on all fetch calls.

## Next.js version warning

`web/AGENTS.md` (loaded automatically) warns: this Next.js version (16.x) has breaking changes. Read `node_modules/next/dist/docs/` before writing routing or data-fetching code.
