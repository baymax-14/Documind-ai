/**
 * Text recognition (OCR) for scanned PDF pages, run in this browser with
 * Tesseract. The engine and the English model are served by this site
 * (see vite.ocrAssets.js), so a scanned page never leaves the device.
 */

/** Rough first-use download, for the button that asks for it. */
export const OCR_DOWNLOAD_LABEL = '~7 MB'

/**
 * Turn Tesseract lines into pdf.js-style text items, in PDF units, so that
 * `layoutPageText` and `boxForRange` treat a recognised page exactly like a
 * page with real text (same line rebuilding, passages and highlight boxes).
 *
 * Every word on a line shares the line's baseline and height, so the line is
 * read as one line; the last word ends the line.
 *
 * @param {Array<{ bbox: {x0:number,y0:number,x1:number,y1:number}, words: Array<{ text: string, bbox: {x0:number,y0:number,x1:number,y1:number} }> }>} lines
 * @param {number} scale - Canvas pixels per PDF unit used when drawing the page.
 * @param {number} pageHeight - Page height in PDF units.
 * @returns {Array<{ str: string, transform: number[], width: number, height: number, hasEOL: boolean }>}
 */
export function ocrLinesToItems(lines, scale, pageHeight) {
  const items = []
  for (const line of lines || []) {
    const words = (line.words || []).filter((w) => w.text && w.text.trim())
    if (words.length === 0) continue
    const lineBox = line.bbox || words[0].bbox
    const height = Math.max(1, (lineBox.y1 - lineBox.y0) / scale)
    const baseline = pageHeight - lineBox.y1 / scale
    words.forEach((word, i) => {
      items.push({
        str: word.text.trim(),
        transform: [1, 0, 0, 1, word.bbox.x0 / scale, baseline],
        width: Math.max(0, (word.bbox.x1 - word.bbox.x0) / scale),
        height,
        hasEOL: i === words.length - 1,
      })
    })
  }
  return items
}

/** All lines of a Tesseract result, in reading order. */
export function linesOf(result) {
  const lines = []
  for (const block of result?.data?.blocks || []) {
    for (const paragraph of block.paragraphs || []) {
      for (const line of paragraph.lines || []) lines.push(line)
    }
  }
  return lines
}

/**
 * Start a recognition worker. Call `terminate()` when done.
 *
 * @param {(fraction: number) => void} [onModelProgress] - Download/initialise progress, 0–1.
 */
export async function createOcrReader(onModelProgress) {
  const { createWorker } = await import('tesseract.js')
  const base = new URL(import.meta.env?.BASE_URL || '/', window.location.href)
  const worker = await createWorker('eng', 1, {
    workerPath: new URL('ocr/worker.min.js', base).href,
    corePath: new URL('ocr/core', base).href,
    langPath: new URL('ocr/lang', base).href,
    gzip: true,
    logger: (m) => {
      if (m.status !== 'recognizing text' && typeof m.progress === 'number') onModelProgress?.(m.progress)
    },
  })
  return {
    /** Recognise one rendered page; resolves to its lines and mean confidence (0–100). */
    async recognize(canvas) {
      const result = await worker.recognize(canvas, {}, { blocks: true, text: false })
      return { lines: linesOf(result), confidence: result?.data?.confidence ?? null }
    },
    terminate: () => worker.terminate(),
  }
}
