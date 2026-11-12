# DocuMind AI — Next Phase Plan

## Purpose

The local-first document workflow is now in place: PDF/DOCX/TXT extraction, IndexedDB storage, keyword-based evidence search, an extracted-text reader, and an assistant demo. This phase makes the assistant honest and verifiable, adds regression coverage, and reduces the production bundle. It does **not** connect a remote AI service.

## Current baseline

- React + Vite app; routes `/` and `/workspace`.
- Document parsing, staging, local persistence, deletion, evidence search, and source navigation live under `src/features/documents/`.
- `src/features/documents/services/aiChat.js` retrieves text chunks but does not call a language model. It waits briefly, then returns canned answers for some query topics and excerpt-based text for others.
- Citations currently identify retrieved chunks. They do not prove that each statement in a canned answer is supported by the cited chunk.
- No backend, AI provider, authentication, or cloud sync is configured.
- `npm run lint` passes. `npm run build` completes but warns that the main JavaScript output is over 500 KB. There is no automated test suite yet.
- Preserve `DESIGN.md`, the local-only privacy boundary, demo labels, responsive behavior, keyboard access, and reduced-motion support.

## Phase 1 — Make assistant output trustworthy (do this first)

### Work

1. Replace the canned topic-based responses in `src/features/documents/services/aiChat.js`.
2. Until a real model is deliberately selected and integrated, make the assistant an **evidence preview**: show the most relevant excerpts and their document/section/page locators. It may summarize only by quoting or lightly trimming retrieved text; it must not add unsupported figures, recommendations, or claims.
3. Keep the no-evidence response explicit. Never return a confident answer when retrieval returns no matching chunks.
4. Make the interface clear that this is local keyword retrieval / a prototype assistant, not an AI model. Update the workspace assistant header, welcome text, excerpt review dialog, action button, and landing-page copy to match. Do not use “AI generated,” “reasoned,” or equivalent language for deterministic template output.
5. Ensure each displayed excerpt has its own citation and clicking it opens the exact source chunk in the reader. Avoid attaching one broad answer to citations that do not support every sentence.
6. Keep the excerpt review step and cancellation behavior, but explain its actual purpose: the user can inspect which local passages will be shown.

### Acceptance criteria

- No hard-coded market statistics, product claims, or canned summaries remain in answer logic.
- With matching evidence, the UI displays the actual retrieved source text and exact locator.
- With no matching evidence, it says no relevant passage was found and shows no citations.
- UI text consistently says retrieval/excerpts are local and no real model is connected.
- Citations open the corresponding passage in the reader.
- Existing demo documents remain marked as demo content.

## Phase 2 — Add regression tests

Use Vitest and the React Testing Library only if needed by the existing setup; keep test dependencies limited. Add focused tests for pure services first, then a few key user flows.

Cover:

- Format and file-size validation, including unsupported `.doc`, empty files, oversized files, and mixed valid/invalid selections.
- Parser routing and extraction failures for PDF, DOCX, and TXT; test that generated chunks have stable text and valid locators/offsets.
- Search ranking/snippets, zero results, and retrieval of the exact chunk used by a citation.
- Assistant evidence-preview behavior: output is drawn only from retrieved passages; no evidence produces no citation.
- IndexedDB save/load/delete/clear and quota/error handling with a mocked IndexedDB implementation.
- Import queue state transitions and the explicit save-to-library action.

### Acceptance criteria

- `npm run test` (or the documented equivalent) passes in a clean install.
- The tests cover core privacy and source-grounding boundaries, not only component snapshots.
- `npm run lint` and `npm run build` still pass.

## Phase 3 — Reduce initial bundle cost

1. Inspect Vite’s bundle output and identify which dependencies account for the initial entry size.
2. Lazy-load PDF parsing and the document reader/assistant views where practical. Configure manual chunks only when it produces a measurable improvement and does not break the PDF.js worker URL.
3. Do not defer the initial landing page or primary workspace shell.
4. Record before/after initial JS and largest chunk sizes from the production build.

### Acceptance criteria

- Production build completes without the current oversized main-chunk warning, or the remaining warning is explained with measured evidence.
- PDF.js worker still loads in the built app.
- `/`, `/workspace`, import, search, reader, and assistant navigation still work after code splitting.

## Phase 4 — Decide whether to add real AI (decision gate; do not implement yet)

Before connecting a model, the product owner must choose one path:

- **On-device model:** document excerpts remain local, but model download size, browser/device support, performance, and model licensing need evaluation.
- **Server-side model:** requires a backend proxy, provider selection, secret management, retention policy, privacy notice, explicit per-query consent for transmitted excerpts, rate limits, and error handling. Never call a provider directly from the Vite client or expose a provider key in frontend environment variables.

For either path, require passage-level citations, no-evidence behavior, cancellation, and checks that every claim is supported by retrieved evidence. Keep the current evidence-preview mode available when model service is unavailable.

Do not begin this phase until the provider/data-flow/retention decision is recorded in `PRODUCT.md`.

## Out of scope for this phase

Cloud uploads, accounts, sync, team sharing, OCR, legacy `.doc` parsing, document comparison, exports, and billing. Do not imply these are available.

## Antigravity handoff

Implement **Phase 1 only** first. Inspect the current code and preserve the design system. Keep the fix focused: remove unsupported canned factual answers, turn the assistant into a clearly labeled local evidence preview, and verify exact citation navigation. Then report the files changed, behavior verified, and remaining limitations. Stop before adding tests, code splitting, or model integration unless the owner asks to continue.
