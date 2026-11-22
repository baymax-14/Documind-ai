"""Document lifecycle, ingestion, and reprocessing endpoints."""

import hashlib
import uuid
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.errors import NotFoundError, ValidationError, QuotaExceededError, AuthorizationError
from app.core.security import get_current_user, AuthenticatedUser
from app.db.session import get_db
from app.models.document import Document, DocumentStatus
from app.models.job import ProcessingJob, JobStatus
from app.schemas.document import DocumentResponse, DocumentContentResponse, ChunkSummary
from app.services.storage import get_storage
from app.services.ingestion import get_ingestion_service
from app.services.retrieval import get_retrieval_service

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Upload a document and immediately process it through the ingestion pipeline.
    
    Validates file extension, MIME type, size limit, stores privately,
    and runs parsing, semantic chunking, and hybrid vector indexing.
    """
    filename = file.filename or "unnamed_document"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext not in settings.ALLOWED_EXTENSIONS:
        raise ValidationError(
            f"Unsupported file format '{ext}'. Allowed formats: {', '.join(settings.ALLOWED_EXTENSIONS)}."
        )

    # Read and validate file size
    content = await file.read()
    size_bytes = len(content)
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    if size_bytes == 0:
        raise ValidationError("Empty file (0 bytes) is not allowed.")
    if size_bytes > max_bytes:
        raise QuotaExceededError(
            f"File size ({size_bytes / (1024*1024):.1f} MB) exceeds maximum allowed {settings.MAX_UPLOAD_SIZE_MB} MB."
        )

    # Compute checksum
    checksum = hashlib.sha256(content).hexdigest()

    # Generate isolated storage key: {owner_id}/{doc_id}.{ext}
    doc_id = uuid.uuid4()
    storage_key = f"{current_user.id}/{doc_id}.{ext}"

    # Store file privately
    storage = get_storage()
    await storage.save_file(content, storage_key)

    # Create Document record
    document = Document(
        id=doc_id,
        owner_id=current_user.id,
        filename=filename,
        mime_type=file.content_type or f"application/{ext}",
        size_bytes=size_bytes,
        storage_key=storage_key,
        checksum=checksum,
        status=DocumentStatus.QUEUED,
        parser_version="v1.0",
    )
    db.add(document)

    # Create ProcessingJob record
    job = ProcessingJob(
        document_id=doc_id,
        status=JobStatus.PENDING,
        pipeline_version="v1.0",
    )
    db.add(job)
    await db.commit()
    await db.refresh(document)

    # Execute ingestion pipeline
    ingestion_service = get_ingestion_service()
    try:
        document = await ingestion_service.process_document(
            document_id=doc_id,
            db=db,
            storage=storage,
        )
    except Exception:
        # Document record reflects FAILED status and error is logged
        await db.refresh(document)

    return document


@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Lists all active documents owned by the authenticated user."""
    stmt = (
        select(Document)
        .where(
            and_(
                Document.owner_id == current_user.id,
                Document.status != DocumentStatus.DELETED,
            )
        )
        .order_by(Document.created_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Retrieves document metadata by ID with ownership enforcement."""
    stmt = select(Document).where(Document.id == document_id)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()

    if not doc or doc.status == DocumentStatus.DELETED:
        raise NotFoundError("Document", document_id)
    if doc.owner_id != current_user.id:
        raise AuthorizationError("You do not have permission to view this document.")

    return doc


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Soft-deletes document, purges vector index, and removes original stored file bytes."""
    stmt = select(Document).where(Document.id == document_id)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()

    if not doc or doc.status == DocumentStatus.DELETED:
        raise NotFoundError("Document", document_id)
    if doc.owner_id != current_user.id:
        raise AuthorizationError("You do not have permission to delete this document.")

    doc.status = DocumentStatus.DELETED

    # Delete storage file
    storage = get_storage()
    await storage.delete_file(doc.storage_key)

    # Purge from hybrid retrieval index
    retrieval_service = get_retrieval_service()
    retrieval_service.delete_document_index(document_id)

    await db.commit()
    return None


@router.get("/{document_id}/content", response_model=DocumentContentResponse)
async def get_document_content(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Retrieves extracted document text chunks and provenance locators."""
    stmt = (
        select(Document)
        .options(selectinload(Document.chunks))
        .where(Document.id == document_id)
    )
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()

    if not doc or doc.status == DocumentStatus.DELETED:
        raise NotFoundError("Document", document_id)
    if doc.owner_id != current_user.id:
        raise AuthorizationError("You do not have permission to view this document content.")

    chunks = sorted(doc.chunks, key=lambda c: c.chunk_index)
    return DocumentContentResponse(
        document_id=doc.id,
        filename=doc.filename,
        status=doc.status,
        total_chunks=len(chunks),
        chunks=[ChunkSummary.model_validate(c) for c in chunks],
    )


@router.post("/{document_id}/reprocess", response_model=DocumentResponse)
async def reprocess_document(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Re-runs the document ingestion pipeline with the latest parser and chunker."""
    stmt = select(Document).where(Document.id == document_id)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()

    if not doc or doc.status == DocumentStatus.DELETED:
        raise NotFoundError("Document", document_id)
    if doc.owner_id != current_user.id:
        raise AuthorizationError("You do not have permission to reprocess this document.")

    storage = get_storage()
    ingestion_service = get_ingestion_service()
    doc = await ingestion_service.process_document(
        document_id=document_id,
        db=db,
        storage=storage,
    )
    return doc
