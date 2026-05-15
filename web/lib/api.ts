const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export interface PersonaData {
  companion_name: string;
  tone: string | null;
  expectation: string | null;
  open_field: string | null;
  language_pref: string;
}

export async function fetchPersona(token: string): Promise<PersonaData> {
  const res = await fetch(`${API}/persona`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch persona");
  return res.json() as Promise<PersonaData>;
}

export async function upsertPersona(
  data: Partial<PersonaData>,
  token: string,
): Promise<PersonaData> {
  const res = await fetch(`${API}/persona`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to upsert persona");
  return res.json() as Promise<PersonaData>;
}

export interface MemoryFact {
  id: string;
  category: string;
  fact: string;
  created_at: string;
  updated_at: string;
}

export async function fetchMemories(token: string): Promise<MemoryFact[]> {
  const res = await fetch(`${API}/memories`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch memories");
  const data = await res.json() as { memories: MemoryFact[] };
  return data.memories;
}

export async function deleteMemory(id: string, token: string): Promise<void> {
  const res = await fetch(`${API}/memories/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });
  if (!res.ok && res.status !== 204) throw new Error("Failed to delete memory");
}

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
