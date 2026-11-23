/**
 * Page layout helpers for PDF extraction: turn positioned pdf.js text items
 * into reading text and map passages back to page coordinates.
 * Kept free of pdf.js imports so they can be unit-tested in Node.
 */

/**
 * Rebuild readable text from pdf.js text items.
 *
 * Items on the same baseline are joined with a space when there is a visible
 * gap; a new line becomes a space (with end-of-line hyphens rejoined); a large
 * vertical gap, a jump upward (new column) or a change to a larger font starts
 * a new paragraph. Each item's character range and position are recorded.
 *
 * @param {Array<any>} items - `getTextContent().items`
 * @returns {{ text: string, spans: Array<{ start: number, end: number, x: number, y: number, w: number, h: number }> }}
 */
export function layoutPageText(items) {
  const textItems = items.filter((it) => typeof it.str === 'string')
  const heights = textItems
    .filter((it) => it.str.trim())
    .map((it) => it.height || Math.hypot(it.transform?.[2] || 0, it.transform?.[3] || 0))
    .filter((h) => h > 0)
    .sort((a, b) => a - b)
  const median = heights.length ? heights[Math.floor(heights.length / 2)] : 10

  let text = ''
  const spans = []
  let prev = null
  let pendingEol = false

  for (const it of textItems) {
    if (!it.str) {
      if (it.hasEOL) pendingEol = true
      continue
    }
    const t = it.transform || [1, 0, 0, 1, 0, 0]
    const x = t[4]
    const y = t[5]
    const h = it.height || Math.hypot(t[2], t[3]) || median
    const w = it.width || 0

    if (prev) {
      const sameLine = !pendingEol && !prev.eol && Math.abs(y - prev.y) < Math.max(2, 0.5 * Math.min(h, prev.h))
      if (sameLine) {
        const gap = x - (prev.x + prev.w)
        if (gap > 0.15 * h && !/\s$/.test(text) && !/^\s/.test(it.str)) text += ' '
      } else {
        const drop = prev.y - y
        const headingChange = h > 1.25 * median || prev.h > 1.25 * median
        if (drop > 1.8 * Math.max(median, prev.h) || drop < -median || headingChange) {
          text = text.replace(/\s+$/, '') + '\n\n'
        } else if (/[a-z]-$/.test(text) && /^[a-z]/.test(it.str)) {
          text = text.slice(0, -1)
        } else if (!/\s$/.test(text)) {
          text += ' '
        }
      }
    }

    const start = text.length
    text += it.str
    spans.push({ start, end: text.length, x, y, w, h })
    prev = { x, y, w, h, eol: Boolean(it.hasEOL) }
    pendingEol = false
  }

  return { text: text.replace(/[ \t]+$/, ''), spans }
}

/**
 * Bounding box (percent of the page) covering the text items in [start, end).
 *
 * @returns {import('./visualGrounding.js').BoundingBox | undefined}
 */
export function boxForRange(spans, start, end, pageWidth, pageHeight) {
  if (!pageWidth || !pageHeight) return undefined
  let minX = Infinity
  let maxX = -Infinity
  let minTop = Infinity
  let maxBottom = -Infinity
  for (const s of spans) {
    if (s.end <= start || s.start >= end) continue
    minX = Math.min(minX, s.x)
    maxX = Math.max(maxX, s.x + s.w)
    minTop = Math.min(minTop, pageHeight - (s.y + s.h))
    maxBottom = Math.max(maxBottom, pageHeight - s.y)
  }
  if (!Number.isFinite(minX)) return undefined
  const pct = (v, total) => Math.round(Math.max(0, Math.min(100, (v / total) * 100)) * 100) / 100
  const left = pct(minX, pageWidth)
  const top = pct(minTop, pageHeight)
  return {
    top,
    left,
    width: Math.max(1, pct(maxX, pageWidth) - left),
    height: Math.max(1, pct(maxBottom, pageHeight) - top),
  }
}
