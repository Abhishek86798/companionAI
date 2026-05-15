"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { sendMessageStream, RateLimitError, type SSEEvent } from "@/lib/chat";
import { upsertPersona } from "@/lib/api";
import { usePersona } from "@/hooks/usePersona";
import { COPY, type Lang } from "@/lib/copy";
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

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { session, isLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const persona = usePersona();
  const lang = (persona.language_pref ?? "hinglish") as Lang;
  const t = COPY[lang].chat;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLimited, setIsLimited] = useState(false);
  const [conversationId, setConversationId] = useState<string>();
  const [restoreText, setRestoreText] = useState("");

  const hadSession = useRef(false);

  // ── Auth gate + JWT expiry detection ────────────────────────────────────────
  useEffect(() => {
    if (isLoading) return;
    if (session) {
      hadSession.current = true;
      return;
    }
    if (hadSession.current) {
      showToast(t.sessionExpired, "error");
      setTimeout(() => router.replace("/auth"), 1000);
    } else {
      router.replace("/auth");
    }
  }, [session, isLoading, router, showToast, t.sessionExpired]);

  // ── Restore anon conversation_id after auth redirect ────────────────────────
  useEffect(() => {
    if (isLoading || !session) return;
    if (conversationId) return;
    const saved = localStorage.getItem("arjun_anon_conv_id");
    if (saved) {
      setConversationId(saved);
      localStorage.removeItem("arjun_anon_conv_id");
    }
  }, [isLoading, session, conversationId]);

  // ── Persona sync — POST arjun_persona from localStorage if not yet synced ───
  useEffect(() => {
    if (isLoading || !session) return;
    const raw = localStorage.getItem("arjun_persona");
    if (!raw) return;

    void (async () => {
      try {
        const payload = JSON.parse(raw) as Record<string, string>;
        await upsertPersona(payload, session.access_token);
        localStorage.removeItem("arjun_persona");
      } catch {
        // silently fail — will retry on next page load
      }
    })();
  }, [isLoading, session]);

  // ── First-load intake trigger ────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading || !session) return;
    const alreadySent = localStorage.getItem("arjun_first_sent");
    if (alreadySent) return;

    const raw = localStorage.getItem("arjun_intake");
    const fallback: ChatMessage = {
      id: newId(),
      role: "assistant",
      content: t.fallbackWelcome(persona.companion_name),
      timestamp: new Date(),
    };

    if (!raw) {
      setMessages([fallback]);
      return;
    }

    let introMsg: string;
    try {
      introMsg = buildIntroMessage(JSON.parse(raw) as Record<string, string>);
    } catch {
      setMessages([fallback]);
      return;
    }

    localStorage.setItem("arjun_first_sent", "1");

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
        for await (const event of sendMessageStream(introMsg, session.access_token)) {
          applyEvent(event, streamId, t.aiError, setMessages, setConversationId, setIsLimited);
        }
      } catch {
        setMessages([fallback]);
      } finally {
        setIsStreaming(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, session]);

  // ── Send handler ─────────────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (text: string) => {
      const userMsgId = newId();
      const streamId = newId();
      let receivedAnyToken = false;

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
          if (event.type === "token") receivedAnyToken = true;
          if (event.type === "done" && !session) {
            localStorage.setItem("arjun_anon_conv_id", event.conversation_id);
          }
          applyEvent(event, streamId, t.aiError, setMessages, setConversationId, setIsLimited);
        }
      } catch (err) {
        if (err instanceof RateLimitError) {
          const limitMsg = err.detail === "anon_limit" ? t.limitAnon : t.limitDaily;
          setMessages((prev) =>
            prev
              .filter((m) => m.id !== streamId)
              .concat({ id: newId(), role: "assistant", content: limitMsg, timestamp: new Date() }),
          );
          setIsLimited(true);
        } else if (!receivedAnyToken) {
          setMessages((prev) =>
            prev.filter((m) => m.id !== streamId && m.id !== userMsgId),
          );
          setRestoreText(text);
          showToast(t.messageNotSent, "error");
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamId ? { ...m, isStreaming: false } : m,
            ),
          );
          showToast(t.connectionBroken, "error");
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [conversationId, session, showToast, t],
  );

  if (isLoading) return null;

  return (
    <div
      className="flex flex-col w-full overflow-hidden"
      style={{ height: "100dvh", background: "var(--color-bg)" }}
    >
      {/* Top bar */}
      <header
        className="flex-shrink-0 border-b border-[var(--color-border)]"
        style={{ background: "var(--color-surface)" }}
      >
        <div className="flex items-center justify-between px-4 md:px-8 py-3 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-white text-base flex-shrink-0"
              style={{ background: "var(--color-primary)" }}
            >
              {persona.companion_name[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-text)]">
                {persona.companion_name}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    background: "var(--color-success)",
                    animation: "pulse-ring 2s ease-in-out infinite",
                  }}
                />
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  {t.online}
                </span>
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-1">
            <button
              onClick={() => router.push("/settings")}
              aria-label="Settings"
              className="w-11 h-11 flex items-center justify-center rounded-full transition-colors hover:bg-[var(--color-elevated)]"
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
          </nav>
        </div>
      </header>

      {/* Messages */}
      <MessageList messages={messages} />

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        disabled={isStreaming}
        isLimited={isLimited}
        lang={lang}
        restoreText={restoreText}
        onRestoreConsumed={() => setRestoreText("")}
      />
    </div>
  );
}

// ── Pure SSE event handler ────────────────────────────────────────────────────

function applyEvent(
  event: SSEEvent,
  streamId: string,
  aiError: string,
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
          ? { ...m, id: event.message_id, isStreaming: false, isCrisis: event.safety_triggered }
          : m,
      ),
    );
    setConversationId(event.conversation_id);
    if (event.remaining_messages_today === 0) setIsLimited(true);
  } else if (event.type === "error") {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === streamId ? { ...m, content: aiError, isStreaming: false } : m,
      ),
    );
  }
}
