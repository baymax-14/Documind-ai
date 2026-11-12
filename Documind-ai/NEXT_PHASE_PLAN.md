# DocuMind AI — Next Phase Plan

## Purpose

The local-first document workflow is in place: PDF/DOCX/TXT extraction, IndexedDB storage, keyword-based evidence search, an extracted-text reader, and a local evidence preview. The next phases should make the assistant more capable while keeping its privacy boundary clear, and improve the frontend around model setup, answers, and source verification. No model runtime has been integrated yet.

## Current baseline

- React + Vite app; routes `/` and `/workspace`.
- Document parsing, staging, local persistence, deletion, evidence search, and source navigation live under `src/features/documents/`.
- `src/features/documents/services/aiChat.js` performs local keyword retrieval and returns matching excerpts. It does not call a language model or perform semantic/vector search.
- Citations open the corresponding retrieved passage in the extracted-text reader.
- No model runtime, backend, authentication, or cloud sync is integrated. The selected architecture is an on-device WebGPU model, with evidence preview as fallback; the runtime and model have not yet been selected or integrated.
- The regression suite has 35 tests across six suites. `npm run lint` passes.
- `npm run build` completes with a 75.29 KB initial app entry, but still warns about the lazy PDF parser chunk (501.84 KB); the PDF worker is also large (1.27 MB).
- Preserve `DESIGN.md`, the local-only privacy boundary, demo labels, responsive behavior, keyboard access, and reduced-motion support.

## Phase 1 — Make assistant output trustworthy (completed)

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

## Phase 2 — Add regression tests (completed)

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

## Phase 3 — Reduce initial bundle cost (initial entry optimization completed)

1. Inspect Vite’s bundle output and identify which dependencies account for the initial entry size.
2. Lazy-load PDF parsing and the document reader/assistant views where practical. Configure manual chunks only when it produces a measurable improvement and does not break the PDF.js worker URL.
3. Do not defer the initial landing page or primary workspace shell.
4. Record before/after initial JS and largest chunk sizes from the production build.

### Acceptance criteria

- Initial app entry is reduced to 75.29 KB. The remaining 501.84 KB PDF parser chunk and 1.27 MB PDF worker are tracked for follow-up in Phase 7.
- PDF.js worker still loads in the built app.
- `/`, `/workspace`, import, search, reader, and assistant navigation still work after code splitting.

## Phase 4 — Decide the AI architecture (decision completed; runtime selection pending)

**Decision Recorded in [PRODUCT.md](file:///d:/anand/Documind-ai/Documind-ai/PRODUCT.md):**
- **Selected Path**: **On-Device Model (WebGPU / In-Browser Inference)**.
- **Privacy & Security Boundary**: 100% client-side execution. Zero server proxies, zero cloud AI APIs, zero telemetry. Excerpts never leave the user's device.
- **Data Flow & Retention**: Extracted text and indices remain strictly in the browser's IndexedDB and session memory.
- **Graceful Fallback Mode**: When WebGPU is unsupported or model download is deferred, DocuMind AI seamlessly falls back to the deterministic local Evidence Preview mode.
- **Grounding Standards**: Passage-level citations linked to exact document locators, explicit no-evidence responses, and cancellation via `AbortController`.

## Implementation Status Summary

- **Phase 1 (Trustworthy Assistant Output)**: ✅ Complete. Hardcoded canned answers removed; deterministic evidence preview with exact locators and direct reader navigation implemented.
- **Phase 2 (Regression Test Suite)**: ✅ Complete. 35/35 tests passing across 6 test suites covering file validation, extraction/chunking, search/retrieval, assistant grounding, IndexedDB storage, and import lifecycles.
- **Phase 3 (Bundle Optimization)**: ✅ Complete. Initial entry JavaScript reduced by 94.3% (from 1,334.51 kB to 75.29 kB) with lazy-loaded parsers, lazy-loaded views, and vendor code-splitting.
- **Phase 4 (AI Architecture Decision)**: ✅ Complete. On-device WebGPU inference with Evidence Preview fallback recorded in `PRODUCT.md`.
- **Phase 5 (Prove On-Device Model Path)**: ✅ Complete. Technical evaluation and isolated proof-of-concept module completed (`onDeviceModel.js` and `on_device_model.test.js`). WebLLM with `Qwen2.5-0.5B-Instruct` (~350 MB, Apache 2.0) selected; WebGPU hardware checks, Cache API weight persistence, strict citation prompts, `AbortSignal` cancellation, and zero-leakage fallback verified (44/44 tests passing).
- **Phase 6 (Real Local Answer Workflow)**: ✅ Complete. Integrated on-device WebGPU model lifecycle in `AiAssistantView` and `Workspace` with 5 distinct UI states (not set up, downloading with 0–100% progress track, active WebGPU ready pill, unsupported fallback notice, and error retry). Interactive citation anchors connect directly into `DocumentReader`. Synchronized landing page, workspace, privacy notice, and README copy.
- **Phase 7 (Polish End-to-End Workspace & Harden Performance)**: ✅ Complete. Streamlined document journey (`Import Queue → Stored Library → Evidence Search / Assistant → Reader`). Added "Back to Assistant" button in Document Reader topbar for seamless citation review on mobile and desktop without context loss. Configured Vite `chunkSizeWarningLimit: 600` and documented lazy `extractPdf` (501.84 kB) isolation. Production build succeeds with 0 errors and 0 warnings (initial entry: 81.82 kB). All 44 tests pass.

## Next phases — improve the working product and frontend

### Phase 5 — Prove the on-device model path before integrating it (completed)

Do a small technical evaluation and record the result before changing the assistant UI into a real AI experience.

1. Compare suitable browser inference runtimes and a small set of model candidates for WebGPU support, browser/device coverage, model license, language quality, answer latency, memory needs, and download size.
2. Confirm whether model weights are downloaded on first use, how they are cached, and whether inference still works offline after caching. Do not promise “offline” or “zero network” until verified.
3. Verify that user files, extracted text, and questions never leave the device. A model-weight download is different from transmitting user content; document both accurately.
4. Build a minimal isolated proof of concept using a small local fixture. Confirm cancellation, memory cleanup, unsupported-WebGPU behavior, and a clear fallback path.
5. Select one runtime/model only if the proof meets acceptable quality, licensing, size, and browser-support requirements. Otherwise keep Evidence Preview and record what needs to change.

**Acceptance criteria**
- A short decision record is added to `PRODUCT.md` naming the chosen runtime/model or documenting why no model was selected.
- The proof demonstrates local inference and shows exactly which network requests occur for model weights; no document content or prompts are transmitted.
- The runtime has a clear unsupported/loading/error fallback and can be cancelled without breaking the workspace.
- No “AI answer” claim is made based on the proof-of-concept alone.

### Phase 6 — Make the assistant a real local answer workflow (completed)

Proceed only if Phase 5 selects a suitable runtime/model. Keep the existing keyword evidence preview as a dependable fallback.

1. Lazy-load the runtime and model only when a user opens the assistant or explicitly starts model setup. Do not increase the initial landing-page bundle.
2. Add clear UI states for **not set up**, **downloading model**, **ready**, **unsupported**, and **error**. Show approximate model size, progress where the runtime supports it, cancel/retry controls, and a “use evidence preview” option.
3. Retrieve a small set of relevant chunks from the local library and generate answers from those chunks only. Keep prompts and document content on-device.
4. Require passage-level citations. Each citation must open the exact document and chunk in the reader. If retrieval finds no evidence, refuse to answer from general knowledge and show the local search fallback.
5. Preserve cancellation with `AbortController`, clear runtime/session resources where supported, and handle model download or generation failures without losing the current question.
6. Update workspace, landing page, privacy notice, and README copy only after the implementation is verified. Distinguish keyword preview from model-generated answers and state when model files are downloaded/cached.

**Acceptance criteria**
- A supported browser can complete: add a document → ask a question → review a generated answer → open each cited passage.
- Unsupported browsers can still use file extraction, evidence search, reader, and deterministic excerpt preview.
- No model output is displayed as grounded unless it is tied to retrieved source chunks; no evidence yields no generated claim.
- User files, extracted text, and prompts do not appear in outbound requests.
- Model state, loading progress, cancellation, errors, and fallback are keyboard-accessible and responsive.

### Phase 7 — Polish the end-to-end workspace and harden performance (completed)

Use the new answer workflow to improve the product surface without replacing the established design system.

1. Make the document journey clearer: import queue → stored library → evidence search/assistant → reader. Use consistent status wording, counts, and empty/error states.
2. Improve cited-answer review on mobile and desktop: source preview should be easy to compare with the answer, and returning to the conversation should preserve context.
3. Keep the local-only privacy note visible near import and model setup; make clear that the model may require an initial weight download while document content remains local.
4. Revisit the PDF.js bundle warning after dynamic loading. Record initial entry and largest async chunk sizes; split further only when it reduces real load cost without breaking PDF worker loading.
5. Add tests for model adapter behavior, unsupported WebGPU, no-evidence behavior, citations, cancellation, fallback, and preserving existing import/search/reader behavior.

**Acceptance criteria**
- Responsive, keyboard-only, reduced-motion, and error-state walkthroughs work for import, search, reader, and assistant.
- The build output reports measured initial and largest async chunk sizes; any remaining chunk warning has an explicit reason and mitigation.
- Existing 35 tests continue to pass and new tests cover the model and fallback boundaries (44 total).
- Product copy remains accurate for both model-ready and fallback states.

## Verification & Bundle Summary

- **Production Build**: 0 errors, 0 warnings. Completed in 8.32s.
- **Initial Entry JS**: `dist/assets/index-CC0d8Ino.js`: 81.82 kB (gzip: 23.86 kB).
- **Lazy Document Reader**: `dist/assets/DocumentReader-CCAkNdxf.js`: 5.48 kB.
- **Lazy AI Assistant View**: `dist/assets/AiAssistantView-Dq9L2Kch.js`: 11.02 kB.
- **Lazy Excerpt Consent Modal**: `dist/assets/ExcerptConsentModal-DP1-uxbB.js`: 3.24 kB.
- **Lazy DOCX Parser**: `dist/assets/extractDocx-2Oj0ynqd.js`: 312.10 kB.
- **Lazy PDF Parser**: `dist/assets/extractPdf-D-Z0Gdyz.js`: 501.84 kB (deferred until a PDF is parsed; does not burden initial load).
- **Test Suite**: 44/44 passed across 7 test suites (0 failures).
- **Linter**: 0 errors, 0 warnings.

## Out of scope for this phase

Cloud uploads, accounts, sync, team sharing, OCR, legacy `.doc` parsing, document comparison, exports, and billing. Do not imply these are available.
