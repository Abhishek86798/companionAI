import requests

def test_get_health_check_returns_ok():
    base_url = "http://localhost:8000"
    url = f"{base_url}/health"
    headers = {
        "Authorization": "Bearer eyJhbGciOiJFUzI1NiIsImtpZCI6IjQwODhjYWE1LWJlNzMtNDY2OC1iOTdmLTU3YmFhNDA0MDBiNiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2xzdXlhanFuemZlbWxtaGhtbGVtLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI4YTE5YjY    1Yi0yZjY2LTRjNGEtODAzYy0xYzI4YjI0YTFlMzMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzc4ODI1OTg5LCJpYXQiOjE3Nzg3ODk5ODksImVtYWlsIjoiYWJoaWtva2Fkd2FyMkBnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwc    m92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoiYWJoaWtva2Fkd2FyMkBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJzdWIiOiI4YTE5YjY1Yi0    yZjY2LTRjNGEtODAzYy0xYzI4YjI0YTFlMzMifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJvdHAiLCJ0aW1lc3RhbXAiOjE3Nzg3ODk5ODl9XSwic2Vzc2lvbl9pZCI6IjZmZGNiYTE2LWNjMGYtNDg2Yi1iYWRjL    Tk3MWJlMmZlYWI5YiIsImlzX2Fub255bW91cyI6ZmFsc2V9.zW1FMCVC0XXLCJmoNgHT3ylcNN8DNviK9xPovgp0PmucdS87xUnxj34jQGYuoRr5mt5sVTDiN0jexOFpUM8Ovg"
    }
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        json_data = response.json()
        assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
        assert json_data == {"status":"ok"}, f"Expected JSON {{'status':'ok'}}, got {json_data}"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_get_health_check_returns_ok()