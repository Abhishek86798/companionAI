"use client";
import { useState, KeyboardEvent } from "react";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState("");

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex items-end gap-2 p-3 bg-white border-t border-gray-200">
      <textarea
        className="flex-1 resize-none rounded-2xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:border-orange-400 max-h-32"
        rows={1}
        placeholder="Kuch bhi bolo yaar..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKey}
        disabled={disabled}
      />
      <button
        onClick={submit}
        disabled={disabled || !value.trim()}
        className="w-10 h-10 rounded-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40 flex items-center justify-center flex-shrink-0 transition-colors"
      >
        <svg className="w-5 h-5 text-white rotate-90" fill="currentColor" viewBox="0 0 24 24">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
    </div>
  );
}
