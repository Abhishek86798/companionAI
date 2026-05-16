"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { COPY, type Lang } from "@/lib/copy";

type Tab = "phone" | "email";
type Step = "input" | "otp";

const MAX_OTP_ATTEMPTS = 3;

export default function AuthPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [lang, setLang] = useState<Lang>("hinglish");
  const [tab, setTab] = useState<Tab>("phone");
  const [step, setStep] = useState<Step>("input");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [showResend, setShowResend] = useState(false);

  const t = COPY[lang].auth;

  useEffect(() => {
    const saved = localStorage.getItem("arjun_lang_pref") as Lang | null;
    if (saved && (saved === "hinglish" || saved === "hindi" || saved === "english")) {
      setLang(saved);
    }
  }, []);

  // Redirect when session arrives (e.g. after magic link click)
  useEffect(() => {
    if (!session) return;
    const done = localStorage.getItem("arjun_onboarding_done") === "true";
    router.replace(done ? "/chat" : "/onboarding");
  }, [session, router]);

  // Show resend after 30 s on sent screen
  useEffect(() => {
    if (step !== "otp") {
      setShowResend(false);
      return;
    }
    const t = setTimeout(() => setShowResend(true), 30_000);
    return () => clearTimeout(t);
  }, [step]);

  const switchTab = (t: Tab) => {
    setTab(t);
    setStep("input");
    setError("");
    setOtp(["", "", "", "", "", ""]);
    setOtpAttempts(0);
    setShowResend(false);
  };

  // Normalise phone to E.164: strip spaces/dashes, prepend +91 if no country code
  const normalisePhone = (raw: string): string => {
    const digits = raw.replace(/[\s\-().]/g, "");
    if (digits.startsWith("+")) return digits;
    if (/^\d{10}$/.test(digits)) return `+91${digits}`;
    return digits;
  };

  const validatePhone = (raw: string): string | null => {
    const normalised = normalisePhone(raw);
    if (!normalised.startsWith("+")) return t.phoneInvalidCountry;
    if (!/^\+\d{7,15}$/.test(normalised)) return t.phoneInvalidFormat;
    return null;
  };

  const handleSend = async () => {
    setError("");

    if (tab === "phone") {
      const validationErr = validatePhone(phone);
      if (validationErr) { setError(validationErr); return; }
    }

    // Test mode (phone only): skip real OTP send, go straight to OTP input
    if (tab === "phone" && process.env.NEXT_PUBLIC_TEST_OTP) {
      setStep("otp");
      setOtpAttempts(0);
      return;
    }

    setLoading(true);
    try {
      const { error } =
        tab === "phone"
          ? await supabase.auth.signInWithOtp({ phone: normalisePhone(phone) })
          : await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      setStep("otp");
      setOtpAttempts(0);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.toLowerCase().includes("unsupported phone provider") || msg.toLowerCase().includes("phone provider")) {
        setError(t.phoneProviderError);
        setTimeout(() => switchTab("email"), 1800);
      } else {
        setError(msg || t.genericError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    const token = otp.join("");
    try {
      const testOtp = process.env.NEXT_PUBLIC_TEST_OTP;
      if (testOtp && token === testOtp) {
        const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
        const res = await fetch(`${API}/auth/test-verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: normalisePhone(phone), otp: token }),
        });
        if (!res.ok) throw new Error("Test login failed");
        const { email } = await res.json() as { email: string };
        const { error } = await supabase.auth.signInWithPassword({ email, password: token });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.verifyOtp({
          phone: normalisePhone(phone),
          token,
          type: "sms",
        });
        if (error) throw error;
      }
      const done = localStorage.getItem("arjun_onboarding_done") === "true";
      router.replace(done ? "/chat" : "/onboarding");
    } catch (e: unknown) {
      const newCount = otpAttempts + 1;
      setOtpAttempts(newCount);

      if (newCount >= MAX_OTP_ATTEMPTS) {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 350);
        setShowResend(true);
        setError(t.otpMaxAttempts);
      } else {
        setError(e instanceof Error ? e.message : t.otpInvalid);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const inputValue = tab === "phone" ? phone : email;
  const canSend = inputValue.trim().length > 0;
  const canVerify = otp.join("").length === 6;

  return (
    <div
      className="flex items-center justify-center px-4"
      style={{
        minHeight: "100dvh",
        background:
          "radial-gradient(ellipse at 50% -20%, rgba(255,107,53,0.12) 0%, transparent 70%), var(--color-bg)",
      }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            A
          </div>
          <h1 className="text-2xl font-semibold text-[var(--color-text)]">
            Arjun
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {t.tagline}
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          {/* Tabs */}
          <div
            className="flex rounded-lg mb-6 p-1"
            style={{ backgroundColor: "var(--color-bg)" }}
          >
            {(["phone", "email"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className="flex-1 py-2 rounded-md text-sm font-medium transition-colors"
                style={{
                  backgroundColor:
                    tab === t ? "var(--color-primary)" : "transparent",
                  color: tab === t ? "white" : "var(--color-text-muted)",
                  minHeight: 44,
                }}
              >
                {t === "phone" ? "Phone" : "Email"}
              </button>
            ))}
          </div>

          {step === "input" ? (
            <>
              <label className="block text-xs mb-2 text-[var(--color-text-muted)]">
                {tab === "phone" ? "Phone number" : "Email address"}
              </label>
              <input
                type={tab === "phone" ? "tel" : "email"}
                placeholder={
                  tab === "phone" ? "+91 98765 43210" : "you@example.com"
                }
                value={inputValue}
                onChange={(e) =>
                  tab === "phone"
                    ? setPhone(e.target.value)
                    : setEmail(e.target.value)
                }
                onKeyDown={(e) => e.key === "Enter" && canSend && handleSend()}
                className="w-full px-4 py-3 rounded-xl text-sm mb-4 text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] caret-[var(--color-primary)]"
                style={{
                  backgroundColor: "var(--color-elevated)",
                  border: "1px solid var(--color-border)",
                }}
              />
              {error && (
                <p className="text-xs mb-3" style={{ color: "var(--color-danger)" }}>
                  {error}
                </p>
              )}
              <button
                onClick={handleSend}
                disabled={loading || !canSend}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all active:scale-[0.97] disabled:opacity-50"
                style={{ backgroundColor: "var(--color-primary)", minHeight: 52 }}
              >
                {loading
                  ? t.sending
                  : tab === "phone"
                  ? t.sendOtp
                  : t.sendMagicLink}
              </button>
            </>
          ) : tab === "email" ? (
            /* ── Email: magic link sent — no code to enter ── */
            <>
              <div className="text-center py-6">
                <div className="text-5xl mb-4">📧</div>
                <p className="text-sm font-medium text-[var(--color-text)] mb-1">
                  {t.linkSent}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {t.emailSentDesc(email)}
                </p>
              </div>

              {error && (
                <p className="text-xs mb-3 text-center" style={{ color: "var(--color-danger)" }}>
                  {error}
                </p>
              )}

              {showResend && (
                <div className="mb-3 flex flex-col items-center gap-1">
                  <button
                    onClick={handleSend}
                    disabled={loading}
                    className="text-xs transition-colors disabled:opacity-50"
                    style={{ color: "var(--color-primary)", minHeight: 44 }}
                  >
                    {loading ? t.sending : t.resendLink}
                  </button>
                </div>
              )}

              <button
                onClick={() => {
                  setStep("input");
                  setError("");
                  setShowResend(false);
                }}
                className="w-full mt-1 text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
                style={{ minHeight: 44 }}
              >
                {t.back}
              </button>
            </>
          ) : (
            /* ── Phone: enter OTP code ── */
            <>
              <p className="text-xs mb-4 text-center text-[var(--color-text-muted)]">
                {t.otpSentTo(phone)}
              </p>

              {/* OTP boxes — 48×52px, 8px gap */}
              <div
                className={`flex gap-2 justify-center mb-4 ${isShaking ? "shake" : ""}`}
              >
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="text-center text-[var(--color-text)] text-lg font-bold rounded-xl caret-[var(--color-primary)]"
                    style={{
                      width: 48,
                      height: 52,
                      backgroundColor: "var(--color-elevated)",
                      border: digit
                        ? "1px solid var(--color-primary)"
                        : "1px solid var(--color-border)",
                    }}
                  />
                ))}
              </div>

              {error && (
                <p className="text-xs mb-3 text-center" style={{ color: "var(--color-danger)" }}>
                  {error}
                </p>
              )}

              <button
                onClick={handleVerify}
                disabled={loading || !canVerify}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all active:scale-[0.97] disabled:opacity-50"
                style={{ backgroundColor: "var(--color-primary)", minHeight: 52 }}
              >
                {loading ? t.verifying : t.verify}
              </button>

              {showResend && (
                <div className="mt-4 flex flex-col items-center gap-1">
                  <button
                    onClick={handleSend}
                    disabled={loading}
                    className="text-xs transition-colors disabled:opacity-50"
                    style={{ color: "var(--color-primary)", minHeight: 44 }}
                  >
                    {loading ? t.sending : t.resendOtp}
                  </button>
                  <p className="text-xs text-center" style={{ color: "var(--color-text-muted)" }}>
                    {t.otpNotReceived}{" "}
                    <button
                      onClick={() => switchTab("email")}
                      className="underline"
                      style={{ color: "var(--color-primary)" }}
                    >
                      {t.tryEmail}
                    </button>
                  </p>
                </div>
              )}

              <button
                onClick={() => {
                  setStep("input");
                  setError("");
                  setOtp(["", "", "", "", "", ""]);
                  setOtpAttempts(0);
                }}
                className="w-full mt-3 text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
                style={{ minHeight: 44 }}
              >
                {t.back}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
