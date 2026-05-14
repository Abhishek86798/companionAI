from typing import Optional
from app.db import supabase


async def get_or_create_conversation(
    user_id: str, conversation_id: Optional[str] = None
) -> str:
    if conversation_id:
        return conversation_id
    result = (
        supabase.table("conversations").insert({"user_id": user_id}).execute()
    )
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
