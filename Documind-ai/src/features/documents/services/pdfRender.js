import { getDocument } from './pdfjs.js'
import { getDocumentFile } from './storage.js'

/**
 * Draws the real pages of a saved PDF. Loaded only when the reader's Page view
 * opens a document whose original file was kept.
 */

/** docId -> Promise<PDFDocumentProxy | null> */
const open = new Map()

/**
 * Open the stored original of a document. Resolves to null when there is none.
 *
 * @param {string} docId
 */
export function openStoredPdf(docId) {
  if (!open.has(docId)) {
    const loading = (async () => {
      const blob = await getDocumentFile(docId)
      if (!blob) return null
      const data = new Uint8Array(await blob.arrayBuffer())
      return getDocument({ data, useSystemFonts: true }).promise
    })().catch((err) => {
      console.warn('[DocuMind] Could not open the original PDF:', err)
      open.delete(docId)
      return null
    })
    open.set(docId, loading)
  }
  return open.get(docId)
}

/** Free a document's memory when the reader closes. */
export async function closeStoredPdf(docId) {
  const loading = open.get(docId)
  open.delete(docId)
  const pdf = await loading
  pdf?.destroy?.()
}

/**
 * Render one page into a canvas at a given CSS width, sharp on high-density
 * screens. Returns the render task so a newer render can cancel it.
 *
 * @param {import('pdfjs-dist').PDFDocumentProxy} pdf
 * @param {number} pageNumber
 * @param {HTMLCanvasElement} canvas
 * @param {number} cssWidth
 */
export async function renderPdfPage(pdf, pageNumber, canvas, cssWidth) {
  const page = await pdf.getPage(pageNumber)
  const base = page.getViewport({ scale: 1 })
  const ratio = Math.min(window.devicePixelRatio || 1, 2)
  const viewport = page.getViewport({ scale: (cssWidth / base.width) * ratio })
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  canvas.style.aspectRatio = `${base.width} / ${base.height}`
  const task = page.render({ canvas, viewport })
  return task
}
