"""
Shared test setup/teardown helpers for TestSprite backend tests.

Uses two SECURITY DEFINER Supabase RPC functions (added via migration
add_test_helper_functions) to reset test state between runs without
requiring the service role key in test code.

Secret 'arjun-test-2026' is a low-stakes test gate — not a production credential.
"""
import requests

SUPABASE_URL = "https://lsuyajqnzfemlmhhmlem.supabase.co"
SUPABASE_ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdXlhanFuemZlbWxtaGhtbGVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2ODc4NDIsImV4cCI6MjA5NDI2Mzg0Mn0"
    ".sQUn9xzr4R6A5hAjtO5UzVeq52dv7RFzmxDgitCXPo0"
)
_TEST_SECRET = "arjun-test-2026"

TEST_USER_ID = "8a19b65b-2f66-4c4a-803c-1c28b24a1e33"
FREE_TIER_DAILY_LIMIT = 20  # must match config.py FREE_TIER_DAILY_LIMIT

_RPC_HEADERS = {
    "apikey": SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
}


def cleanup_persona(user_id: str = TEST_USER_ID) -> None:
    """Delete the persona row for *user_id* so the next GET returns Arjun defaults."""
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/test_cleanup_persona",
        headers=_RPC_HEADERS,
        json={"p_user_id": user_id, "p_secret": _TEST_SECRET},
        timeout=10,
    )
    assert resp.status_code == 200, f"cleanup_persona RPC failed ({resp.status_code}): {resp.text}"


def seed_rate_limit(user_id: str = TEST_USER_ID, count: int = FREE_TIER_DAILY_LIMIT) -> None:
    """Upsert today's daily_usage row so the rate limiter blocks the next request."""
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/test_seed_rate_limit",
        headers=_RPC_HEADERS,
        json={"p_user_id": user_id, "p_count": count, "p_secret": _TEST_SECRET},
        timeout=10,
    )
    assert resp.status_code == 200, f"seed_rate_limit RPC failed ({resp.status_code}): {resp.text}"
