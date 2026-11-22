"""Workflow schemas for cross-document comparison and citation-preserving export."""

from typing import List, Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field


class CompareEntry(BaseModel):
    document_id: UUID
    document_name: str
    chunk_id: Optional[UUID] = None
    locator: str
    page: Optional[int] = None
    text: str
    has_evidence: bool = True


class CompareDimensionResult(BaseModel):
    id: str
    label: str
    synthesis_status: str = Field(..., description="'consensus' | 'contrast' | 'partial' | 'uncovered'")
    summary: str
    entries: List[CompareEntry]


class CompareRequest(BaseModel):
    document_ids: List[UUID] = Field(..., min_length=2, description="At least two document UUIDs to compare")
    dimensions: Optional[List[str]] = Field(default=None, description="Optional custom dimension labels or queries")
    custom_topic: Optional[str] = Field(default=None, description="Additional custom topic facet")


class CompareResponse(BaseModel):
    document_count: int
    dimensions: List[CompareDimensionResult]


class ExportRequest(BaseModel):
    report_type: str = Field(..., description="'comparison' | 'chat'")
    data: Dict[str, Any] = Field(..., description="Payload containing either comparison dimensions or chat messages")


class ExportResponse(BaseModel):
    markdown_content: str
    filename: str


class SectionSummary(BaseModel):
    id: str
    title: str
    locator: str
    page: Optional[int] = None
    chunk_id: UUID
    takeaways: List[str]
    full_excerpt: str


class SummarizeRequest(BaseModel):
    document_id: UUID


class SummarizeResponse(BaseModel):
    document_id: UUID
    document_name: str
    document_type: str
    sections: List[SectionSummary]


class ExtractField(BaseModel):
    key: str
    label: str
    value: Optional[str] = None
    excerpt: str
    locator: str
    page: Optional[int] = None
    chunk_id: Optional[UUID] = None
    has_evidence: bool = True
    confidence: str = Field(default="high", description="'high' | 'medium' | 'none'")


class ExtractRequest(BaseModel):
    document_id: UUID
    schema_id: Optional[str] = Field(default="RESEARCH_PAPER", description="'RESEARCH_PAPER' | 'LEGAL_AGREEMENT' | 'MARKET_ANALYSIS'")


class ExtractResponse(BaseModel):
    document_id: UUID
    document_name: str
    schema_name: str
    fields: List[ExtractField]
