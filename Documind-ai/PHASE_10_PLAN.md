# Phase 10 — End-to-End Integration, Conversation Persistence & Backend Connection

## Purpose

Phases 0–9 built the complete frontend workbench and enterprise backend independently. Phase 10 bridges them: the React workspace connects to the live FastAPI backend for real document upload/processing, persistent conversation history, backend-grounded chat, and a unified connectivity layer with graceful local-first fallback.

---

## Deliverables

### 10.1 — Backend Connection Manager & Health Indicator
- Build `Documind-ai/src/features/documents/services/connectionManager.js`:
  - Periodic backend health polling (every 30s) with exponential backoff on failure.
  - Reactive connection state: `connected`, `disconnected`, `checking`.
  - Export `useBackendConnection` React hook exposing `{ isConnected, isChecking, backendInfo, error, checkNow }`.
- Add a **Connection Status Indicator** pill in the sidebar:
  - Green dot + "Backend Connected" when server responds.
  - Yellow dot + "Checking…" during health poll.
  - Gray dot + "Local Only" when backend is unreachable (graceful degradation to on-device mode).

### 10.2 — Hybrid Document Management (Local + Backend)
- Extend `useDocumentImport` hook:
  - When backend is connected, **dual-track upload**: save to IndexedDB (immediate) AND upload to backend via `uploadDocumentToBackend()`.
  - Display per-document `backendStatus`: `pending`, `uploading`, `processing`, `synced`, `failed`.
  - Add a "Sync" action button on library cards for manual retry of failed backend uploads.
  - Backend documents show "☁ Cloud" badge; local-only show "💾 Local" badge.
- Build `Documind-ai/src/features/documents/services/syncManager.js`:
  - Tracks sync state between local IndexedDB documents and backend.
  - On reconnect, identifies unsynced documents and queues upload.
  - Handles conflict resolution: backend is source of truth for processing status; local is source of truth for user preferences.

### 10.3 — Persistent Conversation History
- Build `Documind-ai/src/features/documents/services/conversationStore.js`:
  - IndexedDB-backed conversation persistence (`documind_conversations` object store).
  - `saveConversation(id, messages)`, `loadConversation(id)`, `listConversations()`, `deleteConversation(id)`.
  - Auto-title generation from first user question.
- Add **Conversation History Panel** to sidebar navigation:
  - Lists previous conversations with title, timestamp, message count.
  - Click to restore messages into AI Assistant view.
  - Swipe-to-delete on mobile, delete button on desktop.
  - "New Conversation" button clears current messages and creates fresh session.
- When backend is connected:
  - Persist conversations server-side via backend API.
  - Sync local conversations on reconnect.

### 10.4 — Backend-Grounded Chat Integration
- Modify `handleApproveConsentAndGenerate()` in `Workspace.jsx`:
  - When backend is connected, route questions through `askBackendQuestion()` for hybrid vector+BM25 retrieval.
  - Display backend citations with `resolveBackendCitation()` for click-to-source navigation.
  - Fall back to local `generateAnswerWithFallback()` when backend is offline.
- Add a **Source Mode Toggle** in the AI tab:
  - "Local Evidence" — on-device retrieval + WebGPU/Evidence Preview.
  - "Backend Intelligence" — server-side PaperQA grounded agent.
  - Auto-select based on connection state.

### 10.5 — Document Processing Status & Progress
- Build `Documind-ai/src/features/documents/components/ProcessingStatusBadge.jsx`:
  - Animated status indicators: Uploading → Processing → Ready / Failed.
  - Shows backend processing stage name and elapsed time.
  - Retry button for failed processing.
- Add backend document status polling:
  - After upload, poll `getBackendDocumentContent()` every 3s until `status === 'ready'`.
  - Update library card badge in real-time.

### 10.6 — Tests & Quality Verification
- Build `Documind-ai/tests/connectionManager.test.js`: connection state transitions, reconnect logic, health check handling.
- Build `Documind-ai/tests/conversationStore.test.js`: CRUD operations, IndexedDB persistence, auto-title generation.
- Build `Documind-ai/tests/syncManager.test.js`: dual-track upload, conflict resolution, offline queue.
- All existing 64 tests must continue passing.
- ESLint 0 errors/0 warnings; clean Vite production build.

---

## Acceptance Criteria

- [ ] Backend connection indicator visible in sidebar; updates reactively.
- [ ] Documents upload to both IndexedDB and backend when connected.
- [ ] Documents degrade gracefully to local-only when backend is offline.
- [ ] Conversation history persists across page refreshes via IndexedDB.
- [ ] Previous conversations are restorable from the sidebar panel.
- [ ] AI questions route to backend when connected; fall back to local mode when not.
- [ ] All new + existing tests pass (target: 76+ tests across 15 suites).
- [ ] ESLint clean; Vite build clean.

---

## Design Constraints

- Maintain Neo-Brutalist Pastel Harmony design system.
- Zero telemetry in local-only mode.
- Backend connection is optional — the app must remain fully functional without it.
- All new UI follows existing accessibility patterns (keyboard navigation, ARIA labels, focus management).
