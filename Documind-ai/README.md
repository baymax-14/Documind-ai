# DocuMind AI — Local prototype

A responsive React + Vite landing page and workspace prototype for researchers and students. The interface follows the cyber-brutalist Instrument Sheet design system described in [DESIGN.md](DESIGN.md): one signal red on a light grey ground, monospace interface type and 1px frames. The home page is `/`; the workspace is `/workspace`.

## Start locally

```bash
npm install
npm run dev
```

## Available scripts

- `npm run dev` — start the Vite development server
- `npm run build` — create the production build
- `npm run preview` — preview the production build
- `npm run lint` — run ESLint

## Working in the prototype

- The front page checks your own browser live (WebGPU, free storage, whether the model is cached), compares DocuMind with cloud AI chat row by row, and plays a sample walkthrough of the workspace, with sample files marked as samples.
- Choose or drag in PDF, DOCX, and TXT files up to 25 MB each.
- Document text is extracted locally on-device using `pdfjs-dist` (for PDF), `mammoth` (for DOCX), and browser UTF-8 decoding (for TXT).
- Review files in the Import Queue and explicitly choose **Add to local library** to persist extracted records to IndexedDB in your browser.
- Stored documents and their extracted text persist across page refreshes and browser restarts.
- Delete individual documents or clear the entire stored library with confirmation.
- No file bytes or extracted text leave your browser. All storage is on-device.
- Full-text evidence search across extracted document chunks with highlighted matches and source locators (page numbers for PDF, section/paragraph locators for DOCX/TXT).
- Extracted-text Document Reader view with interactive section jumper rail, in-document search filter, and clipboard copy.
- Grounded AI Document Assistant with dual inference modes:
  - **On-Device AI Model**: In-browser local LLM (`Qwen2.5-0.5B-Instruct` via WebGPU/WebLLM) running 100% client-side. Model weights (~350 MB) download once into browser Cache API for offline inference. User documents, extracted text, and prompts never leave your device.
  - **Deterministic Evidence Preview**: Instant zero-download fallback that retrieves and presents exact source passages and page/paragraph locators when WebGPU is unavailable or model download is deferred.
  - **Strict Source Grounding**: Every generated statement or excerpt is anchored to passage-level citations linked directly into the Document Reader.
- Search documents by filename, filter by file type, sort by recent or filename, and switch between list and grid views.
- Switch between light and dark appearances.
- Sample documents are clearly marked. The workspace operates seamlessly in local-only mode (on-device WebGPU and IndexedDB) and can optionally connect to the PaperQA FastAPI + PostgreSQL + Qdrant backend service via `VITE_API_BASE_URL`. Compare documents side by side across analysis dimensions in the Compare view.

## Stack

React, Vite, Tailwind CSS v4, GSAP, Lucide React, React Router, Zustand, TanStack Query, and Motion. Fonts: Anton, Martian Mono and Source Serif 4.
