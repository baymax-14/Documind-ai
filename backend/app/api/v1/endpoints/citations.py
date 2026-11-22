"""Citation resolution endpoints."""

import uuid
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import NotFoundError, AuthorizationError
from app.core.security import get_current_user, AuthenticatedUser
from app.db.session import get_db
from app.models.citation import Citation
from app.schemas.citation import CitationDetail

router = APIRouter(prefix="/citations", tags=["citations"])


@router.get("/{citation_id}", response_model=CitationDetail)
async def resolve_citation(
    citation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Resolves a citation ID to its exact source chunk, document, and page locator."""
    stmt = (
        select(Citation)
        .options(
            selectinload(Citation.document),
            selectinload(Citation.evidence_reference),
        )
        .where(Citation.id == citation_id)
    )
    result = await db.execute(stmt)
    citation = result.scalar_one_or_none()

    if not citation:
        raise NotFoundError("Citation", citation_id)

    # Check ownership of source document
    if citation.document.owner_id != current_user.id:
        raise AuthorizationError("You do not have access to the source document for this citation.")

    chunk_id = None
    if citation.evidence_reference:
        chunk_id = citation.evidence_reference.chunk_id

    return CitationDetail(
        id=citation.id,
        message_id=citation.message_id,
        document_id=citation.document_id,
        document_name=citation.document.filename if citation.document else None,
        page=citation.page,
        source_locator=citation.source_locator,
        validation_status=citation.validation_status,
        excerpt=citation.excerpt,
        chunk_id=chunk_id,
    )

