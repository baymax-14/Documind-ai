"""API integration tests for Chat and Citations endpoints."""

import io
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_chat_e2e_grounded_qa(client: AsyncClient):
    # 1. Upload a document
    content = b"# PaperQA Architecture\n\nPaperQA uses hybrid vector and keyword search to gather evidence.\n\nEvery claim must be backed by a verifiable source locator."
    files = {"file": ("paperqa_spec.txt", io.BytesIO(content), "text/plain")}
    upload_res = await client.post("/api/v1/documents", files=files)
    assert upload_res.status_code == 201
    doc_id = upload_res.json()["id"]

    # 2. Ask question about the document
    chat_payload = {
        "question": "What search methods does PaperQA use to gather evidence?",
        "document_ids": [doc_id],
    }
    chat_res = await client.post("/api/v1/chat", json=chat_payload)
    assert chat_res.status_code == 200
    data = chat_res.json()

    assert data["status"] == "success"
    assert "hybrid vector" in data["answer"].lower()
    assert len(data["citations"]) > 0

    citation = data["citations"][0]
    citation_id = citation["id"]

    # 3. Resolve citation via /citations/{id}
    cit_res = await client.get(f"/api/v1/citations/{citation_id}")
    assert cit_res.status_code == 200
    cit_data = cit_res.json()
    assert cit_data["document_id"] == doc_id
    assert cit_data["validation_status"] == "verified"
    assert "Page" in cit_data["source_locator"] or "Doc" in cit_data["source_locator"]


@pytest.mark.asyncio
async def test_chat_abstention_when_unsupported(client: AsyncClient):
    chat_payload = {
        "question": "What is the secret recipe for chocolate cake on Mars?",
    }
    chat_res = await client.post("/api/v1/chat", json=chat_payload)
    assert chat_res.status_code == 200
    data = chat_res.json()
    assert data["status"] == "insufficient_evidence"
    assert len(data["citations"]) == 0
    assert "could not find sufficient evidence" in data["answer"].lower()
