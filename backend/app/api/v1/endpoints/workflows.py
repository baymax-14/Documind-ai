"""Workflow API endpoints for Cross-Document Comparison and Report Export."""

from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.security import get_current_user_id
from app.schemas.workflow import (
    CompareRequest,
    CompareResponse,
    ExportRequest,
    ExportResponse,
    SummarizeRequest,
    SummarizeResponse,
    ExtractRequest,
    ExtractResponse,
)
from app.schemas.table import (
    TableAnalysisRequest,
    TableAnalysisResponse,
)
from app.services.comparison import CrossDocumentComparisonService

router = APIRouter(prefix="/workflows", tags=["Workflows"])


@router.post("/compare", response_model=CompareResponse)
async def compare_documents(
    payload: CompareRequest,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Compare multiple documents side-by-side with verifiable chunk locators."""
    try:
        return await CrossDocumentComparisonService.compare(
            db=db,
            owner_id=user_id,
            document_ids=payload.document_ids,
            custom_topic=payload.custom_topic,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/export", response_model=ExportResponse)
async def export_report(
    payload: ExportRequest,
    user_id: UUID = Depends(get_current_user_id),
):
    """Generate Markdown report with citation footnotes."""
    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    if payload.report_type == "comparison":
        dimensions = payload.data.get("dimensions", [])
        md_lines = [
            "# DocuMind AI — Cross-Document Comparison Report",
            f"**Generated:** {timestamp} UTC",
            "**Boundary:** Enterprise Tenant-Isolated Hybrid Retrieval Engine\n",
            "---",
        ]
        footnote_idx = 1
        footnotes = []

        for dim in dimensions:
            md_lines.append(f"\n## {dim.get('label', 'Dimension')}")
            md_lines.append(f"> **Synthesis ({dim.get('synthesis_status', 'STATUS').upper()}):** {dim.get('summary', '')}\n")

            for entry in dim.get("entries", []):
                doc_name = entry.get("document_name", "Document")
                if entry.get("has_evidence"):
                    fn = footnote_idx
                    footnote_idx += 1
                    footnotes.append(f"[^{fn}]: **{doc_name}** ({entry.get('locator', 'Locator')}): \"{entry.get('text', '').strip()}\"")
                    md_lines.append(f"### {doc_name}")
                    md_lines.append(f"\"{entry.get('text', '').strip()}\"[^{fn}]\n")
                else:
                    md_lines.append(f"### {doc_name}")
                    md_lines.append("*No matching evidence found in this document.*\n")

            md_lines.append("---")

        if footnotes:
            md_lines.append("\n## Verifiable Citations & Footnotes\n")
            md_lines.extend(footnotes)

        content = "\n".join(md_lines)
        return ExportResponse(
            markdown_content=content,
            filename=f"documind-comparison-{datetime.utcnow().strftime('%Y%m%d')}.md",
        )

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported report_type: {payload.report_type}")


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize_document(
    payload: SummarizeRequest,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Generate section-aware document summary anchored to verifiable chunk locators."""
    try:
        return await CrossDocumentComparisonService.summarize_document(
            db=db,
            owner_id=user_id,
            document_id=payload.document_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/extract", response_model=ExtractResponse)
async def extract_structured_data(
    payload: ExtractRequest,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Extract structured schema fields with supporting excerpts and claim locators."""
    try:
        return await CrossDocumentComparisonService.extract_structured_data(
            db=db,
            owner_id=user_id,
            document_id=payload.document_id,
            schema_id=payload.schema_id or "RESEARCH_PAPER",
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/table-analysis", response_model=TableAnalysisResponse)
async def analyze_tables(
    payload: TableAnalysisRequest,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    """Analyze structured tables, coordinate cell index, search metrics, and detect cross-document contradictions."""
    try:
        return await CrossDocumentComparisonService.analyze_document_tables(
            db=db,
            owner_id=user_id,
            document_ids=payload.document_ids,
            query=payload.query,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
