---
id: 04B-PLAN-05
title: "usePersona hook + chat top bar + persona sync useEffect"
wave: 2
depends_on: [04B-PLAN-02]
files_modified:
  - web/hooks/usePersona.ts
  - web/lib/api.ts
  - web/app/chat/page.tsx
autonomous: true
must_haves:
  truths:
    - "web/hooks/usePersona.ts exists and exports usePersona()"
    - "usePersona() returns { companion_name: string, tone: string|null, expectation: string|null } with fallback companion_name='Arjun' when unauthenticated or no DB row"
    - "usePersona uses React Query (useQuery) with queryKey ['persona', token]"
    - "fetchPersona and upsertPersona functions exist in web/lib/api.ts"
    - "Chat top bar shows companion_name from usePersona() instead of hardcoded 'Arjun'"
    - "Chat avatar initial shows first character of companion_name instead of hardcoded 'A'"
    - "Persona sync useEffect in chat/page.tsx: on mount, if authenticated and no DB row, checks localStorage arjun_persona and POSTs to PUT /api/v1/persona, then clears arjun_persona from localStorage"
    - "Anonymous users: persona is not fetched; top bar shows 'Arjun' via fallback"
  commands:
    - "grep -n 'usePersona' web/hooks/usePersona.ts"
    - "grep -n 'fetchPersona\|upsertPersona' web/lib/api.ts"
    - "grep -n 'usePersona' web/app/chat/page.tsx"
---

## Objective

Create the usePersona hook as a React Query wrapper for GET /api/v1/persona. Add fetchPersona and upsertPersona to api.ts. Update chat/page.tsx to use the hook in the top bar and add the persona sync useEffect that migrates localStorage data to the DB on first authenticated load.

## Tasks

### Task 1: Add fetchPersona and upsertPersona to api.ts

<read_first>
- web/lib/api.ts (reason: existing fetchMemories pattern — fetch call, Authorization header, error handling, return type)
</read_first>

<action>
In web/lib/api.ts, append after the deleteMemory function:

1. Add interface PersonaData:
   { companion_name: string; tone: string | null; expectation: string | null; open_field?: string | null; }

2. Add fetchPersona(token: string): Promise<PersonaData>:
   - GET ${API}/persona with Authorization Bearer token and credentials: "include"
   - If !res.ok throw new Error("Failed to fetch persona")
   - Return res.json() as PersonaData

3. Add upsertPersona(data: { companion_name: string; tone?: string | null; expectation?: string | null }, token: string): Promise<PersonaData>:
   - PUT ${API}/persona with Authorization Bearer token, Content-Type application/json, credentials: "include"
   - Body: JSON.stringify(data)
   - If !res.ok throw new Error("Failed to upsert persona")
   - Return res.json() as PersonaData
</action>

<acceptance_criteria>
- grep -n "fetchPersona\|upsertPersona\|PersonaData" web/lib/api.ts returns 3+ lines
- TypeScript: npx tsc --noEmit exits 0 from web/ directory
</acceptance_criteria>

### Task 2: Create web/hooks/usePersona.ts

<read_first>
- web/app/settings/page.tsx lines 1-45 (reason: see how useQuery and useAuth are combined — queryKey pattern, enabled: !!session, staleTime)
- web/context/AuthContext.tsx (reason: confirm useAuth() exports session with access_token)
</read_first>

<action>
Create web/hooks/usePersona.ts.

"use client" is NOT needed — hooks don't need it.

Imports:
  - useQuery from @tanstack/react-query
  - useAuth from @/context/AuthContext
  - fetchPersona, PersonaData from @/lib/api

const PERSONA_FALLBACK: PersonaData = { companion_name: "Arjun", tone: null, expectation: null };

export function usePersona(): PersonaData {
  const { session } = useAuth();
  const token = session?.access_token;

  const { data } = useQuery({
    queryKey: ["persona", token],
    queryFn: () => fetchPersona(token!),
    enabled: !!token,
    staleTime: 60_000,
    retry: 1,
  });

  return data ?? PERSONA_FALLBACK;
}

The hook returns PersonaData directly (not the full query object) — callers only need the values, not loading state.
</action>

<acceptance_criteria>
- File web/hooks/usePersona.ts exists
- grep -n "export function usePersona" web/hooks/usePersona.ts returns 1 line
- TypeScript: npx tsc --noEmit exits 0 from web/ directory
</acceptance_criteria>

### Task 3: Update chat/page.tsx top bar to use usePersona

<read_first>
- web/app/chat/page.tsx lines 1-10 (reason: existing imports to extend)
- web/app/chat/page.tsx lines 190-220 (reason: exact location of hardcoded "A" avatar and "Arjun" text — lines ~199 and ~203)
</read_first>

<action>
In web/app/chat/page.tsx:

1. Add import at top: import { usePersona } from "@/hooks/usePersona";

2. Inside ChatPage component, after existing useState declarations, add:
   const persona = usePersona();

3. In the top bar JSX:
   - Replace the avatar div's inner text "A" with: {persona.companion_name.charAt(0).toUpperCase()}
   - Replace the <p> text "Arjun" (line ~203) with: {persona.companion_name}

No other changes to the top bar.
</action>

<acceptance_criteria>
- grep -n '"A"' web/app/chat/page.tsx no longer shows lines 199 or 203 having the literal standalone "A" string
- grep -n 'persona.companion_name' web/app/chat/page.tsx returns 2 lines (avatar initial + name display)
- TypeScript: npx tsc --noEmit exits 0
</acceptance_criteria>

### Task 4: Add persona sync useEffect to chat/page.tsx

<read_first>
- web/app/chat/page.tsx lines 80-123 (reason: exact location and pattern of the first-load intake useEffect — the persona sync useEffect is a sibling, placed immediately after it)
</read_first>

<action>
In web/app/chat/page.tsx, add a new useEffect immediately after the first-load intake useEffect block (after line ~123).

Add import at top: import { upsertPersona } from "@/lib/api"; (add to existing lib/api import if present, or add new import line).

The new useEffect:

useEffect(() => {
  if (isLoading || !session) return;
  const raw = localStorage.getItem("arjun_persona");
  if (!raw) return;

  let parsed: { companion_name?: string; tone?: string; expectation?: string };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    localStorage.removeItem("arjun_persona");
    return;
  }

  const payload = {
    companion_name: parsed.companion_name ?? "Arjun",
    tone: parsed.tone ?? null,
    expectation: parsed.expectation ?? null,
  };

  void upsertPersona(payload, session.access_token)
    .then(() => {
      localStorage.removeItem("arjun_persona");
    })
    .catch(() => {
      // Silent — will retry on next page load
    });
}, [isLoading, session]);

The dependency array [isLoading, session] matches the first-load useEffect pattern.
</action>

<acceptance_criteria>
- grep -n "arjun_persona" web/app/chat/page.tsx returns at least 3 lines (getItem, removeItem x2)
- grep -n "upsertPersona" web/app/chat/page.tsx returns at least 1 line
- TypeScript: npx tsc --noEmit exits 0
- After signing in with arjun_persona in localStorage, a PUT /api/v1/persona request is made (verifiable in browser Network tab)
- After the PUT succeeds, arjun_persona is removed from localStorage
</acceptance_criteria>
