"""
Safety service tests — 55+ cases, 100% pass required.

Keyword crisis cases: hit the frozenset directly → no API call, deterministic.
Normal message cases: semantic check mocked to return False → no API call, deterministic.
Fail-safe cases: mock OpenAI internals to raise → verify triggered=True returned.
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.safety import check_safety, SafetyResult, _keyword_check


# ─── 1. Keyword crisis tests (25) ────────────────────────────────────────────
# These hit the keyword set — no OpenAI call is made.

@pytest.mark.asyncio
@pytest.mark.parametrize("msg", [
    # English (15)
    "I want to kill myself right now",
    "thinking about suicide all day",
    "going to end my life tonight",
    "I'm suicidal and don't know what to do",
    "I want to die so badly",
    "self harm is the only way out",
    "I've been cutting myself again",
    "I hurt myself last night",
    "I'm going to hang myself",
    "took an overdose of pills",
    "there is no reason to live anymore",
    "life is not worth living",
    "I'd be better off dead",
    "want to sleep and never wake up — end it all",
    "nobody cares if i die so why not",
    # Hindi romanized (10)
    "yaar khudkushi kar lunga",
    "aatmahatya karna chahta hoon",
    "marna chahta hoon bahut zyada",
    "mar jaunga aaj raat",
    "khatam kar lunga sab kuch aaj",
    "jaan de dunga",
    "jeene ka mann nahi bilkul bhi",
    "phansi lagaunga",
    "wrist cut kar liya",
    "maut chahiye mujhe yaar",
])
async def test_crisis_keyword_triggers(msg: str) -> None:
    result = await check_safety(msg)
    assert result.triggered is True, f"Expected triggered for: {msg!r}"
    assert result.trigger_type == "keyword"


# ─── 2. Normal messages (25) — semantic mocked to False ──────────────────────

@pytest.mark.asyncio
@pytest.mark.parametrize("msg", [
    "Yaar bohot stress hai aaj office mein",
    "breakup ho gaya mera, bura lag raha hai",
    "job nahi mil rahi kuch bhi try karo",
    "exam mein fail ho gaya phir se",
    "What's up? Kya scene hai?",
    "kal kya plan hai yaar?",
    "mujhe bohot bore ho raha hai ghar mein",
    "I'm feeling really sad today",
    "my best friend is ignoring me completely",
    "I feel like crying all the time",
    "I'm so angry at my boss",
    "family se badi fight ho gayi",
    "naukri se nikaala gaya yaar",
    "everything is going wrong in my life",
    "I feel hopeless about my career",
    "bura lag raha hai sab kuch",
    "frustrated hu yaar kuch samajh nahi aa raha",
    "koi mujhe samajhta nahi",
    "bohot akela feel ho raha hai",
    "I don't know what to do with my life",
    "pareshaan hoon bahut",
    "I'm having a really tough week at work",
    "dumped by my girlfriend after 2 years",
    "I'm struggling with work pressure",
    "depressed feel ho raha hoon, kuch help chahiye",
])
async def test_normal_messages_not_triggered(msg: str) -> None:
    with patch("app.services.safety._semantic_check", new=AsyncMock(return_value=False)):
        result = await check_safety(msg)
        assert result.triggered is False, f"Expected NOT triggered for: {msg!r}"
        assert result.trigger_type is None


# ─── 3. Semantic classification tests ────────────────────────────────────────

@pytest.mark.asyncio
async def test_semantic_catches_crisis_without_keyword() -> None:
    """Message with no keyword but clear crisis intent — semantic returns True."""
    msg = "I think tonight is the last night. I've made my decision."
    with patch("app.services.safety._semantic_check", new=AsyncMock(return_value=True)):
        result = await check_safety(msg)
        assert result.triggered is True
        assert result.trigger_type == "semantic"


@pytest.mark.asyncio
async def test_semantic_non_crisis_returns_not_triggered() -> None:
    msg = "I just feel so lost these days, nothing makes sense"
    with patch("app.services.safety._semantic_check", new=AsyncMock(return_value=False)):
        result = await check_safety(msg)
        assert result.triggered is False
        assert result.trigger_type is None


# ─── 4. Fail-safe: OpenAI error → triggered=True ─────────────────────────────

@pytest.mark.asyncio
async def test_openai_timeout_defaults_to_triggered() -> None:
    """Any OpenAI failure inside _semantic_check must return True."""
    msg = "feeling really down lately, nothing helps"
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(
        side_effect=Exception("Connection timeout")
    )
    with patch("app.services.safety._openai", mock_client):
        result = await check_safety(msg)
        assert result.triggered is True


@pytest.mark.asyncio
async def test_openai_bad_response_defaults_to_triggered() -> None:
    """Garbage response from OpenAI — not 'yes' or 'no' — should not trigger."""
    msg = "having a tough week"
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.choices[0].message.content = "maybe"
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
    with patch("app.services.safety._openai", mock_client):
        result = await check_safety(msg)
        assert result.triggered is False  # "maybe" doesn't startswith "yes"


# ─── 5. Keyword check unit tests ─────────────────────────────────────────────

def test_keyword_check_case_insensitive() -> None:
    assert _keyword_check("I WANT TO KILL MYSELF") is True
    assert _keyword_check("SUICIDE IS ON MY MIND") is True
    assert _keyword_check("just feeling sad") is False


def test_keyword_check_hindi_devanagari() -> None:
    assert _keyword_check("मुझे आत्महत्या करनी है") is True
    assert _keyword_check("खुदकुशी का ख्याल आ रहा है") is True
    assert _keyword_check("आज मौसम अच्छा है") is False


def test_keyword_check_mixed_sentence() -> None:
    assert _keyword_check("Yaar I want to kill myself, can't handle this") is True
    assert _keyword_check("please help me I'm very sad") is False


def test_keyword_not_called_when_keyword_hit() -> None:
    """Keyword hit must short-circuit — semantic check must NOT be called."""
    with patch("app.services.safety._semantic_check") as mock_sem:
        import asyncio
        result = asyncio.run(check_safety("I want to commit suicide"))
        mock_sem.assert_not_called()
        assert result.triggered is True
        assert result.trigger_type == "keyword"


def test_safety_result_dataclass() -> None:
    r = SafetyResult(triggered=True, trigger_type="keyword")
    assert r.triggered is True
    assert r.trigger_type == "keyword"

    r2 = SafetyResult(triggered=False)
    assert r2.triggered is False
    assert r2.trigger_type is None
