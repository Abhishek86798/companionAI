from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.db import supabase

router = APIRouter(tags=["auth"])


class TestVerifyRequest(BaseModel):
    identifier: str  # phone (E.164) or email
    otp: str


class TestVerifyResponse(BaseModel):
    token: str
    email: str


@router.post("/auth/test-verify", response_model=TestVerifyResponse)
async def test_verify(body: TestVerifyRequest) -> TestVerifyResponse:
    """
    Dev-only endpoint: accepts a hardcoded TEST_OTP and returns a magic-link token
    so the frontend can establish a real Supabase session for any identifier.
    Disabled (404) when TEST_OTP env var is not set.
    """
    if not settings.test_otp:
        raise HTTPException(status_code=404, detail="Not found")
    if body.otp != settings.test_otp:
        raise HTTPException(status_code=403, detail="Invalid test OTP")

    # Derive an email — phone numbers get a synthetic address
    identifier = body.identifier.strip()
    if identifier.startswith("+") or identifier.lstrip("-").isdigit():
        email = f"{identifier.replace('+', '').replace(' ', '')}@test.arjun.app"
    else:
        email = identifier

    try:
        res = supabase.auth.admin.generate_link({"type": "magiclink", "email": email})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate session: {e}")

    hashed_token: str = res.properties.hashed_token  # type: ignore[union-attr]
    return TestVerifyResponse(token=hashed_token, email=email)
