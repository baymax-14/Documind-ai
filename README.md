# DocuMind AI

<p align="center">
  <strong>Private, Verifiable Document Intelligence & Grounded Research Assistant</strong>
</p>

<p align="center">
  <a href="#key-features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#api-reference">API Reference</a> •
  <a href="#verification--testing">Testing</a> •
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-6.0-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white" alt="Tailwind CSS v4" />
  <img src="https://img.shields.io/badge/GSAP-3.15-0AE448?style=flat-square&logo=greensock&logoColor=black" alt="GSAP 3" />
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python 3.11" />
  <img src="https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Qdrant-v1.9-DC2626?style=flat-square&logo=qdrant&logoColor=white" alt="Qdrant" />
  <img src="https://img.shields.io/badge/Redis-7.0-DC382D?style=flat-square&logo=redis&logoColor=white" alt="Redis 7" />
  <img src="https://img.shields.io/badge/WebGPU-Qwen_2.5-0052FF?style=flat-square" alt="WebGPU" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Tests-122%20Passing-059669?style=flat-square" alt="122 Passing Tests" />
  <img src="https://img.shields.io/badge/License-MIT-black?style=flat-square" alt="License" />
</p>

---

## Overview

**DocuMind AI** is a dual-mode, privacy-first document intelligence platform built for researchers, analysts, and students. It eliminates synthetic hallucinations by enforcing strict, mathematical **PaperQA source grounding**: every statement synthesized by the system is anchored to exact passage locators (page numbers, section headings, and visual bounding boxes).

The platform can operate **100% locally on-device** (via WebGPU, WebLLM, and client-side IndexedDB with zero cloud transmission) or connect to an **enterprise-grade hybrid retrieval backend** powered by FastAPI, PostgreSQL, and Qdrant.

---

## Key Features

### 1. Dual-Mode Grounded AI Assistant
- **On-Device Neural Model**: Runs quantized local LLMs (`Qwen2.5-0.5B-Instruct` via WebGPU and WebLLM) directly inside the user's browser. Model weights (~350 MB) download once into the browser Cache API for instant, private offline inference.
- **Deterministic Evidence Fallback**: When WebGPU is unavailable or deferred, DocuMind falls back to instant keyword excerpt retrieval and verified citation synthesis with zero model weight downloads.
- **Hallucination Prevention**: Zero synthetic claims. Answers are drawn strictly from retrieved document chunks or explicitly report no matching evidence.

### 2. High-Performance Hybrid Retrieval & Neural Re-Ranking
- **BM25 Okapi + Dense Vector Search**: Integrates Lexical BM25 ranking with Qdrant vector embeddings via **Reciprocal Rank Fusion (RRF)**.
- **Cross-Encoder Neural Re-Ranking**: Second-stage cross-encoder re-ranking scores candidate chunks with deep semantic relevance and provides confidence percentiles.
- **Multi-Tenant Isolation**: Rigorous tenant and document isolation (`owner_id` + `document_ids` filters) prevents cross-tenant citation forgery or IDOR leaks.
- **Resilient Cold-Start Handling**: Built-in non-blocking reconnect backoffs absorb container lag and maintain high availability.

### 3. Visual Document Grounding & Page-by-Page Inspection
- **Interactive Page-by-Page Viewer**: Inspect PDF, DOCX, and TXT files with thumbnail sidebars, zoom controls (50% to 200%), and page navigation.
- **Visual Bounding Box Citations**: Every cited passage is anchored to proportional visual bounding box coordinates on the preview canvas.
- **Split-Pane Document Reader**: Full-featured drawer with section jumper navigation, text filtering, and one-click jump-to-source.

### 4. Multimodal VLM Chart & Image Reasoning
- **Visual Figure & Chart Detection**: Automatic detection of charts, plots, and architecture diagrams within document pages.
- **VLM Reasoning Prompts**: Vision-Language prompt templates for automated metric extraction, trend summarization, and data verification from images.

### 5. Automated Structured Schema Extraction
- **Context-Aware Schema Inference**: Automatically selects optimal extraction schemas based on document type (Research Paper, Market Analysis, Legal Agreement, and Brand & Product Guidelines).
- **Tabular Matrix & JSON Export**: View extracted fields in structured tables with cited evidence passages or export as validated JSON.

### 6. Cross-Document Comparative Matrix
- **Side-by-Side Analysis**: Compare multiple documents simultaneously across analytical dimensions (e.g., Governance, Performance, Security, Cost).
- **Custom Topic Querying**: Enter targeted queries to extract comparative evidence across all staged files.

### 7. Local-First Privacy & Persistent Chat History
- **100% Client-Side Extraction**: Client-side parsing via `pdfjs-dist` (PDF), `mammoth` (DOCX), and native text decoders.
- **IndexedDB Session Persistence**: AI chat conversations, parsed document chunks, and user preferences persist securely in IndexedDB across reloads with automatic session hydration.
- **Token Observability & Governance**: Real-time token usage telemetry, operational budget limits, and hardware diagnostics.

### 8. Tactile Neo-Brutalist Design System ("The Paper Workbench")
- **Distinctive Editorial Aesthetic**: Space Grotesk + DM Sans typography, tactile pastel palette (Mint, Sky, Butter), and solid black strokes.
- **Ergonomic Precision**: Tabular numerals (`tabular-nums`) to eliminate update jitter, proportional mechanical button physics, and comprehensive high-contrast Light and Dark themes.

---

## Architecture

```mermaid
flowchart TD
  subgraph Client ["Client Browser (Local-First Workspace)"]
    UI["React 19 + Vite Workspace UI"]
    Parser["Web Worker Parsers (pdfjs-dist / mammoth)"]
    IDB[("IndexedDB Local Storage")]
    WebGPU["On-Device WebLLM (Qwen 2.5 on GPU)"]
    Grounding["Visual Bounding Box & Citations Engine"]
    
    UI <--> Parser
    Parser --> IDB
    UI <--> IDB
    UI <--> WebGPU
    UI <--> Grounding
  end

  subgraph CloudGateway ["Optional Hybrid Backend Connection"]
    ConnMgr["Backend Connection Manager (Poller & Circuit Breaker)"]
    UI -.->|VITE_API_BASE_URL| ConnMgr
  end

  subgraph BackendServer ["FastAPI Enterprise Server"]
    API["FastAPI REST Endpoints (v1)"]
    Ingest["Ingestion Worker & Chunker"]
    Hybrid["Hybrid Retrieval Engine (RRF)"]
    BM25["In-Memory BM25 Okapi"]
    
    ConnMgr --> API
    API --> Ingest
    API --> Hybrid
    Hybrid <--> BM25
  end

  subgraph Storage ["Enterprise Infrastructure"]
    PG[("PostgreSQL 16 (Relational & Auth)")]
    Qdrant[("Qdrant Vector DB (Hybrid Chunks)")]
    Redis[("Redis 7 (Rate Limiting & Tasks)")]
    
    API <--> PG
    Hybrid <--> Qdrant
    API <--> Redis
  end
```

---

## Tech Stack

DocuMind AI combines a local-first browser runtime with an enterprise hybrid retrieval architecture:

### 1. Frontend & Client-Side Core
- **Framework & Tooling**: [React 19](https://react.dev/), [Vite 6](https://vitejs.dev/) with native ES modules and fast HMR, [React Router 7](https://reactrouter.com/) for single-page routing.
- **State & Data Management**: [Zustand 5](https://github.com/pmndrs/zustand) for reactive lightweight UI state, [TanStack React Query 5](https://tanstack.com/query) for asynchronous lifecycle caching.
- **File Ingestion**: [React Dropzone](https://react-dropzone.js.org/) for drag-and-drop validation, size partitioning, and multi-file staging.

### 2. Styling, Motion & Design System
- **Design Language**: Custom **"The Paper Workbench"** neobrutalist design system with high-contrast pastel palettes (Mint `#88d498`, Butter `#ffd23f`, Sky `#74b9ff`), solid pitch-black structural borders (`2px/3px solid var(--ink)`), and hard box shadows (`4px 4px 0 var(--ink)`).
- **CSS Architecture**: [Tailwind CSS v4](https://tailwindcss.com/) with native modern CSS variables, `tabular-nums` alignment, and full Dark Mode (`.dark` / `color-scheme: dark`) synchronization across the entire viewport.
- **Animation & Motion**: [GSAP 3](https://gsap.com/) (`@gsap/react`, `ScrollSmoother`, `ScrollTrigger`, `ScrambleTextPlugin`) for fluid hero typography reveals, section transitions, and responsive spring physics.
- **Iconography**: [Lucide React](https://lucide.dev/) stroke-based accessible iconography.

### 3. On-Device AI & Hardware Acceleration
- **In-Browser LLM Runtime**: [WebLLM](https://webllm.mlc.ai/) powered by **Apache TVM** and **WebGPU**, compiling optimized WGSL shaders directly onto client graphics hardware.
- **Quantized Neural Weights**: `Qwen2.5-0.5B-Instruct-q4f16_1-MLC` (~350 MB shards) downloaded once into the browser's persistent `Cache API` for zero-token, zero-upload local generation.
- **Multimodal VLM Reasoning**: Vision-Language Model prompting patterns for detecting charts/figures, isolating bounding box regions, and summarizing visual trends.
- **Hardware Telemetry**: Navigator WebGPU adapter probing, VRAM limit checks, and live Token Governance budget tracking (`createTokenBudgetTracker`).

### 4. Client-Side Document Parsing & Local Storage
- **PDF Extraction**: [pdfjs-dist](https://github.com/mozilla/pdf.js) (Mozilla PDF.js) executing inside background Web Workers for high-speed page-by-page text stream decoding and visual bounding box calculation.
- **DOCX Extraction**: [Mammoth.js](https://github.com/mwilliamson/mammoth.js) converting Word XML structures to sanitized semantic HTML chunks and paragraphs.
- **Local Persistence**: Browser [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) via [idb 8](https://github.com/jakearchibald/idb) across two isolated databases:
  - `documind_db`: Persists staged files, text chunks, and document metadata across reloads.
  - `documind_conversations`: Persists timestamped chat sessions with auto-generated titles, message logs, and citation records.

### 5. Algorithmic Intelligence & Grounding
- **Lexical Retrieval**: In-memory BM25 Okapi with custom tokenization, lowercasing, punctuation stripping, and stop-word filtering (`k1=1.2`, `b=0.75`).
- **Dense Vector Search**: Qdrant HNSW vector indexing with cosine distance metric.
- **Reciprocal Rank Fusion (RRF)**: Merges sparse lexical rankings with dense vector embeddings using constant reciprocal scoring ($k=60$).
- **Cross-Encoder Neural Re-Ranking**: Second-stage semantic re-ranking model scoring candidate chunks for deep query-passage alignment and confidence percentile estimation.
- **Visual Grounding Engine**: Proportional coordinate normalization algorithms mapping text chunk offsets to visual bounding boxes across page thumbnails and split-pane reader views.
- **Schema Extraction Engine**: Automated schema inference matching document titles and passages against structured schemas (Research Paper, Market Analysis, Legal Agreement, Product/Brand Guidelines).

### 6. Backend Server & API Layer
- **API Framework**: [FastAPI 0.111+](https://fastapi.tiangolo.com/) with asynchronous ASGI event loop powered by [Uvicorn](https://www.uvicorn.org/).
- **Data Validation & Settings**: [Pydantic v2](https://docs.pydantic.dev/) and `pydantic-settings` for type validation and environment loading.
- **Server-Side Document Parsers**: [PyMuPDF](https://pymupdf.readthedocs.io/) (`fitz`) for server PDF extraction and [python-docx](https://python-docx.readthedocs.io/) for Word files.
- **HTTP Client**: [HTTPX](https://www.python-httpx.org/) for async non-blocking external requests and health probing.
- **Security & Tokens**: [python-jose](https://github.com/mpdavis/python-jose) (JWT cryptographic verification) and [passlib](https://passlib.readthedocs.io/) (bcrypt password hashing).

### 7. Databases, ORM & Caching
- **Relational Database**: [PostgreSQL 16](https://www.postgresql.org/) for relational tenant storage, document records, and conversation history.
- **Asynchronous ORM**: [SQLAlchemy 2.0](https://www.sqlalchemy.org/) with async engine via [asyncpg](https://github.com/MagicStack/asyncpg).
- **Schema Migrations**: [Alembic](https://alembic.sqlalchemy.org/) for version-controlled, reproducible database schema migrations.
- **Vector Database**: [Qdrant v1.9](https://qdrant.tech/) for scalable vector embeddings, payload filtering, and tenant isolation.
- **In-Memory Cache & Broker**: [Redis 7](https://redis.io/) for session caching, rate limiting, and background task queues.

### 8. DevOps, Testing & Quality Assurance
- **Containerization**: [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) defining multi-container orchestration across services.
- **Frontend Test Suite**: Native Node.js Test Runner (`node:test`, `node:assert/strict`) executing **122 automated unit and integration tests across 21 test suites** with zero third-party testing dependencies.
- **Backend Test Suite**: [pytest 8](https://docs.pytest.org/), `pytest-asyncio`, and `pytest-cov` for backend API and retrieval tests.
- **Code Quality**: [ESLint 9](https://eslint.org/) flat configuration enforcing clean code (0 errors, 0 warnings enforced).

---

## Quick Start

### Option 1: Run Frontend in Local-First Mode (Zero Cloud)

The frontend runs completely standalone with full on-device WebGPU and IndexedDB capabilities:

```bash
# 1. Clone repository
git clone https://github.com/your-username/Documind-ai.git
cd Documind-ai/Documind-ai

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

### Option 2: Run Full Stack with Docker Compose

Run the complete platform (PostgreSQL, Redis, Qdrant, and FastAPI Backend):

```bash
# From the repository root:
docker compose up -d
```

Services started:
- **FastAPI Backend**: [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger Docs**: [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
- **Qdrant Vector DB UI**: [http://localhost:6333/dashboard](http://localhost:6333/dashboard)
- **PostgreSQL**: `localhost:5432` (db: `documind_db`)
- **Redis**: `localhost:6379`

Now launch the frontend to connect:
```bash
cd Documind-ai
npm run dev
```

---

### Option 3: Manual Backend Setup

If developing on the FastAPI backend directly:

```bash
# 1. Start required infrastructure containers
docker compose up -d postgres redis qdrant

# 2. Navigate to backend directory
cd backend

# 3. Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\Activate.ps1

# 4. Install dependencies
pip install -r requirements.txt

# 5. Run database migrations
alembic upgrade head

# 6. Start FastAPI server
uvicorn app.main:app --reload --port 8000
```

---

## API Reference

The backend provides a RESTful API compliant with OpenAPI v3 standards:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Healthcheck and container dependency status |
| `POST` | `/api/v1/documents` | Upload a document (PDF, DOCX, TXT) for ingestion |
| `GET` | `/api/v1/documents` | List stored documents for authenticated tenant |
| `GET` | `/api/v1/documents/{id}` | Retrieve document metadata and processing status |
| `DELETE` | `/api/v1/documents/{id}` | Soft-delete document and purge stored bytes |
| `GET` | `/api/v1/documents/{id}/content` | Retrieve extracted document chunks and locators |
| `POST` | `/api/v1/chat` | PaperQA-grounded retrieval & Q&A with citations |
| `GET` | `/api/v1/chat/conversations` | List conversation threads |
| `GET` | `/api/v1/chat/conversations/{id}` | Retrieve conversation message history |
| `GET` | `/api/v1/citations/{citation_id}` | Resolve citation to exact source chunk & page |

Interactive documentation is available at `/api/v1/docs` when the backend is running.

---

## Verification & Testing

DocuMind AI enforces a rigorous automated test suite covering security defenses, adversarial prompt injection neutralization, citation integrity, bounding box normalization, VLM chart reasoning, cross-encoder re-ranking, and cross-document comparison:

```bash
cd Documind-ai

# Run all unit and integration tests (122 tests across 21 suites)
npm test

# Run ESLint check (0 errors, 0 warnings enforced)
npm run lint

# Build production bundle
npm run build
```

---

## Repository Structure

```text
Documind-ai/
├── .github/                   # CI/CD workflows and issue templates
├── backend/                   # FastAPI Backend
│   ├── app/
│   │   ├── api/v1/            # API endpoints (chat, documents, citations)
│   │   ├── core/              # Config, security, database sessions
│   │   ├── models/            # SQLAlchemy database models
│   │   ├── schemas/           # Pydantic validation schemas
│   │   └── services/          # Retrieval (BM25 + Qdrant), Ingestion, Agent
│   ├── migrations/            # Alembic database migrations
│   ├── tests/                 # Pytest backend test suite
│   ├── Dockerfile             # Backend container image
│   └── requirements.txt       # Python dependencies
├── Documind-ai/               # React 19 Frontend
│   ├── src/
│   │   ├── features/documents/# Core services (WebLLM, VLM reasoning, re-ranking, IndexedDB, etc.)
│   │   ├── LandingPage.jsx    # Neobrutalist landing page
│   │   ├── Workspace.jsx      # Research workspace & assistant interface
│   │   ├── styles.css         # The Paper Workbench design system styles
│   │   └── landing.css        # Landing page styling & animations
│   ├── tests/                 # Frontend node:test suite (122 tests across 21 suites)
│   └── package.json           # Frontend dependencies & scripts
├── docker-compose.yml         # Multi-container orchestration (PostgreSQL, Redis, Qdrant, Backend)
└── README.md                  # Project documentation
```

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/my-new-feature`.
3. Commit your changes: `git commit -am 'Add some feature'`.
4. Ensure tests and lint pass: `npm test && npm run lint`.
5. Push to the branch: `git push origin feature/my-new-feature`.
6. Open a Pull Request.

---

## License

This project is licensed under the [MIT License](LICENSE).
