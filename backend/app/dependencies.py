import logging
from typing import Optional

import jwt as pyjwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from app.db import supabase

logger = logging.getLogger(__name__)

_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> Optional[str]:
    """Return the user UUID from a verified Supabase JWT, or None for anonymous requests."""
    if creds is None:
        return None

    user_id: Optional[str] = None

    if settings.supabase_jwt_secret:
        try:
            payload = pyjwt.decode(
                creds.credentials,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(status_code=401, detail="Token missing sub claim")
        except pyjwt.ExpiredSignatureError:
            logger.warning("JWT rejected: expired")
            raise HTTPException(status_code=401, detail="Token expired")
        except pyjwt.exceptions.InvalidAlgorithmError:
            # Project may use RS256 — fall through to network verification
            logger.warning("JWT uses non-HS256 algorithm; falling back to Supabase verification")
        except pyjwt.InvalidTokenError as e:
            logger.warning("JWT rejected: %s", e)
            raise HTTPException(status_code=401, detail="Invalid token")

    if user_id is None:
        # Network fallback: covers missing secret, non-HS256 algorithms, etc.
        try:
            response = supabase.auth.get_user(creds.credentials)
            user_id = str(response.user.id)
        except Exception as e:
            logger.warning("Supabase auth.get_user failed: %s", e)
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
