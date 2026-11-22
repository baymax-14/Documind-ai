# DocuMind AI — Next Phase Plan

## Purpose

DocuMind AI combines a local-first browser workbench (WebGPU on-device inference + deterministic evidence preview + IndexedDB storage) with an enterprise server-side FastAPI + PostgreSQL + Qdrant grounded intelligence engine (inspired by PaperQA). This document outlines the architectural roadmap, current status across all checkpoints, and concrete implementation specifications for upcoming capabilities.

---

## Current Baseline & Project State

- **Frontend Application (`Documind-ai/`)**:
  - React + Vite app with routes `/` (Landing Page) and `/workspace` (Document Intelligence Workbench).
  - Neo-Brutalist Pastel Harmony design system (`#FFFDF5`, `#000000`, `#88D498`, `#74B9FF`, `#FFD23F`).
  - Client-side on-device extraction: `pdfjs-dist` (PDF), `mammoth` (DOCX), and browser UTF-8 text decoding (TXT).
  - Browser persistence in IndexedDB (`documind_db`) with export, clear-all, and storage quota estimation.
  - Interactive Document Reader with sticky section jumper rail, in-document search filter, and citation return navigation.
  - Dual AI Inference Engine:
    - **On-Device Model**: `Qwen2.5-0.5B-Instruct` via WebGPU/WebLLM with Cache API weight caching (~350 MB) and `AbortController` cancellation.
    - **Deterministic Evidence Preview**: Instant zero-download fallback that surfaces exact retrieved excerpts and locators.
  - Verification: 44/44 unit tests passing across 7 suites; ESLint 0 errors/0 warnings; production bundle built cleanly in ~8s with 0 warnings.

- **Backend Application (`backend/`)**:
  - FastAPI 0.111+ service with async SQLAlchemy 2.0 and Pydantic v2 schemas.
  - Multi-tenant tenant isolation (`owner_id` enforcement) and path-traversal-hardened file storage engine.
  - Document parser adapters for PDF (scanned/low-text detection), DOCX (heading hierarchy & table rows), and TXT/Markdown.
  - Boundary-preserving semantic chunker maintaining page numbers, section titles, and character offsets (`char:start-end`).
  - Ingestion pipeline with automated processing jobs and reprocessing endpoint (`POST /api/v1/documents/{id}/reprocess`).
  - Grounded hybrid retrieval engine combining 384-dimensional dense vectors with BM25 Okapi search using Reciprocal Rank Fusion ($k=60$).
  - PaperQA-inspired Grounded Chat Agent with evidence sufficiency validation, claim-level verifiable citations, and explicit abstention on insufficient evidence.
  - Docker Compose orchestrating PostgreSQL 16, Redis 7, Qdrant 1.9+, and the FastAPI backend service.

---

## Completed Phases Summary

- **Phase 0 — Repository Audit & Baseline**: ✅ Cleaned Git tracking, pinned lockfile dependencies, and verified GSAP/plugin licensing.
- **Phase 1 — Trustworthy Evidence Preview**: ✅ Replaced hardcoded responses with strict excerpt extraction and locator anchors.
- **Phase 2 — Core Regression Test Suite**: ✅ Built unit tests for file validation, chunking, search, storage, and import lifecycles.
- **Phase 3 — Bundle Optimization**: ✅ Initial entry reduced by 94.3% via lazy-loading parsers and view components.
- **Phase 4 — AI Architecture Decision**: ✅ Selected on-device WebGPU runtime with Evidence Preview fallback and server-side PaperQA hybrid backend.
- **Phase 5 — On-Device Model Integration**: ✅ Integrated `Qwen2.5-0.5B-Instruct` WebGPU runtime with 5 distinct UI states and hardware detection.
- **Phase 6 — Server-Side Foundation & Ingestion (C1–C2)**: ✅ FastAPI application, async database models, storage engine, format-aware parsers, and semantic chunker.
- **Phase 7 — Grounded Retrieval & PaperQA Agent (C3–C5)**: ✅ Hybrid vector + BM25 fusion engine, tenant isolation, claim-level page citations, and frontend API client (`backendApi.js`).

---

## Upcoming Phases

### Phase 8 — Advanced Evidence-Grounded Workflows (Checkpoint C6)

Expand trusted retrieval into higher-value analytical workflows across both frontend and backend:

1. **Section-Aware Document Summaries**:
   - Generate hierarchical summaries anchored to specific sections (e.g. Methodology, Findings, Financials) with direct source links.
2. **Cross-Document Comparison**:
   - Compare multiple selected documents side-by-side with matrix generation, highlighting agreements, contradictions, and distinct contributions with multi-source citations.
3. **Structured Schema-Based Extraction**:
   - Extract structured JSON data (e.g., contract parties, dates, financial metrics, research metrics) where each field includes its supporting excerpt and page locator.
4. **Citation-Preserving Export**:
   - Export synthesized answers, summaries, and comparison matrices to Markdown and PDF while preserving full citation footnotes and verifiable locators.

**Acceptance Criteria**:
- Summaries cite specific document sections; ungrounded statements are rejected.
- Comparison matrix flags conflicting statements between sources.
- Extracted JSON fields missing supporting evidence are marked `null` with explicit `missing_evidence` notice rather than guessed.

---

### Phase 9 — Evaluation Benchmark, Security Hardening & Deployment (Checkpoint C7)

Formalize quality metrics and operational readiness:

1. **Automated Evaluation Set**:
   - Curate a benchmark dataset of 50+ document-question pairs (including answerable, multi-hop, ambiguous, and unanswerable questions).
   - Measure Retrieval Recall@k, Answer Correctness, Citation Precision, and Abstention Quality (zero hallucinated citations).
2. **Adversarial & Prompt Injection Defense**:
   - Treat uploaded files strictly as untrusted data; sanitize against prompt injection and escape delimiter tokens.
   - Enforce rigorous IDOR and tenant isolation tests across document chunks, citations, and storage keys.
3. **Production Deployment Runbooks**:
   - Automated database migrations via Alembic.
   - Helm / Docker deployment manifests with health probes, Redis Celery workers, and structured logging.

**Acceptance Criteria**:
- 100% of invalid or cross-tenant citation resolution attempts are blocked.
- Retrieval hit rate >= 85% on benchmark set; 0% hallucinated citations.
- Full backup, restore, and zero-downtime migration procedures documented.
