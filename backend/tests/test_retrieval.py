"""Tests for hybrid vector + BM25 retrieval and multi-tenant security."""

import uuid
import pytest
from app.services.retrieval import RetrievalService, EmbeddingService, BM25Index


def test_embedding_service_dimensions():
    embedder = EmbeddingService()
    vec = embedder.embed_text("DocuMind artificial intelligence")
    assert len(vec) == 384
    # Vector norm is approximately 1.0
    import math
    norm = math.sqrt(sum(x * x for x in vec))
    assert abs(norm - 1.0) < 1e-4



def test_embedding_is_stable_across_processes():
    """Vectors stored in Qdrant must match query vectors after a restart.

    Python's built-in hash() is salted per process, so embedding the same text
    under two different PYTHONHASHSEED values must still give the same vector.
    """
    import os
    import subprocess
    import sys

    code = (
        "from app.services.retrieval import EmbeddingService;"
        "v = EmbeddingService().embed_text('quarterly revenue growth');"
        "print(','.join(f'{x:.6f}' for x in v))"
    )
    outputs = []
    for seed in ("1", "2"):
        env = {**os.environ, "PYTHONHASHSEED": seed}
        res = subprocess.run(
            [sys.executable, "-c", code],
            capture_output=True, text=True, env=env, check=True,
            cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        )
        outputs.append(res.stdout.strip())
    assert outputs[0] == outputs[1]

def test_bm25_scoring():
    bm25 = BM25Index()
    doc1 = uuid.uuid4()
    doc2 = uuid.uuid4()

    bm25.add_document(doc1, "The quick brown fox jumps over the lazy dog.")
    bm25.add_document(doc2, "Fast neural networks accelerate transformer inference.")

    scores = bm25.score("neural networks", {doc1, doc2})
    assert doc2 in scores
    assert doc1 not in scores or scores[doc2] > scores.get(doc1, 0)


def test_retrieval_service_tenant_isolation():
    service = RetrievalService()
    user_a = uuid.uuid4()
    user_b = uuid.uuid4()
    doc_a = uuid.uuid4()
    doc_b = uuid.uuid4()
    chunk_a = uuid.uuid4()
    chunk_b = uuid.uuid4()

    service.index_chunk(
        chunk_id=chunk_a,
        document_id=doc_a,
        owner_id=user_a,
        document_name="UserA_Private.pdf",
        chunk_index=0,
        text="Confidential financial report of User A with secret numbers.",
        page_start=1,
    )

    service.index_chunk(
        chunk_id=chunk_b,
        document_id=doc_b,
        owner_id=user_b,
        document_name="UserB_Public.pdf",
        chunk_index=0,
        text="Public company announcement about quarterly revenue.",
        page_start=1,
    )

    # User B queries for secret financial report: MUST NOT see User A's chunks!
    results_user_b = service.hybrid_search(
        query="Confidential financial report secret numbers",
        owner_id=user_b,
        top_k=5,
    )
    assert all(r.document_id != doc_a for r in results_user_b)
    assert all(r.chunk_id != chunk_a for r in results_user_b)

    # User A queries: CAN see User A's chunk
    results_user_a = service.hybrid_search(
        query="Confidential financial report",
        owner_id=user_a,
        top_k=5,
    )
    assert len(results_user_a) > 0
    assert results_user_a[0].chunk_id == chunk_a
    assert results_user_a[0].document_name == "UserA_Private.pdf"
