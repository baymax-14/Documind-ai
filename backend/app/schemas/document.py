"""Document and ingestion schemas."""

import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict
from app.models.document import DocumentStatus


class DocumentBase(BaseModel):
    filename: str
    mime_type: str
    size_bytes: int


class DocumentResponse(DocumentBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID
    checksum: str
    status: DocumentStatus
    parser_version: str
    created_at: datetime
    updated_at: datetime


class ChunkSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    chunk_index: int
    text: str
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    section: Optional[str] = None
    offsets: Optional[str] = None


class DocumentContentResponse(BaseModel):
    document_id: uuid.UUID
    filename: str
    status: DocumentStatus
    total_chunks: int
    chunks: List[ChunkSummary]
