"""Chat and grounded answer orchestration endpoints."""

import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import NotFoundError, AuthorizationError, ValidationError
from app.core.security import get_current_user, AuthenticatedUser
from app.db.session import get_db
from app.models.conversation import Conversation, Message
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    ConversationResponse,
)
from app.services.agent import get_grounded_agent

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def ask_question(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Executes PaperQA grounded retrieval and answer synthesis.
    
    1. Enforces tenant scope and authorized document IDs.
    2. Runs hybrid vector + BM25 retrieval with Reciprocal Rank Fusion.
    3. Evaluates evidence coverage and abstains if evidence is insufficient.
    4. Generates grounded claims with verified page citations.
    """
    question = request.question.strip()
    if not question:
        raise ValidationError("Question cannot be empty.")

    agent = get_grounded_agent()
    response = await agent.execute_chat(
        question=question,
        owner_id=current_user.id,
        db=db,
        document_ids=request.document_ids,
        conversation_id=request.conversation_id,
    )
    return response


@router.get("/conversations", response_model=List[ConversationResponse])
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Lists conversations belonging to the authenticated user."""
    stmt = (
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.owner_id == current_user.id)
        .order_by(Conversation.updated_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Retrieves full conversation with messages and citation references."""
    stmt = (
        select(Conversation)
        .options(selectinload(Conversation.messages).selectinload(Message.citations))
        .where(Conversation.id == conversation_id)
    )
    result = await db.execute(stmt)
    conv = result.scalar_one_or_none()

    if not conv:
        raise NotFoundError("Conversation", conversation_id)
    if conv.owner_id != current_user.id:
        raise AuthorizationError("Access denied.")

    return conv
