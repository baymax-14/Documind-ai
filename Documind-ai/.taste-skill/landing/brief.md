# DocuMind AI landing page brief

## Audience and action
Researchers and students need a clear way into a document workspace. The one action is opening the existing local workspace at `/workspace`.

## Idea
On this page, DocuMind’s local-only constraint becomes the visible boundary between a demo workspace and AI features that are not connected yet. The product preview is the current dashboard UI, rendered as HTML and labeled Demo. The primary live action is opening the real workspace.

## Claims and proof
- Hero: DocuMind is a document workspace; the page visibly says this prototype selects files locally and does not upload or analyze them.
- Product preview: the current dashboard has filename browsing and four seeded sample documents; show those existing names with a Demo label.
- How it works: file selection and filename browsing work in the existing workspace for this browser session; asking AI questions and reviewing citations are future steps and are plainly labeled not connected.
- Trust note: uploads, document processing, AI answers, citations, and persistence are not connected; files selected in the workspace are session-only.
- Footer: DocuMind AI, link to How it works, and Local prototype status; omit an unavailable privacy or sign-in destination.

## Copy deck
- Header links: How it works · Open your workspace
- H1: Understand your documents faster.
- Supporting copy: A workspace for research and reports. This local prototype lets you select files and browse demo examples; document analysis is not connected.
- Primary action: Open your workspace
- Secondary action: See how it works
- Product preview title: Your workspace, in demo
- Preview notice: Example documents only · No files uploaded or analyzed
- Preview files: Q3 Market Research.pdf · Product Strategy 2025.docx · Customer Interviews.pdf · Brand Guidelines.pdf (each marked Demo)
- Prototype note: This is a local prototype. Files selected in the workspace stay in that browser session; uploads, persistence, document processing, AI answers, and citations are not connected.
- How it works heading: A simple path through your research
- Step one: Add documents. Select a supported file to see its name in your current workspace session. Local selection only; the file is not uploaded or processed.
- Step two: Ask questions. Planned. AI answers are not connected yet.
- Step three: Review cited answers. Planned. Citations and source review are not connected yet.
- Footer: DocuMind AI · Local prototype · Files are not uploaded or analyzed.

## Direction and intentional redraw
- Dealt direction: The split stage, seed 827009333. Keep the sticky half-screen product view and reader's scrolling column, then break the split for a full-width How it works section.
- Keep the fixed user palette and typography. Product preview is a real DOM interface fragment (`data-ui`) based on the current dashboard, with no device frame.
- Redraw the sheet’s scaling-wordmark motion: this brand has a compact document mark rather than an oversized wordmark. Use restrained section entrances instead; keep the preview still so its sample rows remain legible.
- No found photographs or clips. The actual product UI is the image; no customer, analysis result, or service claim is invented.

## Motion thesis
- **Focal moment:** ScrambleText resolves the existing hero headline once on first load, explaining the product name's document-to-understanding idea without changing the words.
- **Continuity:** ScrollSmoother eases scroll on desktop while preserving native touch scrolling; its instance exists only on the landing route.
- **Feedback:** Existing tactile button press/hover and visible keyboard focus remain in place.
- **Budget:** One 0.9-second headline tween and GSAP's documented 0.8-second desktop catch-up; no smoothing or scramble when reduced motion is requested. The existing DOM section reveals remain gated by reduced motion.
