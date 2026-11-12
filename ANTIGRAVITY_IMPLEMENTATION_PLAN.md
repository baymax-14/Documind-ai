# DocuMind AI — Antigravity Implementation Plan

## Mission

Turn the current React + Vite prototype into a useful, privacy-clear document workspace in small, verifiable milestones. Start with real **on-device document extraction and evidence search**. Keep the existing landing page, workspace layout, shared brand, and Neo-Brutalist Pastel Harmony design system.

The primary users are researchers and students. Preserve honest product language: do not call a file uploaded, analyzed, saved, or answered by AI unless that specific behavior is implemented and working.

## Current state

- The app is in `Documind-ai/`; it uses React 19, Vite, React Router, Lucide, GSAP, and Tailwind CSS v4.
- Routes: `/` landing page and `/workspace` workspace.
- Workspace file selection currently stores only file names, types, and sizes in React page state. It does not read file bytes or persist between refreshes.
- Demo documents are seeded in `src/Workspace.jsx` and marked as examples.
- There is no backend, authentication, database, parser, AI provider, or citation implementation.
- The design system is documented in `Documind-ai/DESIGN.md`; product constraints are in `Documind-ai/PRODUCT.md`.
- The UI currently accepts PDF, DOC, DOCX, and TXT, but the product requirements name PDF, DOCX, and TXT. Do not advertise legacy DOC unless a parser is selected and verified.
- Existing checks: `npm run lint` and `npm run build`.

Before editing, inspect the current route/components and these two docs. Reuse the existing components and tokens; avoid replacing the working visual system.

## Recommended first release: local-first, no account

Process files in the browser and keep document content in that browser’s IndexedDB. No file bytes or extracted text should leave the device in this release. Do not add an AI API call: a browser client must never contain a provider secret, and sending document text to a remote AI requires an explicit privacy/product decision.

Add a clear local privacy notice before importing. State that chosen files are read in this browser, text is stored locally in this browser if the user adds them to the library, and users can delete individual documents or clear the local library. Do not claim encryption or guaranteed permanent storage; browser storage can be cleared or evicted.

## Milestones

### 0. Establish safe boundaries

1. Confirm the supported formats and enforce the same list in the picker, drag-and-drop handler, validation, and UI copy. Recommended v1: PDF, DOCX, TXT. Defer legacy DOC and scanned-PDF OCR.
2. Keep the existing 25 MB per-file limit unless browser-memory constraints require lowering it. Add a reasonable page/text limit and clear errors for oversized or unreadable files.
3. Add a short privacy explanation before the first import. Make it clear that local parsing reads file contents in the browser.

**Done when:** unsupported files cannot enter the library, and the user understands what local processing and local storage mean before importing.

### 1. Extract document text on-device

1. Add focused parser modules, separate from React rendering/state:
   - PDF: `pdfjs-dist`, with its worker configured correctly for Vite.
   - DOCX: `mammoth` for text extraction.
   - TXT: decode as UTF-8 with a useful error for unsupported/invalid content.
2. Use the browser File API only; do not send file bytes to a server. Process one file at a time or in a small bounded queue to avoid memory spikes.
3. Normalize extracted content into a common record. Include document ID, name, type, byte size, extraction timestamp, text, and source chunks. Store PDF page numbers; store paragraph/section offsets for DOCX/TXT rather than inventing page numbers.
4. Surface per-file states: waiting, extracting, ready, and failed. Keep errors actionable and do not label a file “analyzed.” Scanned PDFs should say OCR is not supported yet.
5. Keep parsing logic out of `Workspace.jsx`; expose typed/simple functions such as `extractDocument(file)` and keep UI state orchestration in the React layer.

**Done when:** representative PDF, DOCX, and TXT files produce readable text locally; malformed/unsupported files show recoverable errors; browser network inspection confirms document bytes are not sent anywhere.

### 2. Add explicit local library persistence

1. Use IndexedDB for extracted text and document metadata. A small wrapper such as `idb` is optional; avoid adding a state-management layer just for this feature.
2. Separate the temporary file selection queue from the persistent library. Let users review selected files and explicitly choose **Add to local library** before saving extracted content.
3. Add delete-one and clear-library actions with confirmation for clearing all data. Update library counts from actual stored records.
4. Handle quota errors, corrupt records, browser storage being unavailable, and refresh/reopen behavior. Provide a recovery path instead of silently losing data.
5. On successful persistence, use precise labels such as “Stored in this browser.” Never use “cloud,” “uploaded,” or “synced.”

**Done when:** a user can add, refresh, reopen, and delete a local document; deleting it removes its extracted text/chunks too; the app explains that browser storage is local and may be cleared by the browser.

### 3. Search and inspect evidence before AI

1. Add full-text search over the local library. Start with a small, dependable local index; do not add a vector database for this milestone.
2. Show matching snippets with their source document and a reliable locator: PDF page number, or a paragraph/section reference for DOCX/TXT.
3. Let a result open the document’s extracted-text reader at the cited passage. Make the match easy to find and keyboard reachable.
4. Use explicit empty, loading, no-match, parser-error, and missing-locator states.

**Done when:** users can search extracted text and follow every result back to a source passage. Describe this as local document search, not generated AI answers.

### 4. Add AI answers only after a privacy/API decision

This is a separate milestone. Do not start it until the product owner chooses an AI provider, a server-side architecture, retention rules, and whether document excerpts may leave the device.

Required design:

- Provider credentials stay on a server; never ship secrets in Vite environment variables or browser code.
- Explain what text is sent, to which provider, and whether it is retained. Ask for user action/consent before remote processing.
- Retrieve relevant local chunks, send only the minimum needed, and require citations to exact retrieved chunks.
- Render citations as links back to source locations. If evidence is missing, say so instead of inventing an answer.
- Show processing, failure, retry, cancellation, and rate-limit states. Do not display a fabricated answer while waiting.

**Done when:** answer citations open the exact supporting passage; unsupported claims are not presented as grounded; network/data handling matches the notice and chosen retention policy.

## Architecture guidance

Keep the app small and modular. Suggested boundaries (adapt to existing conventions after inspection):

```text
src/
  features/documents/
    components/       # import queue, library, reader, search results
    services/         # format validation, extraction, IndexedDB
    hooks/            # document state and import orchestration
    types/            # normalized document/chunk shapes, if useful
```

Avoid putting parser, IndexedDB, or future AI network code in the page component. Avoid adding a backend, authentication, cloud sync, embeddings, OCR, document comparison, or export in the first release.

## UX and accessibility requirements

- Preserve the cream `#FFFDF5`, mint `#88D498`, sky `#74B9FF`, butter `#FFD23F`, and black `#000000` system, Space Grotesk headings, DM Sans body, crisp borders, and hard offset shadows from `DESIGN.md`.
- Keep the current responsive shell and shared `Brand` component.
- All controls need labels, keyboard operation, visible focus, and status messages that do not rely on color alone.
- Respect `prefers-reduced-motion`; keep any new animation brief and nonessential.
- Keep sample documents explicitly marked as demo content and separate from users’ local documents.
- Update landing-page claims and prototype/privacy notes whenever real behavior changes. Never leave stale “not connected” claims after a feature is implemented, and never remove limitations that still apply.

## Verification checklist for each milestone

- `npm run lint`
- `npm run build`
- Manually exercise the flow at desktop and phone widths, with keyboard only and reduced motion enabled.
- Verify refresh/persistence and deletion where relevant.
- Verify local-only boundaries in browser network tools before claiming files stay on-device.
- Test representative valid, empty, malformed, encrypted/password-protected, oversized, and unsupported files. Add automated tests for parsing, validation, persistence, and citation-location mapping as those modules are introduced.

## Antigravity execution instructions

Implement **Milestone 0 and Milestone 1 only** in the first pass. Do not jump to AI answers or backend work. First inspect the current code, then make the smallest coherent changes. Keep the interface honest and update the README/product copy to match the actual behavior. At the end, report changed files, supported formats, privacy/data flow, checks run, and known limitations. Stop before Milestone 2 and summarize what product decisions or user review are needed next.
