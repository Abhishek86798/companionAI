"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Tab = "phone" | "email";
type Step = "input" | "otp";

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("phone");
  const [step, setStep] = useState<Step>("input");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const switchTab = (t: Tab) => {
    setTab(t);
    setStep("input");
    setError("");
    setOtp(["", "", "", "", "", ""]);
  };

  const handleSend = async () => {
    setError("");
    setLoading(true);
    try {
      const { error } =
        tab === "phone"
          ? await supabase.auth.signInWithOtp({ phone })
          : await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      setStep("otp");
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Kuch gadbad ho gayi, dobara try karo."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    const token = otp.join("");
    try {
      const { error } =
        tab === "phone"
          ? await supabase.auth.verifyOtp({ phone, token, type: "sms" })
          : await supabase.auth.verifyOtp({ email, token, type: "email" });
      if (error) throw error;
      const done = localStorage.getItem("arjun_onboarding_done") === "true";
      router.replace(done ? "/chat" : "/onboarding");
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "OTP galat hai, dobara try karo."
      );
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
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "#0F0F14" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold"
            style={{ backgroundColor: "#FF6B35" }}
          >
            A
          </div>
          <h1 className="text-white text-2xl font-bold">Arjun</h1>
          <p className="mt-1 text-sm" style={{ color: "#6B7280" }}>
            Tera apna dost
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: "#1A1A2E" }}>
          {/* Tabs */}
          <div
            className="flex rounded-lg mb-6 p-1"
            style={{ backgroundColor: "#0F0F14" }}
          >
            {(["phone", "email"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className="flex-1 py-2 rounded-md text-sm font-medium transition-colors"
                style={{
                  backgroundColor: tab === t ? "#FF6B35" : "transparent",
                  color: tab === t ? "white" : "#6B7280",
                }}
              >
                {t === "phone" ? "Phone" : "Email"}
              </button>
            ))}
          </div>

          {step === "input" ? (
            <>
              <label
                className="block text-xs mb-2"
                style={{ color: "#9CA3AF" }}
              >
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
                className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-600 outline-none mb-4 text-sm"
                style={{
                  backgroundColor: "#22223A",
                  border: "1px solid #2D2D4A",
                }}
              />
              {error && (
                <p className="text-red-400 text-xs mb-3">{error}</p>
              )}
              <button
                onClick={handleSend}
                disabled={loading || !canSend}
                className="w-full py-3 rounded-lg text-white font-semibold text-sm transition-opacity disabled:opacity-50"
                style={{ backgroundColor: "#FF6B35" }}
              >
                {loading ? "Bhej raha hoon..." : "OTP Bhejo"}
              </button>
            </>
          ) : (
            <>
              <p
                className="text-xs mb-4 text-center"
                style={{ color: "#9CA3AF" }}
              >
                OTP bheja{" "}
                <span className="text-white">
                  {tab === "phone" ? phone : email}
                </span>{" "}
                pe
              </p>
              <div className="flex gap-2 justify-center mb-4">
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
                    className="w-10 h-12 text-center text-white text-lg font-bold rounded-lg outline-none"
                    style={{
                      backgroundColor: "#22223A",
                      border: digit
                        ? "1px solid #FF6B35"
                        : "1px solid #2D2D4A",
                    }}
                  />
                ))}
              </div>
              {error && (
                <p className="text-red-400 text-xs mb-3 text-center">{error}</p>
              )}
              <button
                onClick={handleVerify}
                disabled={loading || !canVerify}
                className="w-full py-3 rounded-lg text-white font-semibold text-sm transition-opacity disabled:opacity-50"
                style={{ backgroundColor: "#FF6B35" }}
              >
                {loading ? "Verify ho raha hai..." : "Verify Karo"}
              </button>
              <button
                onClick={() => {
                  setStep("input");
                  setError("");
                  setOtp(["", "", "", "", "", ""]);
                }}
                className="w-full mt-3 py-2 text-xs"
                style={{ color: "#6B7280" }}
              >
                Wapas jao
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
