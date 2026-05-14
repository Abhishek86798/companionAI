# Technical Requirements Document
## Hinglish AI Companion — Web App MVP
**Version:** 1.1  
**Status:** Active  
**Scope:** MVP (Web only) — Flutter Android is post-MVP and shares this backend unchanged  
**Paired Document:** PRD_Hinglish_AI_Companion.md

---

## 1. Stack Decisions at a Glance

| Layer | Decision |
|---|---|
| Frontend | Next.js 16 + TypeScript (built); TRD originally specified React 18 + Vite |
| Styling | Tailwind CSS |
| Backend | Python 3.11 + FastAPI |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth (Phone OTP + Email OTP) |
| Frontend Hosting | Vercel |
| Backend Hosting | Railway |
| AI | OpenAI GPT-4o Mini |
| Payments | Razorpay (JS SDK on frontend, Python SDK on backend) — **post-MVP, not built in MVP** |
| Voice Input | Web Speech API (browser-native) |
| Push Notifications | Web Push API + Service Worker |
| Error Tracking | Sentry (both frontend and backend) |
| Background Tasks | FastAPI `BackgroundTasks` |

---

## 2. Frontend

### 2.1 Framework & Language
- **Next.js 16** with **TypeScript** — App Router, strict mode enabled
- *(Originally planned as React 18 + Vite; Next.js chosen for faster scaffold and Vercel-native deployment)*
- Target: modern browsers only (Chrome 90+, Firefox 88+, Safari 14+)
- Mobile-first responsive design — primary use case is mobile browser on Android

### 2.2 Styling
- **Tailwind CSS v3** — utility-first, no component library for MVP
- Custom design tokens defined in `tailwind.config.ts`:
  - Brand color: warm saffron (`#FF6B35`) + deep navy (`#1A1A2E`)
  - Font: `Inter` (body) + `Noto Sans Devanagari` (Hindi text rendering)
- No CSS modules, no styled-components — Tailwind only
- Dark mode: not in MVP scope

### 2.3 State Management
- **React Context + useReducer** for global state (auth, user tier, chat)
- No Redux — overkill for MVP
- **TanStack Query (React Query v5)** for all server state (messages, memories)
  - Handles caching, refetching, loading/error states
  - Used for: `GET /messages`, `GET /memories`

### 2.4 Routing
- **Next.js App Router** (file-system based routing)
- Routes:
  ```
  /                   → redirect to /chat if authed, else /onboarding
  /onboarding         → onboarding flow (language → persona → intake)
  /chat               → main chat screen (protected)
  /settings           → user settings (protected)
  /auth               → OTP login/verify
  ```
- `/upgrade` route deferred — no payments in MVP
- Protected routes: redirect to `/auth` if no valid JWT

### 2.5 Key Libraries

| Library | Version | Purpose |
|---|---|---|
| `@supabase/supabase-js` | ^2.x | Auth, JWT management |
| `@tanstack/react-query` | ^5.x | Server state / data fetching |
| `react-router-dom` | ^6.x | Client-side routing |
| `axios` | ^1.x | HTTP client for FastAPI calls |
| `zod` | ^3.x | Runtime validation of API responses |
| `react-hot-toast` | ^2.x | Toast notifications (errors, confirmations) |
| `lucide-react` | ^0.x | Icons (send, mic, settings, etc.) |
| `date-fns` | ^3.x | Message timestamp formatting |
| `@sentry/react` | ^7.x | Frontend error tracking |

### 2.6 Voice Input
- Uses **Web Speech API** (`window.SpeechRecognition`) — zero cost, no API key
- Language: `hi-IN` primary, `en-IN` fallback
- Graceful degradation: if browser doesn't support it (Firefox, Safari), hide mic button and show tooltip: "Voice input works best on Chrome"
- Transcript shown in input box before sending — user can edit

### 2.7 Push Notifications
- **Web Push API** with a **service worker** (`/public/sw.js`)
- VAPID keys generated once, stored as env vars on both frontend and backend
- Permission prompt shown after user's 3rd session — never on first load
- Service worker also enables basic offline shell (cached chat UI) — not full offline mode

### 2.8 Frontend Folder Structure
```
src/
├── api/                  # All axios API call functions (one file per domain)
│   ├── chat.ts           # sendMessage, getMessages
│   ├── memories.ts       # getMemories, deleteMemory
│   └── payments.ts       # createOrder, verifyPayment — post-MVP, stub only
├── components/
│   ├── chat/
│   │   ├── ChatBubble.tsx
│   │   ├── ChatInput.tsx
│   │   ├── MessageList.tsx
│   │   └── VoiceButton.tsx
│   ├── onboarding/
│   │   ├── LanguageSelect.tsx
│   │   ├── PersonaPick.tsx
│   │   └── IntakeForm.tsx
│   └── ui/               # Generic reusable components
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Modal.tsx
│       └── Toast.tsx
├── context/
│   ├── AuthContext.tsx    # Supabase session, user object
│   └── ChatContext.tsx    # Active conversation state
├── hooks/
│   ├── useMessages.ts     # React Query wrapper for messages
│   ├── useMemories.ts     # React Query wrapper for memories
│   ├── useVoiceInput.ts   # Web Speech API hook
│   └── usePushNotif.ts    # Web Push subscription hook
├── pages/
│   ├── OnboardingPage.tsx
│   ├── ChatPage.tsx
│   ├── AuthPage.tsx
│   ├── SettingsPage.tsx
│   └── UpgradePage.tsx
├── types/
│   └── index.ts           # Shared TypeScript types (Message, Memory, User)
├── utils/
│   ├── supabase.ts        # Supabase client singleton
│   └── constants.ts       # App-wide constants (API_URL, tier limits)
├── App.tsx
├── main.tsx
└── vite.config.ts
```

### 2.9 Naming Conventions (Frontend)
- Components: `PascalCase` (`ChatBubble.tsx`)
- Hooks: `camelCase` prefixed with `use` (`useMessages.ts`)
- API functions: `camelCase` verb-noun (`sendMessage`, `getMemories`)
- Types/interfaces: `PascalCase`, no `I` prefix (`type Message = {...}`)
- Constants: `SCREAMING_SNAKE_CASE` (`MAX_FREE_MESSAGES = 20`)
- CSS: Tailwind utility classes only — no custom class names unless unavoidable

---

## 3. Backend

### 3.1 Framework & Language
- **Python 3.11**
- **FastAPI** — async throughout; no sync route handlers
- **Uvicorn** as the ASGI server
- **Pydantic v2** for all request/response models and validation

### 3.2 Project Structure
```
app/
├── main.py                  # FastAPI app init, CORS, router registration
├── config.py                # Settings via pydantic-settings (reads .env)
├── dependencies.py          # Shared FastAPI dependencies (get_current_user, db session)
│
├── routers/
│   ├── chat.py              # POST /api/v1/message, GET /api/v1/messages/{conversation_id}
│   ├── memories.py          # GET /api/v1/memories, DELETE /api/v1/memories/{id}
│   ├── payments.py          # POST /api/v1/payments/order — post-MVP
│   ├── transcribe.py        # POST /api/v1/transcribe — future Bhashini; passthrough for MVP
│   └── notifications.py     # POST /api/v1/notifications/subscribe
│
├── services/
│   ├── ai.py                # OpenAI API call, prompt assembly
│   ├── memory.py            # Prompt injector — get_memory_facts() formats facts for system prompt
│   ├── extractor.py         # BackgroundTask — extract facts from messages, upsert to memories
│   ├── summarizer.py        # BackgroundTask — compress history at msg 20/40/60
│   ├── messages.py          # save_messages(), get_recent_messages(), count_messages()
│   ├── safety.py            # Keyword check + semantic classification
│   ├── rate_limiter.py      # Daily message counter — handles user_id and anon_session_id
│   └── push.py              # Web Push notification sender (pywebpush)
│
├── models/
│   └── schemas.py           # All Pydantic request/response models
│
├── db/
│   └── supabase.py          # Supabase Python client singleton
│
└── tests/
    ├── test_safety.py        # Critical — 50+ crisis message test cases
    ├── test_memory.py
    └── test_chat.py
```

### 3.3 API Design

All routes are prefixed `/api/v1/`. All responses are JSON. All protected routes require `Authorization: Bearer <jwt>` header.

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/message` | ✅ | Send message; returns AI response |
| GET | `/api/v1/messages/{conversation_id}` | ✅ | Fetch paginated message history |
| GET | `/api/v1/memories` | ✅ | Fetch user's stored memory facts |
| DELETE | `/api/v1/memories/{id}` | ✅ | Delete a specific memory fact |
| POST | `/api/v1/payments/order` | ✅ | **Post-MVP** — Create Razorpay order |
| POST | `/api/v1/webhook/razorpay` | ❌ (HMAC) | **Post-MVP** — Payment webhook → upgrade tier |
| POST | `/api/v1/notifications/subscribe` | ✅ | Store Web Push subscription |
| POST | `/api/v1/transcribe` | ✅ | Audio → text (post-MVP Bhashini; not in Week 10 since Web Speech API is client-side) |

> **Auth endpoints removed:** OTP send/verify is handled by the Supabase JS SDK directly on the frontend. There are no backend auth proxy endpoints. On first authenticated request, `get_current_user()` lazy-creates the `public.users` row. See Section 5.

### 3.4 Request / Response Schemas (Pydantic)

```python
# POST /api/v1/message
class MessageRequest(BaseModel):
    content: str                  # user's message text
    conversation_id: UUID | None  # None = start new conversation

class MessageResponse(BaseModel):
    message_id: UUID
    conversation_id: UUID
    content: str                  # Arjun's response
    safety_triggered: bool        # true if crisis path was taken
    remaining_free_messages: int | None  # None for Plus users
```

```python
# GET /api/v1/memories
class MemoryFact(BaseModel):
    id: UUID
    fact: str
    category: str
    updated_at: datetime

class MemoriesResponse(BaseModel):
    memories: list[MemoryFact]
```

### 3.5 Core Service Logic

#### `services/safety.py` — runs first on every message
```
1. Keyword scan (O(1) — set lookup against ~50 Hinglish crisis terms)
2. If keyword hit → skip to crisis response immediately (don't call OpenAI)
3. If no keyword hit → call GPT-4o Mini with a binary classification prompt:
   "Does this message express suicidal ideation or intent to self-harm? Reply only: yes or no."
   Max tokens: 5. Cost: negligible.
4. If semantic hit → crisis response
5. If clean → return None (proceed to main AI call)
```

#### `services/memory.py` — runs as background task after every message
```
1. Fetch last 5 messages for the user
2. Call GPT-4o Mini with extraction prompt → returns JSON array of {fact, category}
3. For each extracted fact:
   - If category already exists in memories table → UPDATE fact, updated_at
   - If new category → INSERT
4. If conversation message count > 20:
   - Run summarizer: compress full history into 3–5 bullet facts
   - Replace all existing memories with summarized set
```

#### `services/ai.py` — the main AI call
```
1. Fetch all memories for user → format as bullet list
2. Inject into system prompt at {memory_facts_injected_here}
3. Fetch last 10 messages → build conversation history array
4. Call OpenAI chat completions (GPT-4o Mini)
5. Return response text
```

#### `services/rate_limiter.py`
```
# Authenticated users (user_id from JWT)
1. SELECT msg_count FROM daily_usage WHERE user_id = ? AND date = today
2. If count >= settings.FREE_TIER_DAILY_LIMIT AND user.tier == 'free' → raise HTTP 429
   "Yaar, aaj ke 20 free messages ho gaye. Kal phir baat karte hain! 🙌"
   (No paywall nudge in MVP — payments are post-MVP)
3. If Plus user → skip check entirely (post-MVP)
4. After successful AI response → UPSERT daily_usage, increment msg_count
   (always server-side; client never touches this)

# Anonymous users (anon_session_id from HttpOnly cookie, set by backend on first request)
1. SELECT msg_count FROM daily_usage WHERE anon_session_id = ? AND date = today
2. If count >= settings.ANON_MSG_LIMIT → raise HTTP 429 (reason: "anon_limit")
   Frontend shows inline auth wall (not a redirect)
3. After successful AI response → UPSERT daily_usage for anon_session_id
```

> **Limits defined in `app/config.py` — never hardcoded elsewhere:**
> - `FREE_TIER_DAILY_LIMIT = 20` — authenticated free users, resets midnight IST
> - `ANON_MSG_LIMIT = 8` — anonymous session lifetime cap (not per-day)

### 3.6 CORS Configuration
```python
allow_origins = [
    "https://yourdomain.vercel.app",   # production
    "http://localhost:3000",            # Next.js dev server
]
allow_credentials = True  # required for anon_session_id cookie
allow_methods = ["GET", "POST", "DELETE"]
allow_headers = ["Authorization", "Content-Type"]
```

> Frontend must set `credentials: 'include'` (fetch) or `withCredentials: true` (axios) on all requests so the `anon_session_id` cookie is sent.

### 3.7 Naming Conventions (Backend)
- Files: `snake_case` (`rate_limiter.py`)
- Functions: `snake_case` (`get_current_user`, `extract_memories`)
- Pydantic models: `PascalCase` (`MessageRequest`, `MemoryFact`)
- Route handlers: `async def` always — never sync
- Constants: `SCREAMING_SNAKE_CASE` in `config.py`
- DB table names: `snake_case` plural (`users`, `messages`, `memories`, `daily_usage`)

---

## 4. Database

### 4.1 Provider
- **PostgreSQL via Supabase** (free tier for MVP — 500MB storage, 2 projects)
- Accessed from backend via **`supabase-py`** (Python client)
- Accessed from frontend via **`@supabase/supabase-js`** for auth only — all data queries go through FastAPI, not directly to Supabase from the browser

### 4.2 Full Schema

```sql
-- Users (Supabase Auth manages the auth.users table; this extends it)
CREATE TABLE public.users (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id),
  phone                 TEXT UNIQUE,
  email                 TEXT UNIQUE,
  tier                  TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'plus')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  web_push_subscription JSONB,
  notif_time            TIME DEFAULT '21:00:00',
  notif_enabled         BOOLEAN DEFAULT true
);

-- Conversations
CREATE TABLE public.conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  title       TEXT  -- auto-generated summary, optional
);

-- Messages
CREATE TABLE public.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  safety_flagged  BOOLEAN NOT NULL DEFAULT false
);

-- Memory facts
CREATE TABLE public.memories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  fact        TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('name','city','job','relationship','situation','other')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, category)  -- one fact per category per user; upsert on conflict
);

-- Daily usage counter
CREATE TABLE public.daily_usage (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  msg_count   INT NOT NULL DEFAULT 0,
  UNIQUE(user_id, date)  -- one row per user per day
);

-- Safety event log (never delete rows from this table)
CREATE TABLE public.safety_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES public.users(id),  -- nullable (pre-auth users)
  message       TEXT NOT NULL,
  trigger_type  TEXT NOT NULL CHECK (trigger_type IN ('keyword', 'semantic')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.3 Indexes
```sql
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_user_id ON public.messages(user_id);
CREATE INDEX idx_memories_user_id ON public.memories(user_id);
CREATE INDEX idx_daily_usage_user_date ON public.daily_usage(user_id, date);
CREATE INDEX idx_safety_events_created_at ON public.safety_events(created_at);
```

### 4.4 Row Level Security (RLS)
Supabase RLS is enabled on all tables. The FastAPI backend uses the **service role key** (bypasses RLS), so RLS mainly protects against any direct browser-to-Supabase queries.

```sql
-- Example: users can only read their own data (safety net)
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own memories" ON public.memories
  FOR ALL USING (auth.uid() = user_id);
```

---

## 5. Authentication

### 5.1 Provider
- **Supabase Auth** — handles OTP generation, SMS (via Twilio), session management

### 5.2 Flow
```
1. User enters phone number → frontend calls supabase.auth.signInWithOtp({ phone })
2. Supabase sends SMS OTP
3. User enters OTP → frontend calls supabase.auth.verifyOtp({ phone, token, type: 'sms' })
4. Supabase returns session { access_token (JWT), refresh_token }
5. Frontend stores session via Supabase JS SDK (localStorage)
6. All FastAPI requests include: Authorization: Bearer <access_token>
7. FastAPI middleware verifies JWT using Supabase JWT secret (env var)
8. On first authenticated request: get_current_user() checks public.users — if no row exists,
   inserts one with the UUID from the JWT payload. One extra query on first request, never again.
```

> There are no backend OTP proxy endpoints. Auth is handled entirely by the Supabase JS SDK on the frontend.

### 5.3 Email OTP (fallback)
- Same flow but with `supabase.auth.signInWithOtp({ email })`
- For users who don't want to share phone number
- Auth page shows both options with a tab toggle

### 5.4 JWT Verification (FastAPI)

Two dependencies in `app/dependencies.py`:

```python
# Optional — used by /api/v1/message (anonymous allowed up to ANON_MSG_LIMIT)
async def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
) -> Optional[str]:
    if creds is None:
        return None  # anonymous request
    payload = jwt.decode(creds.credentials, settings.supabase_jwt_secret,
                         algorithms=["HS256"], audience="authenticated")
    user_id = payload["sub"]
    # Lazy-create public.users row on first login
    existing = supabase.table("users").select("id").eq("id", user_id).execute()
    if not existing.data:
        supabase.table("users").insert({"id": user_id}).execute()
    return user_id

# Strict — used by /api/v1/memories, /api/v1/notifications, /api/v1/settings (401 if no JWT)
async def require_current_user(
    user_id: Optional[str] = Depends(get_current_user),
) -> str:
    if user_id is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user_id
```

Route handlers declare which they need:
- `user_id: Optional[str] = Depends(get_current_user)` — allows anonymous
- `user_id: str = Depends(require_current_user)` — 401 if no JWT

### 5.5 Session Handling (Frontend)
- Supabase JS SDK handles token refresh automatically
- `AuthContext` listens to `supabase.auth.onAuthStateChange` and updates global state
- On logout: `supabase.auth.signOut()` + clear React state + redirect to `/auth`

---

## 6. Hosting & Deployment

### 6.1 Frontend — Vercel
- Auto-deploy from `main` branch on GitHub push
- Preview deployments on every PR
- Environment variables set in Vercel dashboard (not committed to repo)
- Build command: `npm run build`
- Output directory: `dist` (Vite default)

### 6.2 Backend — Railway
- Deploys from GitHub repo (separate repo or monorepo `/backend` subfolder)
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- `Procfile`:
  ```
  web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
  ```
- Railway auto-injects `$PORT`
- Health check endpoint: `GET /health` → `{"status": "ok"}`

### 6.3 Branching Strategy
```
main        → production (auto-deploy)
dev         → staging / preview
feature/*   → feature branches (PR into dev)
```

### 6.4 Monorepo vs Separate Repos
- **Monorepo** (recommended for solo dev):
  ```
  /
  ├── frontend/    (React + Vite)
  ├── backend/     (FastAPI)
  └── README.md
  ```
- Vercel configured to deploy from `/frontend`
- Railway configured to deploy from `/backend`

---

## 7. Third-Party APIs & Services

| Service | Purpose | SDK | Tier | Key Env Var |
|---|---|---|---|---|
| OpenAI | GPT-4o Mini for chat, memory extraction, safety classification | `openai` (Python) | Pay-as-you-go | `OPENAI_API_KEY` |
| Supabase | PostgreSQL database + Auth | `supabase-py`, `@supabase/supabase-js` | Free (MVP) | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Razorpay | Payments (UPI + cards) — **post-MVP** | `razorpay` (Python), Razorpay JS | Free account + 2% per transaction | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` |
| Sentry | Error tracking (frontend + backend) | `@sentry/react`, `sentry-sdk` (Python) | Free (5K errors/month) | `SENTRY_DSN_FRONTEND`, `SENTRY_DSN_BACKEND` |
| Web Push (VAPID) | Browser push notifications | `pywebpush` (Python) | Free (self-hosted) | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` |
| Twilio (via Supabase) | SMS OTP delivery | Managed by Supabase | Supabase free tier includes limited SMS | Managed in Supabase dashboard |

**Post-MVP only (do not integrate in MVP):**
- Bhashini STT — Hindi voice transcription for Flutter app
- FCM — Android push notifications for Flutter app

---

## 8. Environment Variables

### 8.1 Backend `.env`
```bash
# OpenAI
OPENAI_API_KEY=

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=   # backend only — never expose to frontend
SUPABASE_JWT_SECRET=          # for JWT verification in FastAPI

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=      # for HMAC signature verification on webhook

# Web Push (VAPID)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=mailto:you@yourdomain.com

# App
ENVIRONMENT=production        # 'development' | 'production'
ALLOWED_ORIGINS=https://yourdomain.vercel.app,http://localhost:5173

# Sentry
SENTRY_DSN_BACKEND=
```

### 8.2 Frontend `.env.local` (Next.js — prefix all with `NEXT_PUBLIC_`)
```bash
# Supabase (public keys — safe to expose)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=       # anon key only — never the service role key

# Backend — includes /api/v1 prefix; baked in once here, never repeated in API call code
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api/v1

# Razorpay (public key only) — post-MVP
NEXT_PUBLIC_RAZORPAY_KEY_ID=

# Web Push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=

# Sentry
NEXT_PUBLIC_SENTRY_DSN=

# App
NEXT_PUBLIC_ENV=production
```

> ⚠️ **Never commit `.env.local` files.** Add to `.gitignore`. Set all vars in Vercel and Railway dashboards.

---

## 9. Hard Technical Constraints

### 9.1 Must-Haves
- **Rate limiting is server-side only.** The client never makes decisions about whether a user can send a message. The server checks, the server increments, the server blocks.
- **Safety check runs before every AI call, on every message, with no exceptions.** No feature flag, no dev bypass in production, no "skip if user is trusted."
- **Safety event logs are never deleted.** The `safety_events` table has no DELETE policy.
- **Service role key never sent to frontend.** Only the `anon` key is in `VITE_*` env vars.
- **All API communication over HTTPS** — HTTP is rejected in production.
- **Razorpay webhook verified via HMAC signature** — reject any webhook request that fails signature check.

### 9.2 Mobile Browser Compatibility
- Primary test device: Android Chrome (latest)
- Chat UI must be fully usable on 360px wide screens
- Input box must not be hidden behind the Android soft keyboard (use `dvh` units, not `vh`)
- Voice input (Web Speech API): Chrome only — hide mic button on unsupported browsers, do not throw errors

### 9.3 Performance Targets
- Chat response: first token streamed within 1.5s of sending (use SSE streaming from FastAPI)
- Page load (initial): < 2s on 4G (Vite bundle split by route)
- Memory extraction: must not block the AI response — always `BackgroundTasks`

### 9.4 Streaming (SSE) — Post-MVP
- **Not implemented in MVP** — `POST /api/v1/message` returns a single JSON blob
- Post-MVP: migrate to Server-Sent Events for progressive token rendering (like ChatGPT)
- When implemented: FastAPI returns `text/event-stream`; frontend reads stream with `EventSource`

### 9.5 What We Are NOT Building in MVP
- No Redis — counters and sessions handled in Postgres
- No Celery / task queue — FastAPI `BackgroundTasks` is sufficient for memory extraction at MVP scale
- No custom email system — Razorpay sends receipts, Supabase sends OTPs
- No admin dashboard — monitor via Supabase Studio + Railway logs + Sentry
- No WebSockets — SSE is simpler and sufficient for one-way streaming
- No Docker for local dev — direct `uvicorn` + `npm run dev` is faster for solo dev

---

## 10. Local Development Setup

### 10.1 Prerequisites
- Node.js 20+
- Python 3.11+
- Supabase CLI (for local DB if needed)

### 10.2 Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # fill in values
uvicorn app.main:app --reload --port 8000
```

### 10.3 Frontend
```bash
cd frontend
npm install
cp .env.example .env.local    # fill in values
npm run dev                   # starts on http://localhost:5173
```

### 10.4 Key `requirements.txt` Packages
```
fastapi==0.111.0
uvicorn[standard]==0.29.0
pydantic==2.7.0
pydantic-settings==2.2.1
supabase==2.4.0
openai==1.25.0
razorpay==1.4.1
pywebpush==2.0.0
sentry-sdk[fastapi]==1.45.0
PyJWT==2.8.0
httpx==0.27.0
python-multipart==0.0.9
```

---

## 11. Post-MVP: Flutter Android (Month 4)

The FastAPI backend requires **zero changes** for Flutter. The Flutter app is just another client making the same HTTP requests.

Flutter-specific additions (handled entirely on the Flutter side or via new env vars):
- Supabase Flutter SDK (`supabase_flutter`) for auth
- FCM token stored in a new `fcm_token` column on `users` table
- Bhashini STT REST API replaces Web Speech API for Hindi voice
- Razorpay Flutter SDK for in-app payments

No backend refactor needed. The only backend addition is a new `POST /api/v1/notifications/send-fcm` endpoint when FCM is integrated.

---

*Document Owner: Founder / Solo Developer*  
*Next Review: Before Week 1 development starts*  
*Paired Document: PRD_Hinglish_AI_Companion.md*
