from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from app.db import supabase

_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> Optional[str]:
    """Return the user UUID from a verified Supabase JWT, or None for anonymous requests."""
    if creds is None:
        return None
    try:
        response = supabase.auth.get_user(creds.credentials)
        user_id = str(response.user.id)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    # Lazy-create public.users row on first valid JWT
    existing = supabase.table("users").select("id").eq("id", user_id).execute()
    if not existing.data:
        supabase.table("users").insert({"id": user_id}).execute()

    return user_id


async def require_current_user(
    user_id: Optional[str] = Depends(get_current_user),
) -> str:
    if user_id is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user_id
