import json
from datetime import datetime, timezone
from openai import AsyncOpenAI
from app.config import settings
from app.db import supabase
from app.services.messages import count_messages, get_recent_messages

_openai = AsyncOpenAI(api_key=settings.openai_api_key, base_url=settings.openai_base_url)

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

_VALID_CATEGORIES = {"name", "city", "job", "relationship", "situation", "other"}
_SUMMARIZE_THRESHOLD = 20   # messages
_SUMMARIZE_INTERVAL  = 20   # re-run every N messages after threshold


async def maybe_summarize(user_id: str) -> None:
    """Trigger summarization when the conversation crosses the threshold."""
    total = await count_messages(user_id)
    if total < _SUMMARIZE_THRESHOLD:
        return
    # Run at exactly the threshold, then every interval after
    if (total - _SUMMARIZE_THRESHOLD) % _SUMMARIZE_INTERVAL != 0:
        return
    await _summarize(user_id)


async def _summarize(user_id: str) -> None:
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
        if raw.startswith("```"):
            raw = raw.split("```")[1].lstrip("json").strip()
        facts = json.loads(raw)
    except Exception:
        return

    if not isinstance(facts, list):
        return

    now = datetime.now(timezone.utc).isoformat()
    rows = []
    for f in facts:
        if not isinstance(f, dict):
            continue
        if "category" in f and "fact" in f:
            cat, fact = f["category"], f["fact"]
        elif len(f) == 1:
            cat, fact = next(iter(f.items()))
        else:
            continue
        if cat not in _VALID_CATEGORIES or not isinstance(fact, str) or not fact.strip():
            continue
        rows.append({"user_id": user_id, "category": cat, "fact": fact.strip(), "updated_at": now})

    if rows:
        # deduplicate by category — keep last occurrence to avoid ON CONFLICT batch error
        deduped = {r["category"]: r for r in rows}.values()
        supabase.table("memories").upsert(list(deduped), on_conflict="user_id,category").execute()
