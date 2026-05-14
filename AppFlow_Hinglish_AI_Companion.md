# App Flow — Navigation & User Journey Map
## Hinglish AI Companion — Web App MVP
**Version:** 1.1  
**Status:** Active  
**Paired Documents:** PRD_Hinglish_AI_Companion.md, TRD_Hinglish_AI_Companion.md

---

## 1. All Pages / Routes

| Route | Page Name | Auth Required | Description |
|---|---|---|---|
| `/` | Root | ❌ | Smart redirect only — no UI of its own |
| `/onboarding` | Onboarding | ❌ | 4-step flow: language → persona → intake → first message |
| `/auth` | Auth | ❌ | Phone OTP or Email OTP login/verify |
| `/chat` | Chat | ✅ (soft — anonymous allowed until quota hit) | Main chat screen with Arjun |
| `/settings` | Settings | ✅ | Notification time, memory view, logout, account |

> **No `/upgrade` route in MVP.** Payments are post-MVP.

---

## 2. Navigation Structure

- **No persistent navbar or sidebar.** This is a full-screen chat app — navigation is contextual, not structural.
- **Mobile-first layout:** single column, full viewport height
- Navigation elements:
  - Top bar on `/chat`: settings icon (⚙, top right) → opens Settings drawer
  - Back button on `/onboarding` steps (except Step 1)
  - Back button on `/auth` → returns to wherever they came from
- **No bottom tab bar for MVP** — only one primary destination (chat)

---

## 3. Entry Points & First Screen Logic

### 3.1 Root `/` Redirect Logic
```
User visits /
│
├── Has valid JWT in localStorage?
│     └── YES → redirect to /chat
│
└── NO (new visitor or logged out)
      └── Has completed onboarding? (check localStorage flag: onboarding_done)
            ├── YES → redirect to /chat  (anonymous session, quota still applies)
            └── NO  → redirect to /onboarding
```

> ⚠️ Onboarding completion is stored in `localStorage` as `onboarding_done: true`. This is only a UX flag — no security implications. Auth and rate limiting are always enforced server-side.

### 3.2 What a Brand New Visitor Sees
1. Lands on `/` → immediately redirected to `/onboarding`
2. Sees Step 1 of onboarding — no splash screen, no landing page for MVP
3. Completes onboarding → lands on `/chat` (no account yet — anonymous session)
4. Chats freely for up to **8 anonymous messages** (configurable: `ANON_MSG_LIMIT = 8`)
5. On message 8 → auth wall appears inline: *"Save your chats & memory — login with phone"*
6. User logs in → returns to `/chat` — now gets **20 messages/day** as authenticated free user

---

## 4. Quota System (Two-Tier)

### 4.1 Anonymous Users (not logged in)
- **8 free messages total** (not per day — this is a lifetime anonymous cap)
- Tracked server-side via session token / IP fingerprint (best-effort; not security-critical)
- Why not 20? Memory injection, history, extraction, and context growth make each message expensive. 20 free messages to anonymous users = abuse vector.
- On hitting limit: inline auth wall (not a full-page redirect)
- After auth: lifetime anonymous count is discarded; daily quota starts fresh

### 4.2 Authenticated Free Users (logged in)
- **20 messages/day**
- Resets at midnight IST (server-side, `daily_usage` table)
- On hitting limit: input disabled, friendly message shown
- No paywall nudge, no upgrade CTA — user simply waits for midnight reset

### 4.3 Plus Users (post-MVP)
- Unlimited messages
- Not implemented in MVP

---

## 5. Onboarding Flow (`/onboarding`)

The onboarding is a **4-step wizard** on a single route. Steps are rendered conditionally via local state — no separate URLs per step.

```
Step 1: Language Select
│   "Kaise baat karein?" (How do you want to talk?)
│   Options: [Hinglish — mix of Hindi + English] [More English] [More Hindi]
│   → User selects → stored in localStorage as language_pref
│   → Next button → Step 2
│
Step 2: Persona Introduction
│   "Meet Arjun — tera naya dost 👋"
│   Short description: warm, non-judgmental, always here
│   Single CTA: [Haan, let's go!]
│   → Click → Step 3
│
Step 3: Intake Form (3 questions, one per screen or stacked)
│   Q1: "Tera naam kya hai?" → text input
│   Q2: "Kahan se hai?" → text input (city)
│   Q3: "Aajkal life mein kya chal raha hai?" → textarea (free text)
│   → [Start chatting] button
│   → Intake responses stored in localStorage (synced to backend on first auth)
│
Step 4: First Message from Arjun
    Redirect to /chat
    Arjun sends a personalized opening message using intake data:
    e.g. "Arre [Name]! Pune mein rehta hai? Bata, kya chal raha hai —
          sun raha hoon main."
    → User is now in the anonymous chat loop
```

**Onboarding rules:**
- No account required to complete onboarding
- No back button on Step 1 (entry point)
- Back button on Steps 2, 3 goes to previous step
- If user navigates away mid-onboarding and comes back → resume from last completed step (track in localStorage)
- Skipping intake questions: not allowed — all 3 are required. Keep them short and conversational.

---

## 6. Auth Flow (`/auth`)

Auth is **not the first thing a user sees** — it's triggered after the anonymous message quota is hit. This maximises conversion by letting users experience the product first.

### 6.1 When Auth is Triggered
- User sends their **8th anonymous message** → backend returns HTTP 429 with `reason: "anon_limit"`
- Frontend shows inline auth wall in chat (not a redirect):
  ```
  ┌──────────────────────────────────────────┐
  │ 💬 Arjun ki yaaddasht save karo!         │
  │ Apna account banao aur baat jaari rakho. │
  │                                          │
  │ [📱 Phone se login]  [📧 Email se login] │
  └──────────────────────────────────────────┘
  ```
- Input box is disabled until authenticated
- Also accessible from: Settings page → [Log out] → [Log in again]

### 6.2 Auth Page Flow
```
/auth
│
├── Tab 1: Phone OTP (default)
│     ├── Input: phone number (with +91 prefix)
│     ├── [Send OTP] button
│     │     → calls supabase.auth.signInWithOtp({ phone })
│     │     → UI switches to OTP entry screen
│     ├── Input: 6-digit OTP
│     ├── [Verify] button
│     │     → calls supabase.auth.verifyOtp({ phone, token, type: 'sms' })
│     │     → on success: JWT stored, user record created in DB
│     │     → redirect to /chat
│     └── [Resend OTP] link (shown after 30 seconds)
│
└── Tab 2: Email OTP (fallback)
      ├── Input: email address
      ├── [Send OTP] button
      │     → calls supabase.auth.signInWithOtp({ email })
      │     → UI switches to OTP entry screen
      ├── Input: 6-digit OTP
      ├── [Verify] button
      │     → on success: same redirect logic as phone
      └── [Resend OTP] link (shown after 30 seconds)
```

### 6.3 Post-Auth Redirect Logic
```
After successful OTP verification → always redirect to /chat
```

### 6.4 Already Logged In
- If user visits `/auth` with a valid JWT → redirect to `/chat` immediately

---

## 7. Chat Page (`/chat`)

The primary screen. Users spend 90%+ of their time here.

### 7.1 Layout
```
┌─────────────────────────────────┐
│  [Arjun 🟢]          [⚙ icon]  │  ← Top bar (fixed)
├─────────────────────────────────┤
│                                 │
│   [Arjun bubble]                │
│             [User bubble]       │
│   [Arjun bubble]                │
│             [User bubble]       │
│                                 │
│   [Arjun is typing...]          │  ← Loading indicator (3 dots)
│                                 │
├─────────────────────────────────┤
│  [🎤] [Type a message...] [➤]  │  ← Input bar (fixed, above keyboard)
└─────────────────────────────────┘
```

- Messages scroll upward; latest message always visible
- Input bar is fixed — uses `dvh` units to stay above Android soft keyboard
- Mic button (🎤): visible on Chrome only; hidden on Firefox/Safari; free for all users
- Send button (➤): disabled while AI is processing a response
- Settings icon (⚙): top right → opens Settings drawer/modal

### 7.2 Sending a Message (Happy Path)
```
User types message → taps [➤]
│
├── Frontend: disable send button, show typing indicator (3 dots)
├── POST /api/v1/message → FastAPI
│     ├── Safety check runs first (keyword scan → semantic classification)
│     │     ├── CRISIS DETECTED → return crisis response immediately (no OpenAI call)
│     │     │     → show crisis message bubble + helpline numbers
│     │     │     → re-enable send button
│     │     │
│     │     └── CLEAN → proceed
│     │
│     ├── Rate limiter check
│     │     ├── Anonymous, count >= 8 → return HTTP 429 (reason: anon_limit)
│     │     │     → frontend shows inline auth wall
│     │     │     → input disabled until auth completes
│     │     │
│     │     ├── Authenticated free, count >= 20 → return HTTP 429 (reason: daily_limit)
│     │     │     → frontend shows daily limit message inline
│     │     │     → input disabled until midnight IST reset
│     │     │
│     │     └── OK → proceed
│     │
│     ├── Memory assembler fetches user memories → builds system prompt
│     ├── OpenAI call → returns full JSON response (no streaming in MVP)
│     └── Background tasks: memory extractor + summarizer (async, non-blocking)
│
├── Frontend: hides typing indicator, renders Arjun's full response bubble
├── Re-enable send button
└── Daily usage counter incremented server-side
```

### 7.3 Voice Input Flow (Chrome only, all users)
```
User clicks [🎤] button
│
├── Web Speech API starts recording (hi-IN primary, en-IN fallback)
├── Click again OR silence detected → stops recording
├── Transcription appears in input box (editable)
└── Tap [➤] to send → same flow as text message
```

If browser doesn't support Web Speech API (Firefox, Safari):
- Mic button is hidden entirely
- No error thrown, no tooltip

### 7.4 Anonymous Quota Reached (8 messages)
```
┌──────────────────────────────────────────┐
│  [Arjun's last response]                 │
│                                          │
│ ──────────────────────────────────────── │
│ 💬 Arjun ki yaaddasht save karo!         │
│ Apna account banao aur baat jaari rakho. │
│                                          │
│ [📱 Phone se login]  [📧 Email se login] │
└──────────────────────────────────────────┘
```
- Input box disabled until user authenticates
- Tapping login button → opens `/auth` in same tab
- After auth → returns to `/chat`, conversation continues

### 7.5 Daily Limit Reached (authenticated, 20 messages)
```
┌────────────────────────────────────────┐
│ [Arjun response text]                  │
│                                        │
│ ─────────────────────────────────────  │
│ Yaar, aaj ke 20 messages ho gaye!      │
│ Kal phir milenge. Take care 🌙         │
└────────────────────────────────────────┘
```
- Input box is disabled for the rest of the day
- Input placeholder: "Kal phir baat karte hain — aaj ka quota khatam! 🌙"
- No upgrade CTA — user simply waits for midnight IST reset

---

## 8. Settings Page (`/settings`)

Accessible via the ⚙ icon in the top bar of `/chat`. Opens as a **full-page drawer** sliding in from the right (on mobile) or a modal panel (on desktop).

### 8.1 Settings Sections

```
Settings
│
├── Account
│     ├── Phone/Email: [+91 98765 43210] (display only)
│     └── [Log out] → confirm modal → clears JWT → redirect to /onboarding
│
├── Notifications
│     ├── Toggle: Enable daily check-in [ON/OFF]
│     ├── Time picker: "Remind me at [9:00 PM ▼]"
│     └── [Save] → POST /api/v1/notifications/subscribe (stores web push subscription)
│
├── Memory
│     ├── "Arjun yaad rakhta hai:" (What Arjun remembers about you)
│     ├── List of memory facts (category + fact):
│     │     e.g. "📍 City: Pune"
│     │          "💼 Job: Software engineer"
│     │          "❤️ Situation: Going through a breakup"
│     ├── Each fact has a [🗑 Delete] button → DELETE /api/v1/memories/{id}
│     │     → Confirm modal: "Yeh memory delete kar doon?" [Yes] [Cancel]
│     └── Empty state: "Abhi kuch yaad nahi hai — thoda aur baat karo!"
│
└── About
      ├── Version: 1.0.0
      ├── Privacy Policy (link)
      └── Terms of Service (link)
```

> **No upgrade/Plus section in MVP.** Payments are post-MVP.

### 8.2 Log Out Flow
```
User taps [Log out]
│
├── Confirm modal: "Pakka log out karna hai?" [Yes] [Cancel]
├── YES → supabase.auth.signOut()
│     → clear React state + localStorage JWT
│     → redirect to /onboarding
│         (onboarding_done flag is preserved — they won't redo onboarding)
└── CANCEL → dismiss modal, stay in settings
```

---

## 9. Core User Journeys

### Journey 1 — Brand New User, First Conversation

```
[Lands on /]
    ↓
Redirect to /onboarding
    ↓
Step 1: Selects "Hinglish"
    ↓
Step 2: Reads about Arjun → taps "Haan, let's go!"
    ↓
Step 3: Fills name, city, situation → taps "Start chatting"
    ↓
Redirect to /chat (anonymous session)
    ↓
Arjun sends personalized first message using intake data
    ↓
User chats freely (messages 1–8, anonymous)
    ↓
After 8th message → inline auth wall appears
Input box disabled
"Arjun ki yaaddasht save karo! Login karo aur jaari rakho."
    ↓
User logs in via phone OTP
    ↓
Returns to /chat — authenticated
Conversation continues — now gets 20 msg/day
```

---

### Journey 2 — Returning Authenticated User, Daily Check-in

```
User receives browser push notification at 9 PM IST:
"Aaj kaisa raha? Arjun intezaar kar raha hai 😊"
    ↓
Clicks notification → browser opens /chat
    ↓
Valid JWT in localStorage → no re-auth needed
    ↓
User picks up conversation from where they left off
    ↓
Sends messages → Arjun responds (full JSON, no streaming)
    ↓
After 20th message → daily limit message appears inline
Input disabled until midnight IST reset
```

---

### Journey 3 — Crisis Path

```
User types a message with crisis keywords
    ↓
Frontend: sends message → typing indicator shows briefly
    ↓
Backend: keyword scan fires → skips OpenAI entirely
    ↓
Returns crisis response immediately (< 500ms)
    ↓
Frontend: renders crisis message bubble:
    "Yaar, sun — jo tu feel kar raha hai woh bahut heavy hai..."
    📞 iCall: 9152987821
    📞 Vandrevala: 1860-2662-345
    ↓
Input box remains enabled (user can keep talking)
    ↓
Backend: safety event logged to safety_events table (never deleted)
    ↓
Conversation continues normally — Arjun stays warm and present
```

---

### Journey 4 — Deleting a Memory

```
User on /chat → taps ⚙ → Settings → Memory section
    ↓
Sees: "❤️ Situation: Going through a breakup"
    ↓
Taps [🗑 Delete] next to that fact
    ↓
Confirm modal: "Yeh memory delete kar doon?" [Yes] [Cancel]
    ↓
Taps [Yes] → DELETE /api/v1/memories/{id}
    ↓
Memory removed from list instantly (optimistic update)
    ↓
Toast: "Memory hata di ✅"
    ↓
Arjun no longer references that fact in future messages
```

---

## 10. Empty States

| Screen | Condition | What the User Sees |
|---|---|---|
| `/chat` | First load after onboarding | Arjun's personalized opening message (from onboarding intake) |
| `/chat` | Returning user, no conversation today | Last conversation visible; Arjun doesn't send a new opening unprompted |
| Settings → Memory | No memories stored yet | "Abhi kuch yaad nahi hai — thoda aur baat karo!" with a friendly illustration |
| `/chat` | Anonymous quota hit | Inline auth wall (not empty state — see section 7.4) |

---

## 11. Error States

| Error | Trigger | What the User Sees |
|---|---|---|
| Network error on send | No internet / Railway down | Toast: "Message nahi gaya. Internet check kar." Send button re-enabled. Message stays in input box. |
| OTP not received | SMS delivery failure | "OTP nahi aaya? Email se try karo" + tab switch to Email OTP |
| Wrong OTP entered | 3 failed attempts | "Galat OTP hai. Dobara bhejo?" + [Resend OTP] button |
| JWT expired mid-session | Token age > 1 hour | Supabase SDK auto-refreshes silently. If refresh fails → toast "Session expire ho gaya" + redirect to `/auth` |
| Safety check API down | OpenAI classification call fails | **Default to crisis response, not normal response.** Log the failure. |
| Anonymous quota hit (429) | 8th anonymous message | Inline auth wall in chat; input disabled until login |
| Daily limit hit (429) | 20th message today (authenticated) | Inline daily limit message; input disabled till midnight IST |
| Memory fetch fails | Supabase down | Settings Memory section shows: "Memories load nahi hui. Refresh karo." No crash. |

---

## 12. Modal & Overlay Interactions

| Modal | Trigger | Actions |
|---|---|---|
| Log out confirm | Tap [Log out] in Settings | [Yes — Log out] → clears session → `/onboarding` / [Cancel] → dismiss |
| Delete memory confirm | Tap [🗑 Delete] on any memory | [Yes, hata do] → DELETE API call / [Cancel] → dismiss |
| Notification permission | After user's 3rd session | Browser-native permission prompt (cannot customise UI) — shown once |

**Settings drawer/panel** is not a modal — it's a slide-in page overlay that covers the chat screen. Back button / tap outside → closes it.

---

## 13. Redirect Map (Complete)

| Action / Event | Redirect To |
|---|---|
| New visitor hits `/` | `/onboarding` |
| Returning logged-in user hits `/` | `/chat` |
| Returning anonymous user (onboarding done) hits `/` | `/chat` |
| Completes onboarding Step 4 | `/chat` |
| OTP verified | `/chat` |
| Log out | `/onboarding` |
| Visits `/auth` while already logged in | `/chat` |
| Visits `/chat` while logged out | `/chat` (anonymous session allowed until quota hit) |
| Visits `/settings` while logged out | `/auth` |
| Taps back on `/settings` | `/chat` |
| Taps ⚙ in chat | Opens Settings drawer (no route change) |
| Anonymous quota hit | Inline auth wall in `/chat` (no redirect) |
| Daily limit hit (authenticated) | Stays on `/chat`, input disabled |

---

## 14. Constants (configurable in `constants.ts` / `config.py`)

| Constant | Value | Description |
|---|---|---|
| `ANON_MSG_LIMIT` | `8` | Max messages for anonymous users before auth wall |
| `FREE_DAILY_LIMIT` | `20` | Max messages/day for authenticated free users |
| `NOTIF_DEFAULT_TIME` | `21:00 IST` | Default daily check-in notification time |
| `SUMMARIZE_THRESHOLD` | `20` | Message count that triggers conversation summarizer |
| `SUMMARIZE_INTERVAL` | `20` | Re-run summarizer every N messages after threshold |

---

*Document Owner: Founder / Solo Developer*  
*Version 1.1 — Updated: two-tier quota (8 anon / 20 auth), no paywall/upgrade in MVP, voice free for all, JSON not SSE*  
*Next Review: Before Week 7 (auth + rate limiting build)*  
*Paired Documents: PRD_Hinglish_AI_Companion.md, TRD_Hinglish_AI_Companion.md*
