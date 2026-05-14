# Phase 4B–4E: Persona Customization — Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Add user-controlled persona customization to the AI companion. Users name their companion, define its tone, and set expectations during onboarding. Persona is stored in DB (authenticated users only), injected into every system prompt, and editable from Settings. Covers: DB migration, backend API, onboarding UI extension (3 → 6 steps), chat top bar, and Settings edit section.

**Not in scope:** AuthContext rewrite, rate limiter changes, safety layer changes, push notifications, voice input, multi-conversation support.

</domain>

<decisions>
## Implementation Decisions

### LocalStorage Strategy
- **D-01:** Keep existing localStorage keys unchanged (`arjun_intake`, `arjun_onboarding_done`, `arjun_lang_pref`, `arjun_first_sent`, `arjun_onboarding_step`). Do NOT migrate to `onboarding_data` nested schema.
- **D-02:** Add one new flat key: `arjun_persona` for storing `{ companion_name, tone, expectation }`. No nesting, no migration code required.
- **D-03:** Existing users who completed the 3-step onboarding get defaults silently (no re-onboarding redirect, no banner). They can edit from Settings later.

### DB Schema
- **D-04:** One `persona` table only — `persona(id, user_id, companion_name, tone, expectation, open_field, created_at, updated_at)`. Do NOT add `companion_name` to `users` table. One migration, one query.
- **D-05:** `companion_name` defaults to `'Arjun'` in application code when no row exists. No default row is written to DB. `get_persona_for_prompt()` returns `{ companion_name: 'Arjun', tone: None, expectation: None, open_field: None }` when no persona row exists.
- **D-06:** `UNIQUE(user_id)` constraint on `persona` table — always upsert, never insert duplicates.

### Persona Sync Timing
- **D-07:** Persona syncs to DB inside `chat/page.tsx` in a `useEffect` that runs after session is confirmed. Sequence: `GET /api/v1/persona` → if no row exists AND `arjun_persona` is in localStorage → `POST /api/v1/persona` with the localStorage values → clear `arjun_persona` from localStorage on success.
- **D-08:** No changes to auth flow or AuthContext required. Sync is a page-level side-effect, not a global auth hook.
- **D-09:** GET-before-POST prevents duplicate syncs across page reloads. No additional localStorage flag needed.

### Anonymous User Persona
- **D-10:** Anonymous users always see default persona (`Arjun`, no tone/expectation injected). No localStorage-to-backend plumbing for anon chat. Persona only activates after DB sync (authenticated).
- **D-11:** All 6 onboarding steps are shown to everyone regardless of auth state. Anon users fill in persona steps → saved to `arjun_persona` localStorage → activates when they later log in and sync.

### Prompt Safety
- **D-12:** Sanitize `tone` and `expectation` before system prompt injection: strip backtick fences (` ``` `), strip `"System:"` prefix, truncate to 500 chars. Basic but sufficient for MVP. Implemented in `ai.py` as `sanitize_persona_field()`.
- **D-13:** Persona fields are injected into the system prompt only for authenticated users (`user_id` is not None). Anonymous system prompt uses existing template with default name.

### Backend API
- **D-14:** Two endpoints: `GET /api/v1/persona` (returns current persona or defaults) and `POST /api/v1/persona` (upsert — insert or update on `user_id` conflict). Both require authentication (`require_current_user`).
- **D-15:** `POST /api/v1/persona` updates `persona` table only. No change to `users` table needed (D-04 decision).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Specification
- `docs/ImplementationPlan_PersonaCustomization.md` — Full phase spec (4B–4E). Note: D-04 overrides 4B.1 (one table, not split). D-02 overrides 4B.4 (keep old keys, add `arjun_persona`). All other sections remain authoritative.

### Files to extend (backend)
- `backend/app/services/ai.py` — `build_system_prompt()` at line 42; `_SYSTEM_TEMPLATE` at line 11. Both must be updated to inject `companion_name`, `tone`, `expectation`.
- `backend/app/services/memory.py` — `get_memories_for_prompt()` is the pattern to follow for `get_persona_for_prompt()`.
- `backend/app/models/schemas.py` — Add `PersonaUpsert` and `PersonaResponse` schemas here.
- `backend/app/main.py` — Register `persona` router here with `prefix="/api/v1"`.
- `backend/app/dependencies.py` — `require_current_user` is the auth dependency to use on persona endpoints.

### Files to extend (frontend)
- `web/app/onboarding/page.tsx` — 3 steps (0–2) → 6 steps (0–5). Uses `arjun_intake`, `arjun_onboarding_done`, `arjun_lang_pref`, `arjun_onboarding_step` keys. Add `arjun_persona` write on Step 5 (last step). Fix the 4-dot bug (currently 4 dots for 3 steps — extend to 6 dots).
- `web/app/chat/page.tsx` — Add persona sync `useEffect`. Replace hardcoded `"Arjun"` and `"A"` initial in top bar with `usePersona()` hook output.
- `web/context/AuthContext.tsx` — Do NOT modify. Sync is page-level, not in AuthContext.

### Codebase maps
- `.planning/codebase/CONCERNS.md` — Risk registry. Read the "Persona Customization Status" and "Pending DB Migrations" sections before planning.
- `.planning/codebase/STRUCTURE.md` — Annotated file tree. Confirms: no `persona.py` router exists yet, no `usePersona` hook exists.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/app/services/memory.py` → `get_memories_for_prompt(user_id)`: exact pattern for `get_persona_for_prompt(user_id)`. Same: Supabase SELECT + format as string. Returns a formatted string for injection, not a dict.
- `backend/app/routers/memories.py`: pattern for a new protected router with `require_current_user`. Copy the structure for `persona.py`.
- `web/app/onboarding/page.tsx`: `BackButton` component, `goTo()` slide transition, `LS_*` key pattern — all reusable for Steps 4–6.
- `web/app/onboarding/page.tsx`: `inputCls` + `inputInline` style constants — reuse for new step inputs.

### Established Patterns
- System prompt is built in `build_system_prompt(user_id)` in `ai.py` — this is the single insertion point. Planner should NOT add persona injection anywhere else.
- All DB reads use synchronous `supabase` client (from `app/db.py`) inside async handlers — follow this pattern for `get_persona_for_prompt()`. Do not introduce async DB calls.
- Supabase upsert pattern: `supabase.table("persona").upsert(row, on_conflict="user_id").execute()` — use this for `POST /api/v1/persona`.
- Frontend auth check: `useAuth()` from `context/AuthContext.tsx` returns `{ session, isLoading }`. Use `session?.access_token` for Bearer token on API calls.

### Integration Points
- `build_system_prompt(user_id)` in `ai.py:42` — add `await get_persona_for_prompt(user_id)` call here, parallel to `get_memories_for_prompt()`.
- `chat/page.tsx` line ~80 — the first-load `useEffect` block is where the persona sync `useEffect` goes (sibling effect, same deps: `[isLoading, session]`).
- `onboarding/page.tsx` — the `finish()` function at line 116 is where `arjun_persona` gets written to localStorage before redirect.

</code_context>

<specifics>
## Specific Requirements

- Onboarding Steps 4–6 must use the same slide animation, `BackButton`, and progress dot style as existing steps.
- The progress dots must update from 4 dots to 6 dots (fixing the existing 4-dot / 3-step mismatch bug at the same time).
- `PersonaTone` step (Step 5): 4 option cards (Funny & chill, Motivating, Logical, Just listen) + optional free-text input. Card selection + text combine into the `tone` field.
- `PersonaExpectation` step (Step 6): free-text textarea, soft min 10 chars (hint on empty submit, not hard block).
- Step 6 submit CTA: "Start chatting →" (replaces existing "Chalo baat karte hain!" on Step 2).
- `companion_name` input on Step 4: max 30 chars, pre-filled with "Arjun", empty → default to "Arjun".
- Chat top bar: after persona sync, show `companion_name` from DB. Before sync or on error: fall back to "Arjun". Avatar initial = `companion_name[0].toUpperCase()`.
- Settings persona edit: read `docs/ImplementationPlan_PersonaCustomization.md §4E.3` for the exact UI spec.

</specifics>

<deferred>
## Deferred Ideas

- **Atomic rate limiting** (`INSERT ... ON CONFLICT DO UPDATE SET msg_count = msg_count + 1`) — noted as tech debt in CONCERNS.md. Belongs in a separate reliability phase.
- **`users` table migration** (email, web_push columns) — required for notifications (Phase 7), not persona.
- **`conversations` table creation** — highest-priority DB blocker for chat, but not persona-specific. Needs its own migration plan before Phase 5 can be tested end-to-end.
- **LocalStorage key rename** (`arjun_*` prefix feels wrong once companion may not be called Arjun) — deliberate deferral. Rename after persona ships and names stabilize.

</deferred>

---

*Phase: 4B-4E Persona Customization*
*Context gathered: 2026-05-15*
