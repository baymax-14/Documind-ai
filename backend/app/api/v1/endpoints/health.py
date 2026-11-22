"""Health & readiness endpoints."""

import time
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.db.session import get_db
from app.schemas.health import HealthResponse, ServiceStatus

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def check_health(db: AsyncSession = Depends(get_db)):
    """Liveness and readiness health probe checking database and dependencies."""
    services = {}

    # 1. PostgreSQL check
    db_start = time.perf_counter()
    try:
        await db.execute(text("SELECT 1"))
        db_latency = (time.perf_counter() - db_start) * 1000
        services["postgres"] = ServiceStatus(status="healthy", latency_ms=round(db_latency, 2))
    except Exception as e:
        services["postgres"] = ServiceStatus(status="unhealthy", detail=str(e))

    # Overall status
    all_healthy = all(s.status == "healthy" for s in services.values())

    return HealthResponse(
        status="healthy" if all_healthy else "degraded",
        environment=settings.ENVIRONMENT,
        version=settings.VERSION,
        services=services,
    )
