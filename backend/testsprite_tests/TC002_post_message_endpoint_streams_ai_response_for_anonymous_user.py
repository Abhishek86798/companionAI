import requests
import json

BASE_URL = "http://localhost:8000"


def test_post_message_anonymous_stream():
    url = f"{BASE_URL}/api/v1/message"
    payload = {"content": "Hello, how are you?"}
    headers = {
        "Accept": "text/event-stream",
        "Content-Type": "application/json",
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30, stream=True)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
    assert response.headers.get("Content-Type", "").startswith("text/event-stream"), \
        f"Expected Content-Type 'text/event-stream', got '{response.headers.get('Content-Type')}'"

    token_events_found = False
    done_event_found = False

    try:
        for line in response.iter_lines(decode_unicode=True):
            if not line or not line.startswith("data:"):
                continue
            raw = line[5:].strip()
            try:
                obj = json.loads(raw)
                if obj.get("type") == "token":
                    token_events_found = True
                elif obj.get("type") == "done":
                    done_event_found = True
                    break
            except (json.JSONDecodeError, AttributeError):
                pass
    except requests.RequestException as e:
        assert False, f"Error streaming response: {e}"

    assert token_events_found, "No streamed token events found in response."
    assert done_event_found, "No done event (type='done') found in streamed response."


test_post_message_anonymous_stream()
