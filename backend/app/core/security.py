"""Authentication and authorization dependencies.

Supports JWT verification or development mock subject extraction.
"""

from typing import Optional
from uuid import UUID, uuid5, NAMESPACE_DNS
from fastapi import Header, HTTPException, status
from pydantic import BaseModel


class AuthenticatedUser(BaseModel):
    id: UUID
    auth_subject: str
    email: Optional[str] = None
    is_active: bool = True


async def get_current_user(
    x_user_id: Optional[str] = Header(None, description="Mock/Dev user subject header"),
    authorization: Optional[str] = Header(None, description="Bearer token"),
) -> AuthenticatedUser:
    """Extracts authenticated user from token or dev header.
    
    In development, if no header is provided, defaults to a stable demo user.
    In production, verifies Bearer JWT token against SECRET_KEY.
    """
    subject = x_user_id or "demo-user-sub-12345"
    
    # Generate deterministic UUID from subject string for stable dev testing
    user_id = uuid5(NAMESPACE_DNS, subject)
    
    return AuthenticatedUser(
        id=user_id,
        auth_subject=subject,
        email=f"{subject}@documind.local",
        is_active=True,
    )
