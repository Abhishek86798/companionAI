from datetime import date
from typing import Optional

from fastapi import HTTPException

from app.config import settings
from app.db import supabase


async def check_and_increment(
    user_id: Optional[str],
    anon_session_id: Optional[str],
) -> Optional[int]:
    """
    Check daily rate limit and increment counter.

    Returns remaining messages for today (after this one) or None if unconstrained.
    Raises HTTP 429 if the caller is over their limit.

    Authenticated:  limit = settings.free_tier_daily_limit (20)
    Anonymous:      limit = settings.anon_msg_limit (8), keyed by anon_session_id cookie
    Neither:        pass-through (shouldn't happen in prod; no row written)
    """
    today = date.today().isoformat()

    if user_id:
        return await _check_increment_user(user_id, today)

    if anon_session_id:
        return await _check_increment_anon(anon_session_id, today)

    return None


async def _check_increment_user(user_id: str, today: str) -> int:
    limit = settings.free_tier_daily_limit
    # maybe_single().execute() returns None (not APIResponse) when 0 rows found
    row = (
        supabase.table("daily_usage")
        .select("id,msg_count")
        .eq("user_id", user_id)
        .eq("date", today)
        .maybe_single()
        .execute()
    )
    current = row.data["msg_count"] if (row is not None and row.data) else 0

    if current >= limit:
        raise HTTPException(
            status_code=429,
            detail="Daily message limit reached. Kal phir aana!",
        )

    _upsert_row(row.data if row is not None else None, {"user_id": user_id, "date": today}, current)
    return limit - (current + 1)


async def _check_increment_anon(anon_session_id: str, today: str) -> int:
    limit = settings.anon_msg_limit
    # maybe_single().execute() returns None (not APIResponse) when 0 rows found
    row = (
        supabase.table("daily_usage")
        .select("id,msg_count")
        .eq("anon_session_id", anon_session_id)
        .eq("date", today)
        .maybe_single()
        .execute()
    )
    current = row.data["msg_count"] if (row is not None and row.data) else 0

    if current >= limit:
        raise HTTPException(
            status_code=429,
            detail="anon_limit",
        )

    _upsert_row(row.data if row is not None else None, {"anon_session_id": anon_session_id, "date": today}, current)
    return limit - (current + 1)


def _upsert_row(existing_row: Optional[dict], insert_payload: dict, current: int) -> None:
    """Update existing row or insert new one with msg_count = current + 1."""
    if existing_row:
        supabase.table("daily_usage").update({"msg_count": current + 1}).eq(
            "id", existing_row["id"]
        ).execute()
    else:
        supabase.table("daily_usage").insert({**insert_payload, "msg_count": 1}).execute()
