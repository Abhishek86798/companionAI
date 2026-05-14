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
            className="px-4 py-3 text-sm leading-relaxed text-[#F0EDE8]"
            style={{
              background: "#1E1A3E",
              borderLeft: "4px solid #8B7CF6",
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
              background: "#FF6B35",
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
          className="px-4 py-3 text-sm leading-relaxed text-[#F0EDE8]"
          style={{
            background: "#22223A",
            borderRadius: isEmpty ? "18px" : "18px 18px 18px 4px",
            fontWeight: 400,
          }}
        >
          {isEmpty ? (
            // Typing indicator — 3 dots
            <span className="flex gap-1.5 items-center h-4 py-0.5">
              <span className="typing-dot" />
              <span
                className="typing-dot"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="typing-dot"
                style={{ animationDelay: "300ms" }}
              />
            </span>
          ) : (
            <>
              {content}
              {isStreaming && (
                <span
                  className="inline-block w-0.5 h-3.5 ml-0.5 align-middle animate-pulse"
                  style={{ background: "#FF6B35", opacity: 0.8 }}
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
