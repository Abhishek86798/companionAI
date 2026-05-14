from typing import Optional, AsyncGenerator

from openai import AsyncOpenAI

from app.config import settings
from app.services.memory import get_memory_facts
from app.services.messages import get_recent_messages

_openai = AsyncOpenAI(api_key=settings.openai_api_key, base_url=settings.openai_base_url)

_SYSTEM_TEMPLATE = """\
You are Arjun, a close Indian friend talking on WhatsApp. \
You speak Hinglish — the natural mix of Hindi and English that urban Indians use. \
You are warm, present, non-judgmental. You listen and validate first. \
You never claim to be an AI unless directly asked.

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


async def build_system_prompt(user_id: Optional[str]) -> str:
    """Fetch memories for user and return the fully-rendered system prompt."""
    facts = (
        await get_memory_facts(user_id)
        if user_id
        else "No information yet about this person."
    )
    return _SYSTEM_TEMPLATE.format(memory_facts=facts)


async def stream_response(
    user_id: Optional[str],
    conversation_id: Optional[str],
    content: str,
) -> AsyncGenerator[str, None]:
    """
    Full AI pipeline — yields text tokens as they arrive from OpenAI.

    Steps:
      1. Fetch memories → build system prompt
      2. Fetch last 10 messages from DB → conversation history
      3. Call OpenAI with stream=True
      4. Yield each non-empty token string

    conversation_id is accepted for interface completeness; history is currently
    fetched by user_id. When per-conversation history is added, pass it through here.
    """
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
