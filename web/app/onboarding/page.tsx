"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Language = "hinglish" | "hindi" | "english";
type Step = 0 | 1 | 2;

interface IntakeData {
  language: Language;
  name: string;
  city: string;
  situation: string;
}

const LANGUAGES: { value: Language; label: string; sub: string }[] = [
  { value: "hinglish", label: "Hinglish", sub: "Mix of Hindi + English" },
  { value: "hindi", label: "हिंदी", sub: "Sirf Hindi mein" },
  { value: "english", label: "English", sub: "Only English" },
];

const COPY: Record<Language, {
  intro: string;
  nameQ: string; nameP: string;
  cityQ: string; cityP: string;
  sitQ: string; sitP: string;
  skip: string; next: string; go: string;
}> = {
  hinglish: {
    intro: "Main Arjun hoon — tera apna dost. Job stress ho, relationships mein confusion ho, ya bas vent karna ho — yahan bata. Koi judgment nahi, sab confidential.",
    nameQ: "Pehle, tera naam kya hai?",
    nameP: "Apna naam batao...",
    cityQ: "Kahan se ho?",
    cityP: "Apna city batao...",
    sitQ: "Aaj kya chal raha hai life mein?",
    sitP: "Kuch bhi share karo, koi judgment nahi...",
    skip: "Baad mein bataunga",
    next: "Aage chalo →",
    go: "Chalo baat karte hain! 🤝",
  },
  hindi: {
    intro: "मैं अर्जुन हूँ — आपका अपना दोस्त। जॉब स्ट्रेस हो, रिश्तों में उलझन हो, या बस कुछ कहना हो — यहाँ बताएं। कोई judgment नहीं, सब confidential।",
    nameQ: "पहले, आपका नाम क्या है?",
    nameP: "अपना नाम बताएं...",
    cityQ: "आप कहाँ से हैं?",
    cityP: "अपना शहर बताएं...",
    sitQ: "आज जीवन में क्या चल रहा है?",
    sitP: "कुछ भी साझा करें, कोई judgment नहीं...",
    skip: "बाद में बताऊँगा",
    next: "आगे चलें →",
    go: "चलो बात करते हैं! 🤝",
  },
  english: {
    intro: "I'm Arjun — your personal friend. Job stress, relationship confusion, or just need to vent — tell me here. Zero judgment, completely confidential.",
    nameQ: "First, what's your name?",
    nameP: "Tell me your name...",
    cityQ: "Where are you from?",
    cityP: "Your city...",
    sitQ: "What's going on in your life today?",
    sitP: "Share anything, zero judgment...",
    skip: "Skip for now",
    next: "Continue →",
    go: "Let's talk! 🤝",
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

  useEffect(() => {
    if (localStorage.getItem("arjun_onboarding_done") === "true") {
      router.replace("/chat");
    }
  }, [router]);

  const c = COPY[lang];

  const advance = (nextStep: Step) => {
    setExiting(true);
    setTimeout(() => {
      setStep(nextStep);
      setExiting(false);
    }, 200);
  };

  const finish = () => {
    const intake: IntakeData = { language: lang, name: name.trim(), city: city.trim(), situation: situation.trim() };
    localStorage.setItem("arjun_intake", JSON.stringify(intake));
    localStorage.setItem("arjun_onboarding_done", "true");
    router.push("/chat");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex flex-col items-center justify-center px-4">
      <div
        className={`w-full max-w-sm transition-all duration-200 ${exiting ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}
      >
        {/* Step dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-orange-500" : i < step ? "w-1.5 bg-orange-300" : "w-1.5 bg-gray-200"
              }`}
            />
          ))}
        </div>

        {step === 0 && (
          <LanguageStep lang={lang} setLang={setLang} onNext={() => advance(1)} />
        )}
        {step === 1 && (
          <IntroStep lang={lang} intro={c.intro} onNext={() => advance(2)} next={c.next} />
        )}
        {step === 2 && (
          <IntakeStep
            c={c}
            name={name} setName={setName}
            city={city} setCity={setCity}
            situation={situation} setSituation={setSituation}
            onFinish={finish}
          />
        )}
      </div>
    </div>
  );
}

function LanguageStep({
  lang, setLang, onNext,
}: {
  lang: Language;
  setLang: (l: Language) => void;
  onNext: () => void;
}) {
  return (
    <div>
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 shadow-lg shadow-orange-200">
          A
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Apni bhasha chuno</h1>
        <p className="text-gray-500 text-sm mt-1">Choose your preferred language</p>
      </div>

      <div className="space-y-3 mb-8">
        {LANGUAGES.map((l) => (
          <button
            key={l.value}
            onClick={() => setLang(l.value)}
            className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all ${
              lang === l.value
                ? "border-orange-500 bg-orange-50 text-orange-700"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="text-left">
              <p className="font-semibold">{l.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{l.sub}</p>
            </div>
            {lang === l.value && (
              <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      <button
        onClick={onNext}
        className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-2xl transition-colors shadow-sm"
      >
        Continue →
      </button>
    </div>
  );
}

function IntroStep({
  lang, intro, onNext, next,
}: {
  lang: Language;
  intro: string;
  onNext: () => void;
  next: string;
}) {
  return (
    <div className="text-center">
      <div className="w-24 h-24 rounded-full bg-orange-500 flex items-center justify-center text-white text-5xl font-bold mx-auto mb-6 shadow-xl shadow-orange-200">
        A
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">
        {lang === "hindi" ? "मैं अर्जुन हूँ" : "Main Arjun hoon"}
      </h2>
      <p className="text-orange-500 text-sm font-medium mb-6">
        {lang === "hindi" ? "आपका अपना दोस्त" : "Tera apna dost"} 🤝
      </p>
      <div className="bg-white rounded-2xl px-5 py-4 text-left shadow-sm border border-gray-100 mb-8">
        <p className="text-gray-700 text-sm leading-relaxed">{intro}</p>
      </div>
      <button
        onClick={onNext}
        className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-2xl transition-colors shadow-sm"
      >
        {next}
      </button>
    </div>
  );
}

function IntakeStep({
  c, name, setName, city, setCity, situation, setSituation, onFinish,
}: {
  c: (typeof COPY)[Language];
  name: string; setName: (v: string) => void;
  city: string; setCity: (v: string) => void;
  situation: string; setSituation: (v: string) => void;
  onFinish: () => void;
}) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Thoda aur bata apne baare mein</h2>
        <p className="text-xs text-gray-400">Sab optional hai — jo dil kare batao</p>
      </div>

      <div className="space-y-4 mb-8">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">{c.nameQ}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={c.nameP}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400 bg-white"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">{c.cityQ}</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={c.cityP}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400 bg-white"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">{c.sitQ}</label>
          <textarea
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder={c.sitP}
            rows={3}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400 bg-white resize-none"
          />
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center mb-4">{c.skip} — iske baad bhi bata sakte ho</p>

      <button
        onClick={onFinish}
        className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-2xl transition-colors shadow-sm"
      >
        {c.go}
      </button>
    </div>
  );
}
