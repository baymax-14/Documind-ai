"""Table intelligence schemas for DocuMind AI (Phase 11)."""

from typing import List, Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field


class TableCellSchema(BaseModel):
    row_index: int
    col_index: int
    value: str
    header: str
    row_header: Optional[str] = None
    locator: str


class DocTableSchema(BaseModel):
    id: str
    title: str
    headers: List[str]
    rows: List[List[str]]
    cells: List[TableCellSchema]
    page: Optional[int] = None
    locator: str
    row_count: int
    col_count: int


class TableAnalysisRequest(BaseModel):
    document_ids: List[UUID] = Field(..., min_length=1, description="Documents to analyze for tables")
    query: Optional[str] = Field(default=None, description="Optional search term or metric name")


class TableCellMatch(BaseModel):
    document_id: UUID
    document_name: str
    table_id: str
    table_title: str
    matched_cell: TableCellSchema
    score: float


class TabularContradiction(BaseModel):
    metric: str
    status: str = Field(..., description="'consensus' | 'contradiction' | 'insufficient_data'")
    description: str
    sources: List[Dict[str, Any]]


class TableAnalysisResponse(BaseModel):
    total_tables: int
    tables: List[DocTableSchema]
    matches: List[TableCellMatch]
    contradictions: List[TabularContradiction]
