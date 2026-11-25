"""Document chunk model."""

import uuid
from typing import Optional, Dict, Any
from sqlalchemy import String, Integer, Text, ForeignKey, JSON, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class DocumentChunk(Base, TimestampMixin):
    __tablename__ = "document_chunks"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), index=True, nullable=False
    )
    chunk_index: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    page_start: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    page_end: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    section: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    offsets: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    extra_metadata: Mapped[Dict[str, Any]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), default=dict, nullable=False
    )
    embedding_version: Mapped[str] = mapped_column(String(50), default="v1.0", nullable=False)

    @property
    def page_number(self) -> Optional[int]:
        return self.page_start

    # Relationships
    document = relationship("Document", back_populates="chunks")
    evidence_references = relationship("EvidenceReference", back_populates="chunk", cascade="all, delete-orphan")

