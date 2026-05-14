"use client";
import { useState, type KeyboardEvent } from "react";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  isLimited?: boolean;
}

export default function ChatInput({ onSend, disabled, isLimited }: Props) {
  const [value, setValue] = useState("");

  const canSend = !!value.trim() && !disabled && !isLimited;

  const submit = () => {
    if (!canSend) return;
    onSend(value.trim());
    setValue("");
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div
      className="flex items-end gap-2 px-3 border-t border-[var(--color-border)]"
      style={{
        background: "var(--color-surface)",
        boxShadow: "var(--shadow-input)",
        paddingTop: "10px",
        paddingBottom: "max(10px, env(safe-area-inset-bottom))",
      }}
    >
      <textarea
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKey}
        disabled={disabled || isLimited}
        placeholder={
          isLimited ? "Daily limit reached. Kal phir aana! 🙏" : "Kuch bhi bolo yaar..."
        }
        className="flex-1 resize-none rounded-2xl px-4 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none max-h-32 transition-all disabled:opacity-50"
        style={{
          background: "var(--color-elevated)",
          border: "1px solid var(--color-border)",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "#FF6B35";
          e.currentTarget.style.boxShadow = "0 0 0 2px rgba(255,107,53,0.2)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--color-border)";
          e.currentTarget.style.boxShadow = "none";
        }}
      />

      <button
        onClick={submit}
        disabled={!canSend}
        aria-label="Send message"
        className="flex-shrink-0 flex items-center justify-center rounded-full transition-opacity"
        style={{
          width: 40,
          height: 40,
          background: "#FF6B35",
          opacity: canSend ? 1 : 0.35,
        }}
      >
        {disabled && !isLimited ? (
          // Spinner while streaming
          <span
            className="block rounded-full border-2 border-white border-t-transparent animate-spin"
            style={{ width: 16, height: 16 }}
          />
        ) : (
          <svg
            className="rotate-90"
            width="20"
            height="20"
            fill="white"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}
