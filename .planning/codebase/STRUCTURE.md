# File Structure
_Last updated: 2026-05-15_

## Backend

```
backend/
├── .venv/                         # Python 3.11 virtual environment (not committed)
├── requirements.txt               # Python dependencies
├── .env                           # Local env vars (not committed)
└── app/
    ├── __init__.py
    ├── main.py                    # FastAPI app init, CORS middleware, Sentry, router registration
    │                              # Routers mounted at /api/v1 prefix. /health is unprefixed.
    ├── config.py                  # pydantic-settings Settings singleton
    │                              # Reads .env; exposes FREE_TIER_DAILY_LIMIT=20, ANON_MSG_LIMIT=8,
    │                              # SUPABASE_*, OPENAI_*, SENTRY_DSN, ALLOWED_ORIGINS
    ├── db.py                      # Supabase client singleton (service role key — bypasses RLS)
    ├── dependencies.py            # Two FastAPI auth dependencies:
    │                              #   get_current_user() → Optional[str]: None for anon; lazy-creates
    │                              #     public.users row on first valid JWT
    │                              #   require_current_user() → str: wraps above; raises 401 if None
    │
    ├── models/
    │   ├── __init__.py
    │   └── schemas.py             # Pydantic request/response models:
    │                              #   MessageRequest, MessageResponse, ChatMessage,
    │                              #   ConversationHistoryResponse, MemoryFact, MemoriesResponse
    │
    ├── routers/
    │   ├── __init__.py
    │   ├── chat.py                # POST /api/v1/message   — full chat pipeline (anon + auth)
    │   │                          # GET  /api/v1/messages/{conversation_id} — paginated history (auth only)
    │   │                          # Handles SSE streaming, anon cookie generation, crisis response
    │   └── memories.py            # GET    /api/v1/memories          — list all facts (auth only)
    │                              # DELETE /api/v1/memories/{id}     — delete with ownership check (auth only)
    │
    ├── services/
    │   ├── __init__.py
    │   ├── ai.py                  # stream_response() — full AI pipeline:
    │   │                          #   build_system_prompt() → get memories → format as bullets
    │   │                          #   get_recent_messages() → conversation history
    │   │                          #   AsyncOpenAI streaming call (openai/gpt-4o-mini via OpenRouter)
    │   │                          #   Yields token strings as AsyncGenerator
    │   ├── memory.py              # get_memories_for_prompt() — SELECT + bullet-list format
    │   │                          # extract_and_store_memories() — BackgroundTask: GPT extraction → upsert
    │   │                          # summarize_memories() — BackgroundTask: fires at msg 20/40/60
    │   │                          # _parse_facts_json() — validates JSON shapes from model
    │   ├── messages.py            # DB helpers:
    │   │                          #   get_or_create_conversation(), save_user_message(),
    │   │                          #   save_assistant_message(), save_messages(),
    │   │                          #   get_recent_messages(), get_messages_by_conversation(),
    │   │                          #   count_messages()
    │   ├── rate_limiter.py        # check_and_increment(user_id, anon_session_id) → remaining count
    │   │                          #   Authenticated: FREE_TIER_DAILY_LIMIT (20) via user_id + date
    │   │                          #   Anonymous: ANON_MSG_LIMIT (8) via anon_session_id + date
    │   │                          #   Raises HTTP 429 if over limit; upserts daily_usage row
    │   ├── safety.py              # Two-step crisis detection:
    │   │                          #   check_safety(message) → SafetyResult(triggered, trigger_type)
    │   │                          #   Step 1: keyword scan (~60 terms: EN + Hindi romanized + Devanagari)
    │   │                          #   Step 2: GPT-4o Mini semantic classifier (fail-safe: errors → triggered)
    │   │                          #   log_safety_event() — BackgroundTask: INSERT into safety_events
    │   ├── extractor.py           # (empty / legacy — functionality merged into memory.py)
    │   ├── summarizer.py          # (empty / legacy — functionality merged into memory.py)
    │   └── push.py                # NOT BUILT — Web Push via pywebpush (stub)
    │
    └── tests/
        ├── __init__.py
        ├── test_safety.py         # Tests for safety.py keyword and semantic checks
        ├── test_rate_limiter.py   # Tests for rate_limiter.py
        ├── test_memory.py         # Tests for memory.py extraction/parsing
        └── test_memories.py       # Tests for memories router (GET/DELETE)
```

## Frontend

```
web/
├── AGENTS.md / CLAUDE.md          # Warning: Next.js 16 breaking changes — read node_modules/next/dist/docs/
├── next.config.ts                 # Next.js config
├── package.json                   # Dependencies: next, react, @supabase/supabase-js,
│                                  #   @tanstack/react-query, tailwindcss
├── tsconfig.json                  # TypeScript config
├── .env.local                     # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
│                                  # NEXT_PUBLIC_API_URL (e.g. https://api.example.com/api/v1)
│
├── app/                           # Next.js App Router
│   ├── layout.tsx                 # Root layout: wraps with <Providers>, sets viewport/fonts
│   ├── providers.tsx              # Client component: QueryClientProvider + AuthProvider + ToastProvider
│   ├── page.tsx                   # Root "/" — auth gate: redirects to /auth, /onboarding, or /chat
│   ├── auth/
│   │   └── page.tsx               # Auth page: phone OTP + email magic link (tabs)
│   │                              # Calls supabase.auth.signInWithOtp() / verifyOtp() directly
│   │                              # Redirects to /onboarding or /chat after success
│   ├── onboarding/
│   │   └── page.tsx               # 3-step wizard:
│   │                              #   Step 0: language selection (Hinglish / Hindi / English)
│   │                              #   Step 1: meet Arjun persona introduction
│   │                              #   Step 2: intake form (name, city, situation)
│   │                              # Saves to localStorage: arjun_lang_pref, arjun_intake, arjun_onboarding_done
│   ├── chat/
│   │   └── page.tsx               # Main chat UI:
│   │                              #   Auth guard (redirects on session loss)
│   │                              #   First-load: sends intake from localStorage as intro message
│   │                              #   sendMessageStream() → SSE token-by-token rendering
│   │                              #   Handles RateLimitError (inline message), network failure (restore input),
│   │                              #   mid-stream disconnect (keeps partial content)
│   │                              #   Links to /settings
│   └── settings/
│       └── page.tsx               # Settings page:
│                                  #   Memories section: lists all facts, optimistic delete via TanStack Query
│                                  #   Notifications section: toggle UI (not wired to backend yet)
│                                  #   Account section: displays email/phone, sign out button
│
├── context/
│   ├── AuthContext.tsx            # AuthProvider: wraps supabase.auth.getSession() + onAuthStateChange()
│   │                              # Exposes: session, user, isLoading, signOut()
│   └── ToastContext.tsx           # ToastProvider: showToast(message, type) — fixed overlay, 3.2s auto-dismiss
│                                  # Types: "error" | "success" | "info"
│
├── lib/
│   ├── supabase.ts                # createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
│   ├── api.ts                     # REST helpers (non-SSE):
│   │                              #   fetchMemories(token) → GET /memories
│   │                              #   deleteMemory(id, token) → DELETE /memories/{id}
│   │                              #   sendMessage() → legacy non-streaming POST /message
│   └── chat.ts                    # SSE streaming helpers:
│                                  #   sendMessageStream(content, token?, conversationId?) → AsyncGenerator<SSEEvent>
│                                  #   SSEEvent types: SSETokenEvent | SSEDoneEvent | SSEErrorEvent
│                                  #   RateLimitError class (thrown on HTTP 429)
│                                  #   fetchMessages(conversationId, token, page) → paginated history
│
├── hooks/
│   ├── useMessages.ts             # TanStack Query hook: fetchMessages() wrapper with pagination
│   └── useVoiceInput.ts           # Web Speech API hook:
│                                  #   isSupported, isRecording, transcript, startRecording, stopRecording
│                                  #   Primary lang: hi-IN, fallback: en-IN
│
└── components/
    └── chat/
        ├── ChatBubble.tsx         # Renders a single message bubble:
        │                          #   User bubble: right-aligned, primary color
        │                          #   Assistant bubble: left-aligned, elevated bg
        │                          #   Crisis bubble: left-aligned, orange left border, role="alert"
        │                          #   Streaming: typing dots (empty content) or cursor blink
        ├── ChatInput.tsx          # Text input + send button + VoiceButton
        │                          #   Handles isLimited (shows upgrade prompt), restoreText (failed send)
        ├── MessageList.tsx        # Scrollable list of ChatBubble components; auto-scrolls to bottom
        └── VoiceButton.tsx        # Mic button wired to useVoiceInput(); appends transcript to input
```

## Supabase

```
supabase/
└── migrations/
    ├── 001_initial.sql            # Initial schema (superseded by 002)
    └── 002_schema_rebuild.sql     # Full schema rebuild (current):
                                   #   Drops all tables, recreates with correct structure
                                   #   Tables: users, conversations, messages, memories,
                                   #           daily_usage, safety_events
                                   #   Key constraints:
                                   #     users.id FK → auth.users(id) ON DELETE CASCADE
                                   #     messages.conversation_id FK → conversations(id)
                                   #     memories UNIQUE(user_id, category)
                                   #     daily_usage UNIQUE(user_id, date)
                                   #     daily_usage partial unique index on (anon_session_id, date)
                                   #     safety_events: no DELETE RLS policy (append-only)
                                   #   RLS enabled on all tables; service role bypasses all
                                   #   Trigger: memories_updated_at (auto-updates updated_at)
```

## What exists vs what's planned

| Feature | Status | Notes |
|---|---|---|
| POST /api/v1/message (SSE streaming chat) | Built | Includes safety, rate limit, auth, anon |
| GET /api/v1/messages/{conversation_id} | Built | Paginated, auth-only |
| GET /api/v1/memories | Built | Auth-only |
| DELETE /api/v1/memories/{id} | Built | Ownership check, auth-only |
| CORS middleware (allow_credentials=True) | Built | Configured in main.py |
| Safety check (keyword + semantic) | Built | Two-step, fail-safe, blocks before AI |
| Safety event logging | Built | Background task to safety_events table |
| Rate limiter (auth + anon) | Built | daily_usage table, HTTP 429 on breach |
| Anonymous session cookie | Built | HttpOnly, generated on first anon request |
| JWT verification (dual-path) | Built | HS256 local + Supabase network fallback |
| Lazy user row creation | Built | SELECT then INSERT on first valid JWT |
| Memory extractor (background) | Built | Fires after every authenticated message |
| Memory summarizer (background) | Built | Fires at message 20/40/60 |
| Conversation management | Built | get_or_create_conversation() |
| Auth page (phone OTP + email magic link) | Built | Supabase JS SDK direct, no backend proxy |
| AuthContext (session management) | Built | getSession + onAuthStateChange |
| Onboarding wizard (3 steps) | Built | localStorage-backed, language + intake |
| Chat page (SSE UI) | Built | Token streaming, crisis UI, rate limit UX |
| Settings page (memories + sign out) | Built | TanStack Query, optimistic delete |
| Voice input (Web Speech API) | Built | hi-IN primary, en-IN fallback |
| ToastContext (toast notifications) | Built | 3.2s auto-dismiss, error/success/info |
| Database schema (migration 002) | Built | Needs to be applied to Supabase project |
| Web Push notifications backend | Not built | push.py is a stub |
| Notifications toggle (Settings UI) | Partially built | Toggle UI exists, not wired to backend |
| Push subscription backend route | Not built | POST /notifications/subscribe planned |
| Settings page voice/theme preferences | Not built | UI not yet designed |
| Admin/moderation tooling | Not built | No planned scope yet |
