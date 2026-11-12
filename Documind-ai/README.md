# DocuMind AI — Local prototype

A responsive React + Vite landing page and workspace prototype for researchers and students. The interface follows the Neo-Brutalist Pastel Harmony design system described in [DESIGN.md](DESIGN.md). The home page is `/`; the workspace is `/workspace`.

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

- The landing page shows the current workspace interface as demo content and explains which capabilities are connected.
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
- Sample documents are clearly marked. Cloud sync, external backend servers, and multi-document comparison are planned capabilities and are not connected.

## Stack

React, Vite, Tailwind CSS v4, Lucide React, React Router, Zustand, TanStack Query, and Motion.
