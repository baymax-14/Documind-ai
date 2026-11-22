/**
 * Visual Grounding & Document Geometry Service for DocuMind AI (Phase 12).
 *
 * Computes bounding boxes, visual coordinates, zoom transformations,
 * and page thumbnail representations for verifiable visual document inspection.
 */

/**
 * @typedef {Object} BoundingBox
 * @property {number} top - Top offset in percentage (0 - 100).
 * @property {number} left - Left offset in percentage (0 - 100).
 * @property {number} width - Width in percentage (0 - 100).
 * @property {number} height - Height in percentage (0 - 100).
 */

/**
 * @typedef {Object} VisualPageInfo
 * @property {number} pageNumber - 1-based page index.
 * @property {string} title - Page title or section locator.
 * @property {import('../types/document.js').DocChunk[]} chunks - Chunks belonging to this page.
 * @property {BoundingBox[]} highlightBoxes - Visual highlight overlays for cited passages.
 * @property {number} textLength - Total text character count on this page.
 */

/**
 * Normalizes a bounding box ensuring all values are bounded between 0 and 100%.
 *
 * @param {Partial<BoundingBox>} bbox
 * @returns {BoundingBox}
 */
export function normalizeBoundingBox(bbox) {
  const top = Math.max(0, Math.min(95, Number(bbox?.top) || 0))
  const left = Math.max(0, Math.min(95, Number(bbox?.left) || 0))
  const width = Math.max(2, Math.min(100 - left, Number(bbox?.width) || 84))
  const height = Math.max(2, Math.min(100 - top, Number(bbox?.height) || 12))

  return {
    top: Math.round(top * 100) / 100,
    left: Math.round(left * 100) / 100,
    width: Math.round(width * 100) / 100,
    height: Math.round(height * 100) / 100,
  }
}

/**
 * Estimate or resolve the visual bounding box for a chunk within a page.
 *
 * If the chunk already has an explicit bounding box, normalizes and returns it.
 * Otherwise, estimates the position based on the relative character offsets
 * within the page's full text.
 *
 * @param {import('../types/document.js').DocChunk} chunk
 * @param {string} [pageText=''] - Full text of the page.
 * @returns {BoundingBox}
 */
export function estimateBoundingBox(chunk, pageText = '') {
  if (!chunk) {
    return normalizeBoundingBox({ top: 10, left: 8, width: 84, height: 15 })
  }

  // If explicit bbox is already recorded
  if (chunk.bbox) {
    return normalizeBoundingBox(chunk.bbox)
  }

  const chunkText = (chunk.text || '').trim()
  const pText = (pageText || '').trim()

  if (!pText || !chunkText) {
    return normalizeBoundingBox({ top: 12, left: 8, width: 84, height: 20 })
  }

  // Find position of chunk text within page text
  const matchIndex = pText.indexOf(chunkText)
  if (matchIndex >= 0) {
    const totalChars = Math.max(1, pText.length)
    const startRatio = matchIndex / totalChars
    const lengthRatio = chunkText.length / totalChars

    // Margin tops: 8% top margin, 84% printable height
    const top = 8 + startRatio * 82
    const height = Math.max(4, Math.min(84, lengthRatio * 82))

    return normalizeBoundingBox({
      top,
      left: 8,
      width: 84,
      height,
    })
  }

  // Fallback heuristic using chunk index
  const index = Math.max(0, chunk.index || 0)
  const estimatedTop = 10 + (index % 4) * 22
  return normalizeBoundingBox({
    top: estimatedTop,
    left: 8,
    width: 84,
    height: 18,
  })
}

/**
 * Group document chunks by page number (or sequential virtual page).
 *
 * @param {import('../types/document.js').DocRecord} doc
 * @returns {VisualPageInfo[]}
 */
export function groupDocumentByPages(doc) {
  if (!doc) return []

  const chunks = doc.chunks || []
  if (chunks.length === 0 && doc.text) {
    return [
      {
        pageNumber: 1,
        title: 'Page 1',
        chunks: [{ index: 0, locator: 'Page 1', text: doc.text, offset: 0 }],
        highlightBoxes: [],
        textLength: doc.text.length,
      },
    ]
  }

  // Group chunks by page property (or chunk index if page is undefined)
  const pageMap = new Map()

  chunks.forEach((chunk) => {
    const pageNum = chunk.page || (chunk.index + 1)
    if (!pageMap.has(pageNum)) {
      pageMap.set(pageNum, [])
    }
    pageMap.get(pageNum).push(chunk)
  })

  const pages = []
  const sortedPageNums = Array.from(pageMap.keys()).sort((a, b) => a - b)

  sortedPageNums.forEach((pageNum) => {
    const pageChunks = pageMap.get(pageNum)
    const combinedText = pageChunks.map((c) => c.text).join('\n\n')
    const highlightBoxes = pageChunks.map((c) => estimateBoundingBox(c, combinedText))

    pages.push({
      pageNumber: pageNum,
      title: pageChunks[0]?.locator?.startsWith('Page')
        ? pageChunks[0].locator
        : `Page ${pageNum}`,
      chunks: pageChunks,
      highlightBoxes,
      textLength: combinedText.length,
    })
  })

  return pages
}

/**
 * Calculate scaled dimensions based on zoom factor and base container width.
 *
 * @param {number} baseWidth - Base unscaled container width in px.
 * @param {number} zoomPercent - Zoom percentage (50 to 200).
 * @returns {{ width: number, scale: number }}
 */
export function calculateZoomMetrics(baseWidth = 640, zoomPercent = 100) {
  const clampedZoom = Math.max(50, Math.min(200, zoomPercent))
  const scale = clampedZoom / 100
  return {
    width: Math.round(baseWidth * scale),
    scale,
  }
}

/**
 * Format a bounding box as a CSS inline style object.
 *
 * @param {BoundingBox} bbox
 * @returns {import('react').CSSProperties}
 */
export function bboxToStyle(bbox) {
  if (!bbox) return {}
  return {
    top: `${bbox.top}%`,
    left: `${bbox.left}%`,
    width: `${bbox.width}%`,
    height: `${bbox.height}%`,
  }
}
