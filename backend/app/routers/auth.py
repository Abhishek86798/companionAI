import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.db import supabase

logger = logging.getLogger(__name__)
router = APIRouter(tags=["auth"])


class TestVerifyRequest(BaseModel):
    identifier: str  # phone (E.164) or email
    otp: str


class TestVerifyResponse(BaseModel):
    email: str


def _derive_test_email(identifier: str) -> str:
    identifier = identifier.strip()
    if identifier.startswith("+") or identifier.replace("+", "").isdigit():
        return f"{identifier.replace('+', '').replace(' ', '')}@test.arjun.app"
    return identifier


@router.post("/auth/test-verify", response_model=TestVerifyResponse)
async def test_verify(body: TestVerifyRequest) -> TestVerifyResponse:
    """
    Dev-only: accepts hardcoded TEST_OTP, ensures a Supabase test user exists
    with that password, returns email so frontend can call signInWithPassword.
    Disabled (404) when TEST_OTP env var is not set.
    """
    if not settings.test_otp:
        raise HTTPException(status_code=404, detail="Not found")
    if body.otp != settings.test_otp:
        raise HTTPException(status_code=403, detail="Invalid test OTP")

    email = _derive_test_email(body.identifier)

    # Try creating the user first
    try:
        supabase.auth.admin.create_user({
            "email": email,
            "password": settings.test_otp,
            "email_confirm": True,
        })
        logger.info("Test user created: %s", email)
        return TestVerifyResponse(email=email)
    except Exception as create_err:
        logger.info("create_user failed (%s), trying to find existing user", create_err)

    # User likely already exists — find them by iterating (small list for test accounts)
    try:
        all_users = supabase.auth.admin.list_users()
        # list_users may return a list or a paginated object
        users = all_users if isinstance(all_users, list) else getattr(all_users, "users", all_users)
        user = next((u for u in users if getattr(u, "email", None) == email), None)
        if not user:
            raise HTTPException(status_code=500, detail="Test user not found after create failed")
        supabase.auth.admin.update_user_by_id(str(user.id), {
                "password": settings.test_otp,
                "email_confirm": True,
            })
        logger.info("Test user password reset: %s", email)
        return TestVerifyResponse(email=email)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("test_verify failed for %s: %s", email, e)
        raise HTTPException(status_code=500, detail=str(e))
