# Implementation Plan — Persona Customization
## Hinglish AI Companion — Feature Addition
**Version:** 1.0  
**Inserts after:** Phase 4 (Onboarding) in the main Implementation Plan  
**New phases added:** 4B (DB), 4C (Backend), 4D (Onboarding UI update), 4E (System prompt wiring)

---

## What This Adds

- User defines how they want the AI to behave during onboarding
- User can name the AI companion whatever they want (default: Arjun)
- Persona is stored in DB and injected into every system prompt
- Persona is editable later from Settings

---

## Phase 4B — DB Changes

**Goal:** Persona and companion name are stored in the database.

### 4B.1 New Table — `public.persona`

Run in Supabase SQL editor:

```sql
CREATE TABLE public.persona (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tone         TEXT,        -- how they want the AI to behave
  expectation  TEXT,        -- what they expect from the AI
  open_field   TEXT,        -- anything else they want to share
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)           -- one persona per user; always upsert
);

-- Auto-update updated_at
CREATE TRIGGER persona_updated_at
  BEFORE UPDATE ON public.persona
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Index for fast lookup
CREATE INDEX idx_persona_user_id ON public.persona(user_id);

-- RLS
ALTER TABLE public.persona ENABLE ROW LEVEL SECURITY;
CREATE POLICY "persona_own" ON public.persona
  FOR ALL USING (auth.uid() = user_id);
```

### 4B.2 Alter `public.users` Table

```sql
-- Companion name — what the user calls their AI
ALTER TABLE public.users
  ADD COLUMN companion_name TEXT NOT NULL DEFAULT 'Arjun';
```

### 4B.3 Update `daily_usage` for anon session support

```sql
-- Already decided in Q3 resolution — add if not already done
ALTER TABLE public.daily_usage
  ADD COLUMN IF NOT EXISTS anon_session_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_usage_anon_date
  ON public.daily_usage(anon_session_id, date)
  WHERE anon_session_id IS NOT NULL;
```

### 4B.4 Update localStorage schema for onboarding

During onboarding (before auth), persona answers are stored locally:

```ts
// localStorage key: 'onboarding_data'
{
  language_pref: 'hinglish' | 'english' | 'hindi',
  intake: {
    name: string,
    city: string,
    situation: string
  },
  persona: {
    companion_name: string,   // what user wants to call the bot
    tone: string,             // how they want it to behave
    expectation: string,      // what they expect
    open_field: string        // anything else (optional)
  }
}
```

### ✅ Phase 4B Done Criteria
- `public.persona` table exists with RLS enabled
- `public.users.companion_name` column exists, defaults to `'Arjun'`
- Trigger on `persona` updates `updated_at` correctly
- Index on `persona.user_id` exists

---

## Phase 4C — Backend Changes

**Goal:** Persona is stored, retrieved, and injected into every AI system prompt.

### 4C.1 Pydantic Schemas (`app/models/schemas.py`)

Add:

```python
class PersonaUpsert(BaseModel):
    companion_name: str = Field(..., min_length=1, max_length=30)
    tone: str = Field(..., min_length=1, max_length=500)
    expectation: str = Field(..., min_length=1, max_length=500)
    open_field: str | None = Field(None, max_length=500)

class PersonaResponse(BaseModel):
    companion_name: str
    tone: str | None
    expectation: str | None
    open_field: str | None
```

### 4C.2 New Router — `app/routers/persona.py`

```python
# GET /api/v1/persona  (require_current_user)
# → fetch persona row for user, return PersonaResponse

# POST /api/v1/persona  (require_current_user)
# → upsert persona row (INSERT or UPDATE on conflict user_id)
# → also update users.companion_name
# → return PersonaResponse
```

Register in `app/main.py` with prefix `/api/v1`.

### 4C.3 Update `app/services/memory.py` — Add `get_persona_for_prompt()`

```python
async def get_persona_for_prompt(user_id: str) -> dict:
    """
    Returns:
    {
      "companion_name": "Arjun",   # or whatever user set
      "tone": "...",
      "expectation": "...",
      "open_field": "..."
    }
    Returns defaults if no persona row exists yet.
    """
```

### 4C.4 Update `app/services/ai.py` — Inject Persona into System Prompt

Current system prompt template:
```
You are Arjun, a close Indian friend...
About the person you're talking to:
{memory_facts_injected_here}
```

Updated template:
```
You are {companion_name}, a close Indian friend chosen by the user.

How the user wants you to behave:
- Tone/style: {tone}
- What they expect from you: {expectation}
{open_field_line}

About the person you're talking to:
{memory_facts_injected_here}

Important: Address yourself as {companion_name} if you ever refer to yourself.
Respond in the language style the user prefers.
```

Update `build_system_prompt(user_id)` to:
1. Call `get_persona_for_prompt(user_id)`
2. Call `get_memories_for_prompt(user_id)`
3. Inject both into the template

### 4C.5 Update `get_current_user()` lazy-create in `dependencies.py`

When creating `public.users` row on first JWT:
- Set `companion_name = 'Arjun'` (default)
- Persona row is created separately via `POST /api/v1/persona` after onboarding

### 4C.6 Update `app/routers/chat.py` top bar response (optional)

When frontend loads `/chat`, it needs to know the companion name to display in the top bar.
Add `companion_name` to the user profile endpoint or return it from `GET /api/v1/persona`.
Frontend reads it from there — no more hardcoded "Arjun" in the UI.

### ✅ Phase 4C Done Criteria
- `POST /api/v1/persona` upserts persona and updates `users.companion_name`
- `GET /api/v1/persona` returns current persona for authenticated user
- `build_system_prompt()` includes companion name + tone + expectation in every prompt
- Send a test message after setting persona — confirm AI response reflects the set tone
- Companion name is no longer hardcoded anywhere in `ai.py`

---

## Phase 4D — Onboarding UI Update

**Goal:** Onboarding now has 2 additional steps for persona setup. User names the companion and defines behavior.

### Updated Onboarding Flow (6 steps total)

```
Step 1: Language Select         (existing — unchanged)
Step 2: Persona Introduction    (existing — updated copy)
Step 3: Intake Form             (existing — name, city, situation)
Step 4: Name your companion     (NEW)
Step 5: How should I behave?    (NEW)
Step 6: What do you expect?     (NEW)
→ Redirect to /chat
```

### 4D.1 Step 4 — Name Your Companion

**File:** `src/components/onboarding/CompanionName.tsx`

```
Screen copy:
  Heading: "Usse kya bulaaun?"
  Subtext: "Iska naam rakh — jo chahe. Default hai 'Arjun'."

  Input: text field, placeholder "Arjun"
         max 30 characters
         pre-filled with "Arjun"

  [Next →] button
```

- Stored in `localStorage` as `onboarding_data.persona.companion_name`
- If left blank or cleared: default to `'Arjun'`

### 4D.2 Step 5 — Tone / Behavior

**File:** `src/components/onboarding/PersonaTone.tsx`

```
Screen copy:
  Heading: "Main kaisa behave karun?"
  Subtext: "Apne hisaab se choose kar."

  Option cards (tap to select, one choice):
  ┌─────────────────────┐  ┌─────────────────────┐
  │ 😄 Funny & chill    │  │ 💪 Motivating       │
  │ Halka phulka        │  │ Push karta rahe      │
  └─────────────────────┘  └─────────────────────┘
  ┌─────────────────────┐  ┌─────────────────────┐
  │ 🧠 Logical          │  │ 🤗 Just listen      │
  │ Practical advice    │  │ Bina advice ke       │
  └─────────────────────┘  └─────────────────────┘

  + free text input (optional):
  "Ya apne words mein batao..." (placeholder)
  max 200 chars

  [Next →] button (enabled even if only card selected)
```

- Card selection + optional text combined into `tone` field
- Stored as `onboarding_data.persona.tone`

### 4D.3 Step 6 — Expectation

**File:** `src/components/onboarding/PersonaExpectation.tsx`

```
Screen copy:
  Heading: "Tujhse kya chahiye mujhe?"
  Subtext: "Honest reh — yahi kaam aayega."

  Free text textarea:
  Placeholder: "Jaise — vent karna hai, ya solution chahiye, 
                ya bas koi sun le..."
  min_length: 10 (soft — show hint if empty on submit)
  max_length: 500

  [Start chatting →] button
```

- Stored as `onboarding_data.persona.expectation`
- On submit:
  1. Set `onboarding_data.persona.open_field = null` (no 4th question for MVP)
  2. Set `localStorage` flag `onboarding_done: true`
  3. Redirect to `/chat`

### 4D.4 Update `OnboardingPage.tsx`

- Add steps 4, 5, 6 to the step state
- Update progress dots from 4 → 6 dots
- Add back button on Steps 4, 5, 6
- On Step 6 submit: save full `onboarding_data` to localStorage, then redirect

### 4D.5 Sync localStorage Persona to DB After Auth

When a user completes auth (`onAuthStateChange` fires with a session):

```ts
// In AuthContext.tsx — post-auth sync
const syncPersonaToDB = async () => {
  const data = localStorage.getItem('onboarding_data')
  if (!data) return
  const { persona } = JSON.parse(data)
  if (!persona) return

  // POST to /api/v1/persona with JWT
  await api.post('/persona', persona)
  // Don't clear localStorage yet — needed for chat page first message
}
```

This ensures persona reaches the DB even though onboarding happens before auth.

### ✅ Phase 4D Done Criteria
- Onboarding has 6 steps, back navigation works on all steps 2–6
- Step 4 stores companion name (defaults to 'Arjun' if blank)
- Step 5 card selection works; free text is optional
- Step 6 free text required (soft validation — hint shown if empty)
- After Step 6 submit: `onboarding_done: true` in localStorage, redirected to `/chat`
- After auth: `POST /api/v1/persona` is called with the stored answers
- `public.persona` row exists in Supabase after a complete onboarding + auth flow

---

## Phase 4E — System Prompt Wiring & Chat UI Update

**Goal:** Companion name appears in the chat UI top bar. AI behavior reflects the set persona.

### 4E.1 Frontend — Read Companion Name for Top Bar

```ts
// src/hooks/usePersona.ts
// React Query wrapper for GET /api/v1/persona
// Returns { companion_name, tone, expectation, open_field }
// Fallback: { companion_name: 'Arjun' } if unauthenticated or not set
```

In `ChatPage.tsx` top bar:
```tsx
// Replace hardcoded "Arjun" with:
const { data: persona } = usePersona()
<span>{persona?.companion_name ?? 'Arjun'}</span>
```

Avatar initial also updates:
```tsx
<Avatar initial={persona?.companion_name?.[0]?.toUpperCase() ?? 'A'} />
```

### 4E.2 Backend — Verify Prompt Injection End-to-End

Manual test sequence:
1. Set persona via `POST /api/v1/persona`:
   ```json
   {
     "companion_name": "Rocky",
     "tone": "Funny & chill — halka phulka",
     "expectation": "Bas sun le, advice mat de"
   }
   ```
2. Send message: "Yaar kya scene hai aajkal"
3. Verify response:
   - Tone is casual and funny, not advice-giving
   - If AI refers to itself, it says "Rocky" not "Arjun"
4. Check system prompt being sent (add debug logging in `ai.py` for dev mode)

### 4E.3 Settings Page — Add Persona Edit Section

In `SettingsPage.tsx`, add a new section above Memory:

```
COMPANION
┌─────────────────────────────────────┐
│ Name: [Rocky              ] ✏️      │
│ Tone: Funny & chill                 │
│ Expects: Bas sun le...              │
│                    [Edit →]         │
└─────────────────────────────────────┘
```

[Edit →] opens a modal or navigates to a dedicated edit screen with the same 3 fields from onboarding Steps 4–6. On save:
- `POST /api/v1/persona` with updated values
- Invalidate `usePersona` React Query cache
- Toast: "Done! [Rocky] ab waise hi behave karega. ✅"

### ✅ Phase 4E Done Criteria
- Chat top bar shows companion name from DB (not hardcoded)
- Avatar initial matches companion name first letter
- AI responses reflect the set tone — verified manually with 3 different persona configs
- Persona edit in Settings saves and reflects immediately in next AI response
- "Arjun" does not appear anywhere hardcoded in the frontend or backend prompt

---

## Updated Full Phase Order

| Phase | Name | Depends On |
|---|---|---|
| 1 | Project Setup | — |
| 2 | Database Schema | 1 |
| 3 | Authentication | 2 |
| 4 | Onboarding (original 4 steps) | 3 |
| **4B** | **DB changes for persona** | **2** |
| **4C** | **Backend persona API + prompt wiring** | **4B, 3** |
| **4D** | **Onboarding UI — 6 steps** | **4C, 4** |
| **4E** | **Chat UI + Settings persona edit** | **4D** |
| 5 | Core AI Chat | 4E |
| 6 | Memory Management UI | 5 |
| 7 | Push Notifications + Voice | 6 |
| 8 | UI Polish | 7 |
| 9 | Deploy | 8 |

---

## What Changes in Existing Docs

| Doc | Section | Change |
|---|---|---|
| BackendSchema | Table list | Add `public.persona` table; add `companion_name` column to `public.users` |
| BackendSchema | Section 11 (API endpoints) | Add `GET /api/v1/persona` and `POST /api/v1/persona` |
| TRD | Section 3.3 (API table) | Add persona endpoints |
| AppFlow | Section 4 (Onboarding) | Update from 4 steps to 6 steps |
| UIUXBrief | Section 7.2 (Onboarding design) | Add design for Steps 4, 5, 6 |
| PRD | Feature F1 (AI Chat) | Note that companion name and tone are user-configurable |

---

## One Important Constraint

The `tone` and `expectation` fields are free text injected directly into the system prompt. Add a **max_length validation** on both (500 chars each — already in schemas) and sanitize before injection:

```python
# In ai.py — before prompt assembly
def sanitize_persona_field(text: str | None, max_len: int = 500) -> str:
    if not text:
        return ""
    # Strip any prompt injection attempts
    cleaned = text.replace("```", "").replace("System:", "").strip()
    return cleaned[:max_len]
```

This prevents a user from injecting "Ignore previous instructions..." into their own system prompt and breaking the AI behavior. Basic but sufficient for MVP.

---

*Document Owner: Founder / Solo Developer*  
*Next Review: Before Phase 4B starts*  
*Parent Document: ImplementationPlan_Hinglish_AI_Companion.md*
