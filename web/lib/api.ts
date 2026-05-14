const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface MessageApiResponse {
  message_id: string;
  conversation_id: string;
  content: string;
  safety_triggered: boolean;
  remaining_messages_today: number | null;
}

export async function sendMessage(
  content: string,
  token?: string,
  conversationId?: string
): Promise<MessageApiResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}/message`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ content, conversation_id: conversationId ?? null }),
  });
  if (!res.ok) throw new Error("Failed to send message");
  return res.json();
}
