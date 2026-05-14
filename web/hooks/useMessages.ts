"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchMessages, type HistoryMessage } from "@/lib/chat";

export function useMessages(
  conversationId: string | undefined,
  token: string | undefined,
  page = 1,
): {
  messages: HistoryMessage[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
} {
  const { data, isLoading, error } = useQuery({
    queryKey: ["messages", conversationId, page],
    queryFn: () => fetchMessages(conversationId!, token!, page),
    enabled: !!conversationId && !!token,
    staleTime: 60_000,
  });

  return {
    messages: data?.messages ?? [],
    isLoading,
    error: error as Error | null,
    hasMore: data?.has_more ?? false,
  };
}
