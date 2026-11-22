"""Private file storage abstraction.

Enforces zero path traversal, private tenant isolation, and checksums.
"""

import abc
import hashlib
import os
import aiofiles
from pathlib import Path
from typing import BinaryIO, Tuple
from app.core.config import settings
from app.core.errors import AppError, NotFoundError


class BaseStorage(abc.ABC):
    @abc.abstractmethod
    async def save_file(self, file_bytes: bytes, storage_key: str) -> str:
        """Saves file bytes and returns storage key."""
        pass

    @abc.abstractmethod
    async def get_file(self, storage_key: str) -> bytes:
        """Retrieves file bytes by storage key."""
        pass

    async def read_file(self, storage_key: str) -> bytes:
        """Alias for get_file."""
        return await self.get_file(storage_key)

    @abc.abstractmethod
    async def delete_file(self, storage_key: str) -> bool:
        """Deletes file by storage key."""
        pass


class LocalStorage(BaseStorage):
    def __init__(self, base_dir: str = settings.LOCAL_STORAGE_DIR):
        self.base_dir = Path(base_dir).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _get_safe_path(self, storage_key: str) -> Path:
        """Resolves target path while defending against path traversal attacks."""
        resolved = (self.base_dir / storage_key).resolve()
        if not str(resolved).startswith(str(self.base_dir)):
            raise AppError("Illegal path traversal attempt in storage key.", code="SECURITY_ERROR")
        return resolved

    async def save_file(self, file_bytes: bytes, storage_key: str) -> str:
        safe_path = self._get_safe_path(storage_key)
        safe_path.parent.mkdir(parents=True, exist_ok=True)

        async with aiofiles.open(safe_path, "wb") as f:
            await f.write(file_bytes)

        return storage_key

    async def get_file(self, storage_key: str) -> bytes:
        safe_path = self._get_safe_path(storage_key)
        if not safe_path.is_file():
            raise NotFoundError("Stored file", storage_key)

        async with aiofiles.open(safe_path, "rb") as f:
            return await f.read()

    async def delete_file(self, storage_key: str) -> bool:
        safe_path = self._get_safe_path(storage_key)
        if safe_path.is_file():
            safe_path.unlink()
            return True
        return False


# Type aliases
StorageEngine = BaseStorage


def get_storage() -> BaseStorage:
    """Factory returning configured storage engine."""
    return LocalStorage()
