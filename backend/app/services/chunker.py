"""Semantic and boundary-preserving chunker.

Partitions parsed documents into discrete, traceable chunks while preserving
page numbers, section titles, and character offsets.
"""

import re
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

from app.services.parser import ParsedDocument, PageExtraction


@dataclass
class ChunkOutput:
    chunk_index: int
    text: str
    page_start: int
    page_end: int
    section: Optional[str] = None
    offsets: Optional[str] = None
    extra_metadata: Dict[str, Any] = field(default_factory=dict)


class SemanticChunker:
    """Chunks documents while preserving page and section boundaries with sliding-window overlap."""

    def __init__(
        self,
        target_chunk_size: int = 650,
        overlap_size: int = 100,
        min_chunk_size: int = 60,
    ):
        self.target_chunk_size = target_chunk_size
        self.overlap_size = overlap_size
        self.min_chunk_size = min_chunk_size

    def chunk_document(self, parsed: ParsedDocument) -> List[ChunkOutput]:
        """Chunks a parsed document into structured, page-mapped passages."""
        chunks: List[ChunkOutput] = []
        global_chunk_idx = 0

        for page in parsed.pages:
            page_text = page.text.strip()
            if not page_text:
                continue

            page_chunks = self._chunk_page(
                page=page,
                start_index=global_chunk_idx,
                default_section=page.sections[0] if page.sections else None,
            )

            for chunk in page_chunks:
                chunks.append(chunk)
                global_chunk_idx += 1

        # If document had no extractable text (e.g. pure scanned without OCR)
        if not chunks and parsed.page_count > 0:
            chunks.append(
                ChunkOutput(
                    chunk_index=0,
                    text="[Scanned document / no extractable text detected]",
                    page_start=1,
                    page_end=parsed.page_count,
                    section="Scanned Content",
                    offsets="char:0-0",
                    extra_metadata={
                        "is_scanned": True,
                        "word_count": 0,
                        "char_count": 0,
                        "confidence": 0.1,
                        "page_locator": "p. 1",
                    },
                )
            )

        return chunks

    def _chunk_page(
        self,
        page: PageExtraction,
        start_index: int,
        default_section: Optional[str],
    ) -> List[ChunkOutput]:
        text = page.text
        page_chunks: List[ChunkOutput] = []
        current_section = default_section

        # Split into natural paragraphs
        paragraphs = re.split(r"\n\s*\n", text)
        buffer = ""
        buffer_start_offset = 0
        current_offset = 0

        for paragraph in paragraphs:
            para = paragraph.strip()
            if not para:
                current_offset += len(paragraph) + 1
                continue

            # Check if paragraph looks like a section header
            if (len(para) < 90 and (para.isupper() or para.startswith("#"))) or para in page.sections:
                clean_sec = para.lstrip("#").strip()
                current_section = clean_sec

            para_len = len(para)

            # If adding this paragraph exceeds target size and buffer already has content
            if buffer and (len(buffer) + para_len + 1 > self.target_chunk_size):
                chunk_text = buffer.strip()
                if len(chunk_text) >= self.min_chunk_size:
                    page_chunks.append(
                        self._create_chunk(
                            index=start_index + len(page_chunks),
                            text=chunk_text,
                            page_num=page.page_number,
                            section=current_section,
                            start_offset=buffer_start_offset,
                            end_offset=buffer_start_offset + len(chunk_text),
                            is_scanned=page.is_scanned,
                        )
                    )

                # Keep overlap from the end of the buffer
                overlap_text = buffer[-self.overlap_size :] if len(buffer) > self.overlap_size else ""
                buffer = (overlap_text + " " + para).strip()
                buffer_start_offset = max(0, current_offset - len(overlap_text))
            else:
                if not buffer:
                    buffer_start_offset = current_offset
                    buffer = para
                else:
                    buffer = buffer + "\n\n" + para

            current_offset += para_len + 2

        # Emit remaining buffer
        if buffer.strip() and len(buffer.strip()) >= self.min_chunk_size:
            chunk_text = buffer.strip()
            page_chunks.append(
                self._create_chunk(
                    index=start_index + len(page_chunks),
                    text=chunk_text,
                    page_num=page.page_number,
                    section=current_section,
                    start_offset=buffer_start_offset,
                    end_offset=buffer_start_offset + len(chunk_text),
                    is_scanned=page.is_scanned,
                )
            )
        elif buffer.strip() and not page_chunks:
            # Under min_chunk_size but only chunk on the page: emit anyway
            chunk_text = buffer.strip()
            page_chunks.append(
                self._create_chunk(
                    index=start_index,
                    text=chunk_text,
                    page_num=page.page_number,
                    section=current_section,
                    start_offset=buffer_start_offset,
                    end_offset=buffer_start_offset + len(chunk_text),
                    is_scanned=page.is_scanned,
                )
            )

        return page_chunks

    def _create_chunk(
        self,
        index: int,
        text: str,
        page_num: int,
        section: Optional[str],
        start_offset: int,
        end_offset: int,
        is_scanned: bool,
    ) -> ChunkOutput:
        words = text.split()
        return ChunkOutput(
            chunk_index=index,
            text=text,
            page_start=page_num,
            page_end=page_num,
            section=section,
            offsets=f"char:{start_offset}-{end_offset}",
            extra_metadata={
                "word_count": len(words),
                "char_count": len(text),
                "is_scanned": is_scanned,
                "page_locator": f"p. {page_num}",
            },
        )
