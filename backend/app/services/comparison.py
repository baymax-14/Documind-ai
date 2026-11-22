"""Cross-Document Comparison Service."""

from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.document import Document, Chunk
from app.schemas.workflow import (
    CompareResponse,
    CompareDimensionResult,
    CompareEntry,
    SummarizeResponse,
    SectionSummary,
    ExtractResponse,
    ExtractField,
)
from app.core.logging import logger

DEFAULT_BACKEND_DIMENSIONS = [
    {
        "id": "objectives",
        "label": "Core Objectives & Vision",
        "query": "objectives vision thesis goal purpose expansion growth landscape",
    },
    {
        "id": "methodology",
        "label": "Architecture & Methodology",
        "query": "architecture methodology extraction workers wasm pipeline technology approach",
    },
    {
        "id": "privacy",
        "label": "Privacy & Data Governance",
        "query": "privacy compliance data boundaries retention confidential security on-device",
    },
    {
        "id": "findings",
        "label": "Findings & Results",
        "query": "findings customer feedback participant interview researcher survey results",
    },
    {
        "id": "recommendations",
        "label": "Recommendations & Next Steps",
        "query": "recommendations roadmap milestones future optimize deliver next steps",
    },
]


class CrossDocumentComparisonService:
    """Service to compare multiple documents within tenant boundaries."""

    @staticmethod
    async def compare(
        db: AsyncSession,
        owner_id: UUID,
        document_ids: List[UUID],
        custom_topic: Optional[str] = None,
    ) -> CompareResponse:
        # Verify tenant owns all requested documents
        doc_stmt = select(Document).where(
            Document.id.in_(document_ids),
            Document.owner_id == owner_id,
        )
        doc_result = await db.execute(doc_stmt)
        docs = doc_result.scalars().all()

        if len(docs) < 2:
            raise ValueError("At least 2 valid documents owned by tenant are required for comparison.")

        # Fetch chunks for all documents
        chunks_stmt = select(Chunk).where(Chunk.document_id.in_([d.id for d in docs]))
        chunk_res = await db.execute(chunks_stmt)
        all_chunks = chunk_res.scalars().all()

        # Group chunks by doc_id
        chunks_by_doc = {}
        for c in all_chunks:
            chunks_by_doc.setdefault(c.document_id, []).append(c)

        dimensions_to_eval = list(DEFAULT_BACKEND_DIMENSIONS)
        if custom_topic and len(custom_topic.strip()) >= 2:
            dimensions_to_eval.append({
                "id": f"custom-{len(dimensions_to_eval)}",
                "label": f'Custom: "{custom_topic.strip()}"',
                "query": custom_topic.strip(),
            })

        results: List[CompareDimensionResult] = []

        for dim in dimensions_to_eval:
            keywords = [w.lower() for w in dim["query"].split() if len(w) > 2]
            entries: List[CompareEntry] = []

            for doc in docs:
                doc_chunks = chunks_by_doc.get(doc.id, [])
                best_chunk = None
                max_hits = 0

                for chunk in doc_chunks:
                    text_lower = (chunk.text or "").lower()
                    hits = sum(1 for kw in keywords if kw in text_lower)
                    if hits > max_hits:
                        max_hits = hits
                        best_chunk = chunk

                if best_chunk and max_hits > 0:
                    entries.append(CompareEntry(
                        document_id=doc.id,
                        document_name=doc.name,
                        chunk_id=best_chunk.id,
                        locator=f"Page {best_chunk.page_number}" if best_chunk.page_number else f"Chunk {best_chunk.chunk_index + 1}",
                        page=best_chunk.page_number,
                        text=best_chunk.text,
                        has_evidence=True,
                    ))
                else:
                    entries.append(CompareEntry(
                        document_id=doc.id,
                        document_name=doc.name,
                        chunk_id=None,
                        locator="N/A",
                        page=None,
                        text="No relevant evidence on this topic located in this document.",
                        has_evidence=False,
                    ))

            with_ev = [e for e in entries if e.has_evidence]
            if len(with_ev) == len(docs):
                status = "consensus"
                summary = f"All {len(docs)} documents contain direct evidence addressing this topic."
            elif len(with_ev) > 0:
                status = "partial"
                summary = f"{len(with_ev)} of {len(docs)} documents contain matching evidence on this topic."
            else:
                status = "uncovered"
                summary = "None of the compared documents contain relevant evidence on this topic."

            results.append(CompareDimensionResult(
                id=dim["id"],
                label=dim["label"],
                synthesis_status=status,
                summary=summary,
                entries=entries,
            ))

        return CompareResponse(
            document_count=len(docs),
            dimensions=results,
        )

    @staticmethod
    async def summarize_document(
        db: AsyncSession,
        owner_id: UUID,
        document_id: UUID,
    ) -> SummarizeResponse:
        doc_stmt = select(Document).where(Document.id == document_id, Document.owner_id == owner_id)
        doc_res = await db.execute(doc_stmt)
        doc = doc_res.scalar_one_or_none()
        if not doc:
            raise ValueError("Document not found or unauthorized.")

        chunk_stmt = select(Chunk).where(Chunk.document_id == document_id).order_by(Chunk.chunk_index)
        chunk_res = await db.execute(chunk_stmt)
        chunks = chunk_res.scalars().all()

        sections: List[SectionSummary] = []
        for c in chunks:
            text = c.text or ""
            first_line = text.strip().split("\n")[0]
            title = first_line[:50] if len(first_line) > 5 else f"Section {c.chunk_index + 1}"
            sentences = [s.strip() for s in text.split(". ") if len(s.strip()) > 20][:3]
            locator = f"Page {c.page_number}" if c.page_number else f"Chunk {c.chunk_index + 1}"

            sections.append(SectionSummary(
                id=f"sec-{c.chunk_index}",
                title=title,
                locator=locator,
                page=c.page_number,
                chunk_id=c.id,
                takeaways=sentences if sentences else [text[:120] + "..."],
                full_excerpt=text,
            ))

        return SummarizeResponse(
            document_id=doc.id,
            document_name=doc.name,
            document_type=doc.file_type,
            sections=sections,
        )

    @staticmethod
    async def extract_structured_data(
        db: AsyncSession,
        owner_id: UUID,
        document_id: UUID,
        schema_id: str = "RESEARCH_PAPER",
    ) -> ExtractResponse:
        doc_stmt = select(Document).where(Document.id == document_id, Document.owner_id == owner_id)
        doc_res = await db.execute(doc_stmt)
        doc = doc_res.scalar_one_or_none()
        if not doc:
            raise ValueError("Document not found or unauthorized.")

        chunk_stmt = select(Chunk).where(Chunk.document_id == document_id).order_by(Chunk.chunk_index)
        chunk_res = await db.execute(chunk_stmt)
        chunks = chunk_res.scalars().all()

        schemas = {
            "RESEARCH_PAPER": {
                "name": "Research Paper Schema",
                "fields": [
                    {"key": "objective", "label": "Objective & Thesis", "query": "objective hypothesis thesis purpose goal"},
                    {"key": "methodology", "label": "Methodology", "query": "methodology architecture pipeline design"},
                    {"key": "findings", "label": "Key Findings", "query": "findings results outcomes data metrics"},
                    {"key": "limitations", "label": "Limitations", "query": "limitations risks constraints challenge"},
                ],
            },
            "LEGAL_AGREEMENT": {
                "name": "Legal & Compliance Schema",
                "fields": [
                    {"key": "parties", "label": "Identified Parties", "query": "participant party customer researcher"},
                    {"key": "governance", "label": "Governance & Privacy", "query": "privacy compliance policy retention"},
                    {"key": "restrictions", "label": "Restrictions", "query": "forbidden strictly prohibited constraint"},
                ],
            },
        }

        active_schema = schemas.get(schema_id, schemas["RESEARCH_PAPER"])
        extracted_fields: List[ExtractField] = []

        for f in active_schema["fields"]:
            keywords = f["query"].split()
            best_chunk = None
            max_hits = 0

            for c in chunks:
                text_lower = (c.text or "").lower()
                hits = sum(1 for kw in keywords if kw in text_lower)
                if hits > max_hits:
                    max_hits = hits
                    best_chunk = c

            if best_chunk and max_hits > 0:
                first_sentence = (best_chunk.text or "").split(". ")[0].strip()
                extracted_fields.append(ExtractField(
                    key=f["key"],
                    label=f["label"],
                    value=first_sentence,
                    excerpt=best_chunk.text,
                    locator=f"Page {best_chunk.page_number}" if best_chunk.page_number else f"Chunk {best_chunk.chunk_index + 1}",
                    page=best_chunk.page_number,
                    chunk_id=best_chunk.id,
                    has_evidence=True,
                    confidence="high" if max_hits >= 2 else "medium",
                ))
            else:
                extracted_fields.append(ExtractField(
                    key=f["key"],
                    label=f["label"],
                    value=None,
                    excerpt="No supporting evidence located in document.",
                    locator="N/A",
                    page=None,
                    chunk_id=None,
                    has_evidence=False,
                    confidence="none",
                ))

        return ExtractResponse(
            document_id=doc.id,
            document_name=doc.name,
            schema_name=active_schema["name"],
            fields=extracted_fields,
        )
