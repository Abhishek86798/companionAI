from dataclasses import dataclass
from typing import Optional, Literal
from openai import AsyncOpenAI
from app.config import settings

_openai = AsyncOpenAI(api_key=settings.openai_api_key, base_url=settings.openai_base_url)


@dataclass
class SafetyResult:
    triggered: bool
    trigger_type: Optional[Literal["keyword", "semantic"]] = None


# ~60 crisis terms: English, Hindi romanized, Devanagari
_CRISIS_KEYWORDS: frozenset[str] = frozenset({
    # English
    "suicide", "suicidal",
    "kill myself", "killing myself",
    "end my life", "end it all",
    "want to die", "wanna die",
    "self harm", "self-harm", "selfharm",
    "hurt myself", "cut myself", "cutting myself",
    "hang myself", "hanging myself",
    "overdose",
    "take my life", "taking my life",
    "no reason to live", "not worth living",
    "better off dead",
    "no point in living",
    "nobody cares if i die",
    "jump off a bridge",
    # Hindi romanized
    "khudkushi",
    "aatmahatya",
    "marna chahta", "marna chahti",
    "mar jaunga", "mar jaungi",
    "mar lunga", "mar lungi",
    "khatam kar lunga", "khatam kar lungi",
    "jaan de dunga", "jaan de dungi",
    "jaan de deta", "jaan de deti",
    "maut chahiye",
    "jeene ka mann nahi", "jeene ka man nahi",
    "jeene ka matlab nahi",
    "koi wajah nahi jeene ki",
    "zindagi khatam", "apni zindagi khatam",
    "phansi", "phensi",
    "khud ko maar", "apne aap ko maar",
    "wrist cut", "blade se kaat",
    "kal nahi rahunga", "kal nahi rahungi",
    "apni jaan lena",
    "koi faida nahi jeene ka",
    # Devanagari
    "आत्महत्या", "खुदकुशी",
    "मरना चाहता", "मरना चाहती",
    "जीने का मन नहीं",
    "जान देना", "जान दे दूंगा",
    "फांसी", "मौत चाहिए",
    "खुद को मारना",
})

_SEMANTIC_PROMPT = """\
You are a crisis safety classifier. Your ONLY job is to detect messages expressing suicidal ideation, intent to self-harm, or a clear desire to end one's life.

Reply ONLY with "yes" or "no":
- "yes": message contains explicit or clear implicit intent to commit suicide, self-harm, or end life
- "no": general sadness, heartbreak, stress, loneliness, or frustration WITHOUT self-harm intent

One word only. Nothing else."""


def _keyword_check(message: str) -> bool:
    """O(1) substring scan against the crisis keyword set."""
    text = message.lower()
    return any(kw in text for kw in _CRISIS_KEYWORDS)


async def _semantic_check(message: str) -> bool:
    """
    Binary GPT-4o Mini classification. Returns True on any error — never fail open on safety.
    """
    try:
        completion = await _openai.chat.completions.create(
            model="openai/gpt-4o-mini",
            messages=[
                {"role": "system", "content": _SEMANTIC_PROMPT},
                {"role": "user", "content": message},
            ],
            max_tokens=5,
            temperature=0,
        )
        answer = completion.choices[0].message.content.strip().lower()
        return answer.startswith("yes")
    except Exception:
        return True  # fail safe — treat as triggered if OpenAI call fails


async def check_safety(message: str) -> SafetyResult:
    """
    Two-step check: keyword scan (O(1)) then semantic only if no keyword hit.
    Never fails open — semantic errors default to triggered=True.
    """
    if _keyword_check(message):
        return SafetyResult(triggered=True, trigger_type="keyword")

    triggered = await _semantic_check(message)
    return SafetyResult(
        triggered=triggered,
        trigger_type="semantic" if triggered else None,
    )


async def log_safety_event(
    user_id: Optional[str], message: str, trigger_type: Optional[str]
) -> None:
    """Background task — log triggered event to safety_events (service role, no RLS)."""
    from app.db import supabase
    supabase.table("safety_events").insert({
        "user_id": user_id,
        "message": message,
        "trigger_type": trigger_type or "semantic",
    }).execute()
