import uuid
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Request, Response

from app.dependencies import get_current_user
from app.models.schemas import MessageRequest, MessageResponse
from app.services.ai import build_system_prompt, _openai, _MODEL, _MAX_TOKENS, _TEMPERATURE
from app.services.messages import (
    get_or_create_conversation,
    save_messages,
    get_recent_messages,
)
from app.services.extractor import extract_and_store
from app.services.summarizer import maybe_summarize
from app.services.safety import check_safety, log_safety_event
from app.services.rate_limiter import check_and_increment

router = APIRouter()

_CRISIS_RESPONSE = (
    "Yaar, yeh sab share karna brave hai. "
    "Ek baar kisi trusted person se ya iCare helpline (9152987821) pe baat karna helpful ho sakta hai."
)

_ANON_COOKIE = "anon_session_id"


@router.post("/message", response_model=MessageResponse)
async def send_message(
    body: MessageRequest,
    request: Request,
    response: Response,
    background_tasks: BackgroundTasks,
    user_id: Optional[str] = Depends(get_current_user),
) -> MessageResponse:
    # 0. Safety check — MUST run first, no bypass, no exceptions
    safety = await check_safety(body.content)
    if safety.triggered:
        background_tasks.add_task(
            log_safety_event, user_id, body.content, safety.trigger_type
        )
        return MessageResponse(
            message_id=uuid.uuid4(),
            conversation_id=body.conversation_id or uuid.uuid4(),
            content=_CRISIS_RESPONSE,
            safety_triggered=True,
            remaining_messages_today=None,
        )

    # 1. Resolve anon session cookie (set on first anonymous request)
    anon_session_id: Optional[str] = None
    if not user_id:
        anon_session_id = request.cookies.get(_ANON_COOKIE)
        if not anon_session_id:
            anon_session_id = str(uuid.uuid4())
            response.set_cookie(
                key=_ANON_COOKIE,
                value=anon_session_id,
                max_age=86400,  # 24 h
                httponly=True,
                samesite="lax",
            )

    # 2. Rate limit check + increment (raises 429 if over limit)
    remaining = await check_and_increment(user_id, anon_session_id)

    # 3. Build memory-enriched system prompt + fetch history
    system = await build_system_prompt(user_id)
    history = await get_recent_messages(user_id) if user_id else []

    # 4. Call AI (non-streaming; SSE is post-MVP per TRD §9.4)
    completion = await _openai.chat.completions.create(
        model=_MODEL,
        messages=[{"role": "system", "content": system}]
        + history
        + [{"role": "user", "content": body.content}],
        max_tokens=_MAX_TOKENS,
        temperature=_TEMPERATURE,
    )
    ai_content = completion.choices[0].message.content

    # 5. Persist + fire async memory tasks (authenticated users only)
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
        remaining_messages_today=remaining,
    )
