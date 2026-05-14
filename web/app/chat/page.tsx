"use client";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { sendMessage, Message } from "@/lib/api";
import MessageList from "@/components/MessageList";
import ChatInput from "@/components/ChatInput";

function buildWelcome(): Message {
  try {
    const raw = localStorage.getItem("arjun_intake");
    if (!raw)
      return {
        role: "assistant",
        content: "Hey yaar! Main Arjun hoon. Bol, kya chal raha hai? 😊",
      };
    const intake = JSON.parse(raw) as {
      name?: string;
      city?: string;
      situation?: string;
      language?: string;
    };
    const name = intake.name?.trim();
    const city = intake.city?.trim();
    const situation = intake.situation?.trim();
    const lang = intake.language ?? "hinglish";

    if (lang === "english") {
      const parts = ["Hey! I'm Arjun."];
      if (name) parts.push(`Great to meet you, ${name}!`);
      if (city) parts.push(`So you're from ${city} — nice!`);
      if (situation)
        parts.push(`You mentioned: "${situation}" — let's talk about it.`);
      else parts.push("What's on your mind today?");
      return { role: "assistant", content: parts.join(" ") };
    }

    if (lang === "hindi") {
      const parts = ["नमस्ते! मैं अर्जुन हूँ।"];
      if (name) parts.push(`मिलकर अच्छा लगा, ${name}!`);
      if (city) parts.push(`तो आप ${city} से हैं!`);
      if (situation)
        parts.push(
          `आपने बताया: "${situation}" — चलो इस बारे में बात करते हैं।`
        );
      else parts.push("आज क्या चल रहा है?");
      return { role: "assistant", content: parts.join(" ") };
    }

    // hinglish (default)
    const parts = ["Hey yaar! Main Arjun hoon."];
    if (name) parts.push(`${name}, mil ke accha laga!`);
    if (city) parts.push(`${city} se ho — nice!`);
    if (situation)
      parts.push(
        `Tune bataya: "${situation}" — iske baare mein baat karte hain.`
      );
    else parts.push("Bol, kya chal raha hai? 😊");
    return { role: "assistant", content: parts.join(" ") };
  } catch {
    return {
      role: "assistant",
      content: "Hey yaar! Main Arjun hoon. Bol, kya chal raha hai? 😊",
    };
  }
}

export default function ChatPage() {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/auth");
    }
  }, [session, isLoading, router]);

  useEffect(() => {
    setMessages([buildWelcome()]);
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      setMessages((prev) => [...prev, { role: "user", content: text }]);
      setLoading(true);
      try {
        const res = await sendMessage(
          text,
          session?.access_token,
          conversationId
        );
        setConversationId(res.conversation_id);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: res.content },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Yaar, kuch gadbad ho gayi. Thodi der baad try karo.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [conversationId, session]
  );

  if (isLoading) return null;

  return (
    <div className="flex flex-col h-screen bg-gray-100 max-w-lg mx-auto">
      <div className="bg-orange-500 text-white px-4 py-3 flex items-center gap-3 shadow-sm">
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
          A
        </div>
        <div>
          <p className="font-semibold text-sm">Arjun</p>
          <p className="text-xs text-orange-100">Tera dost 🤝</p>
        </div>
      </div>

      <MessageList messages={messages} loading={loading} />
      <ChatInput onSend={handleSend} disabled={loading} />
    </div>
  );
}
