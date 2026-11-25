import { getDocument } from './pdfjs.js'
import { MAX_TEXT_LENGTH } from '../types/document.js'
import { chunkRanges } from './chunker.js'
import { layoutPageText, boxForRange } from './pdfLayout.js'
import { ocrLinesToItems } from './ocr.js'

/** Canvas pixels per PDF unit when drawing a page for OCR (about 180 dpi). */
const OCR_SCALE = 2.5

/**
 * Maximum number of pages to extract. Safety limit to avoid
 * browser memory exhaustion on very large PDFs.
 */
const MAX_PAGES = 2000

/**
 * Extract text from a PDF file using pdfjs-dist.
 *
 * Reads the file as an ArrayBuffer in the browser, rebuilds each page's
 * reading text from the positioned text items, and splits each page into
 * passages of about 900 characters. Every passage carries its page number and
 * a bounding box taken from the real positions of its text on the page.
 *
 * Pages with no text layer (scanned pages) are listed in `scannedPages`. When
 * an `ocr` reader is given, those pages are drawn and their text recognised
 * instead, and are listed in `ocrPages`.
 *
 * @param {File} file
 * @param {{ ocr?: { recognize: (canvas: HTMLCanvasElement) => Promise<{ lines: any[], confidence: number|null }> }, onPage?: (info: { page: number, total: number, ocr: boolean }) => void }} [options]
 * @returns {Promise<{ text: string, chunks: import('../types/document.js').DocChunk[], pageCount: number, scannedPages: number[], ocrPages: number[] }>}
 */
export async function extractPdf(file, { ocr, onPage } = {}) {
  let buffer

  try {
    buffer = await file.arrayBuffer()
  } catch {
    throw new Error(`Could not read ${file.name}. The file may be corrupted.`)
  }

  let pdf

  try {
    pdf = await getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
    }).promise
  } catch (err) {
    if (err.name === 'PasswordException' || err.message?.includes('password')) {
      throw new Error(`${file.name} is password-protected. Encrypted PDFs are not supported yet.`)
    }
    throw new Error(`Could not open ${file.name}. The file may be corrupted or not a valid PDF.`)
  }

  if (pdf.numPages === 0) {
    throw new Error(`${file.name} has no pages.`)
  }

  if (pdf.numPages > MAX_PAGES) {
    throw new Error(
      `${file.name} has ${pdf.numPages.toLocaleString()} pages, ` +
      `which exceeds the ${MAX_PAGES.toLocaleString()}-page limit.`
    )
  }

  const chunks = []
  const textParts = []
  let totalLength = 0
  const scannedPages = []
  const ocrPages = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    let page

    try {
      page = await pdf.getPage(pageNum)
    } catch {
      // Skip unreadable pages with a warning chunk
      chunks.push({
        index: chunks.length,
        text: `[Page ${pageNum} could not be read]`,
        locator: `Page ${pageNum}`,
        page: pageNum,
        offset: totalLength,
      })
      continue
    }

    let content

    try {
      content = await page.getTextContent()
    } catch {
      chunks.push({
        index: chunks.length,
        text: `[Page ${pageNum}: text extraction failed]`,
        locator: `Page ${pageNum}`,
        page: pageNum,
        offset: totalLength,
      })
      continue
    }

    // Rebuild the page's reading text (lines, paragraphs, de-hyphenation) and
    // remember where each text item sits so passages get real page coordinates.
    const viewport = page.getViewport({ scale: 1 })
    let { text: pageText, spans } = layoutPageText(content.items)
    let recognised = false

    if (pageText.trim().length === 0) {
      if (ocr) {
        onPage?.({ page: pageNum, total: pdf.numPages, ocr: true })
        try {
          const lines = await recognisePage(page, ocr)
          ;({ text: pageText, spans } = layoutPageText(ocrLinesToItems(lines, OCR_SCALE, viewport.height)))
          recognised = pageText.trim().length > 0
          if (recognised) ocrPages.push(pageNum)
        } catch (err) {
          console.warn(`[DocuMind] Text recognition failed on page ${pageNum}:`, err)
        }
      } else {
        scannedPages.push(pageNum)
      }
    } else {
      onPage?.({ page: pageNum, total: pdf.numPages, ocr: false })
    }

    if (pageText.trim().length > 0) {
      for (const r of chunkRanges(pageText)) {
        chunks.push({
          index: chunks.length,
          text: pageText.slice(r.start, r.end),
          locator: `Page ${pageNum}`,
          page: pageNum,
          offset: totalLength + r.start,
          bbox: boxForRange(spans, r.start, r.end, viewport.width, viewport.height),
          ...(recognised ? { ocr: true } : {}),
        })
      }

      textParts.push(pageText)
      totalLength += pageText.length + 1 // +1 for newline separator
    }

    page.cleanup?.()

    // Safety check: stop if accumulated text exceeds limit
    if (totalLength > MAX_TEXT_LENGTH) {
      throw new Error(
        `${file.name} exceeds the ${(MAX_TEXT_LENGTH / 1_000_000).toFixed(0)}M character limit ` +
        `(stopped at page ${pageNum} of ${pdf.numPages}).`
      )
    }
  }

  const text = textParts.join('\n')

  // A fully scanned PDF is not an error: the import queue offers OCR for it.
  if (text.trim().length === 0 && scannedPages.length === 0) {
    throw new Error(
      ocr
        ? `No text could be recognised in ${file.name}.`
        : `${file.name} contains no extractable text.`
    )
  }

  return { text, chunks, pageCount: pdf.numPages, scannedPages, ocrPages }
}

/** Draw a page at OCR resolution and recognise its text. */
async function recognisePage(page, ocr) {
  const viewport = page.getViewport({ scale: OCR_SCALE })
  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  try {
    await page.render({ canvas, viewport }).promise
    const { lines } = await ocr.recognize(canvas)
    return lines
  } finally {
    canvas.width = 0
    canvas.height = 0
  }
}
