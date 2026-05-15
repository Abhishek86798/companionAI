import json
import uuid
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request
from fastapi.responses import StreamingResponse

from app.dependencies import get_current_user, require_current_user
from app.models.schemas import ChatMessage, ConversationHistoryResponse, MessageRequest
from app.services.ai import stream_response
from app.services.memory import extract_and_store_memories, summarize_memories
from app.services.messages import (
    create_anon_conversation,
    get_messages_by_conversation,
    get_or_create_conversation,
    get_recent_messages,
    save_assistant_message,
    save_user_message,
)
from app.services.rate_limiter import check_and_increment
from app.services.safety import check_safety, log_safety_event

router = APIRouter()

_CRISIS_RESPONSE = (
    "Yaar, yeh sab share karna brave hai. "
    "Ek baar kisi trusted person se ya iCare helpline (9152987821) pe baat karna helpful ho sakta hai."
)

_ANON_COOKIE = "anon_session_id"

_SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",   # disable Nginx buffering
    "Connection": "keep-alive",
}


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


# ── POST /message ─────────────────────────────────────────────────────────────

@router.post("/message")
async def send_message(
    body: MessageRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    user_id: Optional[str] = Depends(get_current_user),
) -> StreamingResponse:
    # 0. Safety check — MUST run first, no bypass, no exceptions
    safety = await check_safety(body.content)
    if safety.triggered:
        crisis_id = uuid.uuid4()
        crisis_conv = body.conversation_id or uuid.uuid4()
        background_tasks.add_task(
            log_safety_event, user_id, body.content, safety.trigger_type
        )

        async def crisis_stream():
            yield _sse({"type": "token", "content": _CRISIS_RESPONSE})
            yield _sse({
                "type": "done",
                "message_id": str(crisis_id),
                "conversation_id": str(crisis_conv),
                "safety_triggered": True,
                "remaining_messages_today": None,
            })

        return StreamingResponse(
            crisis_stream(), media_type="text/event-stream", headers=_SSE_HEADERS
        )

    # 1. Resolve anon session cookie (generated on first anonymous request)
    anon_session_id: Optional[str] = None
    new_cookie_value: Optional[str] = None
    if not user_id:
        anon_session_id = request.cookies.get(_ANON_COOKIE)
        if not anon_session_id:
            anon_session_id = str(uuid.uuid4())
            new_cookie_value = anon_session_id

    # 2. Rate limit check + increment (raises 429 if over limit)
    remaining = await check_and_increment(user_id, anon_session_id)

    # 3. Conversation setup + save user message (messages only for authenticated users)
    conv_id_str: Optional[str] = None
    history: list[dict] = []
    if user_id:
        conv_id_str = await get_or_create_conversation(
            user_id,
            str(body.conversation_id) if body.conversation_id else None,
        )
        history = await get_recent_messages(user_id)
        await save_user_message(user_id, conv_id_str, body.content)
    else:
        # Anon: create or reuse an ownerless conversation row so the frontend
        # can persist conversation_id across the auth redirect and claim it later.
        conv_id_str = (
            str(body.conversation_id)
            if body.conversation_id
            else await create_anon_conversation()
        )

    conversation_id = uuid.UUID(conv_id_str)

    # 4 + 5. Stream AI response; persist assistant message after stream ends
    async def generate():
        tokens: list[str] = []

        try:
            async for token in stream_response(user_id, conv_id_str, body.content):
                tokens.append(token)
                yield _sse({"type": "token", "content": token})
        except Exception:
            yield _sse({"type": "error", "detail": "AI service unavailable"})
            return

        ai_content = "".join(tokens)
        message_id = uuid.uuid4()

        if user_id and conv_id_str:
            assistant_id = await save_assistant_message(user_id, conv_id_str, ai_content)
            message_id = uuid.UUID(assistant_id)
            recent = history[-3:] + [
                {"role": "user", "content": body.content},
                {"role": "assistant", "content": ai_content},
            ]
            background_tasks.add_task(extract_and_store_memories, user_id, recent)
            background_tasks.add_task(summarize_memories, user_id)

        yield _sse({
            "type": "done",
            "message_id": str(message_id),
            "conversation_id": str(conversation_id),
            "safety_triggered": False,
            "remaining_messages_today": remaining,
        })

    headers = dict(_SSE_HEADERS)
    if new_cookie_value:
        headers["Set-Cookie"] = (
            f"{_ANON_COOKIE}={new_cookie_value}; Max-Age=86400; HttpOnly; SameSite=lax; Path=/"
        )

    return StreamingResponse(generate(), media_type="text/event-stream", headers=headers)


# ── GET /messages/{conversation_id} ──────────────────────────────────────────

@router.get("/messages/{conversation_id}", response_model=ConversationHistoryResponse)
async def get_messages(
    conversation_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    user_id: str = Depends(require_current_user),
) -> ConversationHistoryResponse:
    page_size = 20
    rows = await get_messages_by_conversation(
        user_id, str(conversation_id), page=page, page_size=page_size
    )
    return ConversationHistoryResponse(
        messages=[ChatMessage(**r) for r in rows],
        page=page,
        has_more=len(rows) == page_size,
    )
