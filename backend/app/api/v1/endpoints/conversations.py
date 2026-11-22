"""Conversation history and management endpoints matching Section 7 specification."""

import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import NotFoundError, AuthorizationError
from app.core.security import get_current_user, AuthenticatedUser
from app.db.session import get_db
from app.models.conversation import Conversation, Message
from app.schemas.chat import ConversationResponse

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("", response_model=List[ConversationResponse])
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Lists conversations belonging to the authenticated user.
    
    Specification: GET /api/v1/conversations
    """
    stmt = (
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.owner_id == current_user.id)
        .order_by(Conversation.updated_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Retrieves full conversation with messages and citation references.
    
    Specification: GET /api/v1/conversations/{conversation_id}
    """
    stmt = (
        select(Conversation)
        .options(
            selectinload(Conversation.messages)
            .selectinload(Message.citations)
            .selectinload(Citation.document),
            selectinload(Conversation.messages)
            .selectinload(Message.citations)
            .selectinload(Citation.evidence_reference),
        )
        .where(Conversation.id == conversation_id)
    )
    result = await db.execute(stmt)
    conv = result.scalar_one_or_none()

    if not conv:
        raise NotFoundError("Conversation", conversation_id)
    if conv.owner_id != current_user.id:
        raise AuthorizationError("Access denied.")

    return conv


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Deletes a conversation and its messages belonging to the authenticated user."""
    stmt = select(Conversation).where(Conversation.id == conversation_id)
    result = await db.execute(stmt)
    conv = result.scalar_one_or_none()

    if not conv:
        raise NotFoundError("Conversation", conversation_id)
    if conv.owner_id != current_user.id:
        raise AuthorizationError("Access denied.")

    await db.delete(conv)
    await db.commit()
    return None

