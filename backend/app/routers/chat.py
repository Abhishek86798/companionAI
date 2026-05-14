import uuid
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Depends
from openai import AsyncOpenAI
from app.config import settings
from app.dependencies import get_current_user
from app.models.schemas import MessageRequest, MessageResponse
from app.services.memory import get_memory_facts
from app.services.messages import (
    get_or_create_conversation,
    save_messages,
    get_recent_messages,
)
from app.services.extractor import extract_and_store
from app.services.summarizer import maybe_summarize

router = APIRouter()
_openai = AsyncOpenAI(api_key=settings.openai_api_key, base_url=settings.openai_base_url)

_SYSTEM_PROMPT = """You are Arjun, a close Indian friend talking on WhatsApp. \
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
   "Yaar, yeh sab share karna brave hai. Ek baar kisi trusted person se ya iCare helpline (9152987821) pe baat karna helpful ho sakta hai."
7. Never give medical, legal, or financial advice."""


@router.post("/message", response_model=MessageResponse)
async def send_message(
    body: MessageRequest,
    background_tasks: BackgroundTasks,
    user_id: Optional[str] = Depends(get_current_user),
) -> MessageResponse:
    # 1. Assemble memory-enriched system prompt
    memory_facts = (
        await get_memory_facts(user_id)
        if user_id
        else "No information yet about this person."
    )
    system = _SYSTEM_PROMPT.format(memory_facts=memory_facts)

    # 2. Fetch recent message history for conversational context
    history = await get_recent_messages(user_id) if user_id else []

    # 3. Call AI
    completion = await _openai.chat.completions.create(
        model="openai/gpt-4o-mini",
        messages=[{"role": "system", "content": system}]
        + history
        + [{"role": "user", "content": body.content}],
        max_tokens=300,
        temperature=0.8,
    )
    ai_content = completion.choices[0].message.content

    # 4. Persist + fire async memory tasks (authenticated users only)
    if user_id:
        conv_id = await get_or_create_conversation(
            user_id,
            str(body.conversation_id) if body.conversation_id else None,
        )
        assistant_msg_id = await save_messages(
            user_id, conv_id, body.content, ai_content
        )
        conversation_id = uuid.UUID(conv_id)
        message_id = uuid.UUID(assistant_msg_id)
        recent = history[-3:] + [
            {"role": "user", "content": body.content},
            {"role": "assistant", "content": ai_content},
        ]
        background_tasks.add_task(extract_and_store, user_id, recent)
        background_tasks.add_task(maybe_summarize, user_id)
    else:
        conversation_id = body.conversation_id or uuid.uuid4()
        message_id = uuid.uuid4()

    return MessageResponse(
        message_id=message_id,
        conversation_id=conversation_id,
        content=ai_content,
        safety_triggered=False,
        remaining_messages_today=None,
    )
