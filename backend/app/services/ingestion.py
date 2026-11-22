"""Document ingestion service orchestrating parsing, semantic chunking, and vector indexing.

Provides idempotent, retryable document processing with error tracking and status transitions.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.models.document import Document, DocumentStatus
from app.models.job import ProcessingJob, JobStatus
from app.models.chunk import DocumentChunk
from app.services.parser import get_parser
from app.services.chunker import SemanticChunker
from app.services.storage import StorageEngine
from app.services.retrieval import get_retrieval_service


class IngestionService:
    """Orchestrates parsing, chunking, and indexing pipeline."""

    def __init__(self):
        self.chunker = SemanticChunker()
        self.retrieval_service = get_retrieval_service()

    async def process_document(
        self,
        document_id: uuid.UUID,
        db: AsyncSession,
        storage: StorageEngine,
    ) -> Document:
        """Executes end-to-end ingestion pipeline for a document."""
        # 1. Fetch document and processing job
        stmt = select(Document).where(Document.id == document_id)
        result = await db.execute(stmt)
        document = result.scalar_one_or_none()

        if not document:
            logger.error("ingestion.document_not_found", document_id=str(document_id))
            raise ValueError(f"Document {document_id} not found.")

        # Find or create job
        job_stmt = select(ProcessingJob).where(ProcessingJob.document_id == document_id)
        job_res = await db.execute(job_stmt)
        job = job_res.scalars().first()

        if not job:
            job = ProcessingJob(
                document_id=document.id,
                status=JobStatus.RUNNING,
                pipeline_version="v1.0",
            )
            db.add(job)
        else:
            job.status = JobStatus.RUNNING
            job.attempt_count += 1
            job.error_message = None

        document.status = DocumentStatus.PROCESSING
        await db.commit()
        await db.refresh(document)
        await db.refresh(job)

        try:
            # 2. Read raw file bytes
            content = await storage.read_file(document.storage_key)

            # 3. Parse document
            parser = get_parser(document.mime_type, document.filename)
            parsed = parser.parse(content, document.filename)

            # 4. Chunk document
            chunks_output = self.chunker.chunk_document(parsed)

            # 5. Delete existing chunks in case of reprocess
            await db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == document.id))
            self.retrieval_service.delete_document_index(document.id)

            # 6. Save chunks to database & index in retrieval engine
            for chunk_data in chunks_output:
                chunk_id = uuid.uuid4()
                db_chunk = DocumentChunk(
                    id=chunk_id,
                    document_id=document.id,
                    chunk_index=chunk_data.chunk_index,
                    text=chunk_data.text,
                    page_start=chunk_data.page_start,
                    page_end=chunk_data.page_end,
                    section=chunk_data.section,
                    offsets=chunk_data.offsets,
                    extra_metadata=chunk_data.extra_metadata,
                    embedding_version="v1.0",
                )
                db.add(db_chunk)

                # Index in hybrid retrieval service
                self.retrieval_service.index_chunk(
                    chunk_id=chunk_id,
                    document_id=document.id,
                    owner_id=document.owner_id,
                    document_name=document.filename,
                    chunk_index=chunk_data.chunk_index,
                    text=chunk_data.text,
                    page_start=chunk_data.page_start,
                    page_end=chunk_data.page_end,
                    section=chunk_data.section,
                    offsets=chunk_data.offsets,
                )

            # 7. Update status to READY & job to COMPLETED
            document.status = DocumentStatus.READY
            job.status = JobStatus.COMPLETED
            job.completed_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(document)

            logger.info(
                "ingestion.completed",
                document_id=str(document.id),
                chunks_count=len(chunks_output),
                parser=parsed.parser_name,
            )
            return document

        except Exception as exc:
            logger.error(
                "ingestion.failed",
                document_id=str(document.id),
                error=str(exc),
            )
            document.status = DocumentStatus.FAILED
            job.status = JobStatus.FAILED
            job.error_message = str(exc)
            job.error_code = "INGESTION_ERROR"
            await db.commit()
            raise


# Global singleton
_ingestion_service: Optional[IngestionService] = None


def get_ingestion_service() -> IngestionService:
    global _ingestion_service
    if _ingestion_service is None:
        _ingestion_service = IngestionService()
    return _ingestion_service
