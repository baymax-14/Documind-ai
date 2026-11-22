"""Tests for semantic and boundary-preserving chunker."""

import pytest
from app.services.parser import ParsedDocument, PageExtraction
from app.services.chunker import SemanticChunker


def test_chunker_respects_page_boundaries():
    chunker = SemanticChunker(target_chunk_size=300, overlap_size=50)

    pages = [
        PageExtraction(
            page_number=1,
            text="Page one starts here with some intro text.\n\nParagraph two on page one has more information.",
            sections=["Intro"],
            char_count=85,
        ),
        PageExtraction(
            page_number=2,
            text="Page two discusses architecture and models.\n\nSecond paragraph on page two with technical specs.",
            sections=["Architecture"],
            char_count=98,
        ),
    ]

    parsed = ParsedDocument(
        filename="test.txt",
        mime_type="text/plain",
        page_count=2,
        pages=pages,
        total_characters=183,
    )

    chunks = chunker.chunk_document(parsed)

    assert len(chunks) >= 2
    # Check that chunks correctly preserve their source pages
    page_1_chunks = [c for c in chunks if c.page_start == 1]
    page_2_chunks = [c for c in chunks if c.page_start == 2]

    assert len(page_1_chunks) > 0
    assert len(page_2_chunks) > 0
    assert all(c.page_start == c.page_end for c in chunks)
    assert chunks[0].extra_metadata["page_locator"] == "p. 1"


def test_chunker_empty_scanned_document():
    chunker = SemanticChunker()
    parsed = ParsedDocument(
        filename="scanned.pdf",
        mime_type="application/pdf",
        page_count=1,
        pages=[PageExtraction(page_number=1, text="", is_scanned=True, char_count=0)],
        total_characters=0,
        is_scanned=True,
    )

    chunks = chunker.chunk_document(parsed)
    assert len(chunks) == 1
    assert chunks[0].extra_metadata["is_scanned"] is True
