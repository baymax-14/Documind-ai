"""Citation and Evidence schemas."""

import uuid
from typing import Optional, Dict
from pydantic import BaseModel, ConfigDict
from app.models.citation import CitationValidationStatus


class CitationDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    message_id: Optional[uuid.UUID] = None
    document_id: uuid.UUID
    document_name: Optional[str] = None
    page: Optional[int] = None
    source_locator: str
    validation_status: CitationValidationStatus
    excerpt: Optional[str] = None
    chunk_id: Optional[uuid.UUID] = None
    bounding_box: Optional[Dict[str, float]] = None
    rerank_score: Optional[float] = None
    rerank_method: Optional[str] = None


class EvidenceObject(BaseModel):
    """PaperQA-inspired Evidence object with full provenance."""
    model_config = ConfigDict(from_attributes=True)

    evidence_id: uuid.UUID
    document_id: uuid.UUID
    document_name: str
    display_name: Optional[str] = None
    chunk_id: uuid.UUID
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    section: Optional[str] = None
    text: str = ""
    exact_source_excerpt: str = ""
    retrieval_method: str = "hybrid"
    retrieval_score: float
    relevance_score: float = 1.0
    parser_version: str = "v1.0"
    bounding_box: Optional[Dict[str, float]] = None
    rerank_score: Optional[float] = None
    rerank_method: Optional[str] = None
