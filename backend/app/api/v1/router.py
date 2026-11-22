"""API v1 Router registry."""

from fastapi import APIRouter
from app.api.v1.endpoints import health, documents, chat, citations, workflows

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(documents.router)
api_router.include_router(chat.router)
api_router.include_router(citations.router)
api_router.include_router(workflows.router)
