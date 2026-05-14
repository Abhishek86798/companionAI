"use client";
import { useEffect, useRef } from "react";
import ChatBubble, { type ChatMessage } from "./ChatBubble";

interface Props {
  messages: ChatMessage[];
}

export default function MessageList({ messages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevLenRef = useRef(0);

  useEffect(() => {
    // scroll on new messages or streaming content updates
    if (messages.length !== prevLenRef.current || messages.some((m) => m.isStreaming)) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      prevLenRef.current = messages.length;
    }
  }, [messages]);

  return (
    <div
      role="log"
      aria-live="polite"
      aria-label="Conversation with Arjun"
      className="flex-1 overflow-y-auto"
    >
      {/* min-h-full + justify-end pins messages to the bottom when few exist */}
      <div className="flex flex-col justify-end min-h-full px-4 md:px-8 py-4 max-w-5xl mx-auto w-full">
        {messages.map((m) => (
          <ChatBubble key={m.id} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
