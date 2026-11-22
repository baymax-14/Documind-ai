"""Document API tests."""

import io
import pytest
from httpx import AsyncClient
from app.core.security import AuthenticatedUser


@pytest.mark.asyncio
async def test_upload_and_list_documents(client: AsyncClient):
    # Upload TXT file
    file_content = b"This is a test research paper content for DocuMind AI."
    files = {"file": ("research_paper.txt", io.BytesIO(file_content), "text/plain")}

    response = await client.post("/api/v1/documents", files=files)
    assert response.status_code == 201
    doc_data = response.json()
    assert doc_data["filename"] == "research_paper.txt"
    assert doc_data["status"] in ("ready", "queued")
    assert "id" in doc_data
    doc_id = doc_data["id"]

    # List documents
    list_res = await client.get("/api/v1/documents")
    assert list_res.status_code == 200
    docs = list_res.json()
    assert len(docs) >= 1
    assert any(d["id"] == doc_id for d in docs)

    # Get single document
    get_res = await client.get(f"/api/v1/documents/{doc_id}")
    assert get_res.status_code == 200
    assert get_res.json()["filename"] == "research_paper.txt"

    # Get document content & chunks
    content_res = await client.get(f"/api/v1/documents/{doc_id}/content")
    assert content_res.status_code == 200
    assert content_res.json()["total_chunks"] >= 1

    # Delete document
    del_res = await client.delete(f"/api/v1/documents/{doc_id}")
    assert del_res.status_code == 204

    # Verify not found after deletion
    after_del = await client.get(f"/api/v1/documents/{doc_id}")
    assert after_del.status_code == 404


@pytest.mark.asyncio
async def test_upload_validation_rejects_unsupported(client: AsyncClient):
    # Reject .exe
    files = {"file": ("malicious.exe", io.BytesIO(b"binary"), "application/octet-stream")}
    res = await client.post("/api/v1/documents", files=files)
    assert res.status_code == 400
    assert "Unsupported file format" in res.json()["error"]


@pytest.mark.asyncio
async def test_upload_validation_rejects_empty_file(client: AsyncClient):
    # Reject 0-byte file
    files = {"file": ("empty.txt", io.BytesIO(b""), "text/plain")}
    res = await client.post("/api/v1/documents", files=files)
    assert res.status_code == 400
    assert "Empty file" in res.json()["error"]

