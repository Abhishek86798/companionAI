import requests

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


def test_get_memories_returns_all_memory_facts_for_authenticated_user():
    response = requests.get(f"{BASE_URL}/api/v1/memories", headers=HEADERS, timeout=30)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    data = response.json()
    assert isinstance(data, dict), "MemoriesResponse should be a dict"
    # MemoriesResponse shape: {"memories": [...]}
    assert "memories" in data, f"Missing 'memories' key. Got: {list(data.keys())}"
    memory_list = data["memories"]
    assert isinstance(memory_list, list), "'memories' should be a list"

    if len(memory_list) > 1:
        categories = [m["category"] for m in memory_list if isinstance(m, dict) and "category" in m]
        assert categories == sorted(categories), "Memories are not ordered by category"

    for mem in memory_list:
        assert isinstance(mem, dict), "Each memory fact should be a dict"
        for field in ("id", "category", "fact", "created_at", "updated_at"):
            assert field in mem, f"Memory fact missing field '{field}'"


test_get_memories_returns_all_memory_facts_for_authenticated_user()
