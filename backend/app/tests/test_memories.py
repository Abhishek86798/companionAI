"""
Memories router tests — all Supabase calls mocked.

Covers:
  1. GET /memories — no rows, multiple rows, response shape
  2. DELETE /memories/{id} — success 204, 404 when not found,
     ownership check (another user's memory → 404)
  3. require_current_user gate — unauthenticated → 401
"""
import uuid
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app


# ── helpers ───────────────────────────────────────────────────────────────────

USER_ID = str(uuid.uuid4())
MEMORY_ID = str(uuid.uuid4())

_SAMPLE_ROW = {
    "id": MEMORY_ID,
    "category": "name",
    "fact": "Rahul",
    "created_at": "2026-01-01T00:00:00+00:00",
    "updated_at": "2026-01-01T00:00:00+00:00",
}


def _auth(user_id: str = USER_ID):
    """Override require_current_user and get_current_user dependencies."""
    from app.dependencies import require_current_user, get_current_user

    app.dependency_overrides[require_current_user] = lambda: user_id
    app.dependency_overrides[get_current_user] = lambda: user_id


def _clear_auth():
    app.dependency_overrides.clear()


def _db_rows(rows: list[dict]) -> MagicMock:
    m = MagicMock()
    m.data = rows
    return m


def _db_single(row: dict | None) -> MagicMock:
    m = MagicMock()
    m.data = row
    return m


# ── GET /api/v1/memories ─────────────────────────────────────────────────────

class TestGetMemories:
    def setup_method(self):
        _auth()

    def teardown_method(self):
        _clear_auth()

    def test_empty_returns_empty_list(self):
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = _db_rows([])
        with patch("app.routers.memories.supabase", mock_db):
            client = TestClient(app)
            res = client.get("/api/v1/memories")
        assert res.status_code == 200
        assert res.json() == {"memories": []}

    def test_returns_all_facts_for_user(self):
        rows = [
            {**_SAMPLE_ROW, "category": "name", "fact": "Priya"},
            {**_SAMPLE_ROW, "id": str(uuid.uuid4()), "category": "city", "fact": "Mumbai"},
        ]
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = _db_rows(rows)
        with patch("app.routers.memories.supabase", mock_db):
            client = TestClient(app)
            res = client.get("/api/v1/memories")
        assert res.status_code == 200
        body = res.json()
        assert len(body["memories"]) == 2
        cats = {m["category"] for m in body["memories"]}
        assert cats == {"name", "city"}

    def test_response_shape_has_required_fields(self):
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = _db_rows([_SAMPLE_ROW])
        with patch("app.routers.memories.supabase", mock_db):
            client = TestClient(app)
            res = client.get("/api/v1/memories")
        m = res.json()["memories"][0]
        assert "id" in m
        assert "category" in m
        assert "fact" in m
        assert "created_at" in m
        assert "updated_at" in m

    def test_unauthenticated_returns_401(self):
        _clear_auth()
        client = TestClient(app)
        res = client.get("/api/v1/memories")
        assert res.status_code == 401


# ── DELETE /api/v1/memories/{id} ─────────────────────────────────────────────

class TestDeleteMemory:
    def setup_method(self):
        _auth()

    def teardown_method(self):
        _clear_auth()

    def test_delete_existing_own_memory_returns_204(self):
        mock_db = MagicMock()
        # ownership check returns the row
        select_chain = mock_db.table.return_value.select.return_value
        select_chain.eq.return_value = select_chain
        select_chain.maybe_single.return_value.execute.return_value = _db_single(_SAMPLE_ROW)
        # delete chain
        mock_db.table.return_value.delete.return_value.eq.return_value.execute.return_value = MagicMock()

        with patch("app.routers.memories.supabase", mock_db):
            client = TestClient(app)
            res = client.delete(f"/api/v1/memories/{MEMORY_ID}")
        assert res.status_code == 204

    def test_delete_calls_delete_with_correct_id(self):
        mock_db = MagicMock()
        select_chain = mock_db.table.return_value.select.return_value
        select_chain.eq.return_value = select_chain
        select_chain.maybe_single.return_value.execute.return_value = _db_single(_SAMPLE_ROW)
        delete_eq_mock = mock_db.table.return_value.delete.return_value.eq

        with patch("app.routers.memories.supabase", mock_db):
            client = TestClient(app)
            client.delete(f"/api/v1/memories/{MEMORY_ID}")

        delete_eq_mock.assert_called_once_with("id", MEMORY_ID)

    def test_delete_nonexistent_returns_404(self):
        mock_db = MagicMock()
        select_chain = mock_db.table.return_value.select.return_value
        select_chain.eq.return_value = select_chain
        select_chain.maybe_single.return_value.execute.return_value = _db_single(None)

        with patch("app.routers.memories.supabase", mock_db):
            client = TestClient(app)
            res = client.delete(f"/api/v1/memories/{MEMORY_ID}")
        assert res.status_code == 404

    def test_delete_another_users_memory_returns_404(self):
        """Ownership filter means another user's row is invisible → 404."""
        other_user_row = {**_SAMPLE_ROW, "user_id": str(uuid.uuid4())}
        mock_db = MagicMock()
        select_chain = mock_db.table.return_value.select.return_value
        select_chain.eq.return_value = select_chain
        # The .eq("user_id", USER_ID) filter means this row won't be returned
        select_chain.maybe_single.return_value.execute.return_value = _db_single(None)

        with patch("app.routers.memories.supabase", mock_db):
            client = TestClient(app)
            res = client.delete(f"/api/v1/memories/{MEMORY_ID}")
        assert res.status_code == 404
        # Confirm delete was NOT called
        mock_db.table.return_value.delete.assert_not_called()

    def test_delete_invalid_uuid_returns_422(self):
        client = TestClient(app)
        res = client.delete("/api/v1/memories/not-a-uuid")
        assert res.status_code == 422

    def test_unauthenticated_returns_401(self):
        _clear_auth()
        client = TestClient(app)
        res = client.delete(f"/api/v1/memories/{MEMORY_ID}")
        assert res.status_code == 401
