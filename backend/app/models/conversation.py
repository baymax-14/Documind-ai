"""Conversation and Message models."""

import enum
import uuid
from typing import Dict, Any
from sqlalchemy import String, Text, ForeignKey, Enum as SQLEnum, JSON, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class MessageRole(str, enum.Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class MessageStatus(str, enum.Enum):
    SUCCESS = "success"
    PARTIAL = "partial"
    INSUFFICIENT_EVIDENCE = "insufficient_evidence"
    FAILED = "failed"


class Conversation(Base, TimestampMixin):
    __tablename__ = "conversations"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), default="New Conversation", nullable=False)

    # Relationships
    owner = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")


class Message(Base, TimestampMixin):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    role: Mapped[MessageRole] = mapped_column(SQLEnum(MessageRole, name="message_role"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[MessageStatus] = mapped_column(
        SQLEnum(MessageStatus, name="message_status"), default=MessageStatus.SUCCESS, nullable=False
    )
    model_metadata: Mapped[Dict[str, Any]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), default=dict, nullable=False
    )

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    evidence_references = relationship("EvidenceReference", back_populates="message", cascade="all, delete-orphan")
    citations = relationship("Citation", back_populates="message", cascade="all, delete-orphan")
