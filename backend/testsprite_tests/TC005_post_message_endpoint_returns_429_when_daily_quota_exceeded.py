import requests
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))
from _test_helpers import cleanup_persona, seed_rate_limit, TEST_USER_ID

BASE_URL = "http://localhost:8000"
JWT_TOKEN = (
    "eyJhbGciOiJFUzI1NiIsImtpZCI6IjQwODhjYWE1LWJlNzMtNDY2OC1iOTdmLTU3YmFhNDA0MDBiNiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJodHRwczovL2xzdXlhanFuemZlbWxtaGhtbGVtLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI4YTE5YjY1"
    "Yi0yZjY2LTRjNGEtODAzYy0xYzI4YjI0YTFlMzMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzc4ODI1OTg5LCJp"
    "YXQiOjE3Nzg3ODk5ODksImVtYWlsIjoiYWJoaWtva2Fkd2FyMkBnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0"
    "YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoi"
    "YWJoaWtva2Fkd2FyMkBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJz"
    "dWIiOiI4YTE5YjY1Yi0yZjY2LTRjNGEtODAzYy0xYzI4YjI0YTFlMzMifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwi"
    "OiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJvdHAiLCJ0aW1lc3RhbXAiOjE3Nzg3ODk5ODl9XSwic2Vzc2lvbl9pZCI6IjZm"
    "ZGNiYTE2LWNjMGYtNDg2Yi1iYWRjLTk3MWJlMmZlYWI5YiIsImlzX2Fub255bW91cyI6ZmFsc2V9"
    ".zW1FMCVC0XXLCJmoNgHT3ylcNN8DNviK9xPovgp0PmucdS87xUnxj34jQGYuoRr5mt5sVTDiN0jexOFpUM8Ovg"
)
AUTH_HEADERS = {
    "Authorization": f"Bearer {JWT_TOKEN}",
    "Content-Type": "application/json",
}


def test_post_message_rate_limit_exceeded():
    # Seed today's msg_count to FREE_TIER_DAILY_LIMIT so the very next request is blocked
    cleanup_persona()
    seed_rate_limit(user_id=TEST_USER_ID)

    url = f"{BASE_URL}/api/v1/message"
    payload = {"content": "This message should be blocked by the rate limiter."}

    try:
        response = requests.post(url, headers=AUTH_HEADERS, json=payload, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request to {url} failed: {e}"

    assert response.status_code == 429, f"Expected 429, got {response.status_code}: {response.text}"
    body = response.text.lower()
    assert "rate limit" in body or "exceeded" in body or "quota" in body, \
        f"Response does not indicate rate limiting: {response.text}"


test_post_message_rate_limit_exceeded()
