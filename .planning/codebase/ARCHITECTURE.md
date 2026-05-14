# Architecture
_Last updated: 2026-05-15_

## Request flow (happy path)

```
Browser
  │
  ├─ [Auth] supabase.auth.signInWithOtp() / verifyOtp()  ← Supabase JS SDK direct call
  │          → AuthContext stores Session (JWT) in React state
  │
  └─ POST /api/v1/message  (Authorization: Bearer <jwt>  OR  anonymous with anon_session_id cookie)
       │
       ├─ 1. CORS middleware  (allow_credentials=True; frontend sends credentials:'include')
       │
       ├─ 2. get_current_user()
       │       ├─ No Bearer header → returns None (anonymous)
       │       ├─ Bearer present → decode JWT with HS256 + SUPABASE_JWT_SECRET
       │       │     Fallback: supabase.auth.get_user() (network call) if secret missing / RS256
       │       └─ Lazy-create public.users row on first valid JWT (SELECT then INSERT if missing)
       │
       ├─ 3. Safety check  [check_safety(body.content)]  ← MUST run before anything else
       │       ├─ Step 1: keyword scan against ~60 crisis terms (English + Hindi romanized + Devanagari)
       │       └─ Step 2: semantic classification via GPT-4o Mini (only if keyword scan misses)
       │              Fail-safe: any OpenAI error → treat as triggered=True
       │       If triggered:
       │         → BackgroundTask: log_safety_event() → INSERT into safety_events
       │         → StreamingResponse: crisis helpline message (SSE) + "done" event
       │         → STOP — no AI call, no rate limit increment
       │
       ├─ 4. Resolve anon session cookie
       │       Anonymous: read anon_session_id from cookie; generate UUID if absent (set in response header)
       │
       ├─ 5. Rate limit check  [check_and_increment(user_id, anon_session_id)]
       │       Authenticated: limit = FREE_TIER_DAILY_LIMIT (20), keyed by user_id + date
       │       Anonymous:     limit = ANON_MSG_LIMIT (8), keyed by anon_session_id + date
       │       → Upsert daily_usage row; raises HTTP 429 if over limit
       │       → Returns remaining_messages_today (int)
       │
       ├─ 6. [Authenticated only] Persist user message before streaming
       │       get_or_create_conversation(user_id, conversation_id?)
       │       get_recent_messages(user_id, limit=10)  ← conversation history for AI context
       │       save_user_message(user_id, conv_id, content)
       │
       ├─ 7. Stream AI response  [stream_response(user_id, conv_id, content)]
       │       a. build_system_prompt(user_id):
       │            get_memories_for_prompt(user_id) → SELECT from memories → bullet list
       │            Inject into _SYSTEM_TEMPLATE ("Arjun" persona, Hinglish, rules)
       │       b. get_recent_messages(user_id)  ← last 10 msgs as [{role, content}]
       │       c. AsyncOpenAI.chat.completions.create(stream=True)
       │            model: openai/gpt-4o-mini  via  openrouter.ai/api/v1
       │            max_tokens: 300, temperature: 0.8
       │       d. Yield each token as SSE: {"type": "token", "content": "<token>"}
       │
       ├─ 8. [Authenticated only] After stream completes, save assistant message
       │       save_assistant_message(user_id, conv_id, ai_content)
       │
       ├─ 9. SSE "done" event sent to client:
       │       {"type":"done", "message_id":"...", "conversation_id":"...",
       │        "safety_triggered": false, "remaining_messages_today": N}
       │
       └─ 10. Background tasks (fire-and-forget, never crash main flow)
               ├─ extract_and_store_memories(user_id, recent_5_msgs)
               │     GPT-4o Mini → JSON [{category, fact}] → upsert memories (UNIQUE user_id,category)
               └─ summarize_memories(user_id)
                     Fires only when msg_count >= 20 AND (count - 20) % 20 == 0
                     GPT-4o Mini on last 20 msgs → upsert key facts to memories
```

## Key design decisions

- **Safety-first ordering**: `check_safety()` is the very first step in the route handler, hardcoded with no bypass, no feature flag, no dev shortcut. If OpenAI is down during semantic check, the message is blocked (fail-safe).
- **Anonymous users are stateless**: Messages are not persisted, memories not injected, history not fetched. Only safety check and rate limiting apply.
- **Service role key is backend-only**: The Supabase client in `db.py` uses the service role key, bypassing RLS. Ownership is enforced in application code; RLS exists for defense-in-depth for any direct client access.
- **SSE streaming**: The `/message` endpoint returns `StreamingResponse` (text/event-stream). The frontend reads the stream token-by-token and appends to the chat bubble in real time.
- **One memory fact per category**: `memories` has a `UNIQUE(user_id, category)` constraint. Extractor and summarizer use `upsert(on_conflict="user_id,category")` — latest fact for a category replaces the old one.
- **JWT verification is dual-path**: First tries HS256 local verification (fast, no network). Falls back to `supabase.auth.get_user()` network call if secret is missing or algorithm is RS256.
- **`anon_session_id` cookie**: Set as HttpOnly, SameSite=lax, Max-Age=86400 (24h). Backend generates the UUID; client never touches it directly.
- **Background tasks are silent**: Both `extract_and_store_memories` and `summarize_memories` catch all exceptions internally. They must never crash the main response.
- **No backend auth proxy**: Frontend calls Supabase JS SDK directly for OTP/magic-link flows. No `/api/v1/auth/*` routes exist.

## Data flow

```
Onboarding (frontend)
  User selects language → localStorage("arjun_lang_pref")
  User fills name/city/situation → localStorage("arjun_intake")
  Completion flag → localStorage("arjun_onboarding_done")

Chat page (first load)
  Reads arjun_intake from localStorage
  Builds intro message: "My name is {name}. I'm from {city}. {situation}"
  Sends to POST /api/v1/message (authenticated, with JWT)
  localStorage("arjun_first_sent") = "1" to prevent re-send on re-render

Message path (authenticated)
  Frontend → POST /api/v1/message (JWT in Authorization header)
  Backend → safety check → rate limit → save user msg → stream AI
  AI pipeline: memories DB → system prompt → OpenAI → SSE tokens
  After stream: save assistant msg → extract memories (background) → summarize (background)
  Memories DB row (category → fact) updated via upsert

Memory injection into prompt
  SELECT category, fact FROM memories WHERE user_id = ? ORDER BY category
  Formatted as bullet list: "- Name: Rahul\n- City: Pune\n- ..."
  Injected into system prompt template under "What you know about this person:"

Settings page
  GET /api/v1/memories → displays all memory facts with delete buttons
  DELETE /api/v1/memories/{id} → ownership verified server-side before delete
  Uses TanStack Query with optimistic update (removes from UI immediately)
```

## Auth architecture

```
Frontend (Supabase JS SDK — no backend proxy)
  supabase.auth.signInWithOtp({ phone }) or signInWithOtp({ email })
    Phone → SMS OTP (6-digit code) → verifyOtp({ phone, token, type:"sms" })
    Email → Magic link email → user clicks link → session auto-established

AuthContext (React context, app-wide)
  supabase.auth.getSession() on mount → initial session
  supabase.auth.onAuthStateChange() → reactive updates (magic link clicks, expiry)
  Exposes: session, user, isLoading, signOut()

JWT flow to backend
  session.access_token (Supabase JWT) sent as Bearer token on every API call
  Backend: get_current_user() verifies JWT → extracts sub (user UUID)
  First request per user: lazy-create public.users row (SELECT then INSERT)

Anonymous flow
  No Bearer token → get_current_user() returns None
  Backend reads anon_session_id cookie; generates UUID if missing
  Cookie set in response header: HttpOnly, SameSite=lax, Max-Age=86400
  Rate limit: 8 messages per session per day (ANON_MSG_LIMIT)

Route guards (frontend)
  app/page.tsx: redirects → /auth if no session, else → /chat or /onboarding
  app/chat/page.tsx: redirects → /auth if session lost; detects mid-session expiry
  app/settings/page.tsx: redirects → /auth if no session
```

## Background tasks

Both tasks are registered via FastAPI's `BackgroundTasks` after the streaming response is initiated. They run asynchronously after the response starts being delivered.

### extract_and_store_memories (fires on every authenticated message)
1. Takes the last messages passed directly from the chat handler (history[-3:] + user + assistant)
2. Formats as `ROLE: content` lines, sends to GPT-4o Mini with `_EXTRACTION_PROMPT`
3. Model returns JSON array of `{category, fact}` objects
4. Validates: must match `_VALID_CATEGORIES` = {name, city, job, relationship, situation, other}
5. Deduplicates by category (last one wins), adds `user_id` and `updated_at`
6. `supabase.table("memories").upsert(..., on_conflict="user_id,category")` — one fact per category
7. Handles two JSON shapes from model: `{"category": X, "fact": Y}` or fallback `{"category_name": "value"}`
8. Silent on all exceptions — never propagates errors

### summarize_memories (fires conditionally)
1. `count_messages(user_id)` → total message count
2. Only fires when `total >= 20` AND `(total - 20) % 20 == 0` (i.e., at message 20, 40, 60, ...)
3. Fetches last 20 messages, sends to GPT-4o Mini with `_SUMMARIZE_PROMPT`
4. Extracts 3–5 key facts about the user, upserts to memories
5. Silent on all exceptions
