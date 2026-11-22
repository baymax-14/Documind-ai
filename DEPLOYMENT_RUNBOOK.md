# DocuMind AI — Production Deployment & Operations Runbook

## 1. System Overview

DocuMind AI operates in two complementary deployment modes:
1. **Local-First Browser Mode**: In-browser client-side WebAssembly extraction (`pdfjs-dist`, `mammoth`), IndexedDB persistence, on-device `Qwen2.5-0.5B-Instruct` WebGPU runtime, and zero telemetry evidence preview.
2. **Enterprise Server Mode**: Multi-tenant FastAPI backend with PostgreSQL 16 (metadata, conversations, verifiable citations), Qdrant 1.9+ (hybrid 384-d dense embeddings + BM25 okapi search with Reciprocal Rank Fusion), Redis 7 (task queuing), and PaperQA-grounded agent workflows.

---

## 2. Environment Variables & Configuration

Configure the following variables in `.env` or production orchestrator secrets:

| Variable | Default (Dev) | Description |
|---|---|---|
| `ENVIRONMENT` | `development` | Deployment environment (`development` / `production`) |
| `DATABASE_URL` | `postgresql+asyncpg://postgres:postgres@localhost:5432/documind_db` | Async PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis broker connection string |
| `QDRANT_HOST` | `localhost` | Qdrant vector database hostname |
| `QDRANT_PORT` | `6333` | Qdrant HTTP API port |
| `STORAGE_BACKEND` | `local` | Document binary store (`local` or `s3`) |
| `LOCAL_STORAGE_DIR` | `./storage` | Directory for uploaded file binaries |
| `ALLOWED_ORIGINS` | `["http://localhost:5173", "http://localhost:3000"]` | CORS origin whitelist |
| `API_V1_STR` | `/api/v1` | API version prefix |

---

## 3. Quickstart & Containerized Launch

### Launch Services with Docker Compose
```bash
# Build and launch PostgreSQL, Redis, Qdrant, and FastAPI Backend in background
docker compose up -d --build

# Verify container health
docker compose ps
```

### Apply Database Migrations (Alembic)
```bash
# Run latest database migrations
docker compose exec backend alembic upgrade head

# Verify migration status
docker compose exec backend alembic current
```

### Frontend Launch
```bash
cd Documind-ai
npm install
npm run build
npm run preview
```

---

## 4. Verification & Health Probes

### Health Check Endpoint
```bash
curl -f http://localhost:8000/api/v1/health
```
**Expected Response:**
```json
{
  "status": "healthy",
  "environment": "production",
  "database": "connected",
  "qdrant": "connected",
  "version": "1.0.0"
}
```

### Automated Quality Benchmark Suite
DocuMind AI includes an automated 50-item evaluation benchmark testing Retrieval Recall, Abstention Quality, Citation Precision, and Prompt Injection Defense:
```bash
cd Documind-ai
npm test tests/benchmark.test.js
```
**SLAs & Acceptance Thresholds**:
- Retrieval Recall@3: **>= 85%**
- Abstention on Unanswerable Queries: **100%** (zero hallucinated citations)
- Citation Precision & Integrity: **100%** (every citation must exist and match document text)
- Adversarial Delimiter & Prompt Injection Defense: **100%**

---

## 5. Security Policies & Tenant Isolation

1. **Untrusted Input Policy**:
   - All uploaded file bytes and text strings are treated as untrusted data.
   - LLM delimiter tokens (`<|im_start|>`, `<|im_end|>`, `[SYSTEM]`, `<<SYS>>`, ````system`) are stripped or escaped prior to prompt construction.
2. **Tenant Boundary Enforcement**:
   - Every database query enforces `owner_id == current_user_id`.
   - Cross-tenant citation resolution attempts or IDOR document ID probing return HTTP 404 / error and are blocked.
3. **Path Traversal Defense**:
   - Storage paths use non-guessable random UUIDs (`storage_path = {owner_id}/{doc_id}.bin`).
   - File names are sanitized with directory traversal (`../`) and control characters stripped.

---

## 6. Backup & Disaster Recovery Procedures

### 1. PostgreSQL Database Backup
```bash
# Export compressed database dump
docker exec -t documind_postgres pg_dump -U postgres -d documind_db -F c -b -v -f /tmp/backup_documind.dump
docker cp documind_postgres:/tmp/backup_documind.dump ./backups/$(date +%Y%m%d)_pg.dump
```

### 2. Qdrant Vector Collection Snapshot
```bash
# Create Qdrant snapshot
curl -X POST "http://localhost:6333/collections/documind_chunks/snapshots"
```

### 3. File Storage Backup
```bash
tar -czvf ./backups/$(date +%Y%m%d)_storage.tar.gz ./backend/storage
```

### 4. Zero-Downtime Rollback
If a deployment fails, roll back to the previous migration revision:
```bash
docker compose exec backend alembic downgrade -1
```
