"""
Memory service tests — all DB and OpenAI calls mocked, no external dependencies.

Covers:
  1. get_memories_for_prompt — no rows, single row, multi-row formatting
  2. extract_and_store_memories — empty input, valid JSON, fenced JSON, invalid JSON,
     unknown category, multi-same-category deduplication, silent failure on OpenAI error
  3. summarize_memories — below threshold, non-interval count, at threshold,
     facts upserted, silent failure on OpenAI error
  4. _parse_facts_json — primary shape, fallback shape, invalid category,
     empty fact, markdown fence stripping, non-list JSON, raises on bad JSON
"""
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.memory import (
    get_memories_for_prompt,
    extract_and_store_memories,
    summarize_memories,
    _parse_facts_json,
)


# ── helpers ───────────────────────────────────────────────────────────────────

def _supabase_rows(rows: list[dict]) -> MagicMock:
    m = MagicMock()
    m.data = rows
    return m


def _openai_response(content: str) -> MagicMock:
    mock_resp = MagicMock()
    mock_resp.choices[0].message.content = content
    return mock_resp


# ── 1. get_memories_for_prompt ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_memories_no_rows_returns_default() -> None:
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = _supabase_rows([])
    with patch("app.services.memory.supabase", mock_db):
        result = await get_memories_for_prompt("user-1")
    assert result == "No information yet about this person."


@pytest.mark.asyncio
async def test_get_memories_formats_single_row() -> None:
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = _supabase_rows([
        {"category": "name", "fact": "Rahul"},
    ])
    with patch("app.services.memory.supabase", mock_db):
        result = await get_memories_for_prompt("user-1")
    assert result == "- Name: Rahul"


@pytest.mark.asyncio
async def test_get_memories_formats_multiple_rows() -> None:
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = _supabase_rows([
        {"category": "name", "fact": "Priya"},
        {"category": "city", "fact": "Mumbai"},
        {"category": "situation", "fact": "Preparing for CAT exam"},
    ])
    with patch("app.services.memory.supabase", mock_db):
        result = await get_memories_for_prompt("user-2")
    lines = result.splitlines()
    assert len(lines) == 3
    assert "- Name: Priya" in lines
    assert "- City: Mumbai" in lines
    assert "- Current situation: Preparing for CAT exam" in lines


@pytest.mark.asyncio
async def test_get_memories_unknown_category_uses_raw_label() -> None:
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = _supabase_rows([
        {"category": "hobby", "fact": "Plays tabla"},
    ])
    with patch("app.services.memory.supabase", mock_db):
        result = await get_memories_for_prompt("user-3")
    assert "hobby: Plays tabla" in result


# ── 2. extract_and_store_memories ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_extract_empty_messages_is_noop() -> None:
    mock_db = MagicMock()
    with patch("app.services.memory.supabase", mock_db):
        await extract_and_store_memories("user-1", [])
    mock_db.table.assert_not_called()


@pytest.mark.asyncio
async def test_extract_valid_json_upserts_facts() -> None:
    facts_json = json.dumps([
        {"category": "name", "fact": "Rahul"},
        {"category": "city", "fact": "Delhi"},
    ])
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=_openai_response(facts_json))
    mock_db = MagicMock()
    upsert_mock = mock_db.table.return_value.upsert.return_value.execute

    with patch("app.services.memory._openai", mock_client), \
         patch("app.services.memory.supabase", mock_db):
        await extract_and_store_memories("user-1", [
            {"role": "user", "content": "Hi I'm Rahul from Delhi"},
        ])

    upsert_mock.assert_called_once()
    upserted = mock_db.table.return_value.upsert.call_args[0][0]
    categories = {r["category"] for r in upserted}
    assert categories == {"name", "city"}


@pytest.mark.asyncio
async def test_extract_fenced_json_is_parsed() -> None:
    facts_json = "```json\n[{\"category\": \"job\", \"fact\": \"Software engineer\"}]\n```"
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=_openai_response(facts_json))
    mock_db = MagicMock()

    with patch("app.services.memory._openai", mock_client), \
         patch("app.services.memory.supabase", mock_db):
        await extract_and_store_memories("user-1", [{"role": "user", "content": "I work as a software engineer"}])

    mock_db.table.return_value.upsert.assert_called_once()


@pytest.mark.asyncio
async def test_extract_invalid_json_does_not_crash() -> None:
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=_openai_response("not valid json {{"))
    mock_db = MagicMock()

    with patch("app.services.memory._openai", mock_client), \
         patch("app.services.memory.supabase", mock_db):
        await extract_and_store_memories("user-1", [{"role": "user", "content": "hi"}])

    mock_db.table.assert_not_called()


@pytest.mark.asyncio
async def test_extract_unknown_category_is_skipped() -> None:
    facts_json = json.dumps([
        {"category": "pet_name", "fact": "Bruno"},
        {"category": "city", "fact": "Pune"},
    ])
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=_openai_response(facts_json))
    mock_db = MagicMock()

    with patch("app.services.memory._openai", mock_client), \
         patch("app.services.memory.supabase", mock_db):
        await extract_and_store_memories("user-1", [{"role": "user", "content": "My dog Bruno lives in Pune"}])

    upserted = mock_db.table.return_value.upsert.call_args[0][0]
    assert all(r["category"] != "pet_name" for r in upserted)
    assert any(r["category"] == "city" for r in upserted)


@pytest.mark.asyncio
async def test_extract_deduplicates_same_category() -> None:
    facts_json = json.dumps([
        {"category": "city", "fact": "Pune"},
        {"category": "city", "fact": "Mumbai"},  # duplicate — last wins
    ])
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=_openai_response(facts_json))
    mock_db = MagicMock()

    with patch("app.services.memory._openai", mock_client), \
         patch("app.services.memory.supabase", mock_db):
        await extract_and_store_memories("user-1", [{"role": "user", "content": "I'm from Pune, now in Mumbai"}])

    upserted = mock_db.table.return_value.upsert.call_args[0][0]
    city_rows = [r for r in upserted if r["category"] == "city"]
    assert len(city_rows) == 1


@pytest.mark.asyncio
async def test_extract_openai_error_does_not_crash() -> None:
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(side_effect=Exception("timeout"))
    mock_db = MagicMock()

    with patch("app.services.memory._openai", mock_client), \
         patch("app.services.memory.supabase", mock_db):
        await extract_and_store_memories("user-1", [{"role": "user", "content": "hi"}])

    mock_db.table.assert_not_called()


@pytest.mark.asyncio
async def test_extract_empty_json_array_does_not_upsert() -> None:
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=_openai_response("[]"))
    mock_db = MagicMock()

    with patch("app.services.memory._openai", mock_client), \
         patch("app.services.memory.supabase", mock_db):
        await extract_and_store_memories("user-1", [{"role": "user", "content": "hello"}])

    mock_db.table.assert_not_called()


# ── 3. summarize_memories ─────────────────────────────────────────────────────

def _patch_count(n: int):
    return patch("app.services.memory.count_messages", new=AsyncMock(return_value=n))

def _patch_history(msgs: list[dict]):
    return patch("app.services.memory.get_recent_messages", new=AsyncMock(return_value=msgs))

_SAMPLE_MESSAGES = [
    {"role": "user", "content": "I'm Priya from Pune"},
    {"role": "assistant", "content": "That's cool!"},
]

@pytest.mark.asyncio
async def test_summarize_below_threshold_is_noop() -> None:
    mock_db = MagicMock()
    with _patch_count(10), patch("app.services.memory.supabase", mock_db):
        await summarize_memories("user-1")
    mock_db.table.assert_not_called()


@pytest.mark.asyncio
async def test_summarize_non_interval_count_is_noop() -> None:
    mock_db = MagicMock()
    # total=25 → (25-20) % 20 = 5 ≠ 0 → skip
    with _patch_count(25), patch("app.services.memory.supabase", mock_db):
        await summarize_memories("user-1")
    mock_db.table.assert_not_called()


@pytest.mark.asyncio
async def test_summarize_at_threshold_upserts() -> None:
    facts_json = json.dumps([{"category": "name", "fact": "Priya"}])
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=_openai_response(facts_json))
    mock_db = MagicMock()

    with _patch_count(20), _patch_history(_SAMPLE_MESSAGES), \
         patch("app.services.memory._openai", mock_client), \
         patch("app.services.memory.supabase", mock_db):
        await summarize_memories("user-1")

    mock_db.table.return_value.upsert.assert_called_once()


@pytest.mark.asyncio
async def test_summarize_at_second_interval_upserts() -> None:
    # total=40 → (40-20) % 20 = 0 → should run
    facts_json = json.dumps([{"category": "city", "fact": "Hyderabad"}])
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=_openai_response(facts_json))
    mock_db = MagicMock()

    with _patch_count(40), _patch_history(_SAMPLE_MESSAGES), \
         patch("app.services.memory._openai", mock_client), \
         patch("app.services.memory.supabase", mock_db):
        await summarize_memories("user-1")

    mock_db.table.return_value.upsert.assert_called_once()


@pytest.mark.asyncio
async def test_summarize_openai_error_does_not_crash() -> None:
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(side_effect=Exception("API error"))
    mock_db = MagicMock()

    with _patch_count(20), _patch_history(_SAMPLE_MESSAGES), \
         patch("app.services.memory._openai", mock_client), \
         patch("app.services.memory.supabase", mock_db):
        await summarize_memories("user-1")

    mock_db.table.assert_not_called()


@pytest.mark.asyncio
async def test_summarize_accepts_conversation_id() -> None:
    facts_json = json.dumps([{"category": "job", "fact": "Doctor"}])
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=_openai_response(facts_json))
    mock_db = MagicMock()

    with _patch_count(20), _patch_history(_SAMPLE_MESSAGES), \
         patch("app.services.memory._openai", mock_client), \
         patch("app.services.memory.supabase", mock_db):
        # should not raise
        await summarize_memories("user-1", conversation_id="conv-uuid-123")

    mock_db.table.return_value.upsert.assert_called_once()


# ── 4. _parse_facts_json (unit tests) ────────────────────────────────────────

def test_parse_primary_shape() -> None:
    raw = json.dumps([{"category": "name", "fact": "Rohan"}])
    rows = _parse_facts_json(raw, "u1")
    assert len(rows) == 1
    assert rows[0]["category"] == "name"
    assert rows[0]["fact"] == "Rohan"
    assert rows[0]["user_id"] == "u1"


def test_parse_fallback_shape() -> None:
    raw = json.dumps([{"city": "Kolkata"}])
    rows = _parse_facts_json(raw, "u1")
    assert rows[0]["category"] == "city"
    assert rows[0]["fact"] == "Kolkata"


def test_parse_strips_markdown_fence() -> None:
    raw = "```json\n[{\"category\": \"job\", \"fact\": \"Teacher\"}]\n```"
    rows = _parse_facts_json(raw, "u1")
    assert rows[0]["category"] == "job"


def test_parse_invalid_category_excluded() -> None:
    raw = json.dumps([{"category": "zodiac", "fact": "Scorpio"}])
    rows = _parse_facts_json(raw, "u1")
    assert rows == []


def test_parse_empty_fact_excluded() -> None:
    raw = json.dumps([{"category": "city", "fact": "   "}])
    rows = _parse_facts_json(raw, "u1")
    assert rows == []


def test_parse_non_list_raises() -> None:
    raw = json.dumps({"category": "name", "fact": "Solo"})
    with pytest.raises(ValueError):
        _parse_facts_json(raw, "u1")


def test_parse_bad_json_raises() -> None:
    with pytest.raises(Exception):
        _parse_facts_json("not json at all", "u1")


def test_parse_multiple_valid_rows() -> None:
    raw = json.dumps([
        {"category": "name", "fact": "Neha"},
        {"category": "relationship", "fact": "Recently married"},
        {"category": "situation", "fact": "Planning to move abroad"},
    ])
    rows = _parse_facts_json(raw, "u1")
    assert len(rows) == 3
    cats = {r["category"] for r in rows}
    assert cats == {"name", "relationship", "situation"}
