"use client";
import { useState, useEffect, type KeyboardEvent } from "react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import VoiceButton from "./VoiceButton";
import { COPY, type Lang } from "@/lib/copy";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  isLimited?: boolean;
  lang?: Lang;
  /** Set to restore a failed message back into the input box */
  restoreText?: string;
  onRestoreConsumed?: () => void;
}

export default function ChatInput({
  onSend,
  disabled,
  isLimited,
  lang,
  restoreText,
  onRestoreConsumed,
}: Props) {
  const [value, setValue] = useState("");
  const { isSupported, isRecording, transcript, startRecording, stopRecording } =
    useVoiceInput();

  // Populate input when voice transcript arrives
  useEffect(() => {
    if (transcript) setValue(transcript);
  }, [transcript]);

  // Restore a failed message back into the input box
  useEffect(() => {
    if (restoreText) {
      setValue(restoreText);
      onRestoreConsumed?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoreText]);

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
      className="flex-shrink-0 border-t border-[var(--color-border)]"
      style={{
        background: "var(--color-surface)",
        boxShadow: "var(--shadow-input)",
        paddingBottom: "max(0px, env(safe-area-inset-bottom))",
      }}
    >
    <div className="flex items-end gap-2 px-4 md:px-8 max-w-5xl mx-auto" style={{ paddingTop: 10, paddingBottom: 10 }}>
      <textarea
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKey}
        disabled={disabled || isLimited}
        placeholder={
          isLimited
            ? COPY[lang ?? "hinglish"].chat.limitPlaceholder
            : COPY[lang ?? "hinglish"].chat.inputPlaceholder
        }
        className="flex-1 resize-none rounded-2xl px-4 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none max-h-32 transition-all disabled:opacity-50"
        style={{
          background: "var(--color-elevated)",
          border: "1px solid var(--color-border)",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--color-primary)";
          e.currentTarget.style.boxShadow = "0 0 0 2px rgba(255,107,53,0.2)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--color-border)";
          e.currentTarget.style.boxShadow = "none";
        }}
      />

      {isSupported && !isLimited && (
        <VoiceButton
          isRecording={isRecording}
          onStart={startRecording}
          onStop={stopRecording}
        />
      )}

      {/* Send button — 44×44px minimum tap target */}
      <button
        onClick={submit}
        disabled={!canSend}
        aria-label="Send message"
        className="flex-shrink-0 flex items-center justify-center rounded-full transition-opacity active:scale-[0.97]"
        style={{
          width: 44,
          height: 44,
          background: "var(--color-primary)",
          opacity: canSend ? 1 : 0.35,
        }}
      >
        {disabled && !isLimited ? (
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
    </div>
  );
}
