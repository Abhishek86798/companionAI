from pydantic import BaseModel
from typing import Optional
from uuid import UUID


class MessageRequest(BaseModel):
    content: str
    conversation_id: Optional[UUID] = None


class MessageResponse(BaseModel):
    message_id: UUID
    conversation_id: UUID
    content: str
    safety_triggered: bool
    remaining_messages_today: Optional[int]
