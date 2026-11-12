# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Researchers and students are the primary audience, working with complex documents they need to understand and retrieve information from. Business, legal, and finance teams are also intended audiences.

## Product Purpose

DocuMind AI aims to help people understand, analyze, compare, and extract information from complex documents, with answers grounded in document evidence.

## Positioning

The intended product is an AI document workspace combining semantic search, document chat, summaries, comparisons, and structured extraction. The differentiation beyond that capability set is not specified in the PRD.

## Operating Context

The current React + Vite project is a dashboard prototype. It supports local file selection and drag-and-drop, in-memory sample documents, filename search, grid/list display, and a light/dark toggle. Selected files are only represented in page state; they are not uploaded, parsed, persisted, or analyzed.

## Capabilities and Constraints

The PRD describes planned document parsing, RAG-based chat, page citations, comparison, reports, exports, and account/settings flows. These are product goals, not working capabilities in the current frontend. Preserve the React + Vite architecture and avoid implying that planned backend or AI behavior is implemented. Supported upload targets in the PRD are PDF, DOCX, and TXT; the current starter has no server integration.

## Brand Commitments

Product name: DocuMind AI. The user requests a Neo-Brutalist Pastel Harmony palette: warm cream (#FFFDF5 or #FBF7EE), soft mint (#88D498), sky blue (#74B9FF), butter yellow (#FFD23F), and black (#000000) for text and structure. Keep long-form document reading calm and legible, with stronger expression on dashboard and marketing surfaces.

## Evidence on Hand

The supplied PRD is at `C:\Users\USER\Downloads\DocuMind_AI_Updated_PRD_Neobrutalism.docx`. The repository README identifies sample documents and workspace metrics as prototype/mock content. Do not present them as verified user data or product performance.

## Product Principles

- Keep answers and insights grounded in document evidence.
- State clearly when content is unavailable or a capability is not implemented.
- Make document upload and understanding straightforward.
- Keep document reading accessible and low-distraction.

## AI Architecture Decision & Phase 5 Technical Evaluation

- **Selected Path**: **On-Device Model (Local WebGPU / In-Browser Inference)**.
- **Runtime Selected**: **WebLLM (`@mlc-ai/web-llm`)** utilizing Apache TVM WebGPU compilation.
- **Evaluated & Selected Model**:
  - Primary: `Qwen2.5-0.5B-Instruct-q4f32_1-MLC` (~350 MB download, ~800 MB VRAM, Apache 2.0 license). Proven accurate instruction following and excerpt synthesis.
  - Lightweight alternative: `SmolLM2-360M-Instruct-q4f32_1-MLC` (~230 MB download, ~600 MB VRAM, Apache 2.0 license).
- **Network Boundaries & Weight Caching**:
  - Model weights are downloaded only upon explicit user action from verified HuggingFace CDN endpoints and cached persistently via the browser's Cache API (`webllm/model`).
  - Subsequent runs operate 100% offline without network calls.
  - **Zero user data transmission**: Document files, extracted passages, and user queries never leave the browser runtime.
- **Graceful Fallback Mode**: When WebGPU hardware acceleration is unavailable, when model download is declined, or during download/loading states, DocuMind AI seamlessly falls back to the deterministic local Evidence Preview mode.
- **Grounding Standards**: Strict requirement for passage-level citations linking directly to exact document locators (`Page X`, `Section Y`), explicit no-evidence responses when no matching chunks are found, and instant cancellation support via `AbortController`.

## Accessibility & Inclusion

The PRD requires readable contrast, scalable text, keyboard navigation, visible focus, semantic markup, accessible control names, status communication beyond color alone, responsive layouts, and reduced-motion support.
