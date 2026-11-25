"""PaperQA-inspired Grounded Chat Agent.

Orchestrates multi-tenant hybrid retrieval, evidence gathering, sufficiency evaluation,
grounded response generation, and strict citation verification.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.models.conversation import Conversation, Message, MessageRole, MessageStatus
from app.models.citation import EvidenceReference, Citation, CitationValidationStatus
from app.models.chunk import DocumentChunk
from app.models.document import Document
from app.schemas.chat import ChatResponse, CitationSummary
from app.schemas.citation import EvidenceObject
from app.services.retrieval import get_retrieval_service, content_terms


class GroundedChatAgent:
    """Agent that guarantees claims are grounded in authorized document evidence."""

    def __init__(self):
        self.retrieval_service = get_retrieval_service()
        self.min_relevance_threshold = 0.12

    async def execute_chat(
        self,
        question: str,
        owner_id: uuid.UUID,
        db: AsyncSession,
        document_ids: Optional[List[uuid.UUID]] = None,
        conversation_id: Optional[uuid.UUID] = None,
    ) -> ChatResponse:
        """Executes the PaperQA grounded search, evidence evaluation, and answer synthesis."""
        # 1. Resolve or create Conversation
        if conversation_id:
            conv_stmt = select(Conversation).where(
                Conversation.id == conversation_id,
                Conversation.owner_id == owner_id,
            )
            conv_res = await db.execute(conv_stmt)
            conversation = conv_res.scalar_one_or_none()
            if not conversation:
                conversation = Conversation(id=conversation_id, owner_id=owner_id, title=question[:80])
                db.add(conversation)
            else:
                conversation.updated_at = datetime.now(timezone.utc)
        else:
            conversation = Conversation(id=uuid.uuid4(), owner_id=owner_id, title=question[:80])
            db.add(conversation)

        conv_id = conversation.id

        # 2. Record User Message
        user_message = Message(
            id=uuid.uuid4(),
            conversation_id=conv_id,
            role=MessageRole.USER,
            content=question,
            status=MessageStatus.SUCCESS,
            model_metadata={},
        )
        db.add(user_message)
        await db.flush()

        # 3. Step 1: Hybrid Search over authorized documents
        evidence_list = self.retrieval_service.hybrid_search(
            query=question,
            owner_id=owner_id,
            document_ids=document_ids,
            top_k=5,
        )

        # 4. Step 2 & 3: Assess Evidence Coverage and Sufficiency
        sufficient_evidence = [
            e for e in evidence_list if e.relevance_score >= self.min_relevance_threshold
        ]

        # Resilient fallback: search database chunks directly if in-memory index was empty
        if not sufficient_evidence:
            chunk_query = (
                select(DocumentChunk, Document.filename)
                .join(Document, DocumentChunk.document_id == Document.id)
                .where(
                    Document.owner_id == owner_id,
                    Document.status != "deleted",
                )
            )
            if document_ids:
                chunk_query = chunk_query.where(DocumentChunk.document_id.in_(document_ids))

            db_res = await db.execute(chunk_query)
            rows = db_res.all()
            # Whole content words only: substring matching let "the" or "were"
            # hit almost any passage and turned unrelated text into evidence.
            keywords = {w for w in content_terms(question) if len(w) > 2}
            scored = []
            for chunk_obj, doc_name in rows:
                chunk_words = set(content_terms(chunk_obj.text or ""))
                hits = len(keywords & chunk_words)
                if hits > 0:
                    score = min(1.0, hits * 0.25)
                    scored.append((score, chunk_obj, doc_name))
            scored.sort(key=lambda s: s[0], reverse=True)
            for score, chunk_obj, doc_name in scored[:5]:
                sufficient_evidence.append(
                    EvidenceObject(
                        evidence_id=uuid.uuid4(),
                        document_id=chunk_obj.document_id,
                        document_name=doc_name,
                        display_name=doc_name,
                        chunk_id=chunk_obj.id,
                        page_start=chunk_obj.page_start,
                        page_end=chunk_obj.page_end,
                        section=chunk_obj.section,
                        text=chunk_obj.text,
                        exact_source_excerpt=chunk_obj.text[:250],
                        retrieval_method="keyword",
                        retrieval_score=round(score, 4),
                        relevance_score=round(score, 4),
                        bounding_box=chunk_obj.extra_metadata.get("bounding_box") if chunk_obj.extra_metadata else None,
                    )
                )

        # 5. Synthesize grounded answer
        if not sufficient_evidence:
            answer_text = (
                "I could not find sufficient evidence in your uploaded documents to answer this question. "
                "Please verify that relevant documents are uploaded, processed, and selected."
            )
            chat_status = MessageStatus.INSUFFICIENT_EVIDENCE
            citations_out: List[CitationSummary] = []
        else:
            answer_text, citations_out = await self._synthesize_grounded_answer(
                question=question,
                evidence=sufficient_evidence,
                owner_id=owner_id,
                db=db,
            )
            chat_status = MessageStatus.SUCCESS

        # 6. Record Assistant Message in DB
        assistant_msg_id = uuid.uuid4()
        assistant_message = Message(
            id=assistant_msg_id,
            conversation_id=conv_id,
            role=MessageRole.ASSISTANT,
            content=answer_text,
            status=chat_status,
            model_metadata={"pipeline": "paperqa-grounded-agent", "evidence_count": len(sufficient_evidence)},
        )
        db.add(assistant_message)

        # 7. Persist Evidence References and Citations
        ev_ref_map = {}
        for rank, ev in enumerate(sufficient_evidence):
            ev_ref_id = uuid.uuid4()
            ev_ref = EvidenceReference(
                id=ev_ref_id,
                message_id=assistant_msg_id,
                chunk_id=ev.chunk_id,
                rank=rank + 1,
                retrieval_score=ev.retrieval_score,
                relevance_score=ev.relevance_score,
                claim_reference=ev.text[:120],
            )
            db.add(ev_ref)
            ev_ref_map[ev.chunk_id] = ev_ref_id

        for cit in citations_out:
            ev_ref_id = ev_ref_map.get(cit.chunk_id) if cit.chunk_id else None
            cit_record = Citation(
                id=cit.id,
                message_id=assistant_msg_id,
                evidence_reference_id=ev_ref_id,
                document_id=cit.document_id,
                page=cit.page,
                source_locator=cit.source_locator,
                validation_status=cit.validation_status,
                claim_text=cit.excerpt,
            )
            db.add(cit_record)

        await db.commit()

        logger.info(
            "chat.answer_generated",
            conversation_id=str(conv_id),
            status=chat_status.value,
            citations_count=len(citations_out),
            evidence_count=len(sufficient_evidence),
        )

        return ChatResponse(
            conversation_id=conv_id,
            message_id=assistant_msg_id,
            answer=answer_text,
            status=chat_status,
            citations=citations_out,
            evidence_count=len(sufficient_evidence),
        )

    async def _synthesize_grounded_answer(
        self,
        question: str,
        evidence: List[EvidenceObject],
        owner_id: uuid.UUID,
        db: AsyncSession,
    ) -> Tuple[str, List[CitationSummary]]:
        """Synthesizes answer grounded in excerpts and generates verifiable citations."""
        citations: List[CitationSummary] = []
        answer_parts: List[str] = []

        # Map top chunks as grounding points
        for idx, ev in enumerate(evidence[:3], 1):
            cit_id = uuid.uuid4()
            page_label = f"Page {ev.page_start}" if ev.page_start else "Doc"
            locator = f"[{ev.document_name}, {page_label}]"

            # Validate chunk exists in database and owner owns the document
            chunk_stmt = (
                select(DocumentChunk)
                .join(Document, DocumentChunk.document_id == Document.id)
                .where(
                    DocumentChunk.id == ev.chunk_id,
                    Document.owner_id == owner_id,
                )
            )
            chunk_res = await db.execute(chunk_stmt)
            db_chunk = chunk_res.scalar_one_or_none()

            validation = (
                CitationValidationStatus.VERIFIED
                if db_chunk
                else CitationValidationStatus.UNSUPPORTED
            )

            # Build grounded summary of passage
            snippet = ev.text.strip().replace("\n", " ")
            if len(snippet) > 220:
                snippet = snippet[:220].rsplit(" ", 1)[0] + "…"

            answer_parts.append(
                f"According to {ev.document_name} ({page_label}), \"{snippet}\" [{idx}]."
            )

            citations.append(
                CitationSummary(
                    id=cit_id,
                    document_id=ev.document_id,
                    document_name=ev.document_name,
                    page=ev.page_start,
                    source_locator=locator,
                    validation_status=validation,
                    excerpt=snippet,
                    chunk_id=ev.chunk_id,
                    bounding_box=ev.bounding_box,
                )
            )

        combined_answer = " ".join(answer_parts)
        return combined_answer, citations


# Global singleton
_grounded_agent: Optional[GroundedChatAgent] = None


def get_grounded_agent() -> GroundedChatAgent:
    global _grounded_agent
    if _grounded_agent is None:
        _grounded_agent = GroundedChatAgent()
    return _grounded_agent
