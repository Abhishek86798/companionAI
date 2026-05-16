import requests
import uuid
import json

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
HEADERS = {
    "Authorization": f"Bearer {JWT_TOKEN}",
    "Accept": "application/json",
}


def create_conversation() -> str | None:
    """Send a chat message to create/use a conversation; return the conversation_id from the done SSE event."""
    conversation_id = str(uuid.uuid4())
    payload = {"content": "Test message for conversation history", "conversation_id": conversation_id}
    try:
        resp = requests.post(
            f"{BASE_URL}/api/v1/message",
            headers={**HEADERS, "Content-Type": "application/json"},
            json=payload,
            timeout=30,
            stream=True,
        )
        if resp.status_code != 200:
            return None
        for line in resp.iter_lines(decode_unicode=True):
            if line and line.startswith("data:"):
                try:
                    obj = json.loads(line[5:].strip())
                    if obj.get("type") == "done" and obj.get("conversation_id"):
                        return obj["conversation_id"]
                except (json.JSONDecodeError, AttributeError):
                    pass
        return conversation_id
    except Exception:
        return None


def test_get_messages_endpoint_returns_paginated_conversation_history_for_authenticated_user():
    conversation_id = create_conversation()
    assert conversation_id, "Failed to create owned conversation — cannot test messages GET endpoint."

    url = f"{BASE_URL}/api/v1/messages/{conversation_id}"
    response = requests.get(url, headers=HEADERS, params={"page": 1}, timeout=30)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    json_resp = response.json()
    assert isinstance(json_resp, dict), "Response is not a JSON object"
    # ConversationHistoryResponse shape: {"messages": [...], "page": int, "has_more": bool}
    assert "messages" in json_resp and isinstance(json_resp["messages"], list), \
        f"Missing or invalid 'messages' list. Keys: {list(json_resp.keys())}"
    assert "page" in json_resp and json_resp["page"] == 1, \
        f"Missing or incorrect page number: {json_resp.get('page')}"
    assert "has_more" in json_resp, "Missing 'has_more' field"

    if json_resp["messages"]:
        msg = json_resp["messages"][0]
        assert "id" in msg, "Message missing 'id'"
        assert "content" in msg, "Message missing 'content'"
        assert "role" in msg, "Message missing 'role'"


test_get_messages_endpoint_returns_paginated_conversation_history_for_authenticated_user()
