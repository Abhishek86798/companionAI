import time
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
    "Content-Type": "application/json",
    "Accept": "application/json",
}


def send_message_and_get_conv_id(content: str) -> str | None:
    resp = requests.post(
        f"{BASE_URL}/api/v1/message",
        headers=HEADERS,
        json={"content": content},
        timeout=30,
        stream=True,
    )
    if resp.status_code != 200:
        return None
    for line in resp.iter_lines(decode_unicode=True):
        if line and line.startswith("data:"):
            try:
                obj = json.loads(line[5:].strip())
                if obj.get("type") == "done":
                    return obj.get("conversation_id")
            except (json.JSONDecodeError, AttributeError):
                pass
    return None


def test_delete_memories_endpoint_deletes_owned_memory_fact():
    # Send a message that the extractor will parse into memory facts
    unique_tag = str(uuid.uuid4())[:8]
    conv_id = send_message_and_get_conv_id(
        f"My name is TestUser-{unique_tag} and I live in TestCity-{unique_tag}."
    )
    assert conv_id, f"Failed to send message: got None conversation_id"

    # Wait for extract_and_store_memories background task to complete
    time.sleep(3)

    # Fetch memories
    resp = requests.get(f"{BASE_URL}/api/v1/memories", headers=HEADERS, timeout=30)
    assert resp.status_code == 200, f"GET /memories failed: {resp.text}"
    mem_list = resp.json().get("memories", [])
    assert isinstance(mem_list, list), "Expected 'memories' list in response"
    assert len(mem_list) > 0, "No memory facts found — extractor may not have fired"

    # Pick any memory to delete (we own all of them)
    memory_to_delete = mem_list[0]
    memory_id = memory_to_delete["id"]

    try:
        del_resp = requests.delete(
            f"{BASE_URL}/api/v1/memories/{memory_id}",
            headers=HEADERS,
            timeout=30,
        )
        assert del_resp.status_code == 204, \
            f"Expected 204 No Content, got {del_resp.status_code}: {del_resp.text}"

        # Verify it's gone
        resp_after = requests.get(f"{BASE_URL}/api/v1/memories", headers=HEADERS, timeout=30)
        assert resp_after.status_code == 200
        ids_after = {m["id"] for m in resp_after.json().get("memories", [])}
        assert memory_id not in ids_after, "Memory fact was not removed after DELETE"
    finally:
        # Best-effort cleanup
        try:
            requests.delete(f"{BASE_URL}/api/v1/memories/{memory_id}", headers=HEADERS, timeout=5)
        except Exception:
            pass


test_delete_memories_endpoint_deletes_owned_memory_fact()
