---
id: 04B-PLAN-04
title: "Onboarding UI — extend to 6 steps with persona collection"
wave: 2
depends_on: [04B-PLAN-02]
files_modified:
  - web/app/onboarding/page.tsx
autonomous: true
must_haves:
  truths:
    - "LS_PERSONA = 'arjun_persona' constant is defined alongside LS_STEP, LS_LANG, LS_INTAKE, LS_DONE"
    - "Step type is 0|1|2|3|4|5 (6 total steps)"
    - "Progress dots render 6 dots (indices 0-5), not 4"
    - "Step 3: companion name input, saved to companionName state"
    - "Step 4: tone selection (3 options: warm/playful/calm), saved to tone state"
    - "Step 5: expectation input (freeform text), saved to expectation state"
    - "finish() writes LS_PERSONA = JSON.stringify({companion_name, tone, expectation}) to localStorage before navigating to /chat"
    - "finish() also writes LS_INTAKE and LS_DONE as before"
    - "Navigating back from step 3 goes to step 2; back from step 4 goes to step 3; back from step 5 goes to step 4"
    - "Saved step in localStorage is restored correctly for steps 0-5 on page mount"
  commands: []
---

## Objective

Extend the onboarding flow from 3 steps (0-2) to 6 steps (0-5). New steps 3, 4, 5 collect companion customization: the companion's name, tone preference, and user expectation. On finish, save persona data to localStorage under the key arjun_persona. Fix the 4-dot progress indicator bug to show 6 dots.

## Tasks

### Task 1: Update constants, types, and state

<read_first>
- web/app/onboarding/page.tsx lines 1-30 (reason: current constants LS_*, Step type, state declarations)
</read_first>

<action>
In web/app/onboarding/page.tsx:

1. Add constant: const LS_PERSONA = "arjun_persona"; — place it on the line after LS_DONE.

2. Change the Step type from: type Step = 0 | 1 | 2;  to: type Step = 0 | 1 | 2 | 3 | 4 | 5;

3. In the OnboardingPage component's useState declarations, add three new state variables after the existing ones:
   - const [companionName, setCompanionName] = useState("");
   - const [tone, setTone] = useState<"warm" | "playful" | "calm">("warm");
   - const [expectation, setExpectation] = useState("");

4. In the initial useEffect (lines 86-99), extend the savedStep restoration to also handle steps 3, 4, 5:
   Replace the if/else chain with: const n = parseInt(savedStep ?? "0", 10); if (n >= 0 && n <= 5) setStep(n as Step);
</action>

<acceptance_criteria>
- TypeScript compiles without error: npx tsc --noEmit from web/ directory
- LS_PERSONA constant is visible in the file
- State variables companionName, tone, expectation are initialized in the component
</acceptance_criteria>

### Task 2: Fix progress dots (4 -> 6) and wire step rendering

<read_first>
- web/app/onboarding/page.tsx lines 148-200 (reason: current dot rendering and step JSX block)
</read_first>

<action>
In the return JSX of OnboardingPage:

1. Change the dots map from [0,1,2,3] to [0,1,2,3,4,5].

2. After the existing step 2 block (IntakeStep), add three new conditional blocks:

   {step === 3 && (
     <CompanionNameStep
       companionName={companionName}
       setCompanionName={setCompanionName}
       lang={lang}
       onNext={() => goTo(4, "forward")}
       onBack={() => goTo(2, "back")}
     />
   )}
   {step === 4 && (
     <ToneStep
       tone={tone}
       setTone={setTone}
       lang={lang}
       onNext={() => goTo(5, "forward")}
       onBack={() => goTo(3, "back")}
     />
   )}
   {step === 5 && (
     <ExpectationStep
       expectation={expectation}
       setExpectation={setExpectation}
       lang={lang}
       onBack={() => goTo(4, "back")}
       onFinish={finish}
     />
   )}

3. Change the IntakeStep onFinish prop from finish to () => goTo(3, "forward") — the actual finish() is now called from step 5.
</action>

<acceptance_criteria>
- 6 dots render in the progress bar (count the div elements with h-1.5 class)
- Navigating to step 3 shows CompanionNameStep
- TypeScript: npx tsc --noEmit exits 0
</acceptance_criteria>

### Task 3: Update finish() to write LS_PERSONA

<read_first>
- web/app/onboarding/page.tsx lines 116-127 (reason: current finish() implementation)
</read_first>

<action>
In the finish() function:

1. Add before the existing localStorage.setItem(LS_INTAKE, ...) line:
   const personaData = { companion_name: companionName.trim() || "Arjun", tone, expectation: expectation.trim() };
   localStorage.setItem(LS_PERSONA, JSON.stringify(personaData));

2. Keep all existing lines unchanged (LS_INTAKE, LS_DONE, removeItem(LS_STEP), router.push("/chat")).

The companion_name falls back to "Arjun" if the user left it blank.
</action>

<acceptance_criteria>
- After completing onboarding to step 5 and clicking finish, localStorage.getItem('arjun_persona') is non-null and parseable JSON with key companion_name
- Existing LS_INTAKE and LS_DONE are also still written
</acceptance_criteria>

### Task 4: Implement CompanionNameStep, ToneStep, ExpectationStep components

<read_first>
- web/app/onboarding/page.tsx lines 202-494 (reason: inputCls, inputInline, BackButton patterns to reuse; PersonaStep and IntakeStep structure to mirror)
</read_first>

<action>
Add three new step components at the bottom of the file, after IntakeStep. Each follows the same pattern as existing step components.

CompanionNameStep({ companionName, setCompanionName, lang, onNext, onBack }):
  - Shows BackButton
  - Heading: "Apne companion ka naam do" (hinglish/english), "अपने साथी का नाम दें" (hindi)
  - Single text input using inputCls and inputInline styles, value=companionName, placeholder="e.g. Arjun, Rohan, Alex..."
  - Continue button: disabled if companionName.trim() is empty; same primary button style (h-52, borderRadius 14)
  - Below input, small hint text: "Yeh naam chat mein dikhega" (skip elaborate copy — keep it short)

ToneStep({ tone, setTone, lang, onNext, onBack }):
  - Shows BackButton
  - Heading: "Kaisa vibe chahiye?"
  - Three selectable option buttons (reuse the LANGUAGES button pattern from LanguageStep):
    - { value: "warm", label: "Warm & Caring", sub: "Supportive, empathetic" }
    - { value: "playful", label: "Playful & Fun", sub: "Light-hearted, witty" }
    - { value: "calm", label: "Calm & Composed", sub: "Steady, thoughtful" }
  - Selected option highlighted with rgba(255,107,53,0.12) background and orange border (same pattern as language select)
  - Continue button always enabled (default is "warm")

ExpectationStep({ expectation, setExpectation, lang, onBack, onFinish }):
  - Shows BackButton
  - Heading: "Kya expect karte ho Arjun se?"
  - Subheading: "Optional — skip karna bhi theek hai"
  - Textarea using inputCls + inputInline, rows=3, resize-none
  - Finish button: always enabled (expectation is optional)
  - Button label: same c.go label as IntakeStep uses — "Chalo baat karte hain! 🤝" (hinglish), etc.
  - Since lang is passed, use the COPY[lang].go string for the button label

Keep each step component under 80 lines.
</action>

<acceptance_criteria>
- TypeScript: npx tsc --noEmit exits 0 from web/ directory
- All three component names appear in the file: CompanionNameStep, ToneStep, ExpectationStep
- ToneStep renders 3 selectable options
- ExpectationStep finish button is always enabled (no disabled state)
- CompanionNameStep continue button is disabled when input is empty
</acceptance_criteria>
