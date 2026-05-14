"use client";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isCrisis?: boolean;
  isStreaming?: boolean;
}

export default function ChatBubble({ message }: { message: ChatMessage }) {
  const { role, content, timestamp, isCrisis, isStreaming } = message;
  const isUser = role === "user";

  const timeStr = timestamp.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  if (isCrisis) {
    return (
      <div className="flex justify-start mb-4 bubble-slide-up">
        <div className="flex flex-col" style={{ maxWidth: "80%" }}>
          <div
            role="alert"
            className="px-4 py-3 text-sm leading-relaxed text-[var(--color-text)]"
            style={{
              background: "var(--color-crisis-bg)",
              borderLeft: "4px solid var(--color-crisis)",
              borderRadius: "18px 18px 18px 4px",
            }}
          >
            {content}
          </div>
          <span className="mt-1 text-[10px] text-[var(--color-text-muted)] self-start">
            {timeStr}
          </span>
        </div>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="flex justify-end mb-4 bubble-slide-up">
        <div className="flex flex-col items-end" style={{ maxWidth: "80%" }}>
          <div
            className="px-4 py-3 text-sm leading-relaxed text-white"
            style={{
              background: "var(--color-primary)",
              borderRadius: "18px 18px 4px 18px",
              fontWeight: 400,
            }}
          >
            {content}
          </div>
          <span className="mt-1 text-[10px] text-[var(--color-text-muted)]">
            {timeStr}
          </span>
        </div>
      </div>
    );
  }

  // Arjun bubble
  const isEmpty = isStreaming && content === "";

  return (
    <div className="flex justify-start mb-4 bubble-slide-up">
      <div className="flex flex-col" style={{ maxWidth: "80%" }}>
        <div
          className="px-4 py-3 text-sm leading-relaxed text-[var(--color-text)]"
          style={{
            background: "var(--color-elevated)",
            borderRadius: isEmpty ? "18px" : "18px 18px 18px 4px",
            fontWeight: 400,
          }}
        >
          {isEmpty ? (
            <span className="flex gap-1.5 items-center h-4 py-0.5">
              <span className="typing-dot" />
              <span className="typing-dot" style={{ animationDelay: "150ms" }} />
              <span className="typing-dot" style={{ animationDelay: "300ms" }} />
            </span>
          ) : (
            <>
              {content}
              {isStreaming && (
                <span
                  className="inline-block w-0.5 h-3.5 ml-0.5 align-middle animate-pulse"
                  style={{ background: "var(--color-primary)", opacity: 0.8 }}
                />
              )}
            </>
          )}
        </div>
        {!isEmpty && (
          <span className="mt-1 text-[10px] text-[var(--color-text-muted)] self-start">
            {timeStr}
          </span>
        )}
      </div>
    </div>
  );
}
