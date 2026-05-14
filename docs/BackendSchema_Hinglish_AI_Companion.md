# Backend Schema — Data Model & Auth Architecture
## Hinglish AI Companion — Web App MVP
**Version:** 1.0  
**Status:** Draft  
**Paired Documents:** PRD, TRD, AppFlow

---

## 1. Overview

- **Database:** PostgreSQL via Supabase
- **Auth:** Supabase Auth (Phone OTP + Email OTP) — JWT-based
- **Backend access:** FastAPI uses the **service role key** — bypasses RLS entirely
- **Frontend access:** Supabase JS SDK used for auth only — all data queries go through FastAPI, never direct from browser to Supabase
- **File storage:** Not applicable for MVP — no user uploads, no avatars
- **Sensitive fields:** No payment data stored (payments deferred to post-MVP). Phone numbers stored as-is by Supabase Auth in `auth.users` — not duplicated in application tables.

---

## 2. Database Tables

### 2.1 `public.users`
Extends Supabase's built-in `auth.users` table with application-level fields.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, FK → `auth.users(id)` | Same UUID as Supabase Auth user |
| `phone` | `TEXT` | UNIQUE, nullable | Null if user signed up via email OTP |
| `email` | `TEXT` | UNIQUE, nullable | Null if user signed up via phone OTP |
| `tier` | `TEXT` | NOT NULL, DEFAULT `'free'` | `'free'` only in MVP. `'plus'` added post-MVP. CHECK: `tier IN ('free', 'plus')` |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | |
| `web_push_subscription` | `JSONB` | nullable | Full Web Push API subscription object. Null if user hasn't granted notification permission |
| `notif_time` | `TIME` | DEFAULT `'21:00:00'` | User's preferred daily check-in time (IST) |
| `notif_enabled` | `BOOLEAN` | DEFAULT `true` | User can toggle off in Settings |

**Notes:**
- Either `phone` or `email` will always be populated — never both null (enforced at app layer on signup)
- `tier` column is present now so no migration is needed when payments launch post-MVP

---

### 2.2 `public.conversations`
Groups messages into sessions. One user can have many conversations.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | |
| `user_id` | `UUID` | NOT NULL, FK → `public.users(id)` ON DELETE CASCADE | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | |
| `title` | `TEXT` | nullable | Auto-generated summary of conversation. Optional — not displayed in MVP UI |

**Notes:**
- MVP creates one conversation per user and reuses it across sessions (no multi-conversation UI)
- `title` field is reserved for future conversation history feature

---

### 2.3 `public.messages`
Every message sent by the user or Arjun, in order.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | |
| `conversation_id` | `UUID` | NOT NULL, FK → `public.conversations(id)` ON DELETE CASCADE | |
| `user_id` | `UUID` | NOT NULL, FK → `public.users(id)` ON DELETE CASCADE | Denormalised for faster per-user queries |
| `role` | `TEXT` | NOT NULL | CHECK: `role IN ('user', 'assistant')` |
| `content` | `TEXT` | NOT NULL | Raw message text. No encryption in MVP. |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | |
| `safety_flagged` | `BOOLEAN` | NOT NULL, DEFAULT `false` | Set to `true` if message triggered safety path |

**Notes:**
- `user_id` is duplicated here (also reachable via `conversations.user_id`) for query performance — avoids a join when fetching all messages for a user
- Messages are never deleted by the user (no delete UI) but cascade-delete if user account is deleted

---

### 2.4 `public.memories`
Facts Arjun has learned about the user. One row per category per user.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | |
| `user_id` | `UUID` | NOT NULL, FK → `public.users(id)` ON DELETE CASCADE | |
| `fact` | `TEXT` | NOT NULL | e.g. `"Works as a software engineer in Pune"` |
| `category` | `TEXT` | NOT NULL | CHECK: `category IN ('name', 'city', 'job', 'relationship', 'situation', 'other')` |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | Updated every time the fact is overwritten |

**Unique constraint:** `UNIQUE(user_id, category)` — enforces exactly one fact per category per user at the database level. Memory extractor always does an upsert, never a blind insert.

**Notes:**
- User can delete individual facts from the Settings > Memory screen
- When conversation exceeds 20 messages, summarizer replaces all rows for that user with a fresh compressed set
- `'other'` category catches anything that doesn't fit the named categories

---

### 2.5 `public.daily_usage`
Tracks how many messages each user has sent today. Resets at midnight IST via a scheduled job or on-read check.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | |
| `user_id` | `UUID` | nullable, FK → `public.users(id)` ON DELETE CASCADE | Null for anonymous users |
| `anon_session_id` | `TEXT` | nullable | UUID cookie set by backend on first anonymous request; null for authenticated users |
| `date` | `DATE` | NOT NULL, DEFAULT `CURRENT_DATE` | Date in UTC — rate limiter compares against IST midnight |
| `msg_count` | `INT` | NOT NULL, DEFAULT `0` | Incremented server-side after every successful AI response |

**Unique constraints:**
- `UNIQUE(user_id, date)` — one row per authenticated user per day
- Partial unique index: `UNIQUE(anon_session_id, date) WHERE anon_session_id IS NOT NULL` — one row per anonymous session per day

**Notes:**
- Counter is only ever incremented by the FastAPI backend — client has no write access
- Reset logic: a new row is inserted each day; old rows can be purged after 30 days (no business value in keeping them longer)
- `FREE_TIER_DAILY_LIMIT = 20` — authenticated free users. Defined in `app/config.py`, never hardcoded.
- `ANON_MSG_LIMIT = 8` — anonymous session lifetime cap (not per-day). Defined in `app/config.py`.

---

### 2.6 `public.safety_events`
Immutable log of every message that triggered the safety path. **Rows are never deleted.**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | |
| `user_id` | `UUID` | nullable, FK → `public.users(id)` | Nullable — safety check runs even before auth (pre-login onboarding chat) |
| `message` | `TEXT` | NOT NULL | The exact message that triggered the safety path |
| `trigger_type` | `TEXT` | NOT NULL | CHECK: `trigger_type IN ('keyword', 'semantic')` |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | |

**Notes:**
- No DELETE policy on this table — ever
- No RLS policy allows deletion, even by service role (enforced by not granting DELETE in the policy)
- Reviewed manually by the founder on a weekly basis during MVP
- `user_id` is nullable because onboarding chat happens before the user creates an account

---

## 3. Full SQL — Create Statements

```sql
-- 3.1 Users (extends Supabase auth.users)
CREATE TABLE public.users (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone                 TEXT UNIQUE,
  email                 TEXT UNIQUE,
  tier                  TEXT NOT NULL DEFAULT 'free'
                          CHECK (tier IN ('free', 'plus')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  web_push_subscription JSONB,
  notif_time            TIME DEFAULT '21:00:00',
  notif_enabled         BOOLEAN DEFAULT true
);

-- 3.2 Conversations
CREATE TABLE public.conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  title       TEXT
);

-- 3.3 Messages
CREATE TABLE public.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  safety_flagged  BOOLEAN NOT NULL DEFAULT false
);

-- 3.4 Memories
CREATE TABLE public.memories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  fact        TEXT NOT NULL,
  category    TEXT NOT NULL
                CHECK (category IN ('name','city','job','relationship','situation','other')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, category)
);

-- 3.5 Daily usage
CREATE TABLE public.daily_usage (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES public.users(id) ON DELETE CASCADE,  -- nullable for anon
  anon_session_id  TEXT,  -- nullable; UUID cookie for anonymous users
  date             DATE NOT NULL DEFAULT CURRENT_DATE,
  msg_count        INT NOT NULL DEFAULT 0,
  UNIQUE(user_id, date)
);

CREATE UNIQUE INDEX idx_daily_usage_anon_date
  ON public.daily_usage(anon_session_id, date)
  WHERE anon_session_id IS NOT NULL;

-- 3.6 Safety events (append-only)
CREATE TABLE public.safety_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  message       TEXT NOT NULL,
  trigger_type  TEXT NOT NULL CHECK (trigger_type IN ('keyword', 'semantic')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 4. Indexes

```sql
-- Messages: fetch all messages in a conversation (chat history load)
CREATE INDEX idx_messages_conversation_id
  ON public.messages(conversation_id);

-- Messages: fetch all messages by user (memory extractor needs last N messages)
CREATE INDEX idx_messages_user_id_created_at
  ON public.messages(user_id, created_at DESC);

-- Memories: fetch all memories for a user (runs on every AI call)
CREATE INDEX idx_memories_user_id
  ON public.memories(user_id);

-- Daily usage: rate limiter lookup (runs on every message) — authenticated users
CREATE INDEX idx_daily_usage_user_date
  ON public.daily_usage(user_id, date);

-- Daily usage: rate limiter lookup — anonymous users (partial index, anon rows only)
CREATE UNIQUE INDEX idx_daily_usage_anon_date
  ON public.daily_usage(anon_session_id, date)
  WHERE anon_session_id IS NOT NULL;

-- Safety events: time-based review queries
CREATE INDEX idx_safety_events_created_at
  ON public.safety_events(created_at DESC);
```

**Why these indexes:**
- `idx_messages_user_id_created_at` — the memory extractor fetches the last 5 messages for a user. Compound index with `DESC` order means Postgres can satisfy this with an index scan, no sort.
- `idx_daily_usage_user_date` — rate limiter runs before every single AI call. This lookup must be fast.
- `idx_memories_user_id` — memory fetch runs on every AI call. Unindexed, this becomes a table scan at scale.

---

## 5. Relationships

```
auth.users (Supabase managed)
    │
    └── public.users (1:1)
              │
              ├── public.conversations (1:many)
              │         │
              │         └── public.messages (1:many)
              │
              ├── public.messages (1:many) ← direct FK, denormalised
              │
              ├── public.memories (1:many, max 6 rows — one per category)
              │
              ├── public.daily_usage (1:many — one row per day)
              │
              └── public.safety_events (1:many, nullable)
```

---

## 6. Auth Architecture

### 6.1 Provider
**Supabase Auth** — manages the full auth lifecycle:
- OTP generation and delivery (SMS via Twilio, Email via Supabase)
- Session management (access token + refresh token)
- JWT signing

### 6.2 Auth Flow (step by step)
```
1. User enters phone/email on /auth
2. Frontend calls Supabase JS SDK directly (no backend proxy):
     supabase.auth.signInWithOtp({ phone }) 
     OR
     supabase.auth.signInWithOtp({ email })
3. Supabase sends OTP via SMS or email

4. User enters 6-digit OTP
5. Frontend calls Supabase JS SDK directly:
     supabase.auth.verifyOtp({ phone, token, type: 'sms' })
     OR
     supabase.auth.verifyOtp({ email, token, type: 'email' })

6. Supabase returns:
     { access_token: "<JWT>", refresh_token: "<token>", user: {...} }

7. Supabase JS SDK stores session in localStorage automatically

8. On every FastAPI request, frontend sends:
     Authorization: Bearer <access_token>

9. FastAPI decodes and verifies JWT:
     jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
     → extracts payload["sub"] → this is the user's UUID

10. First authenticated request: get_current_user() checks public.users for a row with that UUID.
    If none exists → inserts one (lazy-create). One extra query on first ever request, never again.
    There are no backend /auth/otp/* endpoints.
```

### 6.3 Token Lifecycle
| Token | Lifetime | Storage | Refresh |
|---|---|---|---|
| Access token (JWT) | 1 hour | `localStorage` via Supabase SDK | Auto-refreshed by Supabase JS SDK using refresh token |
| Refresh token | 30 days | `localStorage` via Supabase SDK | Re-issued on use |

- Supabase JS SDK handles refresh automatically via `onAuthStateChange`
- If refresh fails (e.g. revoked session): frontend catches error → shows toast → redirects to `/auth`
- On logout: `supabase.auth.signOut()` → Supabase revokes refresh token → localStorage cleared

### 6.4 JWT Verification in FastAPI

Two dependencies in `app/dependencies.py`:

```python
# Optional — use on routes that allow anonymous access (e.g. POST /api/v1/message)
async def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
) -> Optional[str]:
    if creds is None:
        return None  # anonymous request — caller handles quota via anon_session_id cookie
    try:
        payload = jwt.decode(
            creds.credentials,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated"
        )
        user_id = payload["sub"]
        # Lazy-create public.users row on first login
        existing = supabase.table("users").select("id").eq("id", user_id).execute()
        if not existing.data:
            supabase.table("users").insert({"id": user_id}).execute()
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Strict — use on routes that require auth (e.g. GET /api/v1/memories, /settings)
async def require_current_user(
    user_id: Optional[str] = Depends(get_current_user),
) -> str:
    if user_id is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user_id
```

**Usage:**
- `user_id: Optional[str] = Depends(get_current_user)` — anonymous allowed
- `user_id: str = Depends(require_current_user)` — 401 if no valid JWT

---

## 7. Row Level Security (RLS)

### 7.1 Approach
- RLS is enabled on all `public.*` tables
- The FastAPI backend connects with the **service role key** — bypasses RLS
- RLS is a **safety net** against any accidental direct browser-to-Supabase queries (should never happen in normal operation)
- No direct browser queries to `public.*` tables are expected or allowed

### 7.2 RLS Policies

```sql
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_events ENABLE ROW LEVEL SECURITY;

-- users: read/update own row only
CREATE POLICY "users_own_row" ON public.users
  FOR ALL USING (auth.uid() = id);

-- conversations: own rows only
CREATE POLICY "conversations_own" ON public.conversations
  FOR ALL USING (auth.uid() = user_id);

-- messages: own rows only
CREATE POLICY "messages_own" ON public.messages
  FOR ALL USING (auth.uid() = user_id);

-- memories: own rows only, allow delete (user can remove from Settings)
CREATE POLICY "memories_own" ON public.memories
  FOR ALL USING (auth.uid() = user_id);

-- daily_usage: read own row only (no direct write from browser ever)
CREATE POLICY "daily_usage_own_read" ON public.daily_usage
  FOR SELECT USING (auth.uid() = user_id);

-- safety_events: NO browser access at all — service role only
-- (No policy created = no access for authenticated/anon roles)
```

### 7.3 What This Protects Against
| Scenario | Outcome |
|---|---|
| Browser accidentally queries `memories` directly | Blocked by RLS — only own rows returned |
| Browser tries to read another user's messages | Blocked — `auth.uid() = user_id` fails |
| Browser tries to write to `daily_usage` | Blocked — no write policy exists |
| Browser tries to read `safety_events` | Blocked — no policy at all |
| FastAPI backend reads/writes anything | Allowed — service role bypasses RLS |

---

## 8. User Roles & Permissions

### 8.1 Application-Level Roles
Only one role exists in MVP: **user**. No admin role, no guest role in the database.

| Role | Who | Access |
|---|---|---|
| `user` | Any authenticated user | Own data only (enforced by FastAPI + RLS) |
| Service role | FastAPI backend only | Full access to all tables (used only server-side) |

### 8.2 `users.tier` Field
The `tier` column is an application-level permission flag, not a database role.

| Tier | Daily message limit | Memory | Voice input |
|---|---|---|---|
| `free` | 20 messages/day (`FREE_TIER_DAILY_LIMIT` in `config.py`) | ✅ Enabled | ✅ Enabled |
| `plus` | Unlimited (post-MVP) | ✅ Enabled | ✅ Enabled |

> Note: In MVP, `tier` is always `'free'`. No code path sets it to `'plus'` yet. The column exists so the post-MVP payments feature requires zero schema changes.

---

## 9. Sensitive Fields & Security Notes

| Field | Table | Sensitivity | Handling |
|---|---|---|---|
| `phone` | `public.users` | Medium | Stored in plaintext in Supabase Auth. Not duplicated in `public.users`. |
| `email` | `public.users` | Low | Same as above. |
| `content` | `public.messages` | Medium | Stored in plaintext. No encryption in MVP. Consider at-rest encryption post-MVP if required. |
| `message` | `public.safety_events` | High | Stored in plaintext. Accessible only via service role. Never exposed to frontend. |
| `web_push_subscription` | `public.users` | Low | Contains endpoint URL and keys for push delivery. Not a secret but treated as private. |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend env var | Critical | Never in frontend code. Never in version control. Railway env var only. |
| `SUPABASE_JWT_SECRET` | Backend env var | Critical | Used to verify JWTs. Never exposed. Railway env var only. |
| `OPENAI_API_KEY` | Backend env var | Critical | Backend only. Never in `VITE_*` vars. |

**No payment data is stored anywhere in the database.** Payments are post-MVP.

---

## 10. Webhooks & Triggers

### 10.1 Supabase Auth Webhook (optional — post-MVP)
Supabase can fire a webhook on new user signup. In MVP, the `public.users` row is created by FastAPI on the first authenticated request instead — no webhook needed.

### 10.2 Database Triggers
One trigger is needed to keep `memories.updated_at` current:

```sql
-- Auto-update updated_at on memories upsert
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER memories_updated_at
  BEFORE UPDATE ON public.memories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

No other triggers needed in MVP — all business logic runs in FastAPI services.

### 10.3 Scheduled Jobs (future)
- Daily `daily_usage` cleanup: delete rows older than 30 days — can be a Supabase scheduled function or a Railway cron
- Not required at MVP scale

---

## 11. API Endpoints (Backend Reference)

All routes prefixed `/api/v1/`. Protected routes require `Authorization: Bearer <jwt>`.

All routes prefixed `/api/v1/` except `/health`. Auth is handled by Supabase JS SDK on the frontend — there are no backend OTP proxy endpoints.

| Method | Route | Auth | DB Tables Touched | Notes |
|---|---|---|---|---|
| `POST` | `/api/v1/message` | Optional | `messages`, `daily_usage`, `memories` (bg) | Anonymous allowed up to `ANON_MSG_LIMIT`. Uses `get_current_user` (optional). |
| `GET` | `/api/v1/messages/{conversation_id}` | Required | `messages` | Paginated. Default page size: 20. Uses `require_current_user`. |
| `GET` | `/api/v1/memories` | Required | `memories` | Returns all facts for user. Uses `require_current_user`. |
| `DELETE` | `/api/v1/memories/{id}` | Required | `memories` | Deletes one fact. Verifies ownership. Uses `require_current_user`. |
| `POST` | `/api/v1/notifications/subscribe` | Required | `users` | Updates `web_push_subscription` + `notif_time`. Uses `require_current_user`. |
| `GET` | `/health` | ❌ | — | Returns `{"status": "ok"}`. Railway health check. Unprefixed. |

---

*Document Owner: Founder / Solo Developer*  
*Next Review: Before Week 1 development starts*  
*Paired Documents: PRD_Hinglish_AI_Companion.md, TRD_Hinglish_AI_Companion.md*
