import hashlib
import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.db import supabase

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


def _derive_user_id(email: str) -> str:
    # Deterministic UUID so we can always find the user without listing
    return str(uuid.UUID(hashlib.md5(f"test:{email}".encode()).hexdigest()))


@router.post("/auth/test-verify", response_model=TestVerifyResponse)
async def test_verify(body: TestVerifyRequest) -> TestVerifyResponse:
    """
    Dev-only: accepts hardcoded TEST_OTP, creates/updates a Supabase test user,
    returns the derived email so the frontend can call signInWithPassword.
    Disabled (404) when TEST_OTP env var is not set.
    """
    if not settings.test_otp:
        raise HTTPException(status_code=404, detail="Not found")
    if body.otp != settings.test_otp:
        raise HTTPException(status_code=403, detail="Invalid test OTP")

    email = _derive_test_email(body.identifier)
    uid = _derive_user_id(email)

    try:
        supabase.auth.admin.create_user({
            "id": uid,
            "email": email,
            "password": settings.test_otp,
            "email_confirm": True,
        })
    except Exception:
        # User already exists — just reset password to current test OTP
        try:
            supabase.auth.admin.update_user_by_id(uid, {"password": settings.test_otp})
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to prepare test user: {e}")

    return TestVerifyResponse(email=email)
