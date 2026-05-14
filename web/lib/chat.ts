const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// ── SSE event shapes ──────────────────────────────────────────────────────────

export interface SSETokenEvent {
  type: "token";
  content: string;
}

export interface SSEDoneEvent {
  type: "done";
  message_id: string;
  conversation_id: string;
  safety_triggered: boolean;
  remaining_messages_today: number | null;
}

export interface SSEErrorEvent {
  type: "error";
  detail: string;
}

export type SSEEvent = SSETokenEvent | SSEDoneEvent | SSEErrorEvent;

// ── Errors ────────────────────────────────────────────────────────────────────

export class RateLimitError extends Error {
  constructor(public readonly detail: string) {
    super(detail);
    this.name = "RateLimitError";
  }
}

// ── SSE stream reader ─────────────────────────────────────────────────────────

/**
 * POST /api/v1/message and yield SSE events as they arrive.
 * Throws RateLimitError on HTTP 429; throws Error on other failures.
 */
export async function* sendMessageStream(
  content: string,
  token?: string,
  conversationId?: string,
): AsyncGenerator<SSEEvent> {
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

  if (!res.ok) {
    if (res.status === 429) {
      const json = await res.json().catch(() => ({ detail: "limit" }));
      throw new RateLimitError(
        (json as { detail?: string }).detail ?? "limit",
      );
    }
    throw new Error(`HTTP ${res.status}`);
  }

  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by \n\n
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const line = part.trim();
        if (line.startsWith("data: ")) {
          try {
            yield JSON.parse(line.slice(6)) as SSEEvent;
          } catch {
            // skip malformed events
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ── Conversation history ──────────────────────────────────────────────────────

export interface HistoryMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  safety_flagged: boolean;
}

export interface HistoryResponse {
  messages: HistoryMessage[];
  page: number;
  has_more: boolean;
}

export async function fetchMessages(
  conversationId: string,
  token: string,
  page = 1,
): Promise<HistoryResponse> {
  const res = await fetch(
    `${API}/messages/${conversationId}?page=${page}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<HistoryResponse>;
}
