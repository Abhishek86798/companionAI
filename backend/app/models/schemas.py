from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class MessageRequest(BaseModel):
    content: str
    conversation_id: Optional[UUID] = None


class MessageResponse(BaseModel):
    message_id: UUID
    conversation_id: UUID
    content: str
    safety_triggered: bool
    remaining_messages_today: Optional[int]


class ChatMessage(BaseModel):
    id: UUID
    role: str
    content: str
    created_at: datetime
    safety_flagged: bool


class ConversationHistoryResponse(BaseModel):
    messages: list[ChatMessage]
    page: int
    has_more: bool
