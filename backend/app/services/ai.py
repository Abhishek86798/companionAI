import re
from typing import Optional, AsyncGenerator

from openai import AsyncOpenAI

from app.config import settings
from app.db import supabase
from app.services.memory import get_memories_for_prompt
from app.services.messages import get_recent_messages

_openai = AsyncOpenAI(api_key=settings.openai_api_key, base_url=settings.openai_base_url)

_TONE_LABELS = {
    "funny_chill": "Be funny and chill — use humor, banter, and light sarcasm like a best friend.",
    "motivating": "Be motivating and energetic — hype them up, push them forward.",
    "logical": "Be logical and analytical — think through problems clearly, skip the fluff.",
    "just_listen": "Just listen — validate feelings, hold back advice unless asked.",
}

_SYSTEM_TEMPLATE = """\
You are {companion_name}, a close Indian friend talking on WhatsApp. \
You speak Hinglish — the natural mix of Hindi and English that urban Indians use. \
You are warm, present, non-judgmental. You listen and validate first. \
You never claim to be an AI unless directly asked.
{persona_section}
What you know about this person:
{memory_facts}

Rules — follow these strictly:
1. ONLY reference facts from "What you know about this person" above. \
   Never invent or assume any detail (job, city, situation) not explicitly listed there.
2. Match their language. If they write in Hindi, reply in Hindi. \
   If Hinglish, reply Hinglish. If English, reply English.
3. Use the correct gender only if you know it from memory. \
   If unsure, use gender-neutral phrasing.
4. Be a friend, not a life coach. Don't jump to advice or "focus on skills" \
   type suggestions unless they explicitly ask for advice.
5. Keep replies short — 2 to 3 sentences like a real WhatsApp chat. \
   Validate their feeling first, then one follow-up question at most.
6. If they seem in genuine distress (self-harm, crisis), gently say: \
   "Yaar, yeh sab share karna brave hai. Ek baar kisi trusted person se ya \
iCare helpline (9152987821) pe baat karna helpful ho sakta hai."
7. Never give medical, legal, or financial advice.\
"""

_MODEL = "openai/gpt-4o-mini"
_MAX_TOKENS = 300
_TEMPERATURE = 0.8


def sanitize_persona_field(text: str, max_len: int = 500) -> str:
    text = re.sub(r"```[\s\S]*?```", "", text)
    text = re.sub(r"(?i)^system:\s*", "", text.strip())
    return text.strip()[:max_len]


def get_persona_for_prompt(user_id: str) -> dict:
    result = (
        supabase.table("persona")
        .select("companion_name, tone, expectation, open_field")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not result:
        return {"companion_name": "Arjun", "tone": None, "expectation": None, "open_field": None}
    return result.data


def _build_persona_section(persona: dict) -> str:
    lines = []
    tone = persona.get("tone")
    expectation = persona.get("expectation")

    if tone:
        label = _TONE_LABELS.get(tone)
        if label:
            lines.append(label)
        else:
            sanitized = sanitize_persona_field(tone)
            if sanitized:
                lines.append(f"Tone: {sanitized}")

    if expectation:
        sanitized = sanitize_persona_field(expectation)
        if sanitized:
            lines.append(f"What they want from you: {sanitized}")

    return "\n".join(lines)


async def build_system_prompt(user_id: Optional[str]) -> str:
    if user_id:
        persona = get_persona_for_prompt(user_id)
    else:
        persona = {"companion_name": "Arjun", "tone": None, "expectation": None, "open_field": None}

    companion_name = persona.get("companion_name") or "Arjun"
    persona_section = _build_persona_section(persona)

    facts = (
        await get_memories_for_prompt(user_id)
        if user_id
        else "No information yet about this person."
    )

    return _SYSTEM_TEMPLATE.format(
        companion_name=companion_name,
        persona_section=persona_section,
        memory_facts=facts,
    )


async def stream_response(
    user_id: Optional[str],
    conversation_id: Optional[str],
    content: str,
) -> AsyncGenerator[str, None]:
    system = await build_system_prompt(user_id)
    history = await get_recent_messages(user_id) if user_id else []

    stream = await _openai.chat.completions.create(
        model=_MODEL,
        messages=[{"role": "system", "content": system}]
        + history
        + [{"role": "user", "content": content}],
        max_tokens=_MAX_TOKENS,
        temperature=_TEMPERATURE,
        stream=True,
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta
