"""Unified error models and exception handlers."""

from typing import Any, Dict, Optional
from fastapi import Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class ErrorResponse(BaseModel):
    error: str
    code: str
    detail: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class AppError(Exception):
    """Base application exception."""

    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.detail = detail
        self.context = context or {}


class NotFoundError(AppError):
    def __init__(self, resource: str, resource_id: Any):
        super().__init__(
            message=f"{resource} with id '{resource_id}' was not found.",
            code="NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            context={"resource": resource, "id": str(resource_id)},
        )


class AuthorizationError(AppError):
    def __init__(self, message: str = "Access forbidden to this resource."):
        super().__init__(
            message=message,
            code="FORBIDDEN",
            status_code=status.HTTP_403_FORBIDDEN,
        )


class ValidationError(AppError):
    def __init__(self, message: str, detail: Optional[str] = None):
        super().__init__(
            message=message,
            code="VALIDATION_FAILED",
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
        )


class QuotaExceededError(AppError):
    def __init__(self, message: str = "File size or upload quota exceeded."):
        super().__init__(
            message=message,
            code="QUOTA_EXCEEDED",
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
        )


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    """Handles custom application errors consistently."""
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=exc.message,
            code=exc.code,
            detail=exc.detail,
            context=exc.context,
        ).model_dump(exclude_none=True),
    )
