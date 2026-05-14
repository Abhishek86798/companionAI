---
id: 04B-PLAN-06
title: "Settings — persona edit section"
wave: 3
depends_on: [04B-PLAN-05]
files_modified:
  - web/app/settings/page.tsx
autonomous: true
must_haves:
  truths:
    - "Settings page has a 'Companion' section above the Memories section"
    - "Companion section shows companion_name input field (text)"
    - "Companion section shows tone selector (3 options: warm/playful/calm)"
    - "Companion section shows expectation textarea"
    - "Saving calls PUT /api/v1/persona and invalidates the ['persona'] React Query cache"
    - "Save button is disabled while mutation is in-flight"
    - "A success toast is shown after successful save"
    - "An error toast is shown on save failure"
    - "Fields are pre-populated from usePersona() data on load"
  commands:
    - "grep -n 'Companion\|companion_name\|upsertPersona' web/app/settings/page.tsx"
---

## Objective

Add a Companion persona edit section to the existing Settings page. The section sits above Memories. Users can edit companion_name, tone, and expectation. Saving uses the existing useMutation + upsertPersona pattern, invalidates the persona query cache, and shows a toast. Fields are initialized from usePersona() data.

## Tasks

### Task 1: Add persona state and mutation to SettingsPage

<read_first>
- web/app/settings/page.tsx lines 1-75 (reason: existing imports, useQuery/useMutation pattern, useAuth, useToast, queryClient — all reusable)
</read_first>

<action>
In web/app/settings/page.tsx:

1. Add imports at the top (extend existing import from @/lib/api):
   - Add upsertPersona, PersonaData to the existing import from "@/lib/api"
   - Add usePersona from "@/hooks/usePersona"

2. Inside SettingsPage component, after existing state declarations, add:
   const persona = usePersona();
   const [companionName, setCompanionName] = useState(persona.companion_name);
   const [tone, setTone] = useState<"warm" | "playful" | "calm">((persona.tone as "warm" | "playful" | "calm") ?? "warm");
   const [expectation, setExpectation] = useState(persona.expectation ?? "");

3. Add a useEffect to sync initial form values when persona loads (handles the case where the query resolves after first render):
   useEffect(() => {
     setCompanionName(persona.companion_name);
     setTone((persona.tone as "warm" | "playful" | "calm") ?? "warm");
     setExpectation(persona.expectation ?? "");
   }, [persona.companion_name, persona.tone, persona.expectation]);

4. Add persona save mutation after existing doDelete mutation:
   const { mutate: savePersona, isPending: savingPersona } = useMutation({
     mutationFn: () => upsertPersona({ companion_name: companionName.trim() || "Arjun", tone, expectation: expectation.trim() || null }, session!.access_token),
     onSuccess: () => {
       void queryClient.invalidateQueries({ queryKey: ["persona"] });
       showToast("Persona save ho gaya!", "success");
     },
     onError: () => {
       showToast("Persona save nahi hua. Dobara try karo.", "error");
     },
   });
</action>

<acceptance_criteria>
- TypeScript: npx tsc --noEmit exits 0 from web/ directory
- grep -n "savePersona\|savingPersona" web/app/settings/page.tsx returns 2+ lines
- grep -n "usePersona" web/app/settings/page.tsx returns 1+ lines
</acceptance_criteria>

### Task 2: Add Companion section JSX to SettingsPage

<read_first>
- web/app/settings/page.tsx lines 117-130 (reason: existing section pattern — section tag, uppercase label, rounded-xl container, to mirror for Companion section)
- web/app/onboarding/page.tsx lines 202-212 (reason: inputCls and inputInline to copy verbatim — use identical style constants inline since this is a different file)
</read_first>

<action>
In the scrollable content div of SettingsPage (the div with class "flex-1 overflow-y-auto"), insert a new <section> block BEFORE the existing Memories section.

The Companion section structure:

1. Section label: "Companion" — same uppercase style as "Memories" label.

2. Inside a rounded-xl surface container, three fields separated by var(--color-border) dividers:

   Field 1 — Companion Name:
   - Label: text-xs "Companion ka naam" (muted, uppercase tracking)
   - Text input: value=companionName, onChange sets companionName
   - Use inline styles matching inputCls pattern: px-4 py-3 text-sm, background var(--color-elevated), border 1px solid var(--color-border), border-radius 8px, color var(--color-text)
   - Full width, no external border (sits inside the card)

   Field 2 — Tone:
   - Label: "Tone"
   - Three inline pill buttons: "Warm", "Playful", "Calm"
   - Selected pill: background rgba(255,107,53,0.15), border rgba(255,107,53,0.5), color var(--color-primary)
   - Unselected pill: background var(--color-elevated), border var(--color-border), color var(--color-text-muted)
   - Each pill: px-4 py-2 rounded-full text-sm, onClick sets tone
   - Display pills in a flex gap-2 row

   Field 3 — Expectation:
   - Label: "Kya expect karte ho?" with sub-label "Optional"
   - Textarea: value=expectation, onChange sets expectation, rows=2, resize-none
   - Same inline styles as the name input

3. Save button below the fields (full-width, same primary button style as existing pages):
   - Text: "Save"
   - disabled={savingPersona}
   - onClick={() => savePersona()}
   - opacity 0.5 when disabled

Keep the entire Companion section under 80 lines of JSX.
</action>

<acceptance_criteria>
- grep -n "Companion" web/app/settings/page.tsx returns 2+ lines (label + section header)
- grep -n "companionName\|setCompanionName" web/app/settings/page.tsx returns 3+ lines
- grep -n "savePersona" web/app/settings/page.tsx returns 2+ lines (mutation definition + onClick)
- TypeScript: npx tsc --noEmit exits 0
- Manually: load Settings page — Companion section appears above Memories section
- Manually: change name to "Kai", click Save — toast "Persona save ho gaya!" appears
- Manually: refresh chat page — top bar shows "Kai" (React Query cache updated)
</acceptance_criteria>
