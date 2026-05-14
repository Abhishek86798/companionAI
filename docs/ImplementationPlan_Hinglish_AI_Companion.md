# Implementation Plan — Step-by-Step Build Sequence
## Hinglish AI Companion — Web App MVP
**Version:** 1.0  
**Status:** Draft  
**Paired Documents:** PRD, TRD, AppFlow, BackendSchema, UIUXBrief

---

## How to Use This Document

Work through phases in order. Do not start Phase N+1 until the ✅ Done Criteria for Phase N are met. Each phase has an explicit goal, ordered task list, and done criteria. When using an AI coding agent, paste the relevant phase section as context before starting that phase's work.

**Total phases:** 9  
**Estimated build time:** 10–12 weeks (solo developer)

---

## Phase 1 — Project Setup & Repo Structure

**Goal:** Both frontend and backend are running locally. Env vars are wired. Nothing is built yet — but the scaffolding is solid and consistent with the TRD.

### 1.1 Repo & Folder Structure

- [ ] Create a monorepo on GitHub:
  ```
  /
  ├── frontend/     (React + Vite)
  ├── backend/      (FastAPI)
  └── README.md
  ```
- [ ] Add `.gitignore` — include `.env`, `.env.local`, `__pycache__`, `node_modules`, `venv`, `dist`
- [ ] Add `README.md` with local setup instructions (for future self and collaborators)

### 1.2 Backend Setup

- [ ] Create Python virtual environment:
  ```bash
  cd backend
  python -m venv venv
  source venv/bin/activate
  ```
- [ ] Install all packages from `requirements.txt` (see TRD Section 10.4)
- [ ] Create folder structure exactly as defined in TRD Section 3.2:
  ```
  app/main.py, config.py, dependencies.py
  app/routers/ (empty files: chat.py, memories.py, notifications.py, transcribe.py)
  app/services/ (empty files: ai.py, memory.py, extractor.py, summarizer.py, messages.py, safety.py, rate_limiter.py, push.py)
  app/models/schemas.py
  app/db/supabase.py
  app/tests/
  ```
  Note: no `auth.py` router — auth is via Supabase JS SDK on the frontend.
- [ ] Create `app/main.py` with bare FastAPI app — no routes yet, just CORS config and health check:
  ```python
  GET /health → {"status": "ok"}
  ```
- [ ] Create `app/config.py` using `pydantic-settings` — reads all env vars from `.env`
- [ ] Create `.env.example` with all variable names from TRD Section 8.1 (no values)
- [ ] Copy `.env.example` to `.env` and fill in development values
- [ ] Confirm server runs: `uvicorn app.main:app --reload --port 8000`

### 1.3 Frontend Setup

- [ ] Scaffold with Vite:
  ```bash
  cd frontend
  npm create vite@latest . -- --template react-ts
  ```
- [ ] Install all libraries from TRD Section 2.5
- [ ] Install Tailwind CSS v3 and configure `tailwind.config.ts`:
  - Add brand colors (`#FF6B35`, `#0F0F14`, `#1A1A2E`, `#22223A`, etc.) from UIUXBrief Section 2
  - Add font families: `Plus Jakarta Sans`, `Noto Sans Devanagari`
- [ ] Add Google Fonts import for `Plus Jakarta Sans` (weights 400, 500, 600) and `Noto Sans Devanagari` (400, 500)
- [ ] Set up CSS variables in `src/index.css` — all tokens from UIUXBrief Section 2.3 and 3.2
- [ ] Create folder structure exactly as defined in TRD Section 2.8 — empty files are fine
- [ ] Create `.env.example` with all variable names from TRD Section 8.2 (no values)
- [ ] Copy `.env.example` to `.env.local` and fill in development values
- [ ] Confirm dev server runs: `npm run dev` → `http://localhost:5173`
- [ ] Set TypeScript to strict mode in `tsconfig.json`

### 1.4 Sentry Setup (do this now, not later)

- [ ] Create two Sentry projects: one for frontend, one for backend
- [ ] Add Sentry DSNs to `.env` files
- [ ] Initialize Sentry in `app/main.py` (backend)
- [ ] Initialize Sentry in `frontend/src/main.tsx` (frontend)
- [ ] Confirm errors are captured: throw a deliberate test error, verify it appears in Sentry dashboard

### ✅ Phase 1 Done Criteria
- `GET http://localhost:8000/health` returns `{"status": "ok"}`
- `http://localhost:5173` loads a blank React page with no console errors
- Both `.env.example` files are committed; actual `.env` files are gitignored
- Sentry receives a test error from both frontend and backend
- Folder structures match TRD exactly

---

## Phase 2 — Database Schema & Supabase Setup

**Goal:** All tables exist in Supabase with correct columns, constraints, indexes, and RLS policies. The backend can connect and query.

### 2.1 Supabase Project

- [ ] Create a new Supabase project (free tier)
- [ ] Copy `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_JWT_SECRET` into backend `.env`
- [ ] Copy `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` into frontend `.env.local`

### 2.2 Run Migrations

Run the following SQL in Supabase's SQL editor in order. Each block is in BackendSchema Section 3.

- [ ] Create `public.users` table
- [ ] Create `public.conversations` table
- [ ] Create `public.messages` table
- [ ] Create `public.memories` table
- [ ] Create `public.daily_usage` table
- [ ] Create `public.safety_events` table
- [ ] Run all indexes from BackendSchema Section 4
- [ ] Run `memories_updated_at` trigger from BackendSchema Section 10.2

### 2.3 Row Level Security

- [ ] Enable RLS on all 6 tables
- [ ] Apply all RLS policies from BackendSchema Section 7.2
- [ ] Verify: no DELETE policy on `safety_events`

### 2.4 Backend DB Connection

- [ ] Implement `app/db/supabase.py` — Supabase Python client singleton using service role key
- [ ] Write a quick test script: insert a row into `public.users`, read it back, delete it. Confirm it works.

### 2.5 Seed Test Data

- [ ] Create a test user manually in Supabase Auth dashboard
- [ ] Insert a corresponding row in `public.users`
- [ ] Insert 2–3 test memories for that user
- [ ] Confirm you can query them via the Python client

### ✅ Phase 2 Done Criteria
- All 6 tables exist with correct columns, constraints, and indexes
- RLS is active on all tables; `safety_events` has no DELETE policy
- `app/db/supabase.py` connects without error using the service role key
- Test data inserted and queried successfully from Python

---

## Phase 3 — Authentication

**Goal:** Users can sign up and log in via Phone OTP or Email OTP. JWT is stored in the browser. FastAPI verifies it on protected routes. New users get a row created in `public.users`.

### 3.1 Backend Auth

- [ ] Implement `app/dependencies.py` with two functions (see BackendSchema Section 6.4):
  - `get_current_user()` → `Optional[str]`: decodes JWT if present, returns `None` for anonymous. On first valid JWT, lazy-creates `public.users` row (SELECT then INSERT if missing).
  - `require_current_user()` → `str`: wraps `get_current_user`, raises HTTP 401 if `None`.
- [ ] No `app/routers/auth.py` — OTP send/verify is handled by Supabase JS SDK on the frontend. Do not create this file.
- [ ] Verify `get_current_user()` correctly returns `None` for requests with no `Authorization` header
- [ ] Verify `get_current_user()` raises 401 for expired or malformed tokens
- [ ] Verify `require_current_user()` raises 401 when called without a JWT
- [ ] Verify lazy-create: after first request with a valid JWT, confirm a row exists in `public.users`

### 3.2 Frontend Auth Infrastructure

- [ ] Implement `src/utils/supabase.ts` — Supabase JS client singleton
- [ ] Implement `src/context/AuthContext.tsx`:
  - Listens to `supabase.auth.onAuthStateChange`
  - Stores session, user object, and `isLoading` state
  - Exposes `signOut()` function
- [ ] Wrap `App.tsx` with `AuthProvider`

### 3.3 Auth Page UI (`/auth`)

- [ ] Build `src/pages/AuthPage.tsx`:
  - Phone OTP tab (default) and Email OTP tab
  - Phone number input with `+91` prefix
  - [Send OTP] button → calls `supabase.auth.signInWithOtp()`
  - Transitions to OTP input screen (6 individual boxes, auto-advance)
  - [Verify] button → calls `supabase.auth.verifyOtp()`
  - [Resend OTP] link appears after 30 seconds
  - Shake animation on wrong OTP (see UIUXBrief Section 8)
- [ ] Apply design tokens from UIUXBrief exactly — saffron radial gradient, elevated card, focus glow

### 3.4 Routing & Route Protection

- [ ] Implement all routes in `App.tsx` using `createBrowserRouter`:
  - `/` root redirect logic (see AppFlow Section 3.1)
  - `/onboarding` — unprotected
  - `/auth` — unprotected; redirect to `/chat` if already authed
  - `/chat` — protected; redirect to `/auth` if no JWT
  - `/settings` — protected
- [ ] Build `ProtectedRoute` wrapper component
- [ ] Test: visiting `/chat` while logged out redirects to `/auth`
- [ ] Test: visiting `/auth` while logged in redirects to `/chat`

### ✅ Phase 3 Done Criteria
- Can send OTP to a real phone number and verify it successfully
- After verification, JWT is stored in `localStorage` via Supabase SDK
- `public.users` row is created for new users on first login
- Visiting `/chat` while logged out redirects to `/auth`
- `get_current_user()` correctly extracts user UUID from a valid JWT
- `get_current_user()` returns HTTP 401 for expired or invalid tokens

---

## Phase 4 — Onboarding Flow

**Goal:** A new user lands on `/onboarding`, completes 4 steps, and arrives at `/chat` with their intake data stored as initial memories ready for the first AI call.

### 4.1 Onboarding Page (`/onboarding`)

- [ ] Build `src/pages/OnboardingPage.tsx` with local step state (steps 1–4, no separate URLs)
- [ ] **Step 1 — Language Select** (`src/components/onboarding/LanguageSelect.tsx`):
  - 3 option buttons: Hinglish / More English / More Hindi
  - Selection stored in `localStorage` as `language_pref`
  - Progress dots (4 dots, first filled)
- [ ] **Step 2 — Persona Introduction** (`src/components/onboarding/PersonaPick.tsx`):
  - Arjun avatar with pulsing saffron ring animation (UIUXBrief Section 7.2)
  - Single CTA: "Haan, let's go!"
- [ ] **Step 3 — Intake Form** (`src/components/onboarding/IntakeForm.tsx`):
  - Three inputs: name, city, situation (all required)
  - Inline validation — no submit until all three filled
  - [Start chatting] button
  - On submit: store `{name, city, situation}` in `localStorage` as `intake_data`
  - Set `localStorage` flag `onboarding_done: true`
- [ ] **Step 4** — redirect to `/chat` immediately after Step 3 submit
- [ ] Back button on Steps 2 and 3 (not Step 1)
- [ ] If user returns mid-onboarding: detect last completed step from `localStorage` and resume
- [ ] Apply full design: saffron radial gradient background, step dot progress indicator, slide transition between steps (UIUXBrief Section 8)

### ✅ Phase 4 Done Criteria
- New visitor at `/` lands on `/onboarding` Step 1
- Completing Step 3 sets `onboarding_done: true` in `localStorage` and redirects to `/chat`
- `intake_data` is stored in `localStorage` with name, city, situation
- Returning to `/onboarding` mid-flow resumes from correct step
- Back navigation works on Steps 2 and 3
- UI matches UIUXBrief design tokens

---

## Phase 5 — Core AI Chat (The Main Feature)

**Goal:** Users can send messages and receive streaming Hinglish responses from Arjun. Memory context is injected into every prompt. This is the heart of the product — get this right before anything else.

### 5.1 Safety Service (build this FIRST — before any AI calls work)

- [ ] Implement `app/services/safety.py`:
  - Build the keyword set (~50 Hinglish crisis terms — death, self-harm, suicide in Hindi/English/Hinglish variants)
  - `check_safety(message: str) → SafetyResult` function:
    - Step 1: keyword scan (O(1) set lookup)
    - Step 2 (if no keyword hit): GPT-4o Mini binary classification call (`yes`/`no`, max 5 tokens)
    - Returns `{triggered: bool, trigger_type: 'keyword' | 'semantic' | None}`
  - If OpenAI classification call fails for any reason: **default to `triggered=True`** — never fail open
- [ ] Write `app/tests/test_safety.py` with 50+ test cases:
  - 25+ crisis messages (various phrasings, Hindi, English, Hinglish) — all must return `triggered=True`
  - 25+ normal messages — all must return `triggered=False`
  - Run tests: `pytest app/tests/test_safety.py` — must pass 100%

### 5.2 Memory Service

- [ ] Implement `app/services/memory.py`:
  - `get_memories_for_prompt(user_id) → str` — fetches all memory facts, formats as bullet list for injection
  - `extract_and_store_memories(user_id, messages)` — async background task:
    - Fetches last 5 messages
    - Calls GPT-4o Mini with extraction prompt → returns `[{fact, category}]` JSON
    - Upserts each fact to `public.memories` (UPDATE if category exists, INSERT if new)
  - `summarize_memories(user_id, conversation_id)` — fires when message count > 20:
    - Compresses full conversation into 3–5 bullet facts
    - Replaces all existing memories for user with summarized set

### 5.3 Rate Limiter Service

- [ ] Implement `app/services/rate_limiter.py`:
  - `check_and_increment(user_id, anon_session_id) → None`:
    - If `user_id` is set: check `daily_usage` by `user_id`; raise HTTP 429 if `msg_count >= settings.FREE_TIER_DAILY_LIMIT` (20)
    - If `user_id` is None: check `daily_usage` by `anon_session_id`; raise HTTP 429 (`reason: "anon_limit"`) if count >= `settings.ANON_MSG_LIMIT` (8)
    - Upsert to `public.daily_usage` after successful AI response
    - Never trusts client-provided counts
  - `FREE_TIER_DAILY_LIMIT` and `ANON_MSG_LIMIT` come from `settings` — never hardcoded

### 5.4 AI Service (main prompt assembly)

- [ ] Implement `app/services/ai.py`:
  - `build_system_prompt(user_id) → str` — fetches memories, injects into prompt template (see PRD Section F1)
  - `stream_response(user_id, conversation_id, content) → AsyncGenerator` — full pipeline:
    1. Fetch memories → build system prompt
    2. Fetch last 10 messages from DB → build message history array
    3. Call OpenAI with `stream=True`
    4. Yield SSE tokens as they arrive

### 5.5 Chat Router

- [ ] Implement `app/routers/chat.py`:
  - `POST /api/v1/message` (protected):
    1. Run safety check — if triggered: log to `safety_events`, return crisis response immediately (SSE stream with pre-written crisis message)
    2. Run rate limiter check — if over limit: raise HTTP 429
    3. Save user message to `public.messages`
    4. Stream AI response as SSE (`text/event-stream`)
    5. After stream complete: save assistant message to DB, enqueue memory extraction as `BackgroundTask`
  - `GET /api/v1/messages/{conversation_id}` (protected):
    - Returns paginated message history, 20 per page, ordered `created_at ASC`
- [ ] Register chat router in `app/main.py`

### 5.6 Chat Page UI (`/chat`)

- [ ] Build `src/pages/ChatPage.tsx` — main layout (top bar, message list, input bar)
- [ ] Build `src/components/chat/MessageList.tsx`:
  - Renders user and Arjun bubbles with correct styles (UIUXBrief Section 7.1)
  - `role="log"`, `aria-live="polite"` for accessibility
  - Auto-scrolls to bottom on new message
  - Shows timestamps below each bubble
- [ ] Build `src/components/chat/ChatBubble.tsx`:
  - User bubble: saffron background, white text, `border-radius: 18px 18px 4px 18px`
  - Arjun bubble: `#22223A` background, `border-radius: 18px 18px 18px 4px`
  - Crisis bubble: `#1E1A3E` background, `#8B7CF6` left border, `role="alert"`
  - Slide-up animation on new message (200ms ease-out)
- [ ] Build `src/components/chat/ChatInput.tsx`:
  - Fixed input bar using `dvh` units (never `vh`)
  - Saffron send button (circle, disabled while streaming)
  - Typing indicator (3-dot animation) while awaiting response
- [ ] Build `src/hooks/useMessages.ts` — React Query wrapper for message history
- [ ] Implement SSE streaming in `src/api/chat.ts`:
  - Opens SSE connection to `POST /api/v1/message`
  - Renders tokens progressively as they stream in
  - Handles stream end, network errors (retry with toast)
- [ ] On first load: if `intake_data` exists in `localStorage` and no messages yet → trigger first AI message using intake data
- [ ] Daily limit (HTTP 429): show inline limit-reached message bubble, disable input, change placeholder

### ✅ Phase 5 Done Criteria
- Safety test suite passes 100% (`pytest app/tests/test_safety.py`)
- Sending a message returns a streaming Hinglish response from Arjun
- Crisis keywords trigger the crisis response — OpenAI is NOT called
- Rate limiter blocks the 21st message (authenticated free user) and shows the limit-reached message
- Rate limiter blocks the 9th message (anonymous) and shows the inline auth wall
- After 3 messages, run a memory extraction manually and confirm facts are stored in `public.memories`
- Start a new conversation — Arjun's response references a previously stored memory fact
- UI matches UIUXBrief: bubble styles, colors, animations, input bar above keyboard

---

## Phase 6 — Memory Management UI (Settings)

**Goal:** Users can view what Arjun remembers about them and delete individual facts. Push notification preferences are saved.

### 6.1 Memories API

- [ ] Implement `app/routers/memories.py`:
  - `GET /api/v1/memories` (protected) — returns all memory facts for the user
  - `DELETE /api/v1/memories/{id}` (protected) — deletes one fact; verifies `user_id` ownership before deleting
- [ ] Register memories router in `app/main.py`

### 6.2 Settings Drawer UI

- [ ] Build `src/pages/SettingsPage.tsx` as a slide-in drawer (from right on mobile, UIUXBrief Section 7.3)
- [ ] **Account section:**
  - Display phone or email (read-only)
  - [Log out] button → confirm modal → `supabase.auth.signOut()` → clear state → redirect to `/onboarding`
- [ ] **Notifications section:**
  - Toggle: enable/disable daily check-in
  - Time picker: default 9:00 PM
  - [Save] button → `POST /api/v1/notifications/subscribe`
- [ ] **Memory section:**
  - Build `src/hooks/useMemories.ts` — React Query wrapper for `GET /api/v1/memories`
  - Render list of facts with category emoji + fact text + delete icon
  - Delete icon: `--color-text-dim` → `--color-danger` on hover
  - Tap delete → confirm modal ("Yeh memory delete kar doon?") → `DELETE /api/v1/memories/{id}`
  - Optimistic update: remove from list immediately, rollback on error
  - Toast: "Memory hata di ✅" on success
  - Empty state: "Abhi kuch yaad nahi — thoda aur baat karo!"
- [ ] **About section:** version, Privacy Policy link, Terms of Service link
- [ ] Log out confirm modal (UIUXBrief Section 12 copy)

### ✅ Phase 6 Done Criteria
- `GET /api/v1/memories` returns all facts for the logged-in user
- `DELETE /api/v1/memories/{id}` refuses to delete a fact belonging to another user (test this)
- Settings drawer slides in and out correctly on both mobile and desktop
- Deleting a memory removes it optimistically, shows toast, and it no longer appears in future Arjun responses
- Log out clears session and redirects to `/onboarding`

---

## Phase 7 — Push Notifications & Voice Input

**Goal:** Browser push notifications are working. Voice input transcribes and populates the chat input on Chrome.

### 7.1 Push Notifications — Backend

- [ ] Generate VAPID key pair (one-time): `pywebpush` CLI or online generator. Store in `.env`.
- [ ] Implement `app/services/push.py` — `send_push(subscription, message)` using `pywebpush`
- [ ] Implement `app/routers/notifications.py`:
  - `POST /api/v1/notifications/subscribe` (protected) — saves `web_push_subscription` JSONB + `notif_time` + `notif_enabled` to `public.users`
- [ ] Build a manual trigger script `backend/scripts/send_daily_nudge.py`:
  - Fetches all users with `notif_enabled=true` and `notif_time` within the next minute
  - Sends push notification to each
  - Run this via Railway cron job or manually for MVP

### 7.2 Push Notifications — Frontend

- [ ] Create `public/sw.js` service worker — handles push events, shows browser notification
- [ ] Register service worker in `src/main.tsx`
- [ ] Build `src/hooks/usePushNotif.ts`:
  - Request notification permission after user's 3rd session (track in `localStorage`)
  - On permission granted: subscribe via `PushManager.subscribe()` using `VITE_VAPID_PUBLIC_KEY`
  - POST subscription object to `/api/v1/notifications/subscribe`
- [ ] Add VAPID public key to frontend `.env.local`

### 7.3 Voice Input

- [ ] Build `src/hooks/useVoiceInput.ts`:
  - Detects `window.SpeechRecognition` support
  - Returns `{isSupported, isRecording, transcript, startRecording, stopRecording}`
  - Language: `hi-IN` primary, `en-IN` fallback
- [ ] Build `src/components/chat/VoiceButton.tsx`:
  - Hidden entirely if `isSupported === false` — no error, no tooltip
  - Hold-to-record on mobile, click to start/stop on desktop
  - On stop: populate `ChatInput` text field with transcript
  - User can edit before sending

### ✅ Phase 7 Done Criteria
- Service worker registered; browser shows notification permission prompt after 3rd session
- A test push notification is received on Android Chrome
- Notification preference (time + enabled toggle) persists after page refresh (stored in DB)
- Voice button is visible on Chrome, invisible on Firefox/Safari — no console errors
- Holding voice button on Chrome transcribes speech into the input box

---

## Phase 8 — UI Polish, Empty States & Error Handling

**Goal:** Every screen looks right. Every error is handled gracefully. No broken states exist.

### 8.1 Apply Design System Throughout

- [ ] Audit every screen against UIUXBrief — colors, fonts, border-radius, spacing
- [ ] Verify `dvh` is used in place of `vh` everywhere (grep the codebase)
- [ ] Verify all tap targets are minimum `44px × 44px`
- [ ] Verify all fonts load correctly: Plus Jakarta Sans, Noto Sans Devanagari
- [ ] Verify CSS variables are defined in `index.css` and used throughout (no hardcoded hex values in components)
- [ ] Add reduced-motion media query wrapper around all CSS animations

### 8.2 Empty States

- [ ] `/chat` first load — no messages: Arjun's personalized opening message using intake data
- [ ] Settings → Memory — no facts yet: friendly empty state illustration + copy
- [ ] All React Query loading states: skeleton loaders or spinners, never blank screens

### 8.3 Error Handling

Implement every error state from AppFlow Section 11:

- [ ] **Network error on send:** message stays in input box, toast "Message nahi gaya. Internet check kar.", send button re-enables
- [ ] **OTP not received:** show "Email se try karo" + switch to email tab
- [ ] **Wrong OTP (3 attempts):** shake animation + resend button
- [ ] **JWT expired mid-session:** Supabase SDK auto-refresh → if fails, toast + redirect to `/auth`
- [ ] **Rate limit (HTTP 429):** inline limit message, input disabled
- [ ] **Memory fetch fails:** section shows "Memories load nahi hui. Refresh karo." — no crash
- [ ] **SSE stream interrupted:** graceful fallback — show what streamed so far, re-enable send button

### 8.4 Accessibility Pass

- [ ] Add `role="log"` and `aria-live="polite"` to message list
- [ ] Add `role="alert"` to crisis message bubble
- [ ] Add `aria-label` to all icon-only buttons (send, mic, settings, delete)
- [ ] Test tab navigation through the entire chat UI
- [ ] Verify color contrast ratios with browser devtools (all text meets WCAG AA)

### 8.5 Responsive Design

- [ ] Test every screen at 360px (minimum mobile width)
- [ ] Test chat UI with Android soft keyboard open — input bar must stay visible
- [ ] Test at 768px (tablet) — chat column centered, max 480px wide
- [ ] Test at 1280px (desktop) — settings opens as side panel, not overlay

### ✅ Phase 8 Done Criteria
- No blank/broken screens at any point in any user journey (see AppFlow Sections 9 and 10)
- Every error in AppFlow Section 11 is handled with the correct copy and behavior
- All screens pass visual audit against UIUXBrief
- Chat input stays above keyboard on Android Chrome
- Color contrast passes WCAG AA on all text elements

---

## Phase 9 — Testing, Deployment & Launch

**Goal:** The app is live on production URLs. All critical flows are manually verified. Monitoring is active.

### 9.1 Manual Test Suite

Run every journey from AppFlow Section 9 end-to-end on a real Android Chrome browser:

- [ ] **Journey 1 — New user, first conversation:** onboarding → chat → hit daily limit
- [ ] **Journey 2 — Returning user via push notification:** notification → chat → send messages
- [ ] **Journey 3 — Crisis path:** send a crisis message → verify crisis response appears, OpenAI was NOT called, event logged in `safety_events`
- [ ] **Journey 4 — Delete a memory:** settings → memory → delete → verify Arjun no longer references it
- [ ] **Log out → log back in:** session clears, JWT refreshes, chat history loads correctly
- [ ] **Run `pytest app/tests/`** — all tests pass
- [ ] Manually verify: `safety_events` table has a row for the crisis test; it cannot be deleted even via Supabase dashboard

### 9.2 Backend Deployment (Railway)

- [ ] Create Railway project, connect to GitHub monorepo `/backend` subfolder
- [ ] Add all backend env vars from TRD Section 8.1 in Railway dashboard
- [ ] Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- [ ] Deploy and confirm: `GET https://your-app.railway.app/health` → `{"status": "ok"}`
- [ ] Update `ALLOWED_ORIGINS` in Railway env vars with Vercel production URL

### 9.3 Frontend Deployment (Vercel)

- [ ] Create Vercel project, connect to GitHub monorepo `/frontend` subfolder
- [ ] Add all frontend env vars from TRD Section 8.2 in Vercel dashboard
- [ ] Update `NEXT_PUBLIC_API_URL` to Railway production URL (include `/api/v1` in the value)
- [ ] Deploy and confirm: production URL loads the app without console errors
- [ ] Confirm CORS is working: send a message from the production frontend → response arrives

### 9.4 Production Smoke Test

After both services are deployed, run the following on production (not localhost):

- [ ] New user onboarding flow completes
- [ ] OTP received and verified on a real phone number
- [ ] First message sent and streamed response received
- [ ] Memory extracted and stored after 3 messages (check Supabase dashboard)
- [ ] Crisis keyword sent → crisis response returned → `safety_events` row created
- [ ] Rate limit hit → limit message shown → resets the next day
- [ ] Push notification permission requested and granted
- [ ] Test push notification received on Android Chrome

### 9.5 Monitoring Setup

- [ ] Verify Sentry is receiving events from production frontend and backend
- [ ] Create Sentry alert: notify on any unhandled exception in production
- [ ] Set a Railway spending alert so unexpected traffic doesn't cause surprise bills
- [ ] Set a Supabase email alert for database storage approaching 80% of free tier

### ✅ Phase 9 Done Criteria (MVP Launch Criteria)
- [ ] All 4 user journeys from AppFlow Section 9 pass on production
- [ ] Safety layer verified: crisis keywords always return crisis response; `safety_events` logged; OpenAI never called for crisis messages
- [ ] `pytest app/tests/` passes 100% in CI
- [ ] Production URLs are live and stable for 24 hours
- [ ] Sentry has zero unhandled errors after smoke test
- [ ] Privacy Policy and Terms of Service pages are live (linked from Settings)
- [ ] At least 3 real beta users have completed the full onboarding → 5 messages → limit hit flow

---

## Appendix: Build Order Rationale

The sequence above is non-negotiable. Here's why each phase must come before the next:

| Phase | Must come before | Because |
|---|---|---|
| 1 (Setup) | Everything | No other phase works without a running server and dev environment |
| 2 (Database) | Auth, Chat | Auth creates rows; Chat reads and writes rows. Schema must exist first. |
| 3 (Auth) | Chat, Settings | All protected routes need JWT verification working. |
| 4 (Onboarding) | Chat | Onboarding stores intake data that populates Arjun's first message. |
| 5 (Chat — Safety first) | All of Phase 5 | Safety check must be built and tested before AI calls are wired up. Non-negotiable. |
| 5 (Chat — full) | Settings, Notifications | The core value prop must work before building peripheral features. |
| 6 (Settings) | Push Notifications | Notification preferences are saved via the settings endpoint. |
| 7 (Push + Voice) | Polish | These are complete features; polish happens after all features exist. |
| 8 (Polish) | Deployment | Don't deploy something broken. Fix it locally first. |
| 9 (Deploy) | Launch | Last step, not first. |

---

*Document Owner: Founder / Solo Developer*  
*Next Review: End of Phase 2*  
*Paired Documents: PRD, TRD, AppFlow, BackendSchema, UIUXBrief*
