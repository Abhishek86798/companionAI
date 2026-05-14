import { Message } from "@/lib/api";

export default function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold mr-2 flex-shrink-0 self-end">
          A
        </div>
      )}
      <div
        className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "bg-orange-500 text-white rounded-br-sm"
            : "bg-white text-gray-800 rounded-bl-sm shadow-sm"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
