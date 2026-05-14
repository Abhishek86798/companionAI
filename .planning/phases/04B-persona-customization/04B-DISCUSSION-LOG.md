# Discussion Log — Phase 4B–4E: Persona Customization

**Date:** 2026-05-15
**Mode:** Default interactive

---

## Areas Discussed

All 4 areas selected by user.

---

### Area 1: LocalStorage Migration

**Q1: What happens to existing users (old 3-step onboarding) when persona ships?**
- Options: Redirect to persona setup / Use defaults silently / Banner in /chat
- **Selected:** Use defaults silently
- Notes: Existing users get Arjun + default tone. Can edit from Settings later.

**Q2: Keep old localStorage keys or migrate to new onboarding_data schema?**
- Options: Keep old keys + add arjun_persona (Recommended) / Migrate to nested schema / Two separate code paths
- **Selected:** Keep old keys, add arjun_persona as new flat key
- Notes: Zero migration code. Existing keys untouched. New data in one new key.

---

### Area 2: DB Schema Split

**Q1: Where should companion_name live?**
- Options: One persona table with companion_name included (Recommended) / Split: users + persona tables
- **Selected:** One persona table
- Notes: User cited "minimal DB changes" constraint. One migration, one query. Overrides the implementation plan's split design.

**Q2: Default when no persona row exists?**
- Options: Return defaults in code, never write a row (Recommended) / Lazy-create a default row
- **Selected:** Return defaults in code
- Notes: DB stays clean. get_persona_for_prompt() returns hardcoded defaults when no row found.

---

### Area 3: Persona Sync Timing

**Q1: When does localStorage persona sync to DB?**
- Options: On /chat mount useEffect (Recommended) / After OTP verify on /auth page
- **Selected:** On /chat mount useEffect
- Notes: Sibling effect alongside existing first-load effect. No AuthContext changes needed. Aligns with "existing auth unchanged" constraint.

**Q2: How to prevent duplicate syncs?**
- Options: GET before POST (check DB first) (Recommended) / arjun_persona_synced localStorage flag
- **Selected:** GET before POST
- Notes: Idempotent. One extra read per session start is acceptable.

---

### Area 4: Anonymous User Persona

**Q1: What persona does anon AI see?**
- Options: Always use defaults for anon (Recommended) / Pass persona in request body / Skip persona steps for anon
- **Selected:** Always use defaults for anon
- Notes: No localStorage-to-backend plumbing for anon. Simple. Persona activates after auth + DB sync.

**Q2: Should anon users see persona onboarding steps?**
- Options: Yes — show all 6 steps (Recommended) / No — 3 steps for anon, 6 for logged-in
- **Selected:** Yes — show all 6 steps to everyone
- Notes: Can't detect auth state during onboarding cleanly. Consistent UX. LocalStorage values sit ready for sync on auth.

---

## Deferred Ideas

- Atomic rate limiting — separate reliability phase
- `users` table migration (email, web_push) — Phase 7 (notifications)
- `conversations` table — separate blocker migration, not persona-specific
- localStorage key rename (arjun_* prefix) — defer until persona ships and stabilizes

---

## Decisions Summary

| ID | Decision |
|---|---|
| D-01 | Keep existing localStorage keys unchanged |
| D-02 | Add `arjun_persona` as new flat key for persona data |
| D-03 | Existing users get defaults silently (no re-onboarding) |
| D-04 | One persona table with companion_name included (overrides spec) |
| D-05 | Defaults returned in code; no default row written to DB |
| D-06 | UNIQUE(user_id) on persona, always upsert |
| D-07 | Sync in chat/page.tsx useEffect: GET then POST if no row |
| D-08 | No AuthContext changes for sync |
| D-09 | GET-before-POST prevents duplicates |
| D-10 | Anon chat always uses Arjun defaults |
| D-11 | All 6 onboarding steps shown to everyone |
| D-12 | Basic sanitize: strip backticks, System: prefix, truncate 500 |
| D-13 | Persona injection only for authenticated users |
| D-14 | GET + POST /api/v1/persona, both require auth |
| D-15 | POST updates persona table only, no users table change |
