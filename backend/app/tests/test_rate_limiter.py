"""
Rate limiter tests — all Supabase calls mocked, no real DB access.

Scenarios:
 1. Authenticated user under limit → allowed, correct remaining count
 2. Authenticated user at limit (msg_count == limit) → 429
 3. Anonymous user under limit → allowed, correct remaining count
 4. Anonymous user at limit → 429 with "anon_limit" detail
 5. First-ever request (no DB row yet) → inserts row, returns limit-1
 6. Neither user_id nor anon_session_id → pass-through, returns None
 7. Limit boundaries (count = limit-1 → last allowed; count = limit → 429)
"""
import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException

from app.services.rate_limiter import check_and_increment


# ── helpers ──────────────────────────────────────────────────────────────────

def _make_row(msg_count: int) -> MagicMock:
    """Simulate a single Supabase row returned by maybe_single().execute()."""
    m = MagicMock()
    m.data = {"id": "row-uuid", "msg_count": msg_count}
    return m


def _no_row() -> MagicMock:
    """Simulate no existing DB row (first request today)."""
    m = MagicMock()
    m.data = None
    return m


def _patch_supabase(existing_row_mock):
    """
    Return a patcher that makes supabase.table(...).select(...).eq(...).eq(...)
    .maybe_single().execute() return `existing_row_mock`.
    Also silences update/insert calls.
    """
    mock_client = MagicMock()
    chain = mock_client.table.return_value.select.return_value
    chain.eq.return_value = chain
    chain.maybe_single.return_value.execute.return_value = existing_row_mock
    mock_client.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()
    mock_client.table.return_value.insert.return_value.execute.return_value = MagicMock()
    return patch("app.services.rate_limiter.supabase", mock_client)


# ── 1. Authenticated user — under limit ──────────────────────────────────────

@pytest.mark.asyncio
async def test_auth_user_under_limit_allowed() -> None:
    with patch("app.services.rate_limiter.settings") as mock_settings, \
         _patch_supabase(_make_row(5)):
        mock_settings.free_tier_daily_limit = 20
        mock_settings.anon_msg_limit = 8
        remaining = await check_and_increment("user-123", None)
    assert remaining == 14  # 20 - (5+1)


@pytest.mark.asyncio
async def test_auth_user_returns_correct_remaining() -> None:
    with patch("app.services.rate_limiter.settings") as mock_settings, \
         _patch_supabase(_make_row(19)):
        mock_settings.free_tier_daily_limit = 20
        mock_settings.anon_msg_limit = 8
        remaining = await check_and_increment("user-abc", None)
    assert remaining == 0  # 20 - 20 = 0


# ── 2. Authenticated user — at limit → 429 ───────────────────────────────────

@pytest.mark.asyncio
async def test_auth_user_at_limit_raises_429() -> None:
    with patch("app.services.rate_limiter.settings") as mock_settings, \
         _patch_supabase(_make_row(20)):
        mock_settings.free_tier_daily_limit = 20
        mock_settings.anon_msg_limit = 8
        with pytest.raises(HTTPException) as exc_info:
            await check_and_increment("user-xyz", None)
    assert exc_info.value.status_code == 429


@pytest.mark.asyncio
async def test_auth_user_over_limit_raises_429() -> None:
    with patch("app.services.rate_limiter.settings") as mock_settings, \
         _patch_supabase(_make_row(25)):
        mock_settings.free_tier_daily_limit = 20
        mock_settings.anon_msg_limit = 8
        with pytest.raises(HTTPException) as exc_info:
            await check_and_increment("user-xyz", None)
    assert exc_info.value.status_code == 429


# ── 3. Anonymous user — under limit ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_anon_user_under_limit_allowed() -> None:
    with patch("app.services.rate_limiter.settings") as mock_settings, \
         _patch_supabase(_make_row(3)):
        mock_settings.free_tier_daily_limit = 20
        mock_settings.anon_msg_limit = 8
        remaining = await check_and_increment(None, "session-abc")
    assert remaining == 4  # 8 - (3+1)


@pytest.mark.asyncio
async def test_anon_user_last_message_allowed() -> None:
    with patch("app.services.rate_limiter.settings") as mock_settings, \
         _patch_supabase(_make_row(7)):
        mock_settings.free_tier_daily_limit = 20
        mock_settings.anon_msg_limit = 8
        remaining = await check_and_increment(None, "session-abc")
    assert remaining == 0  # 8 - 8 = 0


# ── 4. Anonymous user — at limit → 429 ───────────────────────────────────────

@pytest.mark.asyncio
async def test_anon_user_at_limit_raises_429() -> None:
    with patch("app.services.rate_limiter.settings") as mock_settings, \
         _patch_supabase(_make_row(8)):
        mock_settings.free_tier_daily_limit = 20
        mock_settings.anon_msg_limit = 8
        with pytest.raises(HTTPException) as exc_info:
            await check_and_increment(None, "session-xyz")
    assert exc_info.value.status_code == 429
    assert exc_info.value.detail == "anon_limit"


@pytest.mark.asyncio
async def test_anon_user_detail_is_anon_limit_string() -> None:
    with patch("app.services.rate_limiter.settings") as mock_settings, \
         _patch_supabase(_make_row(10)):
        mock_settings.free_tier_daily_limit = 20
        mock_settings.anon_msg_limit = 8
        with pytest.raises(HTTPException) as exc_info:
            await check_and_increment(None, "session-xyz")
    assert "anon_limit" in exc_info.value.detail


# ── 5. First request today (no existing row) → insert ────────────────────────

@pytest.mark.asyncio
async def test_auth_first_request_inserts_row() -> None:
    mock_client = MagicMock()
    chain = mock_client.table.return_value.select.return_value
    chain.eq.return_value = chain
    chain.maybe_single.return_value.execute.return_value = _no_row()
    insert_mock = mock_client.table.return_value.insert.return_value.execute

    with patch("app.services.rate_limiter.settings") as mock_settings, \
         patch("app.services.rate_limiter.supabase", mock_client):
        mock_settings.free_tier_daily_limit = 20
        mock_settings.anon_msg_limit = 8
        remaining = await check_and_increment("user-new", None)

    assert remaining == 19  # 20 - 1
    insert_mock.assert_called_once()


@pytest.mark.asyncio
async def test_anon_first_request_inserts_row() -> None:
    mock_client = MagicMock()
    chain = mock_client.table.return_value.select.return_value
    chain.eq.return_value = chain
    chain.maybe_single.return_value.execute.return_value = _no_row()
    insert_mock = mock_client.table.return_value.insert.return_value.execute

    with patch("app.services.rate_limiter.settings") as mock_settings, \
         patch("app.services.rate_limiter.supabase", mock_client):
        mock_settings.free_tier_daily_limit = 20
        mock_settings.anon_msg_limit = 8
        remaining = await check_and_increment(None, "new-session")

    assert remaining == 7  # 8 - 1
    insert_mock.assert_called_once()


# ── 6. Neither user_id nor anon_session_id → pass-through ───────────────────

@pytest.mark.asyncio
async def test_no_identity_returns_none() -> None:
    remaining = await check_and_increment(None, None)
    assert remaining is None


# ── 7. Existing row → update (not insert) ────────────────────────────────────

@pytest.mark.asyncio
async def test_existing_row_calls_update_not_insert() -> None:
    mock_client = MagicMock()
    chain = mock_client.table.return_value.select.return_value
    chain.eq.return_value = chain
    chain.maybe_single.return_value.execute.return_value = _make_row(10)
    update_mock = mock_client.table.return_value.update.return_value.eq.return_value.execute
    insert_mock = mock_client.table.return_value.insert.return_value.execute

    with patch("app.services.rate_limiter.settings") as mock_settings, \
         patch("app.services.rate_limiter.supabase", mock_client):
        mock_settings.free_tier_daily_limit = 20
        mock_settings.anon_msg_limit = 8
        await check_and_increment("user-existing", None)

    update_mock.assert_called_once()
    insert_mock.assert_not_called()


# ── 8. Limit boundary: count = limit - 1 is the last allowed ─────────────────

@pytest.mark.asyncio
@pytest.mark.parametrize("limit,count", [
    (20, 19),  # auth user last message
    (8, 7),    # anon last message
])
async def test_count_at_limit_minus_one_is_allowed(limit: int, count: int) -> None:
    is_anon = limit == 8
    with patch("app.services.rate_limiter.settings") as mock_settings, \
         _patch_supabase(_make_row(count)):
        mock_settings.free_tier_daily_limit = 20
        mock_settings.anon_msg_limit = 8
        uid = None if is_anon else "user-1"
        sid = "s-1" if is_anon else None
        remaining = await check_and_increment(uid, sid)
    assert remaining == 0


@pytest.mark.asyncio
@pytest.mark.parametrize("limit,count", [
    (20, 20),  # auth user: one over
    (8, 8),    # anon: one over
])
async def test_count_at_limit_is_blocked(limit: int, count: int) -> None:
    is_anon = limit == 8
    with patch("app.services.rate_limiter.settings") as mock_settings, \
         _patch_supabase(_make_row(count)):
        mock_settings.free_tier_daily_limit = 20
        mock_settings.anon_msg_limit = 8
        uid = None if is_anon else "user-1"
        sid = "s-1" if is_anon else None
        with pytest.raises(HTTPException) as exc_info:
            await check_and_increment(uid, sid)
    assert exc_info.value.status_code == 429
