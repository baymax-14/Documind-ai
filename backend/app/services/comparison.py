"""Cross-Document Comparison Service."""

from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

import re
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
from app.schemas.table import (
    TableCellSchema,
    DocTableSchema,
    TableCellMatch,
    TabularContradiction,
    TableAnalysisResponse,
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

    @staticmethod
    async def analyze_document_tables(
        db: AsyncSession,
        owner_id: UUID,
        document_ids: List[UUID],
        query: Optional[str] = None,
    ) -> TableAnalysisResponse:
        doc_stmt = select(Document).where(
            Document.id.in_(document_ids),
            Document.owner_id == owner_id,
        )
        doc_res = await db.execute(doc_stmt)
        docs = {d.id: d for d in doc_res.scalars().all()}
        if not docs:
            raise ValueError("No matching documents found or unauthorized.")

        chunk_stmt = select(Chunk).where(
            Chunk.document_id.in_(list(docs.keys()))
        ).order_by(Chunk.document_id, Chunk.chunk_index)
        chunk_res = await db.execute(chunk_stmt)
        all_chunks = chunk_res.scalars().all()

        chunks_by_doc = {}
        for c in all_chunks:
            chunks_by_doc.setdefault(c.document_id, []).append(c)

        all_tables: List[DocTableSchema] = []
        matches: List[TableCellMatch] = []
        metric_cells: dict = {}

        q_lower = (query or "").strip().lower()

        for doc_id, doc in docs.items():
            doc_chunks = chunks_by_doc.get(doc_id, [])
            table_idx = 0

            for c in doc_chunks:
                text = c.text or ""
                lines = [ln.strip() for ln in text.split("\n")]
                i = 0
                while i < len(lines):
                    line = lines[i]
                    if "|" in line and i + 1 < len(lines) and re.match(r"^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$", lines[i + 1]):
                        # Header line
                        headers = [h.strip() for h in line.strip("|").split("|")]
                        rows = []
                        title = f"Table {table_idx + 1}"
                        if i > 0 and len(lines[i - 1]) > 2:
                            title = lines[i - 1].lstrip("#").strip("*").strip() or title

                        i += 2
                        while i < len(lines) and "|" in lines[i] and len(lines[i]) > 0:
                            row_cells = [cell.strip() for cell in lines[i].strip("|").split("|")]
                            while len(row_cells) < len(headers):
                                row_cells.append("")
                            rows.append(row_cells[:len(headers)])
                            i += 1

                        if rows:
                            table_idx += 1
                            page_prefix = f"Page {c.page_number}" if c.page_number else f"Chunk {c.chunk_index + 1}"
                            table_locator = f"{page_prefix}, Table {table_idx}"

                            cells: List[TableCellSchema] = []
                            for row_idx, row in enumerate(rows):
                                row_hdr = row[0] if len(row) > 0 and row[0] else f"Row {row_idx + 1}"
                                for col_idx, val in enumerate(row):
                                    col_hdr = headers[col_idx] if col_idx < len(headers) else f"Col {col_idx + 1}"
                                    cell_locator = f'{table_locator} [Row: "{row_hdr}", Col: "{col_hdr}"]'
                                    cell_schema = TableCellSchema(
                                        row_index=row_idx,
                                        col_index=col_idx,
                                        value=val,
                                        header=col_hdr,
                                        row_header=row_hdr,
                                        locator=cell_locator,
                                    )
                                    cells.append(cell_schema)

                                    # Check query match
                                    if q_lower:
                                        score = 0.0
                                        if q_lower in val.lower():
                                            score += 50.0
                                        if q_lower in col_hdr.lower() or q_lower in row_hdr.lower():
                                            score += 25.0
                                        if score > 0:
                                            matches.append(TableCellMatch(
                                                document_id=doc.id,
                                                document_name=doc.name,
                                                table_id=f"table-{doc.id}-{table_idx}",
                                                table_title=title,
                                                matched_cell=cell_schema,
                                                score=score,
                                            ))

                                    # Collect cross-doc metric comparison (skip col 0)
                                    if col_idx > 0 and val:
                                        metric_key = (row_hdr.lower(), col_hdr.lower())
                                        metric_cells.setdefault(metric_key, []).append({
                                            "document_id": str(doc.id),
                                            "document_name": doc.name,
                                            "row_header": row_hdr,
                                            "column_header": col_hdr,
                                            "value": val,
                                            "locator": cell_locator,
                                        })

                            doc_table = DocTableSchema(
                                id=f"table-{doc.id}-{table_idx}",
                                title=title,
                                headers=headers,
                                rows=rows,
                                cells=cells,
                                page=c.page_number,
                                locator=table_locator,
                                row_count=len(rows),
                                col_count=len(headers),
                            )
                            all_tables.append(doc_table)
                    else:
                        i += 1

        matches.sort(key=lambda m: m.score, reverse=True)

        # Detect contradictions and consensus across documents
        contradictions: List[TabularContradiction] = []
        for (r_hdr, c_hdr), entries in metric_cells.items():
            if len(entries) > 1:
                unique_values = set(e["value"].strip() for e in entries)
                metric_name = f"{entries[0]['row_header']} — {entries[0]['column_header']}"
                if len(unique_values) == 1:
                    contradictions.append(TabularContradiction(
                        metric=metric_name,
                        status="consensus",
                        description=f"Consensus across {len(entries)} sources reporting identical value '{entries[0]['value']}'.",
                        sources=entries,
                    ))
                else:
                    contradictions.append(TabularContradiction(
                        metric=metric_name,
                        status="contradiction",
                        description=f"Divergence detected: sources report conflicting values ({', '.join(unique_values)}). Both sides cited.",
                        sources=entries,
                    ))

        return TableAnalysisResponse(
            total_tables=len(all_tables),
            tables=all_tables,
            matches=matches,
            contradictions=contradictions,
        )
