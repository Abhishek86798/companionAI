"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Language = "hinglish" | "hindi" | "english";
type Step = 0 | 1 | 2;
type Direction = "forward" | "back";

const LS_STEP = "arjun_onboarding_step";
const LS_LANG = "arjun_lang_pref";
const LS_INTAKE = "arjun_intake";
const LS_DONE = "arjun_onboarding_done";

const LANGUAGES: { value: Language; label: string; sub: string }[] = [
  { value: "hinglish", label: "Hinglish", sub: "Mix of Hindi + English" },
  { value: "hindi", label: "हिंदी", sub: "Sirf Hindi mein" },
  { value: "english", label: "English", sub: "Only English" },
];

const COPY: Record<
  Language,
  {
    intro: string;
    nameQ: string; nameP: string;
    cityQ: string; cityP: string;
    sitQ: string; sitP: string;
    next: string; go: string;
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
    go: "Chalo baat karte hain! 🤝",
    heading: "Thoda aur bata apne baare mein",
    subheading: "Taaki Arjun tujhe better samajh sake",
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
    go: "चलो बात करते हैं! 🤝",
    heading: "थोड़ा और बताएं अपने बारे में",
    subheading: "ताकि अर्जुन आपको बेहतर समझ सके",
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
    go: "Let's talk! 🤝",
    heading: "Tell me a bit about yourself",
    subheading: "So Arjun can understand you better",
  },
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [lang, setLang] = useState<Language>("hinglish");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [situation, setSituation] = useState("");
  const [exiting, setExiting] = useState(false);
  const [direction, setDirection] = useState<Direction>("forward");
  const [mounted, setMounted] = useState(false);

  // Resume from last incomplete step
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
    if (savedStep === "1") setStep(1);
    else if (savedStep === "2") setStep(2);
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
    const intake = {
      language: lang,
      name: name.trim(),
      city: city.trim(),
      situation: situation.trim(),
    };
    localStorage.setItem(LS_INTAKE, JSON.stringify(intake));
    localStorage.setItem(LS_DONE, "true");
    localStorage.removeItem(LS_STEP);
    router.push("/chat");
  };

  if (!mounted) return null;

  const c = COPY[lang];

  // Slide direction: forward = slide left out, back = slide right out
  const exitTranslate =
    direction === "forward" ? "-translate-x-5" : "translate-x-5";
  const slideClass = exiting
    ? `opacity-0 ${exitTranslate}`
    : "opacity-100 translate-x-0";

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
      style={{
        background:
          "radial-gradient(ellipse at 50% -20%, rgba(255,107,53,0.12) 0%, transparent 70%), #0F0F14",
      }}
    >
      <div className="w-full max-w-sm">
        {/* 4 progress dots */}
        <div className="flex justify-center gap-2 mb-10">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === step ? "24px" : "6px",
                backgroundColor:
                  i < step ? "#FF6B35" : i === step ? "#FF6B35" : "rgba(255,255,255,0.1)",
              }}
            />
          ))}
        </div>

        {/* Step content */}
        <div
          className={`transition-all duration-200 ease-in-out ${slideClass}`}
        >
          {step === 0 && (
            <LanguageStep
              lang={lang}
              onSelect={handleLangSelect}
              onNext={() => goTo(1, "forward")}
            />
          )}
          {step === 1 && (
            <PersonaStep
              lang={lang}
              intro={c.intro}
              ctaLabel={c.next}
              onNext={() => goTo(2, "forward")}
              onBack={() => goTo(0, "back")}
            />
          )}
          {step === 2 && (
            <IntakeStep
              c={c}
              name={name}
              setName={setName}
              city={city}
              setCity={setCity}
              situation={situation}
              setSituation={setSituation}
              onBack={() => goTo(1, "back")}
              onFinish={finish}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Step 1: Language Select ─────────────────────────────────────────────── */

function LanguageStep({
  lang,
  onSelect,
  onNext,
}: {
  lang: Language;
  onSelect: (l: Language) => void;
  onNext: () => void;
}) {
  return (
    <div>
      <div className="text-center mb-8">
        <div
          className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold"
          style={{ backgroundColor: "#FF6B35" }}
        >
          A
        </div>
        <h1
          className="text-2xl font-semibold"
          style={{ color: "#F0EDE8" }}
        >
          Apni bhasha chuno
        </h1>
        <p className="text-sm mt-1" style={{ color: "#9B96A0" }}>
          Choose your preferred language
        </p>
      </div>

      <div className="space-y-3 mb-8">
        {LANGUAGES.map((l) => (
          <button
            key={l.value}
            onClick={() => onSelect(l.value)}
            className="w-full flex items-center justify-between px-5 py-4 rounded-xl transition-all"
            style={{
              backgroundColor:
                lang === l.value ? "rgba(255,107,53,0.12)" : "#1A1A2E",
              border: `1px solid ${
                lang === l.value
                  ? "rgba(255,107,53,0.5)"
                  : "rgba(255,255,255,0.07)"
              }`,
            }}
          >
            <div className="text-left">
              <p
                className="font-medium"
                style={{
                  color: lang === l.value ? "#FF6B35" : "#F0EDE8",
                }}
              >
                {l.label}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#9B96A0" }}>
                {l.sub}
              </p>
            </div>
            {lang === l.value && (
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "#FF6B35" }}
              >
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      <button
        onClick={onNext}
        className="w-full py-3.5 rounded-xl font-semibold text-white transition-all active:scale-95"
        style={{ backgroundColor: "#FF6B35", height: "52px", borderRadius: "14px" }}
      >
        Continue →
      </button>
    </div>
  );
}

/* ─── Step 2: Meet Arjun ──────────────────────────────────────────────────── */

function PersonaStep({
  lang,
  intro,
  ctaLabel,
  onNext,
  onBack,
}: {
  lang: Language;
  intro: string;
  ctaLabel: string;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="text-center">
      {/* Back button */}
      <div className="flex mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm transition-colors"
          style={{ color: "#9B96A0" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      {/* Pulsing avatar */}
      <div
        className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center text-white text-4xl font-bold avatar-pulse"
        style={{ backgroundColor: "#FF6B35" }}
      >
        A
      </div>

      <h2
        className="text-2xl font-semibold mb-1"
        style={{ color: "#F0EDE8" }}
      >
        {lang === "hindi" ? "मैं अर्जुन हूँ" : "Main Arjun hoon"}
      </h2>
      <p className="text-sm font-medium mb-6" style={{ color: "#FF6B35" }}>
        {lang === "hindi" ? "आपका अपना दोस्त" : "Tera apna dost"} 🤝
      </p>

      {/* Intro card */}
      <div
        className="rounded-xl px-5 py-4 text-left mb-8"
        style={{
          backgroundColor: "#1A1A2E",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <p className="text-sm leading-relaxed" style={{ color: "#9B96A0" }}>
          {intro}
        </p>
      </div>

      <button
        onClick={onNext}
        className="w-full font-semibold text-white transition-all active:scale-95"
        style={{ backgroundColor: "#FF6B35", height: "52px", borderRadius: "14px" }}
      >
        {ctaLabel}
      </button>
    </div>
  );
}

/* ─── Step 3: Intake Form ─────────────────────────────────────────────────── */

function IntakeStep({
  c,
  name, setName,
  city, setCity,
  situation, setSituation,
  onBack,
  onFinish,
}: {
  c: (typeof COPY)[Language];
  name: string; setName: (v: string) => void;
  city: string; setCity: (v: string) => void;
  situation: string; setSituation: (v: string) => void;
  onBack: () => void;
  onFinish: () => void;
}) {
  const canSubmit = name.trim() && city.trim() && situation.trim();

  const inputStyle = {
    backgroundColor: "#22223A",
    border: "1px solid rgba(255,255,255,0.07)",
    color: "#F0EDE8",
    borderRadius: "12px",
    outline: "none",
  };

  const focusStyle = "focus:ring-2 focus:ring-orange-500/40";

  return (
    <div>
      {/* Back button */}
      <div className="flex mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm"
          style={{ color: "#9B96A0" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      <div className="mb-6">
        <h2
          className="text-xl font-semibold mb-1"
          style={{ color: "#F0EDE8" }}
        >
          {c.heading}
        </h2>
        <p className="text-xs" style={{ color: "#9B96A0" }}>
          {c.subheading}
        </p>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: "#9B96A0" }}
          >
            {c.nameQ}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={c.nameP}
            className={`w-full px-4 py-3 text-sm ${focusStyle}`}
            style={{
              ...inputStyle,
              caretColor: "#FF6B35",
            }}
          />
        </div>
        <div>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: "#9B96A0" }}
          >
            {c.cityQ}
          </label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={c.cityP}
            className={`w-full px-4 py-3 text-sm ${focusStyle}`}
            style={{
              ...inputStyle,
              caretColor: "#FF6B35",
            }}
          />
        </div>
        <div>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: "#9B96A0" }}
          >
            {c.sitQ}
          </label>
          <textarea
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder={c.sitP}
            rows={3}
            className={`w-full px-4 py-3 text-sm resize-none ${focusStyle}`}
            style={{
              ...inputStyle,
              caretColor: "#FF6B35",
            }}
          />
        </div>
      </div>

      <button
        onClick={onFinish}
        disabled={!canSubmit}
        className="w-full font-semibold text-white transition-all active:scale-95"
        style={{
          backgroundColor: "#FF6B35",
          height: "52px",
          borderRadius: "14px",
          opacity: canSubmit ? 1 : 0.35,
          cursor: canSubmit ? "pointer" : "not-allowed",
        }}
      >
        {c.go}
      </button>
    </div>
  );
}
