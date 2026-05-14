"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { sendMessageStream, RateLimitError, type SSEEvent } from "@/lib/chat";
import MessageList from "@/components/chat/MessageList";
import ChatInput from "@/components/chat/ChatInput";
import type { ChatMessage } from "@/components/chat/ChatBubble";

// ── Helpers ───────────────────────────────────────────────────────────────────

function newId() {
  return typeof crypto !== "undefined"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function buildIntroMessage(intake: Record<string, string>): string {
  const name = intake.name?.trim();
  const city = intake.city?.trim();
  const situation = intake.situation?.trim();

  const parts: string[] = [];
  if (name) parts.push(`My name is ${name}.`);
  if (city) parts.push(`I'm from ${city}.`);
  if (situation) parts.push(situation);
  if (parts.length === 0) parts.push("Hi, I'm new here.");
  return parts.join(" ");
}

function fallbackWelcome(): ChatMessage {
  return {
    id: newId(),
    role: "assistant",
    content: "Hey yaar! Main Arjun hoon. Bol, kya chal raha hai? 😊",
    timestamp: new Date(),
  };
}

const LIMIT_MESSAGES: Record<string, string> = {
  anon_limit:
    "Yaar, free messages khatam! Sign up karo aur baat karte hain. 🙏",
  default:
    "Yaar, aaj ke 20 free messages ho gaye. Kal phir baat karte hain! 🙌",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { session, isLoading } = useAuth();
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLimited, setIsLimited] = useState(false);
  const [conversationId, setConversationId] = useState<string>();

  // ── Auth gate ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/auth");
    }
  }, [session, isLoading, router]);

  // ── First-load intake trigger ───────────────────────────────────────────────
  useEffect(() => {
    if (isLoading || !session) return;

    const alreadySent = localStorage.getItem("arjun_first_sent");
    if (alreadySent) return;

    const raw = localStorage.getItem("arjun_intake");
    if (!raw) {
      setMessages([fallbackWelcome()]);
      return;
    }

    let introMsg: string;
    try {
      introMsg = buildIntroMessage(JSON.parse(raw) as Record<string, string>);
    } catch {
      setMessages([fallbackWelcome()]);
      return;
    }

    localStorage.setItem("arjun_first_sent", "1");

    // Fire intro without showing the user bubble
    const streamId = newId();
    setMessages([{
      id: streamId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    }]);
    setIsStreaming(true);

    void (async () => {
      try {
        for await (const event of sendMessageStream(
          introMsg,
          session.access_token,
        )) {
          applyEvent(event, streamId, setMessages, setConversationId, setIsLimited);
        }
      } catch {
        setMessages([fallbackWelcome()]);
      } finally {
        setIsStreaming(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, session]);

  // ── Send handler ────────────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (text: string) => {
      const userMsgId = newId();
      const streamId = newId();

      setMessages((prev) => [
        ...prev,
        { id: userMsgId, role: "user", content: text, timestamp: new Date() },
        { id: streamId, role: "assistant", content: "", timestamp: new Date(), isStreaming: true },
      ]);
      setIsStreaming(true);

      try {
        for await (const event of sendMessageStream(
          text,
          session?.access_token,
          conversationId,
        )) {
          applyEvent(event, streamId, setMessages, setConversationId, setIsLimited);
        }
      } catch (err) {
        const limitMsg =
          err instanceof RateLimitError
            ? LIMIT_MESSAGES[err.detail] ?? LIMIT_MESSAGES.default
            : "Yaar, kuch gadbad ho gayi. Thodi der baad try karo.";

        setMessages((prev) =>
          prev
            .filter((m) => m.id !== streamId)
            .concat({
              id: newId(),
              role: "assistant",
              content: limitMsg,
              timestamp: new Date(),
            }),
        );

        if (err instanceof RateLimitError) setIsLimited(true);
      } finally {
        setIsStreaming(false);
      }
    },
    [conversationId, session],
  );

  if (isLoading) return null;

  return (
    <div
      className="flex flex-col max-w-lg mx-auto"
      style={{ height: "100dvh", background: "var(--color-bg)" }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] flex-shrink-0"
        style={{ background: "var(--color-surface)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-white text-base flex-shrink-0"
            style={{ background: "#FF6B35" }}
          >
            A
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-text)]">
              Arjun
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {/* Pulsing green online indicator */}
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: "#4CAF82", animation: "pulse-ring 2s ease-in-out infinite" }}
              />
              <span className="text-[10px] text-[var(--color-text-muted)]">
                online
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => router.push("/settings")}
          aria-label="Settings"
          className="w-9 h-9 flex items-center justify-center rounded-full transition-colors hover:bg-[var(--color-elevated)]"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[var(--color-text-muted)]"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <MessageList messages={messages} />

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        disabled={isStreaming}
        isLimited={isLimited}
      />
    </div>
  );
}

// ── Pure SSE event handler (extracted so it can be used from both send paths) ─

function applyEvent(
  event: SSEEvent,
  streamId: string,
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setConversationId: React.Dispatch<React.SetStateAction<string | undefined>>,
  setIsLimited: React.Dispatch<React.SetStateAction<boolean>>,
) {
  if (event.type === "token") {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === streamId ? { ...m, content: m.content + event.content } : m,
      ),
    );
  } else if (event.type === "done") {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === streamId
          ? {
              ...m,
              id: event.message_id,
              isStreaming: false,
              isCrisis: event.safety_triggered,
            }
          : m,
      ),
    );
    setConversationId(event.conversation_id);
    if (event.remaining_messages_today === 0) setIsLimited(true);
  } else if (event.type === "error") {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === streamId
          ? {
              ...m,
              content: "Yaar, kuch gadbad ho gayi. Thodi der baad try karo.",
              isStreaming: false,
            }
          : m,
      ),
    );
  }
}
