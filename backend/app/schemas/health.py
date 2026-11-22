"""Health check schemas."""

from typing import Dict, Any, Optional
from pydantic import BaseModel


class ServiceStatus(BaseModel):
    status: str
    latency_ms: Optional[float] = None
    detail: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    environment: str
    version: str
    services: Dict[str, ServiceStatus]
