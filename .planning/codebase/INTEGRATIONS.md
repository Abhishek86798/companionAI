# Integrations
_Last updated: 2026-05-15_

## External services

| Service | Purpose | How wired |
|---|---|---|
| Supabase (Postgres) | Primary database | `supabase-py` 2.5.0; service role key in backend (`db.py`); anon key in frontend (`@supabase/supabase-js`) |
| Supabase Auth | User auth (OTP/magic-link) | Frontend calls `supabase.auth.signInWithOtp()` / `verifyOtp()` directly; backend verifies JWTs locally (HS256 via `PyJWT`) or via `supabase.auth.get_user()` network fallback |
| OpenRouter | AI/LLM proxy to GPT-4o Mini | `openai` Python SDK with `base_url=https://openrouter.ai/api/v1`; used in `ai.py`, `safety.py`, `extractor.py`, `summarizer.py` |
| Railway | Backend hosting | Deploys FastAPI; env vars set in Railway dashboard |
| Vercel | Frontend hosting | Deploys Next.js; reads `NEXT_PUBLIC_*` env vars; auto-deploys from git |
| Sentry | Backend error tracking | `sentry-sdk[fastapi]` 2.7.1; initialized in `main.py` if `SENTRY_DSN` is set; `traces_sample_rate=1.0` |

## Not yet integrated

| Service | Purpose | Status |
|---|---|---|
| Twilio / MessageBird / Vonage | SMS OTP for phone auth | Supabase provider not yet configured |
| Web Push (pywebpush) | Push notifications | Service file (`push.py`) not yet built |
| Razorpay | Payments / subscription | Post-MVP; not started |

## Internal service boundaries

```
Browser (Next.js)
  │
  ├─ Supabase JS SDK ──────────────→ Supabase Auth (OTP sign-in, session management)
  │
  └─ fetch (credentials: 'include') → FastAPI backend (Railway)
       │
       ├─ CORS middleware (allow_credentials=True; origins from ALLOWED_ORIGINS)
       ├─ get_current_user() — verifies JWT → Supabase Postgres (lazy user row creation)
       ├─ check_safety() — keyword scan → OpenRouter (semantic GPT-4o Mini fallback)
       ├─ check_and_increment() — rate limit → Supabase (daily_usage table)
       ├─ stream_response() — chat pipeline → OpenRouter (streaming SSE)
       └─ BackgroundTasks:
            ├─ extract_and_store_memories() → OpenRouter + Supabase (memories table)
            ├─ summarize_memories() → OpenRouter + Supabase
            └─ log_safety_event() → Supabase (safety_events table; rows never deleted)
```

## Environment variables (all, redacted)

### Backend (`backend/.env`)
```
SUPABASE_URL=                    # Supabase project URL
SUPABASE_ANON_KEY=               # Public anon key (used for auth network fallback)
SUPABASE_SERVICE_ROLE_KEY=       # Backend-only; bypasses RLS — NEVER in NEXT_PUBLIC_*
SUPABASE_JWT_SECRET=             # From Supabase → Settings → API → JWT Secret
OPENAI_API_KEY=                  # OpenRouter API key (sk-or-v1-...)
OPENAI_BASE_URL=                 # https://openrouter.ai/api/v1
ENVIRONMENT=                     # development | production
ALLOWED_ORIGINS=                 # Comma-separated: http://localhost:3000,https://app.vercel.app
SENTRY_DSN=                      # Optional; Sentry project DSN
# Post-MVP (not in config.py yet):
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=
# RAZORPAY_KEY_ID=
# RAZORPAY_KEY_SECRET=
# RAZORPAY_WEBHOOK_SECRET=
```

### Frontend (`web/.env.local`)
```
NEXT_PUBLIC_API_URL=             # e.g. http://localhost:8000/api/v1 (must include /api/v1)
NEXT_PUBLIC_SUPABASE_URL=        # Same as backend SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Public anon key only — NEVER service role key
```

### Runtime limits (defined in `config.py`, never hardcoded elsewhere)
```
FREE_TIER_DAILY_LIMIT=20         # Authenticated user daily message cap
ANON_MSG_LIMIT=8                 # Anonymous session daily message cap
```

## API contracts

### Backend endpoints (all prefixed `/api/v1` except `/health`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | None | Liveness check; returns `{"status": "ok"}` |
| POST | `/api/v1/message` | Optional (Bearer JWT) | Send a message; returns SSE stream (`text/event-stream`) |
| GET | `/api/v1/messages/{conversation_id}` | Required | Paginated conversation history (`page`, `page_size=20`) |
| GET | `/api/v1/memories` | Required | List all memory facts for authenticated user |
| DELETE | `/api/v1/memories/{id}` | Required | Delete a specific memory (ownership enforced) |

### SSE event format (`POST /message` response)
```json
// Token event (streamed incrementally)
{"type": "token", "content": "<text chunk>"}

// Done event (final frame)
{"type": "done", "message_id": "<uuid>", "conversation_id": "<uuid>", "safety_triggered": false, "remaining_messages_today": 15}

// Error event
{"type": "error", "detail": "AI service unavailable"}
```

### Anonymous session tracking
- Cookie name: `anon_session_id` (HttpOnly, SameSite=lax, Max-Age=86400)
- Set by backend via `Set-Cookie` header on first unauthenticated request
- Keyed against `daily_usage.anon_session_id` column (partial unique index)
- Frontend must use `credentials: 'include'` on all fetch calls to send/receive cookie

### Auth flow
1. Frontend: `supabase.auth.signInWithOtp({ email })` — Supabase sends magic link
2. User clicks link → `supabase.auth.verifyOtp(...)` → session with JWT
3. Frontend sends `Authorization: Bearer <jwt>` on all backend requests
4. Backend: `get_current_user()` verifies JWT → lazy-creates `public.users` row → returns `user_id`
