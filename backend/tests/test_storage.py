"""Storage engine test."""

import pytest
import os
from pathlib import Path
from app.services.storage import LocalStorage
from app.core.errors import AppError, NotFoundError


@pytest.mark.asyncio
async def test_local_storage_lifecycle(tmp_path: Path):
    storage = LocalStorage(base_dir=str(tmp_path))
    test_data = b"DocuMind local storage test data"
    key = "user-123/doc-456.txt"

    # Save
    saved_key = await storage.save_file(test_data, key)
    assert saved_key == key

    # Retrieve
    retrieved = await storage.get_file(key)
    assert retrieved == test_data

    # Delete
    deleted = await storage.delete_file(key)
    assert deleted is True

    # Check non-existent
    with pytest.raises(NotFoundError):
        await storage.get_file(key)


@pytest.mark.asyncio
async def test_path_traversal_prevention(tmp_path: Path):
    storage = LocalStorage(base_dir=str(tmp_path))
    
    with pytest.raises(AppError) as exc_info:
        await storage.save_file(b"malicious", "../../../etc/passwd")

    assert exc_info.value.code == "SECURITY_ERROR"
