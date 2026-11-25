import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'

// One place configures the PDF.js worker for Vite, for both text extraction
// and page rendering.
GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export { getDocument }
