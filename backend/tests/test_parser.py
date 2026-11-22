"""Tests for document parsing adapters (PDF, DOCX, TXT) and structure preservation."""

import pytest
import io
import zipfile
import xml.etree.ElementTree as ET
from app.services.parser import PDFParser, DocxParser, TxtParser, get_parser


def test_txt_parser_simple():
    parser = TxtParser()
    content = b"# Document Title\n\nThis is paragraph one.\n\n## Section 1\n\nThis is paragraph two."
    parsed = parser.parse(content, "sample.txt")

    assert parsed.page_count >= 1
    assert "Document Title" in parsed.pages[0].sections
    assert "Section 1" in parsed.pages[0].sections
    assert "This is paragraph one." in parsed.pages[0].text
    assert parsed.is_scanned is False
    assert parsed.total_characters > 0


def test_txt_parser_pagination_budget():
    parser = TxtParser()
    # Create large content exceeding PAGE_CHAR_BUDGET
    para = "A" * 1500
    content = f"{para}\n\n{para}\n\n{para}".encode("utf-8")
    parsed = parser.parse(content, "long.txt")

    assert parsed.page_count >= 2


def test_docx_parser_fallback_xml():
    # Construct a valid minimal DOCX zip in-memory
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        # Create minimal word/document.xml
        xml_content = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
            <w:body>
                <w:p>
                    <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
                    <w:r><w:t>Introduction to DocuMind</w:t></w:r>
                </w:p>
                <w:p>
                    <w:r><w:t>DocuMind is an AI document assistant based on PaperQA principles.</w:t></w:r>
                </w:p>
            </w:body>
        </w:document>"""
        z.writestr("word/document.xml", xml_content)

    docx_bytes = buf.getvalue()
    parser = DocxParser()
    parsed = parser.parse(docx_bytes, "test.docx")

    assert parsed.page_count >= 1
    assert "Introduction to DocuMind" in parsed.pages[0].sections
    assert "PaperQA principles" in parsed.pages[0].text
    assert parsed.is_scanned is False


def test_pdf_fallback_and_scanned_detection():
    parser = PDFParser()
    # Empty / minimal bytes simulating scanned image-only PDF
    scanned_bytes = b"%PDF-1.4 empty stream test"
    parsed = parser.parse(scanned_bytes, "scanned.pdf")

    assert parsed.page_count >= 1
    assert parsed.is_scanned is True
    assert parsed.pages[0].char_count < 40


def test_get_parser_factory():
    assert isinstance(get_parser("application/pdf", "doc.pdf"), PDFParser)
    assert isinstance(get_parser("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "doc.docx"), DocxParser)
    assert isinstance(get_parser("text/plain", "doc.txt"), TxtParser)
