"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Language = "hinglish" | "hindi" | "english";
type Step = 0 | 1 | 2 | 3 | 4 | 5;
type Direction = "forward" | "back";

const LS_STEP = "arjun_onboarding_step";
const LS_LANG = "arjun_lang_pref";
const LS_INTAKE = "arjun_intake";
const LS_DONE = "arjun_onboarding_done";
const LS_PERSONA = "arjun_persona";

const LANGUAGES: { value: Language; label: string; sub: string }[] = [
  { value: "hinglish", label: "Hinglish", sub: "Mix of Hindi + English" },
  { value: "hindi", label: "हिंदी", sub: "Sirf Hindi mein" },
  { value: "english", label: "English", sub: "Only English" },
];

const TONE_OPTIONS = [
  { value: "funny_chill", emoji: "😄", label: "Funny & chill", sub: "Halka phulka" },
  { value: "motivating", emoji: "💪", label: "Motivating", sub: "Push karta rahe" },
  { value: "logical", emoji: "🧠", label: "Logical", sub: "Practical advice" },
  { value: "just_listen", emoji: "🤗", label: "Just listen", sub: "Bina advice ke" },
] as const;

const COPY: Record<
  Language,
  {
    intro: string;
    nameQ: string; nameP: string;
    cityQ: string; cityP: string;
    sitQ: string; sitP: string;
    next: string;
    heading: string; subheading: string;
  }
> = {
  hinglish: {
    intro:
      "Main Arjun hoon — tera apna dost. Job stress ho, relationships mein confusion ho, ya bas vent karna ho — yahan bata. Koi judgment nahi, sab confidential.",
    nameQ: "Tera naam kya hai?",
    nameP: "Apna naam batao...",
    cityQ: "Kahan se ho?",
    cityP: "Apna city batao...",
    sitQ: "Aaj kya chal raha hai life mein?",
    sitP: "Kuch bhi share karo, koi judgment nahi...",
    next: "Haan, let's go!",
    heading: "Thoda aur bata apne baare mein",
    subheading: "Taaki woh tujhe better samajh sake",
  },
  hindi: {
    intro:
      "मैं अर्जुन हूँ — आपका अपना दोस्त। जॉब स्ट्रेस हो, रिश्तों में उलझन हो, या बस कुछ कहना हो — यहाँ बताएं। कोई judgment नहीं, सब confidential।",
    nameQ: "आपका नाम क्या है?",
    nameP: "अपना नाम बताएं...",
    cityQ: "आप कहाँ से हैं?",
    cityP: "अपना शहर बताएं...",
    sitQ: "आज जीवन में क्या चल रहा है?",
    sitP: "कुछ भी साझा करें, कोई judgment नहीं...",
    next: "हाँ, चलते हैं!",
    heading: "थोड़ा और बताएं अपने बारे में",
    subheading: "ताकि वो आपको बेहतर समझ सके",
  },
  english: {
    intro:
      "I'm Arjun — your personal friend. Job stress, relationship confusion, or just need to vent — tell me here. Zero judgment, completely confidential.",
    nameQ: "What's your name?",
    nameP: "Tell me your name...",
    cityQ: "Where are you from?",
    cityP: "Your city...",
    sitQ: "What's going on in your life today?",
    sitP: "Share anything, zero judgment...",
    next: "Yeah, let's go!",
    heading: "Tell me a bit about yourself",
    subheading: "So they can understand you better",
  },
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [lang, setLang] = useState<Language>("hinglish");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [situation, setSituation] = useState("");
  const [companionName, setCompanionName] = useState("");
  const [selectedTone, setSelectedTone] = useState<string | null>(null);
  const [toneText, setToneText] = useState("");
  const [expectation, setExpectation] = useState("");
  const [exiting, setExiting] = useState(false);
  const [direction, setDirection] = useState<Direction>("forward");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(LS_DONE) === "true") {
      router.replace("/chat");
      return;
    }
    const savedLang = localStorage.getItem(LS_LANG) as Language | null;
    const savedStep = localStorage.getItem(LS_STEP);
    if (savedLang && ["hinglish", "hindi", "english"].includes(savedLang)) {
      setLang(savedLang);
    }
    const s = Number(savedStep);
    if (s >= 1 && s <= 5) setStep(s as Step);
    setMounted(true);
  }, [router]);

  const goTo = (nextStep: Step, dir: Direction = "forward") => {
    setDirection(dir);
    setExiting(true);
    setTimeout(() => {
      setStep(nextStep);
      localStorage.setItem(LS_STEP, String(nextStep));
      setExiting(false);
    }, 200);
  };

  const handleLangSelect = (l: Language) => {
    setLang(l);
    localStorage.setItem(LS_LANG, l);
  };

  const finish = () => {
    localStorage.setItem(
      LS_INTAKE,
      JSON.stringify({ language: lang, name: name.trim(), city: city.trim(), situation: situation.trim() }),
    );
    localStorage.setItem(
      LS_PERSONA,
      JSON.stringify({
        companion_name: companionName.trim() || "Arjun",
        tone: selectedTone ?? (toneText.trim() || null),
        expectation: expectation.trim() || null,
        open_field: null,
        language_pref: lang,
      }),
    );
    localStorage.setItem(LS_DONE, "true");
    localStorage.removeItem(LS_STEP);
    router.push("/chat");
  };

  if (!mounted) return null;

  const c = COPY[lang];
  const exitTranslate = direction === "forward" ? "-translate-x-5" : "translate-x-5";
  const slideClass = exiting ? `opacity-0 ${exitTranslate}` : "opacity-100 translate-x-0";

  return (
    <div
      className="flex flex-col items-center justify-center px-4 py-8"
      style={{
        minHeight: "100dvh",
        background:
          "radial-gradient(ellipse at 50% -20%, rgba(255,107,53,0.12) 0%, transparent 70%), var(--color-bg)",
      }}
    >
      <div className="w-full max-w-sm">
        {/* 6 progress dots */}
        <div className="flex justify-center gap-2 mb-10">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === step ? "24px" : "6px",
                backgroundColor:
                  i <= step ? "var(--color-primary)" : "rgba(255,255,255,0.1)",
              }}
            />
          ))}
        </div>

        <div className={`transition-all duration-200 ease-in-out ${slideClass}`}>
          {step === 0 && (
            <LanguageStep lang={lang} onSelect={handleLangSelect} onNext={() => goTo(1)} />
          )}
          {step === 1 && (
            <MeetStep lang={lang} intro={c.intro} ctaLabel={c.next} onNext={() => goTo(2)} onBack={() => goTo(0, "back")} />
          )}
          {step === 2 && (
            <IntakeStep
              c={c} name={name} setName={setName} city={city} setCity={setCity}
              situation={situation} setSituation={setSituation}
              onBack={() => goTo(1, "back")} onNext={() => goTo(3)}
            />
          )}
          {step === 3 && (
            <CompanionNameStep
              value={companionName} onChange={setCompanionName}
              onBack={() => goTo(2, "back")} onNext={() => goTo(4)}
            />
          )}
          {step === 4 && (
            <ToneStep
              selected={selectedTone} onSelect={setSelectedTone}
              freeText={toneText} onFreeText={setToneText}
              onBack={() => goTo(3, "back")} onNext={() => goTo(5)}
            />
          )}
          {step === 5 && (
            <ExpectationStep
              value={expectation} onChange={setExpectation}
              onBack={() => goTo(4, "back")} onFinish={finish}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Shared styles ──────────────────────────────────────────────────────── */

const inputCls =
  "w-full px-4 py-3 text-sm rounded-xl text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] caret-[var(--color-primary)]";

const inputInline = {
  backgroundColor: "var(--color-elevated)",
  border: "1px solid var(--color-border)",
};

const primaryBtn = {
  backgroundColor: "var(--color-primary)",
  height: 52,
  borderRadius: 14,
};

/* ─── Back button ────────────────────────────────────────────────────────── */

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-sm transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      style={{ minHeight: 44 }}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </button>
  );
}

/* ─── Step 0: Language Select ─────────────────────────────────────────────── */

function LanguageStep({ lang, onSelect, onNext }: { lang: Language; onSelect: (l: Language) => void; onNext: () => void }) {
  return (
    <div>
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold" style={{ backgroundColor: "var(--color-primary)" }}>
          A
        </div>
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">Apni bhasha chuno</h1>
        <p className="text-sm mt-1 text-[var(--color-text-muted)]">Choose your preferred language</p>
      </div>

      <div className="space-y-3 mb-8">
        {LANGUAGES.map((l) => (
          <button
            key={l.value}
            onClick={() => onSelect(l.value)}
            className="w-full flex items-center justify-between px-5 py-4 rounded-xl transition-all"
            style={{
              backgroundColor: lang === l.value ? "rgba(255,107,53,0.12)" : "var(--color-surface)",
              border: `1px solid ${lang === l.value ? "rgba(255,107,53,0.5)" : "var(--color-border)"}`,
              minHeight: 52,
            }}
          >
            <div className="text-left">
              <p className="font-medium" style={{ color: lang === l.value ? "var(--color-primary)" : "var(--color-text)" }}>
                {l.label}
              </p>
              <p className="text-xs mt-0.5 text-[var(--color-text-muted)]">{l.sub}</p>
            </div>
            {lang === l.value && (
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--color-primary)" }}>
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      <button onClick={onNext} className="w-full font-semibold text-white transition-all active:scale-[0.97]" style={primaryBtn}>
        Continue →
      </button>
    </div>
  );
}

/* ─── Step 1: Meet the companion ─────────────────────────────────────────── */

function MeetStep({ lang, intro, ctaLabel, onNext, onBack }: { lang: Language; intro: string; ctaLabel: string; onNext: () => void; onBack: () => void }) {
  return (
    <div className="text-center">
      <div className="flex mb-6">
        <BackButton onClick={onBack} />
      </div>
      <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center text-white text-4xl font-bold avatar-pulse" style={{ backgroundColor: "var(--color-primary)" }}>
        A
      </div>
      <h2 className="text-2xl font-semibold mb-1 text-[var(--color-text)]">
        {lang === "hindi" ? "मैं अर्जुन हूँ" : "Main Arjun hoon"}
      </h2>
      <p className="text-sm font-medium mb-6" style={{ color: "var(--color-primary)" }}>
        {lang === "hindi" ? "आपका अपना दोस्त" : "Tera apna dost"} 🤝
      </p>
      <div className="rounded-xl px-5 py-4 text-left mb-8" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">{intro}</p>
      </div>
      <button onClick={onNext} className="w-full font-semibold text-white transition-all active:scale-[0.97]" style={primaryBtn}>
        {ctaLabel}
      </button>
    </div>
  );
}

/* ─── Step 2: Intake Form ────────────────────────────────────────────────── */

function IntakeStep({
  c, name, setName, city, setCity, situation, setSituation, onBack, onNext,
}: {
  c: (typeof COPY)[Language]; name: string; setName: (v: string) => void;
  city: string; setCity: (v: string) => void; situation: string; setSituation: (v: string) => void;
  onBack: () => void; onNext: () => void;
}) {
  const canSubmit = name.trim() && city.trim() && situation.trim();

  return (
    <div>
      <div className="flex mb-6"><BackButton onClick={onBack} /></div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-1 text-[var(--color-text)]">{c.heading}</h2>
        <p className="text-xs text-[var(--color-text-muted)]">{c.subheading}</p>
      </div>
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-xs font-medium mb-1.5 text-[var(--color-text-muted)]">{c.nameQ}</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={c.nameP} className={inputCls} style={inputInline} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5 text-[var(--color-text-muted)]">{c.cityQ}</label>
          <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder={c.cityP} className={inputCls} style={inputInline} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5 text-[var(--color-text-muted)]">{c.sitQ}</label>
          <textarea value={situation} onChange={(e) => setSituation(e.target.value)} placeholder={c.sitP} rows={3} className={`${inputCls} resize-none`} style={inputInline} />
        </div>
      </div>
      <button onClick={onNext} disabled={!canSubmit} className="w-full font-semibold text-white transition-all active:scale-[0.97]" style={{ ...primaryBtn, opacity: canSubmit ? 1 : 0.35, cursor: canSubmit ? "pointer" : "not-allowed" }}>
        Next →
      </button>
    </div>
  );
}

/* ─── Step 3: Companion Name ─────────────────────────────────────────────── */

function CompanionNameStep({ value, onChange, onBack, onNext }: { value: string; onChange: (v: string) => void; onBack: () => void; onNext: () => void }) {
  return (
    <div>
      <div className="flex mb-6"><BackButton onClick={onBack} /></div>
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-1 text-[var(--color-text)]">Usse kya bulaaun?</h2>
        <p className="text-xs text-[var(--color-text-muted)]">Iska naam rakh — jo chahe. Default hai &lsquo;Arjun&rsquo;.</p>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 30))}
        placeholder="Arjun"
        className={`${inputCls} mb-2`}
        style={inputInline}
      />
      <p className="text-xs text-[var(--color-text-muted)] mb-8 px-1">{value.length}/30</p>
      <button onClick={onNext} className="w-full font-semibold text-white transition-all active:scale-[0.97]" style={primaryBtn}>
        Next →
      </button>
    </div>
  );
}

/* ─── Step 4: Tone ───────────────────────────────────────────────────────── */

function ToneStep({
  selected, onSelect, freeText, onFreeText, onBack, onNext,
}: {
  selected: string | null; onSelect: (v: string | null) => void;
  freeText: string; onFreeText: (v: string) => void;
  onBack: () => void; onNext: () => void;
}) {
  const canSubmit = selected !== null || freeText.trim().length > 0;

  return (
    <div>
      <div className="flex mb-6"><BackButton onClick={onBack} /></div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-1 text-[var(--color-text)]">Main kaisa behave karun?</h2>
        <p className="text-xs text-[var(--color-text-muted)]">Apne hisaab se choose kar.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {TONE_OPTIONS.map((opt) => {
          const active = selected === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onSelect(active ? null : opt.value)}
              className="flex flex-col items-start px-4 py-3 rounded-xl transition-all text-left"
              style={{
                backgroundColor: active ? "rgba(255,107,53,0.12)" : "var(--color-surface)",
                border: `1px solid ${active ? "rgba(255,107,53,0.5)" : "var(--color-border)"}`,
                minHeight: 72,
              }}
            >
              <span className="text-xl mb-1">{opt.emoji}</span>
              <p className="text-sm font-medium" style={{ color: active ? "var(--color-primary)" : "var(--color-text)" }}>
                {opt.label}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">{opt.sub}</p>
            </button>
          );
        })}
      </div>

      <textarea
        value={freeText}
        onChange={(e) => onFreeText(e.target.value.slice(0, 200))}
        placeholder="Ya apne words mein batao... (optional)"
        rows={2}
        className={`${inputCls} resize-none mb-6`}
        style={inputInline}
      />

      <button onClick={onNext} disabled={!canSubmit} className="w-full font-semibold text-white transition-all active:scale-[0.97]" style={{ ...primaryBtn, opacity: canSubmit ? 1 : 0.35, cursor: canSubmit ? "pointer" : "not-allowed" }}>
        Next →
      </button>
    </div>
  );
}

/* ─── Step 5: Expectation ────────────────────────────────────────────────── */

function ExpectationStep({ value, onChange, onBack, onFinish }: { value: string; onChange: (v: string) => void; onBack: () => void; onFinish: () => void }) {
  const trimmed = value.trim();
  const showHint = trimmed.length > 0 && trimmed.length < 10;

  return (
    <div>
      <div className="flex mb-6"><BackButton onClick={onBack} /></div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-1 text-[var(--color-text)]">Tujhse kya chahiye mujhe?</h2>
        <p className="text-xs text-[var(--color-text-muted)]">Honest reh — yahi kaam aayega.</p>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 500))}
        placeholder={"Jaise — vent karna hai, ya solution chahiye,\nya bas koi sun le..."}
        rows={4}
        className={`${inputCls} resize-none mb-1`}
        style={inputInline}
      />
      {showHint && (
        <p className="text-xs mb-1 px-1" style={{ color: "var(--color-primary)" }}>
          Thoda aur batao...
        </p>
      )}
      <p className="text-xs text-[var(--color-text-muted)] mb-8 px-1">{value.length}/500</p>

      <button
        onClick={onFinish}
        disabled={trimmed.length < 10}
        className="w-full font-semibold text-white transition-all active:scale-[0.97]"
        style={{ ...primaryBtn, opacity: trimmed.length >= 10 ? 1 : 0.35, cursor: trimmed.length >= 10 ? "pointer" : "not-allowed" }}
      >
        Start chatting →
      </button>
    </div>
  );
}
