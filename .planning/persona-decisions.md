# Persona Customization — Implementation Decisions
_2026-05-15 | Source: 04B-CONTEXT.md + plan checker_

---

## DB Schema
- **One `persona` table** — `(id, user_id UNIQUE, companion_name DEFAULT 'Arjun', tone, expectation, open_field, created_at, updated_at)`
- No changes to `users` table
- RLS enabled; trigger for `updated_at`; index on `user_id`
- Apply via Supabase MCP (`mcp__supabase__apply_migration`), `autonomous: false`

## Backend API
- **Two endpoints:** `GET /api/v1/persona` + **`POST` /api/v1/persona** (upsert on `user_id` conflict) — **POST not PUT**
- Both require `require_current_user`
- `get_persona_for_prompt(user_id)` — **synchronous** (no async/await, follows supabase-py sync pattern)
- Returns `{"companion_name": "Arjun", "tone": None, "expectation": None, "open_field": None}` when no row — never writes a default row
- `sanitize_persona_field(text, max_len=500)` — strips `` ``` `` fences, strips `"System:"` prefix, truncates to 500 chars
- `build_system_prompt()` — skips persona fetch when `user_id is None` (anon always gets Arjun defaults)

## System Prompt Injection
- `_SYSTEM_TEMPLATE` in `ai.py` replaces hardcoded "You are Arjun" with `{companion_name}` + tone/expectation fields
- Persona only injected for authenticated users

## localStorage
- Keep all existing `arjun_*` keys unchanged
- Add one new key: `arjun_persona = { companion_name, tone, expectation }`
- Existing users (3-step onboarding done): get Arjun defaults silently, no re-onboarding

## Persona Sync (chat/page.tsx useEffect)
1. GET /api/v1/persona
2. If GET returns a row with `companion_name` → skip POST
3. If no row AND `arjun_persona` in localStorage → POST /api/v1/persona
4. On successful POST → clear `arjun_persona` from localStorage
- No AuthContext changes

## Anonymous Users
- Always use Arjun defaults in AI prompt — no localStorage-to-backend plumbing
- All 6 onboarding steps shown to everyone regardless of auth state

## Onboarding UI (3 steps → 6 steps)
- Steps 0–5 (fix 4-dot bug → 6 dots)
- Step 3: CompanionNameStep — text input, max 30 chars, pre-filled "Arjun", empty → "Arjun"
- Step 4: ToneStep — 4 option cards: `funny_chill` / `motivating` / `logical` / `just_listen` + optional free text (combined into `tone` field)
- Step 5: ExpectationStep — textarea, soft min 10 chars, CTA label: **"Start chatting →"** (not `c.go`)
- Step 5 submit: write `arjun_persona` to localStorage, set `arjun_onboarding_done=true`, redirect to `/chat`

## Frontend Hook
- `web/hooks/usePersona.ts` — React Query wrapper for GET /api/v1/persona
- `enabled: !!session?.access_token` — returns `{ companion_name: 'Arjun' }` fallback when unauthenticated

## Plan Files (6 plans, 3 waves)
| Plan | Wave | autonomous | What |
|---|---|---|---|
| 04B-PLAN-01 | 1 | **false** | DB migration |
| 04B-PLAN-02 | 1 | true | Schemas + persona router |
| 04B-PLAN-03 | 1 | true | get_persona_for_prompt + prompt injection |
| 04B-PLAN-04 | 2 | true | Onboarding 6 steps |
| 04B-PLAN-05 | 2 | true | usePersona hook + chat top bar + sync |
| 04B-PLAN-06 | 3 | true | Settings persona edit |

## Known issues in plans (fix before executing)
- PLAN-02/05/06: change `PUT /api/v1/persona` → `POST /api/v1/persona` everywhere
- PLAN-03: `get_persona_for_prompt` must be `def` not `async def`
- PLAN-04: tone options must be 4 cards (funny_chill/motivating/logical/just_listen), not 3
- PLAN-04: ExpectationStep CTA must be `"Start chatting →"`, not `c.go`
- PLAN-05 Task 4: sync useEffect must GET before POST (not POST immediately)
