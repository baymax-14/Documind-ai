/**
 * Built-in sample documents for DocuMind AI.
 * Each document contains realistic sample text split into chunks with locators
 * so users can test on-device search and reader view out-of-the-box.
 *
 * @type {import('../types/document.js').DocRecord[]}
 */
export const SEED_DOCS = [
  {
    id: 'demo-1',
    name: 'Q3 Market Research.pdf',
    type: 'PDF',
    size: 2.4 * 1024 * 1024,
    status: 'ready',
    sample: true,
    addedAt: 4,
    extractedAt: Date.now() - 3600000,
    text: `Executive Summary: Q3 Market Analysis
The enterprise document management landscape experienced a 24% year-over-year expansion during Q3. Primary growth drivers include demand for privacy-first, on-device data processing and compliance with emerging regional privacy standards.

Competitive Landscape
Competitors in the document analysis space have shifted aggressively toward cloud-hosted LLM endpoints. However, customer surveys indicate that 68% of enterprise research teams are constrained by data-retention policies that forbid transmitting proprietary research to third-party APIs.

Key Customer Segments
Academic researchers, legal compliance officers, and biotechnology teams represent the highest-intent segments. These users prioritize verifiable citation paths, source locators, and zero data leakage over conversational creative generation.

Recommendations for Q4
1. Maintain strict on-device data boundaries to differentiate from cloud RAG providers.
2. Deliver high-speed full-text indexing with paragraph and page-level citation anchors.
3. Optimize in-browser memory consumption for large multi-page reports.`,
    chunks: [
      {
        index: 0,
        page: 1,
        locator: 'Page 1',
        text: 'Executive Summary: Q3 Market Analysis. The enterprise document management landscape experienced a 24% year-over-year expansion during Q3. Primary growth drivers include demand for privacy-first, on-device data processing and compliance with emerging regional privacy standards.',
        offset: 0,
      },
      {
        index: 1,
        page: 2,
        locator: 'Page 2',
        text: 'Competitive Landscape. Competitors in the document analysis space have shifted aggressively toward cloud-hosted LLM endpoints. However, customer surveys indicate that 68% of enterprise research teams are constrained by data-retention policies that forbid transmitting proprietary research to third-party APIs.',
        offset: 278,
      },
      {
        index: 2,
        page: 3,
        locator: 'Page 3',
        text: 'Key Customer Segments. Academic researchers, legal compliance officers, and biotechnology teams represent the highest-intent segments. These users prioritize verifiable citation paths, source locators, and zero data leakage over conversational creative generation.',
        offset: 574,
      },
      {
        index: 3,
        page: 4,
        locator: 'Page 4',
        text: 'Recommendations for Q4. 1. Maintain strict on-device data boundaries to differentiate from cloud RAG providers. 2. Deliver high-speed full-text indexing with paragraph and page-level citation anchors. 3. Optimize in-browser memory consumption for large multi-page reports.',
        offset: 844,
      },
    ],
  },
  {
    id: 'demo-2',
    name: 'Product Strategy 2025.docx',
    type: 'DOCX',
    size: 856 * 1024,
    status: 'ready',
    sample: true,
    addedAt: 3,
    extractedAt: Date.now() - 3600000,
    text: `Product Vision and Principles
DocuMind AI is the local-first workbench for researchers and students. Our core thesis: document analysis software must keep users grounded in primary source evidence, not fabricated conclusions.

Architecture Milestones
Milestone 1 delivered client-side extraction for PDF, DOCX, and TXT files using Web Workers and WebAssembly. Milestone 2 introduced persistent local IndexedDB storage with zero telemetry. Milestone 3 implements deterministic full-text search with instant citation retrieval.

Interface and Usability
The interface follows the Neo-Brutalist Pastel Harmony aesthetic: high-contrast black strokes, warm cream canvas, and tactile status pills. Navigation between search results and source text must take less than two clicks.`,
    chunks: [
      {
        index: 0,
        locator: 'Paragraph 1',
        text: 'Product Vision and Principles: DocuMind AI is the local-first workbench for researchers and students. Our core thesis: document analysis software must keep users grounded in primary source evidence, not fabricated conclusions.',
        offset: 0,
      },
      {
        index: 1,
        locator: 'Paragraph 2',
        text: 'Architecture Milestones: Milestone 1 delivered client-side extraction for PDF, DOCX, and TXT files using Web Workers and WebAssembly. Milestone 2 introduced persistent local IndexedDB storage with zero telemetry. Milestone 3 implements deterministic full-text search with instant citation retrieval.',
        offset: 234,
      },
      {
        index: 2,
        locator: 'Paragraph 3',
        text: 'Interface and Usability: The interface follows the Neo-Brutalist Pastel Harmony aesthetic: high-contrast black strokes, warm cream canvas, and tactile status pills. Navigation between search results and source text must take less than two clicks.',
        offset: 541,
      },
    ],
  },
  {
    id: 'demo-3',
    name: 'Customer Interviews.pdf',
    type: 'PDF',
    size: 1.8 * 1024 * 1024,
    status: 'ready',
    sample: true,
    addedAt: 2,
    extractedAt: Date.now() - 3600000,
    text: `Participant 01 — Graduate Researcher (Biochemistry)
"When reading forty-page clinical trial reports, my biggest frustration with standard AI tools is hallucinations. If a tool cites page twelve, I need to click directly to page twelve and verify the exact dosage table with my own eyes."

Participant 02 — Corporate Legal Analyst
"We are strictly forbidden from uploading confidential merger filings to any public cloud AI provider. A tool that operates entirely inside the local browser without uploading file bytes solves our compliance blocker."

Participant 03 — Technical Documentation Lead
"I need fast keyword and phrase search that highlights matching excerpts and lets me jump into the document view seamlessly."`,
    chunks: [
      {
        index: 0,
        page: 1,
        locator: 'Page 1',
        text: 'Participant 01 — Graduate Researcher (Biochemistry): "When reading forty-page clinical trial reports, my biggest frustration with standard AI tools is hallucinations. If a tool cites page twelve, I need to click directly to page twelve and verify the exact dosage table with my own eyes."',
        offset: 0,
      },
      {
        index: 1,
        page: 2,
        locator: 'Page 2',
        text: 'Participant 02 — Corporate Legal Analyst: "We are strictly forbidden from uploading confidential merger filings to any public cloud AI provider. A tool that operates entirely inside the local browser without uploading file bytes solves our compliance blocker."',
        offset: 297,
      },
      {
        index: 2,
        page: 3,
        locator: 'Page 3',
        text: 'Participant 03 — Technical Documentation Lead: "I need fast keyword and phrase search that highlights matching excerpts and lets me jump into the document view seamlessly."',
        offset: 560,
      },
    ],
  },
  {
    id: 'demo-4',
    name: 'Brand Guidelines.pdf',
    type: 'PDF',
    size: 4.1 * 1024 * 1024,
    status: 'ready',
    sample: true,
    addedAt: 1,
    extractedAt: Date.now() - 3600000,
    text: `Visual Identity: The Paper Workbench
The DocuMind brand identity pairs the warmth of physical editorial paper with the structural clarity of a drafting desk.

Color Tokens
Canvas: Warm Cream (#FFFDF5)
Text and Border: Pitch Black (#000000)
Primary Accent: Soft Mint (#88D498)
Secondary Accent: Sky Blue (#74B9FF)
Tertiary Accent: Butter Yellow (#FFD23F)

Typography Guidelines
Headings use Space Grotesk (700 weight, -0.035em tracking). Body copy uses DM Sans (400 weight, 1.5 line height). Monospace is reserved exclusively for system tokens, code, and keyboard shortcuts.`,
    chunks: [
      {
        index: 0,
        page: 1,
        locator: 'Page 1',
        text: 'Visual Identity: The Paper Workbench. The DocuMind brand identity pairs the warmth of physical editorial paper with the structural clarity of a drafting desk.',
        offset: 0,
      },
      {
        index: 1,
        page: 2,
        locator: 'Page 2',
        text: 'Color Tokens: Canvas: Warm Cream (#FFFDF5). Text and Border: Pitch Black (#000000). Primary Accent: Soft Mint (#88D498). Secondary Accent: Sky Blue (#74B9FF). Tertiary Accent: Butter Yellow (#FFD23F).',
        offset: 161,
      },
      {
        index: 2,
        page: 3,
        locator: 'Page 3',
        text: 'Typography Guidelines: Headings use Space Grotesk (700 weight, -0.035em tracking). Body copy uses DM Sans (400 weight, 1.5 line height). Monospace is reserved exclusively for system tokens, code, and keyboard shortcuts.',
        offset: 367,
      },
    ],
  },
]

