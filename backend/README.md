# DocuMind AI — Backend (Phase 1 Foundation)

FastAPI + PostgreSQL + Qdrant backend for the PaperQA-inspired document intelligence platform.

---

## 1. Quick Start

### Prerequisites
- **Python 3.11+** installed on your system.
- **Docker & Docker Compose** (for PostgreSQL, Redis, and Qdrant services).

### Step 1: Start Infrastructure (PostgreSQL, Redis, Qdrant)
From the repository root (`Documind-ai/`):
```bash
docker compose up -d postgres redis qdrant
```

### Step 2: Set Up Python Virtual Environment
Inside `backend/`:
```bash
cd backend
python -m venv .venv

# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
```

### Step 3: Run the Development Server
```bash
uvicorn app.main:app --reload --port 8000
```

- API Docs (Swagger UI): [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
- OpenAPI Spec: [http://localhost:8000/api/v1/openapi.json](http://localhost:8000/api/v1/openapi.json)
- Health Check: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

---

## 2. API Endpoints Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Service liveness & dependency healthcheck |
| `POST`| `/api/v1/documents` | Upload a document (PDF, DOCX, TXT) and create an ingestion job |
| `GET` | `/api/v1/documents` | List active documents owned by authenticated user |
| `GET` | `/api/v1/documents/{id}` | Retrieve document metadata & processing status |
| `DELETE`| `/api/v1/documents/{id}` | Soft-delete document and purge private stored bytes |
| `GET` | `/api/v1/documents/{id}/content` | Retrieve extracted document chunks & page locators |
| `POST`| `/api/v1/chat` | PaperQA-grounded retrieval & question-answering with citations |
| `GET` | `/api/v1/chat/conversations` | List user conversation threads |
| `GET` | `/api/v1/chat/conversations/{id}`| Retrieve messages and citation references |
| `GET` | `/api/v1/citations/{citation_id}`| Resolve citation to source document chunk & locator |

---

## 3. Architecture & Data Entities

The backend implements the PaperQA-inspired relational and vector data model:
- **`User`**: Tenant isolation, identity, and access ownership.
- **`Document`**: Lifecycle states (`uploaded`, `queued`, `processing`, `ready`, `failed`, `deleted`), checksums, storage keys.
- **`ProcessingJob`**: Async pipeline state tracking (`pending`, `running`, `completed`, `failed`).
- **`DocumentChunk`**: Granular passage text, `page_start`, `page_end`, section headers, character offsets, and embedding version.
- **`Conversation` & `Message`**: Session history with claim-level provenance.
- **`EvidenceReference` & `Citation`**: Direct mapping between generated claims, similarity scores, and verifiable document chunks.

---

## 4. Running Tests

```bash
pytest
```
