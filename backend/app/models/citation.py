"""EvidenceReference and Citation models."""

import enum
import uuid
from typing import Optional
from sqlalchemy import String, Float, Integer, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class CitationValidationStatus(str, enum.Enum):
    VERIFIED = "verified"
    UNSUPPORTED = "unsupported"
    AMBIGUOUS = "ambiguous"
    PENDING = "pending"


class EvidenceReference(Base, TimestampMixin):
    __tablename__ = "evidence_references"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    message_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("messages.id", ondelete="CASCADE"), index=True, nullable=False
    )
    chunk_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("document_chunks.id", ondelete="CASCADE"), index=True, nullable=False
    )
    rank: Mapped[int] = mapped_column(Integer, nullable=False)
    retrieval_score: Mapped[float] = mapped_column(Float, nullable=False)
    relevance_score: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    claim_reference: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    message = relationship("Message", back_populates="evidence_references")
    chunk = relationship("DocumentChunk", back_populates="evidence_references")
    citations = relationship("Citation", back_populates="evidence_reference", cascade="all, delete-orphan")


class Citation(Base, TimestampMixin):
    __tablename__ = "citations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    message_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("messages.id", ondelete="CASCADE"), index=True, nullable=False
    )
    evidence_reference_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("evidence_references.id", ondelete="SET NULL"), nullable=True
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), index=True, nullable=False
    )
    page: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    source_locator: Mapped[str] = mapped_column(String(255), nullable=False)
    claim_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    validation_status: Mapped[CitationValidationStatus] = mapped_column(
        SQLEnum(CitationValidationStatus, name="citation_validation_status"),
        default=CitationValidationStatus.VERIFIED,
        nullable=False,
    )

    @property
    def excerpt(self) -> Optional[str]:
        if self.claim_text:
            return self.claim_text
        if self.evidence_reference and self.evidence_reference.claim_reference:
            return self.evidence_reference.claim_reference
        return None

    # Relationships
    message = relationship("Message", back_populates="citations")
    evidence_reference = relationship("EvidenceReference", back_populates="citations")
    document = relationship("Document", back_populates="citations")

