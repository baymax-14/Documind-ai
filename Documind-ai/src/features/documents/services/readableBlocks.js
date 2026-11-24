/**
 * Split extracted passage text into display blocks (headings, pipe tables,
 * paragraphs) for ReadableText. The text itself is never changed.
 */

const HEADING = /^#{1,6}\s+(.*)$/
const TABLE_ROW = /^\s*\|.*\|\s*$/
const TABLE_RULE = /^\s*\|(\s*:?-{3,}:?\s*\|)+\s*$/

/**
 * Split passage text into display blocks.
 *
 * @param {string} text
 * @returns {Array<{ type: 'heading' | 'table' | 'paragraph', text?: string, rows?: string[][], hasHeader?: boolean }>}
 */
export function parseReadableBlocks(text) {
  const blocks = []
  const lines = (text || '').split('\n')
  let para = []

  const flushPara = () => {
    const joined = para.join('\n').trim()
    if (joined) blocks.push({ type: 'paragraph', text: joined })
    para = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const heading = HEADING.exec(line.trim())
    if (heading) {
      flushPara()
      blocks.push({ type: 'heading', text: heading[1].trim() })
      continue
    }
    if (TABLE_ROW.test(line)) {
      flushPara()
      const rows = []
      let hasHeader = false
      while (i < lines.length && TABLE_ROW.test(lines[i])) {
        if (TABLE_RULE.test(lines[i])) {
          if (rows.length === 1) hasHeader = true
        } else {
          rows.push(lines[i].trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()))
        }
        i++
      }
      i--
      blocks.push({ type: 'table', rows, hasHeader })
      continue
    }
    if (!line.trim()) {
      flushPara()
      continue
    }
    para.push(line)
  }
  flushPara()
  return blocks
}
