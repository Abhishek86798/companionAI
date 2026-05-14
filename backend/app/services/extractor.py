import json
from datetime import datetime, timezone
from openai import AsyncOpenAI
from app.config import settings
from app.db import supabase

_openai = AsyncOpenAI(api_key=settings.openai_api_key, base_url=settings.openai_base_url)

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

_VALID_CATEGORIES = {"name", "city", "job", "relationship", "situation", "other"}


async def extract_and_store(user_id: str, recent_messages: list[dict]) -> None:
    if not recent_messages:
        return

    conversation = "\n".join(
        f"{m['role'].upper()}: {m['content']}" for m in recent_messages
    )

    try:
        completion = await _openai.chat.completions.create(
            model="openai/gpt-4o-mini",
            messages=[{"role": "user", "content": _EXTRACTION_PROMPT.format(conversation=conversation)}],
            max_tokens=300,
            temperature=0.0,
        )
        raw = completion.choices[0].message.content.strip()

        # strip ```json ... ``` if model wraps output
        if raw.startswith("```"):
            raw = raw.split("```")[1].lstrip("json").strip()

        facts = json.loads(raw)
    except Exception:
        return  # extractor is non-critical; never crash the main flow

    if not isinstance(facts, list):
        return

    now = datetime.now(timezone.utc).isoformat()
    rows = []
    for f in facts:
        if not isinstance(f, dict):
            continue
        # expected shape: {"category": "city", "fact": "Pune"}
        # fallback shape: {"city": "Pune"}
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
        deduped = {r["category"]: r for r in rows}.values()
        supabase.table("memories").upsert(list(deduped), on_conflict="user_id,category").execute()
