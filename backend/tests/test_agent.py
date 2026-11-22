"""Tests for PaperQA Grounded Chat Agent and Ingestion Pipeline integration."""

import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document, DocumentStatus
from app.models.chunk import DocumentChunk
from app.services.retrieval import get_retrieval_service
from app.services.agent import get_grounded_agent
from app.models.conversation import MessageStatus
from app.core.security import AuthenticatedUser


@pytest.mark.asyncio
async def test_grounded_agent_answers_with_evidence(db_session: AsyncSession, mock_user: AuthenticatedUser):
    retrieval_service = get_retrieval_service()
    doc_id = uuid.uuid4()
    chunk_id = uuid.uuid4()

    # Create document and chunk in DB
    doc = Document(
        id=doc_id,
        owner_id=mock_user.id,
        filename="Physics_Notes.txt",
        mime_type="text/plain",
        size_bytes=500,
        storage_key=f"{mock_user.id}/{doc_id}.txt",
        checksum="dummy_checksum",
        status=DocumentStatus.READY,
    )
    db_session.add(doc)

    chunk = DocumentChunk(
        id=chunk_id,
        document_id=doc_id,
        chunk_index=0,
        text="Quantum entanglement is a physical phenomenon that occurs when a group of particles interact.",
        page_start=4,
        page_end=4,
        section="Quantum Mechanics",
        offsets="char:0-100",
        extra_metadata={"page_locator": "p. 4"},
    )
    db_session.add(chunk)
    await db_session.commit()

    # Index chunk in retrieval service
    retrieval_service.index_chunk(
        chunk_id=chunk_id,
        document_id=doc_id,
        owner_id=mock_user.id,
        document_name=doc.filename,
        chunk_index=0,
        text=chunk.text,
        page_start=4,
    )

    agent = get_grounded_agent()
    response = await agent.execute_chat(
        question="What is quantum entanglement?",
        owner_id=mock_user.id,
        db=db_session,
    )

    assert response.status == MessageStatus.SUCCESS
    assert len(response.citations) > 0
    assert response.citations[0].document_id == doc_id
    assert response.citations[0].page == 4
    assert "Physics_Notes.txt" in response.citations[0].source_locator
    assert "Quantum entanglement" in response.answer


@pytest.mark.asyncio
async def test_grounded_agent_abstains_on_insufficient_evidence(db_session: AsyncSession, mock_user: AuthenticatedUser):
    agent = get_grounded_agent()
    # Query for something completely absent from user's index
    response = await agent.execute_chat(
        question="What were the exact revenue figures of XYZ Corp in 1923?",
        owner_id=mock_user.id,
        db=db_session,
    )

    assert response.status == MessageStatus.INSUFFICIENT_EVIDENCE
    assert len(response.citations) == 0
    assert "could not find sufficient evidence" in response.answer.lower()
