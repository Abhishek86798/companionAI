from typing import Optional
from app.db import supabase


async def create_anon_conversation() -> str:
    result = supabase.table("conversations").insert({}).execute()
    return result.data[0]["id"]


async def get_or_create_conversation(
    user_id: str, conversation_id: Optional[str] = None
) -> str:
    if conversation_id:
        # Try to claim an ownerless (anon) conversation
        claim = (
            supabase.table("conversations")
            .update({"user_id": user_id})
            .eq("id", conversation_id)
            .is_("user_id", "null")
            .execute()
        )
        if claim.data:
            return conversation_id
        # Already owned by this user?
        existing = (
            supabase.table("conversations")
            .select("id")
            .eq("id", conversation_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        if existing:
            return conversation_id
    # No valid conversation found — create a new one
    result = supabase.table("conversations").insert({"user_id": user_id}).execute()
    return result.data[0]["id"]


async def save_messages(
    user_id: str,
    conversation_id: str,
    user_content: str,
    ai_content: str,
) -> str:
    """Save user + assistant messages. Returns assistant message UUID."""
    supabase.table("messages").insert({
        "user_id": user_id,
        "conversation_id": conversation_id,
        "role": "user",
        "content": user_content,
    }).execute()
    result = supabase.table("messages").insert({
        "user_id": user_id,
        "conversation_id": conversation_id,
        "role": "assistant",
        "content": ai_content,
    }).execute()
    return result.data[0]["id"]


async def count_messages(user_id: str) -> int:
    result = (
        supabase.table("messages")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .execute()
    )
    return result.count or 0


async def get_recent_messages(user_id: str, limit: int = 10) -> list[dict]:
    result = (
        supabase.table("messages")
        .select("role, content")
        .eq("user_id", user_id)
        .order("created_at", desc=False)
        .limit(limit)
        .execute()
    )
    return [{"role": r["role"], "content": r["content"]} for r in result.data]


async def save_user_message(user_id: str, conversation_id: str, content: str) -> None:
    supabase.table("messages").insert({
        "user_id": user_id,
        "conversation_id": conversation_id,
        "role": "user",
        "content": content,
    }).execute()


async def save_assistant_message(user_id: str, conversation_id: str, content: str) -> str:
    """Save assistant message and return its UUID."""
    result = supabase.table("messages").insert({
        "user_id": user_id,
        "conversation_id": conversation_id,
        "role": "assistant",
        "content": content,
    }).execute()
    return result.data[0]["id"]


async def get_messages_by_conversation(
    user_id: str,
    conversation_id: str,
    page: int = 1,
    page_size: int = 20,
) -> list[dict]:
    """Fetch paginated message history for a conversation, ordered oldest-first."""
    offset = (page - 1) * page_size
    result = (
        supabase.table("messages")
        .select("id, role, content, created_at, safety_flagged")
        .eq("user_id", user_id)
        .eq("conversation_id", conversation_id)
        .order("created_at", desc=False)
        .range(offset, offset + page_size - 1)
        .execute()
    )
    return result.data
