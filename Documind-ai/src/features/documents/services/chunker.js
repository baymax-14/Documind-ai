/**
 * Passage chunker shared by the PDF, DOCX and TXT extractors.
 *
 * Retrieval and the on-device model both work best on passages of a few
 * paragraphs: big enough to hold a complete thought, small enough that several
 * fit in the model's context window. The chunker packs paragraphs into passages
 * of about TARGET_CHARS, splits over-long paragraphs at sentence ends, starts a
 * new passage at headings, and repeats the last short unit of each passage at
 * the start of the next so a fact on a boundary is never lost.
 *
 * It returns character ranges, so every passage is an exact, contiguous slice
 * of the source text (offsets stay verifiable).
 */

export const TARGET_CHARS = 900
export const MAX_CHARS = 1400
const MIN_CHARS = 250
const MAX_OVERLAP_CHARS = 280

/**
 * Heuristic: a short line without a closing full stop that looks like a heading.
 *
 * @param {string} s
 * @returns {boolean}
 */
export function looksLikeHeading(s) {
  const t = s.trim()
  if (t.length < 3 || t.length > 90 || t.includes('\n')) return false
  if (/[.!?,;:]$/.test(t)) return false
  if (/^(#{1,6}\s|\d+(\.\d+)*\.?\s+[A-Z]|[IVX]+\.\s|chapter\s|section\s|appendix\s)/i.test(t)) return true
  const words = t.split(/\s+/)
  if (words.length > 12) return false
  const capitalised = words.filter((w) => /^[A-Z0-9]/.test(w)).length
  return capitalised / words.length >= 0.6
}

/**
 * Split [start, end) of `text` into sentence ranges no longer than `max`.
 */
function splitLongRange(text, start, end, max) {
  const ranges = []
  const re = /[.!?]["')\]]?\s+(?=[A-Z0-9"'(])/g
  re.lastIndex = start
  let segStart = start
  let lastBreak = -1
  let m
  while ((m = re.exec(text)) && m.index < end) {
    const breakAt = m.index + m[0].length
    if (breakAt - segStart > max && lastBreak > segStart) {
      ranges.push([segStart, lastBreak])
      segStart = lastBreak
    }
    lastBreak = breakAt
  }
  // Hard-split anything still too long (no sentence punctuation).
  while (end - segStart > max) {
    let cut = text.lastIndexOf(' ', segStart + max)
    if (cut <= segStart + MIN_CHARS) cut = segStart + max
    ranges.push([segStart, cut])
    segStart = cut
  }
  if (end > segStart) ranges.push([segStart, end])
  return ranges.map(([s, e]) => trimRange(text, s, e)).filter(([s, e]) => e > s)
}

function trimRange(text, s, e) {
  while (s < e && /\s/.test(text[s])) s++
  while (e > s && /\s/.test(text[e - 1])) e--
  return [s, e]
}

/**
 * Find paragraph units in `text`.
 *
 * @param {string} text
 * @param {RegExp} separator - Paragraph separator (blank lines by default).
 * @returns {Array<[number, number]>}
 */
function findUnits(text, separator, max) {
  const units = []
  const re = new RegExp(separator.source, 'g')
  let pos = 0
  let m
  const push = (s, e) => {
    const [ts, te] = trimRange(text, s, e)
    if (te <= ts) return
    if (te - ts > max) units.push(...splitLongRange(text, ts, te, max))
    else units.push([ts, te])
  }
  while ((m = re.exec(text))) {
    push(pos, m.index)
    pos = m.index + m[0].length
    if (m[0].length === 0) re.lastIndex++
  }
  push(pos, text.length)
  return units
}

/**
 * Chunk text into passage ranges.
 *
 * @param {string} text
 * @param {Object} [opts]
 * @param {RegExp} [opts.separator=/\n\s*\n/] - Paragraph separator.
 * @param {number} [opts.target=TARGET_CHARS]
 * @param {number} [opts.max=MAX_CHARS]
 * @param {boolean} [opts.overlap=true]
 * @returns {Array<{ start: number, end: number }>}
 */
export function chunkRanges(text, opts = {}) {
  const { separator = /\n\s*\n/, target = TARGET_CHARS, max = MAX_CHARS, overlap = true } = opts
  if (!text || !text.trim()) return []

  const units = findUnits(text, separator, max)
  const chunks = []
  let cur = []

  const flush = () => {
    if (cur.length === 0) return
    chunks.push({ start: cur[0][0], end: cur[cur.length - 1][1] })
    const last = cur[cur.length - 1]
    // Carry the last short unit into the next passage as overlap (not headings).
    cur = overlap && cur.length > 1 && last[1] - last[0] <= MAX_OVERLAP_CHARS &&
      !looksLikeHeading(text.slice(last[0], last[1]))
      ? [last]
      : []
  }

  for (const unit of units) {
    const curLen = cur.length ? cur[cur.length - 1][1] - cur[0][0] : 0
    const unitLen = unit[1] - unit[0]
    const isHeading = looksLikeHeading(text.slice(unit[0], unit[1]))
    const onlyOverlap = cur.length === 1 && chunks.length > 0 && cur[0][1] <= chunks[chunks.length - 1].end

    if (cur.length && !onlyOverlap && (
      (isHeading && curLen >= MIN_CHARS) ||
      (curLen + unitLen > target && curLen >= MIN_CHARS) ||
      curLen + unitLen > max
    )) {
      flush()
    }
    if (isHeading && cur.length === 1 && cur[0][1] <= (chunks[chunks.length - 1]?.end ?? -1)) {
      // Don't let overlap text sit in front of a new heading.
      cur = []
    }
    cur.push(unit)
  }

  // Final passage: drop it if it is only the overlap carried from the previous one.
  if (cur.length) {
    const prevEnd = chunks.length ? chunks[chunks.length - 1].end : -1
    if (!(cur.length === 1 && cur[0][1] <= prevEnd)) {
      chunks.push({ start: cur[0][0], end: cur[cur.length - 1][1] })
    }
  }

  // Fold a tiny trailing passage into the one before it when that stays in bounds.
  if (chunks.length >= 2) {
    const last = chunks[chunks.length - 1]
    const prev = chunks[chunks.length - 2]
    if (last.end - last.start < MIN_CHARS && last.end - prev.start <= max * 1.15) {
      prev.end = last.end
      chunks.pop()
    }
  }

  return chunks
}

/**
 * Find the nearest heading at or before `offset` in `text`, for locators.
 *
 * @param {string} text
 * @param {number} offset
 * @returns {string | null}
 */
export function headingBefore(text, offset) {
  // Look back from the passage, including only its own first line (a passage
  // may begin with its heading), never further into it
  const lineEnd = text.indexOf('\n', offset)
  const before = text.slice(Math.max(0, offset - 4000), lineEnd === -1 ? text.length : lineEnd)
  const lines = before.split('\n').map((l) => l.trim()).filter(Boolean)
  for (let i = lines.length - 1; i >= 0; i--) {
    if (looksLikeHeading(lines[i])) return lines[i].replace(/^#{1,6}\s*/, '').slice(0, 60)
  }
  return null
}
