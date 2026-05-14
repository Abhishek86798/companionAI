# Product Requirements Document
## Hinglish AI Companion App (MVP)
**Version:** 1.1  
**Status:** Active  
**Target Launch:** Web Early Access (Week 12)  
**Paired Document:** TRD_Hinglish_AI_Companion.md

---

## 1. Product Overview

### 1.1 Product Vision
A personal AI companion for urban Indian users that feels like a close friend — emotionally intelligent, fluent in Hinglish, and remembers you across conversations. Not a chatbot. Not a therapist. A Dost.

### 1.2 Problem Statement
Urban Indians (18–35) face increasing emotional isolation, stress, and loneliness — but face cultural stigma around therapy. They need a low-barrier, non-judgmental outlet that feels culturally familiar. Existing AI chat products (ChatGPT, Replika) feel foreign, reset every session, and speak formal English.

### 1.3 Solution
A **web app** featuring a Hinglish-speaking AI persona ("Arjun") that remembers personal context across sessions, nudges users with check-ins, and gently routes users in distress to professional resources.

### 1.4 Target User
- Age: 18–32
- Location: Tier 1 & 2 Indian cities (Mumbai, Pune, Delhi, Bengaluru, Hyderabad, Lucknow)
- Device: Android Chrome (primary), desktop Chrome (secondary)
- Language: Fluent in Hinglish; code-switches naturally between Hindi and English
- Pain point: Loneliness, work stress, relationship issues, no one to talk to without judgment

### 1.5 Success Metrics (MVP)
| Metric | Target (End of Month 3) |
|---|---|
| Beta users (Week 11) | 20–50 |
| Web app signups (Month 3) | 200+ |
| Day 7 retention | ≥ 30% |
| Safety incidents logged | 100% (zero missed) |
| Avg messages per active user/day | ≥ 5 |

> **Note:** Free → Paid conversion and Play Store metrics are **post-MVP**. Payments are deferred.

---

## 2. Features & Requirements

### 2.1 Core Features (Must-Have for MVP)

#### F1 — Hinglish AI Chat (Persona: Arjun)
**Description:** A persistent chat interface powered by GPT-4o Mini, with a persona that speaks natural Hinglish and adapts to the user's language register.

**Requirements:**
- AI responds in Hinglish, matching the formality/register of the user's message
- Persona: warm, non-judgmental, does not claim to be an AI unless directly asked
- Responses are 2–4 sentences by default; longer only if user is clearly seeking more
- Never offers medical, legal, or financial advice
- Suggests professional help gently if emotional distress is detected (not via therapy itself)

**System Prompt Structure:**
```
You are Arjun, a close Indian friend. You speak Hinglish naturally — mixing 
Hindi and English the way urban Indians actually talk. You are warm, 
non-judgmental, and emotionally intelligent. You never claim to be an AI 
unless directly asked. You never give medical or legal advice. You listen 
first, give advice only when asked.

About the person you're talking to:
{memory_facts_injected_here}

Important:
- If the person seems in serious distress, gently suggest they talk to a professional. Never attempt therapy.
- Keep responses conversational, 2–4 sentences max unless the person is clearly looking for more.
- Use Hinglish naturally. Don't force Hindi. Match the user's language register.
```

**AI Model:** GPT-4o Mini (primary), fallback to Claude Haiku

---

#### F2 — Memory System
**Description:** The core differentiator. The AI remembers facts about the user across sessions — name, city, job, relationships, ongoing situations.

**Requirements:**
- Extract and store personal facts from every conversation (name, city, profession, relationships, current situations)
- Inject relevant memories into every system prompt
- Summarize long conversations (>20 messages) asynchronously to compress context
- User must feel the AI "knows them" after 3–5 sessions
- Memory is stored per user in Postgres; never shared across users

**Database Schema — memories table:**
```
id          UUID        primary key
user_id     UUID        foreign key → users
fact        TEXT        e.g. "Works in Pune as a software engineer"
category    TEXT        name | city | job | relationship | situation | other
created_at  TIMESTAMP
updated_at  TIMESTAMP
UNIQUE(user_id, category)
```

**Memory Extraction Logic (runs after every message):**
- Async background task on FastAPI
- Prompt GPT-4o Mini to extract structured facts from the last 5 messages
- Upsert to memories table (update if category already exists, insert if new)
- Summarizer job: if conversation > 20 messages, summarize into 3–5 bullet facts and store

**Acceptance Criteria:** After a 20-message test conversation, the AI correctly recalls user's name, city, and at least one personal detail in a new session.

---

#### F3 — Onboarding Flow
**Description:** A short, warm onboarding that collects enough context to personalize the first conversation.

**Steps:**
1. Language select (Hinglish / English-heavy / Hindi-heavy)
2. Persona pick ("Meet Arjun" — single persona for MVP)
3. 3-question intake:
   - "Kya naam hai tera?" (Name)
   - "Kahan rehta/rehti hai?" (City)
   - "Aajkal kaisa chal raha hai life mein?" (Current mood/situation — free text)
4. First message from Arjun (personalized using intake responses)

**Requirements:**
- Maximum 4 screens, no account required at this stage
- OTP auth triggers after first free message limit is hit (not before)
- Intake responses are stored as initial memories before first message

---

#### F4 — Authentication
**Description:** Phone OTP + Email OTP (fallback) via Supabase Auth.

**Requirements:**
- Supabase phone OTP (SMS via Twilio) as primary
- Email OTP as fallback for users who don't want to share phone
- Auth page shows both options with a tab toggle
- JWT issued on successful OTP verification
- JWT middleware on all protected backend routes (`/api/v1/*`)
- Session managed by Supabase JS SDK (auto-refresh)
- Re-auth only if token expires

---

#### F5 — Free Tier Gate
**Description:** 20 free messages per day, then a soft block.

**Requirements:**
- Message counter is server-side only — never trust client-side counts
- Counter resets at midnight IST
- On hitting the limit, return HTTP 429 with a Hinglish message:
  > "Yaar, aaj ke 20 free messages ho gaye. Kal phir baat karte hain! 🙌"
- Counter stored in Postgres `daily_usage` table
- No paywall or payment prompt in MVP — just a friendly daily limit

> **Rate Limit:** 20 messages/day (increased from original 5 for testing and user experience)

---

#### F6 — Safety Layer & Crisis Path
**Description:** Non-negotiable. Must go live before any real user accesses the app.

**Requirements:**
- Runs on every incoming message before the main AI call — no exceptions
- Two-layer check:
  1. **Keyword list:** suicide, khud ko hurt, self-harm, marjana chahta, nahi rehna, marne ka mann + common Hindi/Hinglish equivalents (~50 terms)
  2. **Semantic check:** GPT-4o Mini binary classification — "Does this message express suicidal ideation or intent to harm self or others?" → yes/no (max 5 tokens)
- If triggered (either layer):
  - Skip the main AI entirely
  - Show a pre-written empathetic Hinglish message with iCall and Vandrevala Foundation numbers
  - Log the event to `safety_events` table (user_id, message, timestamp, trigger_type) — **never delete these logs**
- If not triggered: proceed to main AI call

**Crisis Response Template:**
> "Yaar, sun — jo tu feel kar raha hai woh bahut heavy hai. Tu akela nahi hai. Kuch log hain jo genuinely help kar sakte hain:
> 📞 iCall: 9152987821
> 📞 Vandrevala Foundation: 1860-2662-345 (24/7)
> Please inhe call kar. Seriously."

**Acceptance Criteria:** 100% of messages containing crisis keywords must trigger the safety path. Zero false-negative tolerance.

---

#### F7 — Voice Input (Web Speech API)
**Description:** Users can send voice messages directly in the browser using the Web Speech API — zero cost, no external API.

**Requirements:**
- Uses `window.SpeechRecognition` (browser-native) — no API key required
- Language: `hi-IN` primary, `en-IN` fallback
- Mic button in chat UI (click to start, click again to stop)
- Transcript shown in input box before sending — user can edit
- Graceful degradation: if browser doesn't support it (Firefox, Safari), hide mic button and show tooltip: "Voice input works best on Chrome"
- Available to all users (no Plus gate — it's free)

---

#### F8 — Push Notifications (Web Push)
**Description:** Browser push notifications to re-engage users.

**Requirements:**
- Web Push API with a service worker (`/public/sw.js`)
- VAPID keys generated once, stored as env vars on backend
- Permission prompt shown after user's 3rd session — never on first load
- One daily notification at user-configurable time (default: 9 PM IST)
- Hinglish copy — rotate between 5–7 variants:
  - "Aaj kaisa raha? Arjun intezaar kar raha hai 😊"
  - "Baat karte hain yaar — kya chal raha hai?"
  - "Thoda time hai? Arjun se baat kar le 💬"
- User can disable in settings

---

#### F9 — Payments (Post-MVP — Razorpay)
**Description:** In-app purchase flow for the Plus tier. **Not built in MVP.**

**Deferred to Month 4.** When implemented:
- Razorpay integration (UPI + cards + netbanking)
- Plus tier: unlimited messages + priority AI response
- Webhook from Razorpay → backend to upgrade `users.tier` in Postgres
- Subscription management via Razorpay dashboard

**Plus Tier Benefits (post-MVP):**
| Feature | Free | Plus |
|---|---|---|
| Messages/day | 20 | Unlimited |
| Price | ₹0 | ₹149/month |

---

### 2.2 Features Explicitly Deferred (Post-MVP)

| Feature | Target |
|---|---|
| Flutter Android app | Month 4 (backend unchanged) |
| Payments / Plus tier (Razorpay) | Month 4 |
| iOS version | Month 6 |
| Marathi language support | Month 3 |
| Mood tracking dashboard | Month 3 |
| Social / group features | Month 6+ |
| Referral system | Month 4 |
| Custom personas (female, elder) | Month 3 |
| SSE streaming responses | Post-MVP |
| Bhashini STT (Hindi voice for Flutter) | Month 4 |
| FCM push notifications (Flutter) | Month 4 |

---

## 3. Technical Architecture

### 3.1 Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Web frontend | Next.js 16 + TypeScript + Tailwind CSS | SSR/routing, fast scaffold, Vercel-native |
| Backend | Python 3.11 + FastAPI | AI-native ecosystem; async; fast to build |
| Database | Supabase (Postgres) | Auth + DB in one; free tier sufficient for MVP |
| AI APIs | OpenAI GPT-4o Mini | Cost-efficient; good Hinglish quality |
| Memory system | FastAPI BackgroundTasks | Same Python backend, no extra infra |
| Safety check | Python keyword scan + GPT-4o Mini classification | Runs pre-main AI call |
| Payments | Razorpay (post-MVP) | Dominant Indian payment gateway |
| Frontend hosting | Vercel | Native Next.js support |
| Backend hosting | Railway | Native Python support; simple deploy |
| Voice STT | Web Speech API (browser-native) | Zero cost; works on Chrome |
| Push notifications | Web Push API + VAPID | Browser-native; no FCM dependency |
| Error tracking | Sentry (frontend + backend) | Set up from Day 1 |
| Cache / counters | Postgres | Simplicity for MVP; no Redis |

### 3.2 System Architecture

```
[Next.js Web App — Vercel]
       │
       ▼
[FastAPI Backend — Railway]  (/api/v1/*)
       │
       ├─── Safety Check (pre-flight, every message)
       │         └── Keyword filter → semantic AI classification
       │
       ├─── Memory Assembler (builds system prompt)
       │         └── SELECT * FROM memories WHERE user_id = ?
       │
       ├─── OpenAI API call (GPT-4o Mini)
       │
       ├─── Memory Extractor (async BackgroundTask)
       │         └── Extracts facts → upserts to memories table
       │
       ├─── Conversation Summarizer (async BackgroundTask, fires at msg 20/40/60...)
       │
       └─── Rate Limiter (checks + increments daily_usage)
       
[Supabase]
  ├── users table
  ├── conversations table
  ├── messages table
  ├── memories table
  ├── daily_usage table
  ├── safety_events table (never delete)
  └── Auth (Phone OTP + Email OTP + JWT)

[Razorpay — post-MVP]
  └── Webhook → POST /api/v1/webhook/razorpay → upgrade users.tier

[Web Push / VAPID]
  └── Daily push notification job (cron via FastAPI)
```

### 3.3 Core API Endpoints

All routes prefixed `/api/v1/`. All protected routes require `Authorization: Bearer <jwt>`.

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/message` | ✅ | Send a message; returns AI response |
| GET | `/api/v1/messages/{conversation_id}` | ✅ | Fetch paginated message history |
| GET | `/api/v1/memories` | ✅ | Fetch user's stored memory facts |
| DELETE | `/api/v1/memories/{id}` | ✅ | Delete a specific memory fact |
| POST | `/api/v1/auth/otp/send` | ❌ | Trigger Supabase phone/email OTP |
| POST | `/api/v1/auth/otp/verify` | ❌ | Verify OTP → return JWT |
| POST | `/api/v1/notifications/subscribe` | ✅ | Store Web Push subscription |
| POST | `/api/v1/webhook/razorpay` | ❌ (HMAC) | Post-MVP: payment webhook |

### 3.4 Database Schema (Core Tables)

```sql
-- users (extends Supabase auth.users)
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

-- conversations
CREATE TABLE public.conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  title       TEXT
);

-- messages
CREATE TABLE public.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  safety_flagged  BOOLEAN NOT NULL DEFAULT false
);

-- memories
CREATE TABLE public.memories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  fact        TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('name','city','job','relationship','situation','other')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, category)
);

-- daily usage counter
CREATE TABLE public.daily_usage (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  msg_count   INT NOT NULL DEFAULT 0,
  UNIQUE(user_id, date)
);

-- safety event log — NEVER DELETE ROWS
CREATE TABLE public.safety_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES public.users(id),
  message       TEXT NOT NULL,
  trigger_type  TEXT NOT NULL CHECK (trigger_type IN ('keyword', 'semantic')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 4. Build Sequence (12-Week Plan)

### Weeks 1–2: Backend Foundation ✅ DONE
- FastAPI project scaffolded
- Supabase schema deployed
- `POST /api/v1/message` working end-to-end with GPT-4o Mini
- Sentry error tracking configured
- **Milestone:** Single AI conversation loop working end-to-end ✅

### Weeks 3–4: Memory System ✅ DONE
- Prompt assembler (`get_memory_facts`)
- Async memory extractor (BackgroundTask after every message)
- Conversation summarizer (fires at 20/40/60 messages)
- **Milestone:** 20-message test → AI recalls name, city, personal detail in new session ✅

### Weeks 5–6: Web Chat UI
- Next.js project scaffolded
- Chat screen (WhatsApp-style bubble UI)
- Onboarding flow (language → persona → 3-question intake → first message)
- Connect to FastAPI backend
- **Milestone:** Full conversation flow working in browser

### Week 7: Auth + Rate Limiting
- Supabase phone OTP + email OTP fallback
- JWT middleware on all protected routes
- Daily message counter (server-side, 20 msgs/day)
- **Milestone:** Free user hits 20-message limit and sees friendly block message

### Week 8: Safety Layer + Crisis Path
- Keyword list (~50 Hindi/Hinglish terms)
- Semantic GPT-4o Mini classification (pre-main AI call)
- Crisis response template with iCall + Vandrevala numbers
- Safety event logging
- **Milestone:** 100% of test crisis messages correctly routed to safety path

### Week 9: Voice Input + Push Notifications
- Web Speech API mic button in chat UI
- Web Push API + service worker
- Daily check-in nudge (configurable time)
- **Milestone:** Voice message transcribed; push notification received in browser

### Weeks 10–11: Polish + Beta
- Settings page (disable notifications, delete memories)
- Error states, loading states, offline shell
- Closed beta: 20–50 users from personal network
- Monitor obsessively, fix breaking issues

### Week 12: Web Launch
- Deploy to Vercel (frontend) + Railway (backend)
- **Milestone:** App live and publicly accessible

---

## 5. Monetisation (Post-MVP)

### 5.1 Pricing
- Free tier: 20 messages/day (MVP)
- Plus tier: ₹149/month — unlimited messages (post-MVP, Month 4)

### 5.2 Unit Economics (GPT-4o Mini)
| Item | Cost |
|---|---|
| GPT-4o Mini per 1M input tokens | ~$0.15 |
| Avg tokens per conversation (30 msgs) | ~6,000 |
| Cost per active user/month | ~₹3–5 |
| Railway hosting | ~₹2,000/month |
| Supabase (free tier) | ₹0 |
| Web Speech API | ₹0 |
| Break-even (paid users, post-MVP) | 200 |

---

## 6. Safety & Compliance

### 6.1 Safety Requirements
- Safety check is mandatory on every message — no exceptions, no feature flags, no dev bypass in production
- Crisis logs (`safety_events` table) must never be deleted
- iCall and Vandrevala Foundation numbers must be current and verified before any real user accesses the app
- Never position the app as a mental health or therapy product in any marketing

### 6.2 Data Privacy
- No conversation data shared with third parties (except OpenAI for inference)
- Users can request memory deletion at any time (`DELETE /api/v1/memories/{id}`)
- Phone/email stored via Supabase Auth (hashed)
- All API calls over HTTPS

### 6.3 Content Policy
- AI must never provide medical, legal, or financial advice
- AI must never facilitate illegal activity
- AI must never generate sexual or violent content
- Age gate: 18+ (enforced via web signup flow)

---

## 7. Out of Scope (MVP)

- Flutter Android app (Month 4)
- Payments / Plus tier (Month 4)
- iOS version
- Marathi or regional language support beyond Hinglish
- Mood tracking / analytics dashboard
- Social or group chat features
- Custom AI personas beyond Arjun
- Referral or affiliate system
- Admin dashboard
- Export of conversation history
- SSE streaming (post-MVP)
- Bhashini STT
- FCM push notifications

---

## 8. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Safety check misses a crisis message | Medium | Dual-layer (keyword + semantic); log all; review weekly |
| Memory feels broken or repetitive | High | Thorough testing; upsert logic prevents duplicate facts |
| OpenAI API costs spike | Medium | 20 msg/day cap per user; monitor spend dashboard |
| Low Day-7 retention | High | Push notifications + memory quality are primary levers |
| Web Push permission denied by users | High | Ask after 3rd session, not on first load |
| Razorpay webhook failures (post-MVP) | Medium | Idempotent webhook handler; retry queue |

---

## 9. Launch Checklist (Week 12)

- [ ] Safety check live and tested with 50+ crisis message variants
- [ ] Privacy policy page live
- [ ] iCall and Vandrevala numbers verified as current
- [ ] Sentry alerts configured for error spikes
- [ ] Rate limiter tested — cannot be bypassed client-side (20 msg/day)
- [ ] At least 20 beta users have completed 5+ sessions
- [ ] Memory system verified: beta users confirm AI "remembers" them
- [ ] Web Push notifications tested on Android Chrome
- [ ] App deployed to Vercel + Railway with all env vars set

---

*Document Owner: Founder / Solo Developer*  
*Version 1.1 — Updated to reflect web-first MVP, 20 msg/day rate limit, payments deferred to post-MVP*  
*Paired Document: TRD_Hinglish_AI_Companion.md*
