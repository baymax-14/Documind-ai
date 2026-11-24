"""FastAPI Main Application."""

import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.errors import AppError, app_error_handler
from app.core.logging import logger
from app.core.governance import RateLimitMiddleware
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    logger.info(f"Starting {settings.PROJECT_NAME} backend in {settings.ENVIRONMENT} mode.")

    # Bring vectors stored by an older embedding scheme up to date, in the
    # background so startup is not held up; search skips them until then.
    async def _reembed_stale() -> None:
        try:
            from app.services.retrieval import get_retrieval_service
            await asyncio.to_thread(get_retrieval_service().reembed_stale_vectors)
        except Exception as exc:  # never block the API on this
            logger.warning(f"Re-embedding stale vectors failed: {exc}")

    reembed_task = asyncio.create_task(_reembed_stale())
    yield
    reembed_task.cancel()
    logger.info(f"Shutting down {settings.PROJECT_NAME} backend.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.ALLOWED_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom Error Handlers
app.add_exception_handler(AppError, app_error_handler)

# Rate Limiting & Operational Governance Middleware
app.add_middleware(RateLimitMiddleware)

# Include v1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)
