"use client";
import { useRef } from "react";

interface Props {
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
}

function useIsCoarsePointer() {
  const ref = useRef(
    typeof window !== "undefined" &&
      window.matchMedia("(pointer: coarse)").matches,
  );
  return ref.current;
}

export default function VoiceButton({ isRecording, onStart, onStop }: Props) {
  const isTouch = useIsCoarsePointer();

  // Touch: hold to record; mouse: click to toggle
  const eventProps = isTouch
    ? {
        onPointerDown: (e: React.PointerEvent) => {
          e.preventDefault();
          onStart();
        },
        onPointerUp: onStop,
        onPointerLeave: onStop,
        onPointerCancel: onStop,
      }
    : {
        onClick: () => (isRecording ? onStop() : onStart()),
      };

  return (
    <button
      {...eventProps}
      type="button"
      aria-label={isRecording ? "Stop recording" : "Start voice input"}
      aria-pressed={isRecording}
      className="flex-shrink-0 flex items-center justify-center rounded-full transition-colors active:scale-[0.97]"
      style={{
        width: 44,
        height: 44,
        background: isRecording
          ? "rgba(255, 107, 53, 0.15)"
          : "var(--color-elevated)",
        border: isRecording
          ? "1.5px solid var(--color-primary)"
          : "1.5px solid transparent",
      }}
    >
      {isRecording ? (
        <span
          aria-hidden="true"
          style={{ display: "flex", alignItems: "center", gap: 3 }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="mic-bar"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </span>
      ) : (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "var(--color-text-muted)" }}
          aria-hidden="true"
        >
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      )}
    </button>
  );
}
