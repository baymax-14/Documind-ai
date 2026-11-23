import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import { MAX_TEXT_LENGTH } from '../types/document.js'
import { chunkRanges } from './chunker.js'
import { layoutPageText, boxForRange } from './pdfLayout.js'

// Configure the PDF.js worker for Vite.
// Use the minified worker from the build directory via a URL import.
GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

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
 * @param {File} file
 * @returns {Promise<{ text: string, chunks: import('../types/document.js').DocChunk[] }>}
 */
export async function extractPdf(file) {
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
    const { text: pageText, spans } = layoutPageText(content.items)

    if (pageText.trim().length > 0) {
      for (const r of chunkRanges(pageText)) {
        chunks.push({
          index: chunks.length,
          text: pageText.slice(r.start, r.end),
          locator: `Page ${pageNum}`,
          page: pageNum,
          offset: totalLength + r.start,
          bbox: boxForRange(spans, r.start, r.end, viewport.width, viewport.height),
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

  if (text.trim().length === 0) {
    throw new Error(
      `${file.name} contains no extractable text. ` +
      `This may be a scanned PDF. OCR is not supported yet.`
    )
  }

  return { text, chunks }
}
