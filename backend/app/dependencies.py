import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from app.config import settings
from app.db import supabase

_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> Optional[str]:
    """Return the user UUID from a verified Supabase JWT, or None for anonymous requests."""
    if creds is None:
        return None
    if not settings.supabase_jwt_secret:
        raise HTTPException(status_code=500, detail="JWT secret not configured")
    try:
        payload = jwt.decode(
            creds.credentials,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        user_id: str = payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

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
