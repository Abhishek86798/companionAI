import requests

BASE_URL = "http://localhost:8000"


def test_get_messages_unauthorized_returns_401():
    conversation_id = "00000000-0000-0000-0000-000000000000"
    url = f"{BASE_URL}/api/v1/messages/{conversation_id}?page=1"

    def is_auth_error(body: dict) -> bool:
        # "Authentication required" — no token sent
        # "Invalid token" — malformed JWT sent
        # Both are correct 401 responses from this backend.
        detail = str(body.get("detail", "")).lower()
        return "authentication required" in detail or "invalid" in detail or "token" in detail

    # No Authorization header → require_current_user fires → "Authentication required"
    resp_no_auth = requests.get(url, timeout=30)
    assert resp_no_auth.status_code == 401, \
        f"Expected 401 for missing token, got {resp_no_auth.status_code}"
    assert resp_no_auth.headers.get("Content-Type", "").startswith("application/json")
    assert is_auth_error(resp_no_auth.json()), \
        f"Unexpected body for missing token: {resp_no_auth.json()}"

    # Invalid JWT → get_current_user JWT decode fails → "Invalid token"
    resp_bad_jwt = requests.get(
        url,
        headers={"Authorization": "Bearer invalid.jwt.token"},
        timeout=30,
    )
    assert resp_bad_jwt.status_code == 401, \
        f"Expected 401 for invalid token, got {resp_bad_jwt.status_code}"
    assert resp_bad_jwt.headers.get("Content-Type", "").startswith("application/json")
    assert is_auth_error(resp_bad_jwt.json()), \
        f"Unexpected body for invalid token: {resp_bad_jwt.json()}"


test_get_messages_unauthorized_returns_401()
