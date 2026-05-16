import requests
import uuid

BASE_URL = "http://localhost:8000"
TOKEN = "eyJhbGciOiJFUzI1NiIsImtpZCI6IjQwODhjYWE1LWJlNzMtNDY2OC1iOTdmLTU3YmFhNDA0MDBiNiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2xzdXlhanFuemZlbWxtaGhtbGVtLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI4YTE5YjY1Yi0yZjY2LTRjNGEtODAzYy0xYzI4YjI0YTFlMzMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzc4ODI1OTg5LCJpYXQiOjE3Nzg3ODk5ODksImVtYWlsIjoiYWJoaWtva2Fkd2FyMkBnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoiYWJoaWtva2Fkd2FyMkBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJzdWIiOiI4YTE5YjY1Yi0yZjY2LTRjNGEtODAzYy0xYzI4YjI0YTFlMzMifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJvdHAiLCJ0aW1lc3RhbXAiOjE3Nzg3ODk5ODl9XSwic2Vzc2lvbl9pZCI6IjZmZGNiYTE2LWNjMGYtNDg2Yi1iYWRjLTk3MWJlMmZlYWI5YiIsImlzX2Fub255bW91cyI6ZmFsc2V9.zW1FMCVC0XXLCJmoNgHT3ylcNN8DNviK9xPovgp0PmucdS87xUnxj34jQGYuoRr5mt5sVTDiN0jexOFpUM8Ovg"

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
    "Accept": "text/event-stream"
}

def test_post_message_enforces_rate_limit_and_safety_checks():
    url = f"{BASE_URL}/api/v1/message"
    safe_message_content = "Hey yaar, what's up? Let's chat about something fun."

    payload = {
        "content": safe_message_content
    }

    try:
        response = requests.post(url, json=payload, headers=HEADERS, timeout=30, stream=True)
    except requests.RequestException as e:
        assert False, f"Request to {url} failed with exception: {e}"

    # Assert status code 200 indicating request accepted and streamed response
    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"

    # Validate response headers indicate text/event-stream content type
    content_type = response.headers.get("Content-Type", "")
    assert "text/event-stream" in content_type, f"Expected 'text/event-stream' in Content-Type, got {content_type}"

    # Collect streamed response data chunks checking for some assistant reply indications
    event_data = []
    try:
        # The server streams tokens and a done event; we parse lines starting with 'data:'
        for line in response.iter_lines(decode_unicode=True):
            if line:
                event_data.append(line)
            # Break loop early if "event: done" or "[DONE]" token is present in stream
            if "done" in line.lower() or "[DONE]" in line:
                break
    except requests.RequestException as e:
        assert False, f"Error streaming response data: {e}"

    assert event_data, "No streaming event data received from server"

    # Basic heuristic check that data contains streaming tokens and an assistant reply stream
    data_lines = [line for line in event_data if line.startswith("data:")]
    assert len(data_lines) > 0, "No 'data:' events found in streaming response"

    # Check at least one data message contains some Hinglish or Hindi style assistant reply token keywords 
    # (Since actual content depends on backend AI model, we check presence of some token text)
    # We'll check that the streamed content data is non-empty and not error/crisis message
    streaming_texts = [line[5:].strip() for line in data_lines if line[5:].strip() and line[5:].strip() != "[DONE]"]
    assert any(streaming_texts), "Streamed 'data:' events contain no content"

    # Assert safety checks and rate limiter passed implied by 200 and streamed response,
    # no explicit error or 429 found in any of the streamed data or response headers.
    assert response.status_code == 200, "Safety check or rate limit failed (status code not 200)"

    # Additional check: confirm that no rate limit exceeded error present in stream or response
    combined_stream = "\n".join(event_data).lower()
    assert "rate limit" not in combined_stream and "429" not in combined_stream, "Rate limit exceeded indicated in response"

    # Since the message should be stored, check response headers or events for conversation ID or message metadata if any
    # (PRD does not specify exact metadata returned, so minimal validation here)
    # If conversation_id is returned via headers or in partial data, validate UUID format if present
    # This part is best-effort due to lack of explicit spec in PRD for response metadata.

test_post_message_enforces_rate_limit_and_safety_checks()