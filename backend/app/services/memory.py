import json
from datetime import datetime, timezone
from typing import Optional

from openai import AsyncOpenAI

from app.config import settings
from app.db import supabase
from app.services.messages import count_messages, get_recent_messages

_openai = AsyncOpenAI(api_key=settings.openai_api_key, base_url=settings.openai_base_url)

_VALID_CATEGORIES = frozenset({"name", "city", "job", "relationship", "situation", "other"})

_CATEGORY_LABELS = {
    "name":         "Name",
    "city":         "City",
    "job":          "Job",
    "relationship": "Relationships",
    "situation":    "Current situation",
    "other":        "Other",
}

_EXTRACTION_PROMPT = """Extract personal facts about the user from this conversation.
Return a JSON array only — no explanation, no markdown code fences.

Each item must have exactly two keys: "category" and "fact".
Valid categories: name, city, job, relationship, situation, other

Example output:
[
  {{"category": "name", "fact": "Rahul"}},
  {{"category": "city", "fact": "Pune"}},
  {{"category": "situation", "fact": "Going through a breakup and feeling lonely"}}
]

Rules:
- Only extract facts the USER stated about themselves; ignore assistant turns
- One item per category; merge related details into one sentence
- Skip empty or vague facts
- If nothing extractable, return []

Conversation:
{conversation}

JSON array:"""

_SUMMARIZE_PROMPT = """You are summarizing a long conversation between a user and their AI friend Arjun.
Extract 3–5 key facts about the user to remember for future conversations.
Focus on: significant life events, ongoing situations, feelings, relationships, goals.

Each item must have exactly two keys: "category" and "fact".
Valid categories: name, city, job, relationship, situation, other

Example output:
[
  {{"category": "situation", "fact": "Recently moved to Pune after a breakup, feeling lonely"}},
  {{"category": "job", "fact": "Software engineer at a startup, stressed about a product launch"}},
  {{"category": "relationship", "fact": "Girlfriend broke up with him last month"}}
]

Rules:
- Only include facts the USER shared about themselves
- Merge related details into one sentence per category
- Prefer updating existing categories (situation, relationship) over adding new ones
- Return [] only if there is genuinely nothing personal in the conversation

Conversation (last 20 messages):
{conversation}

JSON array:"""

_SUMMARIZE_THRESHOLD = 20
_SUMMARIZE_INTERVAL = 20


# ── Public API ────────────────────────────────────────────────────────────────

async def get_memories_for_prompt(user_id: str) -> str:
    """Fetch all memory facts for user and format as a bullet list for system prompt injection."""
    result = (
        supabase.table("memories")
        .select("category, fact")
        .eq("user_id", user_id)
        .order("category")
        .execute()
    )
    rows = result.data
    if not rows:
        return "No information yet about this person."
    lines = [
        f"- {_CATEGORY_LABELS.get(row['category'], row['category'])}: {row['fact']}"
        for row in rows
    ]
    return "\n".join(lines)


async def extract_and_store_memories(user_id: str, messages: list[dict]) -> None:
    """
    Background task: extract personal facts from recent messages and upsert to memories.
    Silent on failure — must never crash the main response flow.
    """
    if not messages:
        return

    conversation = "\n".join(
        f"{m['role'].upper()}: {m['content']}" for m in messages
    )
    try:
        completion = await _openai.chat.completions.create(
            model="openai/gpt-4o-mini",
            messages=[{"role": "user", "content": _EXTRACTION_PROMPT.format(conversation=conversation)}],
            max_tokens=300,
            temperature=0.0,
        )
        raw = completion.choices[0].message.content.strip()
        rows = _parse_facts_json(raw, user_id)
    except Exception:
        return

    if rows:
        deduped = list({r["category"]: r for r in rows}.values())
        supabase.table("memories").upsert(deduped, on_conflict="user_id,category").execute()


async def summarize_memories(
    user_id: str, conversation_id: Optional[str] = None
) -> None:
    """
    Compress conversation history into 3–5 key facts when message count crosses the
    threshold (20) and then every 20 messages after that.

    conversation_id is accepted for interface completeness; history is currently fetched
    by user_id. Per-conversation filtering can be wired in here without changing callers.
    """
    total = await count_messages(user_id)
    if total < _SUMMARIZE_THRESHOLD:
        return
    if (total - _SUMMARIZE_THRESHOLD) % _SUMMARIZE_INTERVAL != 0:
        return

    messages = await get_recent_messages(user_id, limit=20)
    if not messages:
        return

    conversation = "\n".join(
        f"{m['role'].upper()}: {m['content']}" for m in messages
    )
    try:
        completion = await _openai.chat.completions.create(
            model="openai/gpt-4o-mini",
            messages=[{"role": "user", "content": _SUMMARIZE_PROMPT.format(conversation=conversation)}],
            max_tokens=400,
            temperature=0.0,
        )
        raw = completion.choices[0].message.content.strip()
        rows = _parse_facts_json(raw, user_id)
    except Exception:
        return

    if rows:
        deduped = list({r["category"]: r for r in rows}.values())
        supabase.table("memories").upsert(deduped, on_conflict="user_id,category").execute()


# ── Internal helpers ──────────────────────────────────────────────────────────

def _parse_facts_json(raw: str, user_id: str) -> list[dict]:
    """
    Parse a JSON array of {category, fact} objects returned by OpenAI.
    Strips markdown code fences if present, validates categories, returns
    ready-to-upsert rows (with user_id and updated_at).
    Raises ValueError / json.JSONDecodeError on bad input — caller must handle.
    """
    if raw.startswith("```"):
        raw = raw.split("```")[1].lstrip("json").strip()

    facts = json.loads(raw)
    if not isinstance(facts, list):
        raise ValueError("expected JSON array")

    now = datetime.now(timezone.utc).isoformat()
    rows: list[dict] = []
    for f in facts:
        if not isinstance(f, dict):
            continue
        # primary shape: {"category": "city", "fact": "Pune"}
        # fallback shape: {"city": "Pune"}
        if "category" in f and "fact" in f:
            cat, fact = f["category"], f["fact"]
        elif len(f) == 1:
            cat, fact = next(iter(f.items()))
        else:
            continue
        if cat not in _VALID_CATEGORIES or not isinstance(fact, str) or not fact.strip():
            continue
        rows.append({
            "user_id": user_id,
            "category": cat,
            "fact": fact.strip(),
            "updated_at": now,
        })
    return rows
