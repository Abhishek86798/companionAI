# Product Requirements Document
## Hinglish AI Companion App (MVP)
**Version:** 1.0  
**Status:** Draft  
**Target Launch:** Play Store Early Access (Week 12)

---

## 1. Product Overview

### 1.1 Product Vision
A personal AI companion for urban Indian users that feels like a close friend — emotionally intelligent, fluent in Hinglish, and remembers you across conversations. Not a chatbot. Not a therapist. A Dost.

### 1.2 Problem Statement
Urban Indians (18–35) face increasing emotional isolation, stress, and loneliness — but face cultural stigma around therapy. They need a low-barrier, non-judgmental outlet that feels culturally familiar. Existing AI chat products (ChatGPT, Replika) feel foreign, reset every session, and speak formal English.

### 1.3 Solution
An Android app featuring a Hinglish-speaking AI persona ("Arjun") that remembers personal context across sessions, nudges users with check-ins, and gently routes users in distress to professional resources.

### 1.4 Target User
- Age: 18–32
- Location: Tier 1 & 2 Indian cities (Mumbai, Pune, Delhi, Bengaluru, Hyderabad, Lucknow)
- Device: Android (95%+ of Indian smartphone market)
- Language: Fluent in Hinglish; code-switches naturally between Hindi and English
- Pain point: Loneliness, work stress, relationship issues, no one to talk to without judgment

### 1.5 Success Metrics (MVP)
| Metric | Target (End of Month 3) |
|---|---|
| Beta users (Week 11) | 20–50 |
| Play Store installs (Month 3) | 500+ |
| Day 7 retention | ≥ 30% |
| Free → Paid conversion | ≥ 5% |
| Paid users to break even | 200 |
| Safety incidents logged | 100% (zero missed) |

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
source_msg  UUID        foreign key → messages (optional, for audit)
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
- OTP-based phone auth triggers after first free message limit is hit (not before)
- Intake responses are stored as initial memories before first message

---

#### F4 — Authentication
**Description:** Phone OTP via Supabase Auth.

**Requirements:**
- Supabase phone OTP (SMS)
- JWT issued on successful OTP verification
- JWT middleware on all backend routes
- No email/password option for MVP (adds friction)
- Session persists on device; re-auth only if token expires

---

#### F5 — Free Tier Gate
**Description:** 5 free messages per day, then a soft paywall nudge.

**Requirements:**
- Message counter is server-side only — never trust client-side counts
- Counter resets at midnight IST
- On 5th message, append a soft Hinglish nudge at the bottom of the response:
  > "Yaar, aaj ke 5 free messages ho gaye. Agar aur baat karni hai toh Plus le lo — sirf ₹149/month mein unlimited chat aur memory! 🙌"
- Counter stored in Redis (or Postgres if Redis not used in MVP)
- Plus users are exempt from the counter

---

#### F6 — Safety Layer & Crisis Path
**Description:** Non-negotiable. Must go live before any real user accesses the app.

**Requirements:**
- Runs on every incoming message before the main AI call
- Two-layer check:
  1. **Keyword list:** suicide, khud ko hurt, self-harm, marjana chahta, nahi rehna, marne ka mann + common Hindi/Hinglish equivalents
  2. **Semantic check:** Cheap AI classification call — "Does this message express suicidal ideation or intent to harm self or others?" → yes/no
- If triggered (either layer):
  - Skip the main AI entirely
  - Show a pre-written empathetic Hinglish message with iCall and Vandrevala Foundation numbers
  - Log the event (user_id, message, timestamp, trigger_type) — never delete these logs
- If not triggered: proceed to main AI call

**Crisis Response Template:**
> "Yaar, sun — jo tu feel kar raha hai woh bahut heavy hai. Tu akela nahi hai. Kuch log hain jo genuinely help kar sakte hain:
> 📞 iCall: 9152987821
> 📞 Vandrevala Foundation: 1860-2662-345 (24/7)
> Please inhe call kar. Seriously."

**Acceptance Criteria:** 100% of messages containing crisis keywords must trigger the safety path. Zero false-negative tolerance.

---

#### F7 — Payments (Razorpay)
**Description:** In-app purchase flow for the Plus tier (₹149/month).

**Requirements:**
- Razorpay integration (UPI + cards + netbanking)
- Plus tier: unlimited messages + memory enabled
- Webhook from Razorpay → backend to upgrade `users.tier` in Postgres
- Subscription management: cancel anytime (via Razorpay dashboard for MVP)
- Receipt sent via Razorpay (no custom email for MVP)

**Plus Tier Benefits:**
| Feature | Free | Plus |
|---|---|---|
| Messages/day | 5 | Unlimited |
| Memory | Disabled | Enabled |
| Voice input | Disabled | Enabled |
| Price | ₹0 | ₹149/month |

---

#### F8 — Voice Input (Hindi STT)
**Description:** Users can send voice messages in Hindi; the app transcribes and sends as text.

**Requirements:**
- Bhashini STT API integration (Hindi, and Hinglish as fallback)
- Voice recording button in chat UI (hold to record, release to send)
- Transcription displayed to user before sending (editable)
- Plus users only for MVP
- Max recording length: 60 seconds

---

#### F9 — Push Notifications (Daily Check-in Nudge)
**Description:** FCM push notifications to re-engage users.

**Requirements:**
- One daily notification at a user-configurable time (default: 9 PM IST)
- Hinglish copy — rotate between 5–7 variants:
  - "Aaj kaisa raha? Arjun intezaar kar raha hai 😊"
  - "Baat karte hain yaar — kya chal raha hai?"
  - "Thoda time hai? Arjun se baat kar le 💬"
- User can disable in settings
- FCM token stored per user in Postgres

---

### 2.2 Features Explicitly Deferred (Post-MVP)

| Feature | Target |
|---|---|
| iOS version | Month 4 |
| Web app | Month 5 |
| Marathi language support | Month 3 |
| Mood tracking dashboard | Month 2 |
| Social / group features | Month 6+ |
| Referral system | Month 4 |
| Custom personas (female, elder) | Month 3 |

---

## 3. Technical Architecture

### 3.1 Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Mobile app | React Native (Expo), Android only | 95%+ of target market on Android |
| Backend | Python + FastAPI | AI-native ecosystem; async; fast to build |
| Database | Supabase (Postgres) | Auth + DB in one; free tier sufficient for MVP |
| AI APIs | OpenAI GPT-4o Mini | Cost-efficient; good Hinglish quality |
| Memory summarizer | FastAPI background task | Same Python backend, no extra infra |
| Safety check | Python function + AI classification | Runs pre-main AI call |
| Payments | Razorpay Python SDK | Dominant Indian payment gateway |
| Hosting | Railway (Python) | Native Python support; simple deploy |
| Voice STT | Bhashini REST API | Hindi-first; Indian government API |
| Push notifications | Firebase Cloud Messaging | Standard Android push |
| Error tracking | Sentry | Set up from Day 1 |
| Cache / counters | Postgres (Redis optional) | Simplicity for MVP |

### 3.2 System Architecture

```
[React Native App]
       │
       ▼
[FastAPI Backend on Railway]
       │
       ├─── Safety Check (pre-flight, every message)
       │         └── Keyword filter + AI classification call
       │
       ├─── Memory Assembler (builds system prompt)
       │         └── SELECT * FROM memories WHERE user_id = ?
       │
       ├─── OpenAI API call (GPT-4o Mini)
       │
       ├─── Memory Extractor (async background task)
       │         └── Extracts facts → upserts to memories table
       │
       └─── Rate Limiter (checks + increments daily counter)
       
[Supabase]
  ├── users table
  ├── messages table
  ├── memories table
  └── Auth (Phone OTP + JWT)

[Razorpay]
  └── Webhook → POST /webhook/razorpay → upgrade users.tier

[Bhashini STT]
  └── POST /transcribe → returns Hindi text

[FCM]
  └── Daily push notification job (cron)
```

### 3.3 Core API Endpoints

| Method | Route | Description |
|---|---|---|
| POST | `/message` | Send a message; returns AI response |
| GET | `/messages/{conversation_id}` | Fetch message history |
| GET | `/memories` | Fetch user's stored memories |
| DELETE | `/memories/{id}` | Delete a specific memory |
| POST | `/auth/otp/send` | Trigger Supabase phone OTP |
| POST | `/auth/otp/verify` | Verify OTP, return JWT |
| POST | `/webhook/razorpay` | Payment webhook — upgrades tier |
| POST | `/transcribe` | Audio → Hindi text (Bhashini) |

### 3.4 Database Schema (Core Tables)

**users**
```
id          UUID        PK
phone       TEXT        unique
tier        TEXT        'free' | 'plus'
created_at  TIMESTAMP
fcm_token   TEXT
notif_time  TIME        default 21:00 IST
```

**messages**
```
id              UUID        PK
user_id         UUID        FK → users
role            TEXT        'user' | 'assistant'
content         TEXT
created_at      TIMESTAMP
safety_flagged  BOOLEAN     default false
```

**memories**
```
id          UUID        PK
user_id     UUID        FK → users
fact        TEXT
category    TEXT
created_at  TIMESTAMP
updated_at  TIMESTAMP
```

**daily_usage**
```
id          UUID        PK
user_id     UUID        FK → users
date        DATE
msg_count   INT         default 0
```

---

## 4. Build Sequence (12-Week Plan)

### Weeks 1–2: Backend Foundation
- Set up Railway (Python/FastAPI)
- Set up Supabase (Postgres + Auth)
- Wire basic `POST /message` route
- Hardcoded prompt returning a response
- Set up Sentry error tracking
- **Milestone:** Single AI conversation loop working end-to-end

### Weeks 3–4: Memory System
- Build `memories` table and schema
- Build prompt assembler (injects memory facts into system prompt)
- Build async memory extractor (runs after every message)
- Build summarizer job (fires when conversation > 20 messages)
- **Milestone:** 20-message test conversation → AI correctly recalls name, city, one personal detail in new session

### Weeks 5–6: React Native Chat UI
- Chat screen (WhatsApp-style bubble UI)
- Onboarding flow (language select → persona pick → 3-question intake → first message)
- Connect to backend
- Android only
- **Milestone:** Full conversation flow working on Android device

### Week 7: Auth + Rate Limiting
- Supabase phone OTP
- JWT middleware on all backend routes
- Daily message counter (server-side, Postgres)
- Free tier gate (5 messages → Hinglish paywall nudge)
- **Milestone:** Free user hits 5-message limit and sees paywall

### Week 8: Safety Layer + Crisis Path
- Keyword list (Hindi + Hinglish)
- Semantic AI classification check (pre-main-AI-call)
- Crisis response template
- Safety event logging
- **Milestone:** 100% of test crisis messages correctly routed to safety path

### Week 9: Payments
- Razorpay integration (UPI + card)
- Plus tier activation via webhook
- `users.tier` upgrade in Postgres
- Plus gate: memory enabled, unlimited messages
- **Milestone:** Test payment completes → tier upgrades → memory works

### Week 10: Voice Input + Push Notifications
- Bhashini STT integration
- Voice recording UI (hold-to-record)
- FCM push notification setup
- Daily check-in nudge (configurable time)
- **Milestone:** Voice message transcribed and sent; push notification received on test device

### Weeks 11–12: Beta → Play Store
- Closed beta: 20–50 users from personal network
- Monitor message logs obsessively
- Fix breaking issues
- Submit to Play Store as Early Access app
- **Milestone:** App live on Play Store

---

## 5. Monetisation

### 5.1 Pricing
- Free tier: 5 messages/day, no memory, no voice
- Plus tier: ₹149/month — unlimited messages, memory enabled, voice input

### 5.2 Unit Economics (GPT-4o Mini)
| Item | Cost |
|---|---|
| GPT-4o Mini per 1M input tokens | ~$0.15 |
| Avg tokens per conversation (30 msgs) | ~6,000 |
| Cost per active user/month | ~₹3–5 |
| Railway hosting | ~₹2,000/month |
| Supabase (free tier) | ₹0 |
| Bhashini STT | ₹0 (government API) |
| Break-even (paid users) | 200 |

---

## 6. Safety & Compliance

### 6.1 Safety Requirements
- Safety check is mandatory on every message — no exceptions, no feature flags
- Crisis logs must never be deleted
- iCall and Vandrevala Foundation numbers must be current and verified before launch
- Never position the app as a mental health or therapy product in any marketing

### 6.2 Data Privacy
- No conversation data shared with third parties (except OpenAI for inference)
- Users can request memory deletion at any time (DELETE `/memories/{id}`)
- Phone number stored hashed in Postgres
- All API calls over HTTPS

### 6.3 Content Policy
- AI must never provide medical, legal, or financial advice
- AI must never facilitate illegal activity
- AI must never generate sexual or violent content
- Age gate: 18+ (enforced via Play Store listing)

---

## 7. Out of Scope (MVP)

- iOS version
- Web application
- Marathi or regional language support beyond Hinglish
- Mood tracking / analytics dashboard
- Social or group chat features
- Custom AI personas beyond Arjun
- Referral or affiliate system
- Admin dashboard
- Export of conversation history

---

## 8. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Safety check misses a crisis message | Medium | Dual-layer (keyword + semantic); log all; review weekly |
| Memory feels broken or repetitive | High | Thorough testing; upsert logic prevents duplicate facts |
| OpenAI API costs spike | Medium | Per-user daily cap; monitor spend dashboard |
| Low Day-7 retention | High | Push notifications + memory quality are primary levers |
| Play Store rejection | Low | No therapy claims; clear 18+ age gate; privacy policy live before submission |
| Razorpay webhook failures | Medium | Idempotent webhook handler; retry queue |

---

## 9. Launch Checklist (Week 12)

- [ ] Safety check live and tested with 50+ crisis message variants
- [ ] Privacy policy page live (required for Play Store)
- [ ] iCall and Vandrevala numbers verified as current
- [ ] Sentry alerts configured for error spikes
- [ ] Rate limiter tested — cannot be bypassed client-side
- [ ] Razorpay webhook tested end-to-end (payment → tier upgrade)
- [ ] At least 20 beta users have completed 5+ sessions
- [ ] Memory system verified: beta users confirm AI "remembers" them
- [ ] FCM push notifications tested on 3+ Android devices
- [ ] Play Store listing: screenshots, description, age rating (18+), privacy policy URL

---

*Document Owner: Founder / Solo Developer*  
*Next Review: End of Week 4 (after memory system milestone)*
