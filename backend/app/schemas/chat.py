"""Chat and conversation schemas."""

import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict
from app.models.conversation import MessageRole, MessageStatus
from app.models.citation import CitationValidationStatus


class CitationSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_id: uuid.UUID
    document_name: Optional[str] = None
    page: Optional[int] = None
    source_locator: str
    validation_status: CitationValidationStatus
    excerpt: Optional[str] = None
    chunk_id: Optional[uuid.UUID] = None


class ChatRequest(BaseModel):
    question: str
    document_ids: Optional[List[uuid.UUID]] = None
    conversation_id: Optional[uuid.UUID] = None


class ChatResponse(BaseModel):
    conversation_id: uuid.UUID
    message_id: uuid.UUID
    answer: str
    status: MessageStatus
    citations: List[CitationSummary]
    evidence_count: int


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    conversation_id: uuid.UUID
    role: MessageRole
    content: str
    status: MessageStatus
    created_at: datetime
    citations: List[CitationSummary] = []


class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[MessageResponse] = []
