import requests

def test_get_persona_returns_default_when_none_exists():
    base_url = "http://localhost:8000"
    url = f"{base_url}/api/v1/persona"
    token = "eyJhbGciOiJFUzI1NiIsImtpZCI6IjQwODhjYWE1LWJlNzMtNDY2OC1iOTdmLTU3YmFhNDA0MDBiNiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2xzdXlhanFuemZlbWxtaGhtbGVtLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI4YTE5YjY1Yi0yZjY2LTRjNGEtODAzYy0xYzI4YjI0YTFlMzMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzc4ODI1OTg5LCJpYXQiOjE3Nzg3ODk5ODksImVtYWlsIjoiYWJoaWtva2Fkd2FyMkBnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoiYWJoaWtva2Fkd2FyMkBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJzdWIiOiI4YTE5YjY1Yi0yZjY2LTRjNGEtODAzYy0xYzI4YjI0YTFlMzMifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJvdHAiLCJ0aW1lc3RhbXAiOjE3Nzg3ODk5ODl9XSwic2Vzc2lvbl9pZCI6IjZmZGNiYTE2LWNjMGYtNDg2Yi1iYWRjLTk3MWJlMmZlYWI5YiIsImlzX2Fub255bW91cyI6ZmFsc2V9.zW1FMCVC0XXLCJmoNgHT3ylcNN8DNviK9xPovgp0PmucdS87xUnxj34jQGYuoRr5mt5sVTDiN0jexOFpUM8Ovg"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }

    try:
        response = requests.get(url, headers=headers, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"

    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # Defensive checks for keys presence
    assert "companion_name" in data, "Missing 'companion_name' in response"
    assert "tone" in data, "Missing 'tone' in response"
    assert "expectation" in data, "Missing 'expectation' in response"
    assert "open_field" in data, "Missing 'open_field' in response"

    # Check values are strings
    assert isinstance(data["companion_name"], str), "'companion_name' is not a string"
    assert isinstance(data["tone"], str), "'tone' is not a string"
    assert isinstance(data["expectation"], str), "'expectation' is not a string"
    # open_field can be None or string
    assert data["open_field"] is None or isinstance(data["open_field"], str), "'open_field' is neither None nor string"

    # Only assert non-empty strings for important fields
    assert data["companion_name"].strip() != "", "'companion_name' should not be empty"
    assert data["tone"].strip() != "", "'tone' should not be empty"
    assert data["expectation"].strip() != "", "'expectation' should not be empty"


test_get_persona_returns_default_when_none_exists()