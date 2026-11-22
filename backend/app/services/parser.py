"""Document parser module supporting PDF, DOCX, and TXT with structure preservation.

Preserves page boundaries, headings, section hierarchy, and detects scanned/low-text files.
Includes robust fallback parsers that do not crash in minimal or air-gapped environments.
"""

import io
import re
import zipfile
import xml.etree.ElementTree as ET
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

from app.core.errors import ValidationError


@dataclass
class SectionContent:
    title: str
    level: int = 1


@dataclass
class PageExtraction:
    page_number: int
    text: str
    sections: List[str] = field(default_factory=list)
    tables: List[Dict[str, Any]] = field(default_factory=list)
    is_scanned: bool = False
    confidence: float = 1.0
    char_count: int = 0


@dataclass
class ParsedDocument:
    filename: str
    mime_type: str
    page_count: int
    pages: List[PageExtraction]
    total_characters: int
    is_scanned: bool = False
    parser_name: str = "default"


class BaseParser(ABC):
    @abstractmethod
    def parse(self, content: bytes, filename: str) -> ParsedDocument:
        """Parses document bytes into structured pages and sections."""
        pass


class PDFParser(BaseParser):
    """PDF parser preserving page boundaries and detecting scanned pages."""

    def parse(self, content: bytes, filename: str) -> ParsedDocument:
        pages: List[PageExtraction] = []
        parsed_with = "fallback_stream"

        # 1. Try PyMuPDF (fitz)
        try:
            import fitz  # type: ignore

            doc = fitz.open(stream=content, filetype="pdf")
            for page_idx in range(len(doc)):
                page = doc[page_idx]
                text = page.get_text("text").strip()
                char_count = len(text)
                is_scanned = char_count < 40

                # Extract headings / large text blocks if available
                sections = []
                blocks = page.get_text("blocks")
                for block in blocks:
                    block_text = block[4].strip()
                    if block_text and len(block_text) < 100 and block_text.isupper():
                        sections.append(block_text)

                pages.append(
                    PageExtraction(
                        page_number=page_idx + 1,
                        text=text,
                        sections=sections,
                        is_scanned=is_scanned,
                        confidence=0.5 if is_scanned else 0.98,
                        char_count=char_count,
                    )
                )
            parsed_with = "pymupdf"
        except ImportError:
            # 2. Try pypdf
            try:
                import pypdf  # type: ignore

                reader = pypdf.PdfReader(io.BytesIO(content))
                for page_idx, page in enumerate(reader.pages):
                    text = (page.extract_text() or "").strip()
                    char_count = len(text)
                    is_scanned = char_count < 40
                    pages.append(
                        PageExtraction(
                            page_number=page_idx + 1,
                            text=text,
                            is_scanned=is_scanned,
                            confidence=0.5 if is_scanned else 0.95,
                            char_count=char_count,
                        )
                    )
                parsed_with = "pypdf"
            except ImportError:
                # 3. Resilient pure-python fallback stream extraction
                pages = self._fallback_pdf_extract(content)
                parsed_with = "pure_python_fallback"

        if not pages:
            # Provide at least one page record so empty or non-extractable PDFs do not crash
            pages.append(
                PageExtraction(
                    page_number=1,
                    text="",
                    is_scanned=True,
                    confidence=0.1,
                    char_count=0,
                )
            )

        total_chars = sum(p.char_count for p in pages)
        overall_scanned = all(p.is_scanned for p in pages) or (total_chars < 50 and len(pages) > 0)

        return ParsedDocument(
            filename=filename,
            mime_type="application/pdf",
            page_count=len(pages),
            pages=pages,
            total_characters=total_chars,
            is_scanned=overall_scanned,
            parser_name=parsed_with,
        )

    def _fallback_pdf_extract(self, content: bytes) -> List[PageExtraction]:
        """Extracts text tokens between BT (Begin Text) and ET (End Text) operators."""
        text_chunks: List[str] = []
        try:
            # Look for uncompressed or raw literal strings in PDF
            matches = re.findall(rb"\(([^)]+)\)\s*Tj", content)
            if matches:
                for match in matches:
                    decoded = match.decode("latin1", errors="ignore").strip()
                    if decoded:
                        text_chunks.append(decoded)
            full_text = " ".join(text_chunks)
        except Exception:
            full_text = ""

        is_scanned = len(full_text) < 40
        return [
            PageExtraction(
                page_number=1,
                text=full_text,
                is_scanned=is_scanned,
                confidence=0.4 if is_scanned else 0.8,
                char_count=len(full_text),
            )
        ]


class DocxParser(BaseParser):
    """DOCX parser extracting paragraphs, headings, and tables with section hierarchy."""

    def parse(self, content: bytes, filename: str) -> ParsedDocument:
        pages: List[PageExtraction] = []
        parsed_with = "docx_xml"

        # 1. Try python-docx
        try:
            import docx  # type: ignore

            doc = docx.Document(io.BytesIO(content))
            sections: List[str] = []
            paragraphs_text: List[str] = []

            for p in doc.paragraphs:
                txt = p.text.strip()
                if not txt:
                    continue
                if p.style.name.startswith("Heading") or p.style.name == "Title":
                    sections.append(txt)
                paragraphs_text.append(txt)

            # Include table rows
            for table in doc.tables:
                for row in table.rows:
                    row_txt = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                    if row_txt:
                        paragraphs_text.append(row_txt)

            full_text = "\n\n".join(paragraphs_text)
            pages.append(
                PageExtraction(
                    page_number=1,
                    text=full_text,
                    sections=sections,
                    is_scanned=False,
                    confidence=1.0,
                    char_count=len(full_text),
                )
            )
            parsed_with = "python-docx"
        except (ImportError, Exception):
            # 2. Resilient standard zipfile XML parser
            pages = self._xml_docx_extract(content)
            parsed_with = "zipfile_xml_fallback"

        total_chars = sum(p.char_count for p in pages)
        return ParsedDocument(
            filename=filename,
            mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            page_count=len(pages),
            pages=pages,
            total_characters=total_chars,
            is_scanned=False,
            parser_name=parsed_with,
        )

    def _xml_docx_extract(self, content: bytes) -> List[PageExtraction]:
        """Extracts text, headings, and tables from word/document.xml in DOCX zip."""
        paragraphs: List[str] = []
        sections: List[str] = []

        try:
            with zipfile.ZipFile(io.BytesIO(content)) as z:
                if "word/document.xml" in z.namelist():
                    xml_content = z.read("word/document.xml")
                    root = ET.fromstring(xml_content)

                    # XML namespace
                    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}

                    for p in root.iter(f"{{{ns['w']}}}p"):
                        # Check style for headings
                        p_style = p.find(f".//{{{ns['w']}}}pStyle")
                        is_heading = False
                        if p_style is not None:
                            val = p_style.attrib.get(f"{{{ns['w']}}}val", "")
                            if "Heading" in val or "Title" in val:
                                is_heading = True

                        p_texts = [node.text for node in p.iter(f"{{{ns['w']}}}t") if node.text]
                        text = "".join(p_texts).strip()
                        if text:
                            if is_heading:
                                sections.append(text)
                            paragraphs.append(text)
        except Exception:
            pass

        full_text = "\n\n".join(paragraphs)
        return [
            PageExtraction(
                page_number=1,
                text=full_text,
                sections=sections,
                is_scanned=False,
                confidence=0.9,
                char_count=len(full_text),
            )
        ]


class TxtParser(BaseParser):
    """Plain text and Markdown parser preserving markdown headings and paragraph structure."""

    PAGE_CHAR_BUDGET = 3000

    def parse(self, content: bytes, filename: str) -> ParsedDocument:
        # Decode text with fallback
        for encoding in ("utf-8", "utf-8-sig", "latin1", "cp1252"):
            try:
                raw_text = content.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        else:
            raw_text = content.decode("utf-8", errors="replace")

        # Normalize line endings
        normalized = raw_text.replace("\r\n", "\n").replace("\r", "\n")

        # Detect sections via Markdown headers or all-caps lines
        sections: List[str] = []
        for line in normalized.split("\n"):
            line_str = line.strip()
            if line_str.startswith("#"):
                clean_header = line_str.lstrip("#").strip()
                if clean_header:
                    sections.append(clean_header)
            elif len(line_str) > 3 and len(line_str) < 80 and line_str.isupper():
                sections.append(line_str)

        # Split into logical pages by form-feed \x0c or character budget
        raw_pages = normalized.split("\x0c")
        pages: List[PageExtraction] = []

        page_num = 1
        for raw_page in raw_pages:
            clean_page = raw_page.strip()
            if not clean_page:
                continue

            # If page is overly large, split into chunks of PAGE_CHAR_BUDGET
            if len(clean_page) > self.PAGE_CHAR_BUDGET:
                paragraphs = clean_page.split("\n\n")
                current_buf = []
                current_len = 0

                for p in paragraphs:
                    if current_len + len(p) > self.PAGE_CHAR_BUDGET and current_buf:
                        sub_text = "\n\n".join(current_buf)
                        pages.append(
                            PageExtraction(
                                page_number=page_num,
                                text=sub_text,
                                sections=sections,
                                is_scanned=False,
                                confidence=1.0,
                                char_count=len(sub_text),
                            )
                        )
                        page_num += 1
                        current_buf = [p]
                        current_len = len(p)
                    else:
                        current_buf.append(p)
                        current_len += len(p) + 2

                if current_buf:
                    sub_text = "\n\n".join(current_buf)
                    pages.append(
                        PageExtraction(
                            page_number=page_num,
                            text=sub_text,
                            sections=sections,
                            is_scanned=False,
                            confidence=1.0,
                            char_count=len(sub_text),
                        )
                    )
                    page_num += 1
            else:
                pages.append(
                    PageExtraction(
                        page_number=page_num,
                        text=clean_page,
                        sections=sections,
                        is_scanned=False,
                        confidence=1.0,
                        char_count=len(clean_page),
                    )
                )
                page_num += 1

        if not pages:
            pages.append(
                PageExtraction(
                    page_number=1,
                    text="",
                    is_scanned=False,
                    confidence=1.0,
                    char_count=0,
                )
            )

        total_chars = sum(p.char_count for p in pages)
        return ParsedDocument(
            filename=filename,
            mime_type="text/plain",
            page_count=len(pages),
            pages=pages,
            total_characters=total_chars,
            is_scanned=False,
            parser_name="txt_markdown",
        )


def get_parser(mime_type: str, filename: str) -> BaseParser:
    """Factory retrieving the appropriate parser for file extension and MIME type."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext == "pdf" or "pdf" in mime_type:
        return PDFParser()
    elif ext in ("docx", "doc") or "word" in mime_type or "officedocument" in mime_type:
        return DocxParser()
    elif ext in ("txt", "md", "markdown", "csv", "log") or "text" in mime_type:
        return TxtParser()
    else:
        raise ValidationError(f"No parser available for format '{ext}' (MIME: {mime_type}).")
