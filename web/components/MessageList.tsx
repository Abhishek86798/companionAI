"use client";
import { useEffect, useRef } from "react";
import { Message } from "@/lib/api";
import ChatBubble from "./ChatBubble";

export default function MessageList({ messages, loading }: { messages: Message[]; loading: boolean }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
      {messages.map((m, i) => (
        <ChatBubble key={i} message={m} />
      ))}
      {loading && (
        <div className="flex justify-start mb-2">
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold mr-2 self-end">
            A
          </div>
          <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex gap-1 items-center">
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
