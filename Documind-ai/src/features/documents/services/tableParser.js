/**
 * Table Parser Service for DocuMind AI (Phase 11).
 *
 * Extracts structured tables from markdown, text, and document chunks,
 * preserving header-to-cell alignments and assigning coordinate locators.
 */

/**
 * Split a pipe-delimited markdown row into trimmed cell strings.
 *
 * @param {string} line
 * @returns {string[]}
 */
function splitMarkdownRow(line) {
  const trimmed = line.trim()
  const content = trimmed.replace(/^\|/, '').replace(/\|$/, '')
  return content.split('|').map((c) => c.trim())
}

/**
 * Check if a line is a markdown table separator (e.g. |---|:---|---:|).
 *
 * @param {string} line
 * @returns {boolean}
 */
function isTableSeparator(line) {
  const cells = splitMarkdownRow(line)
  if (cells.length === 0) return false
  return cells.every((c) => /^:?-+:?$/.test(c.trim()))
}

/**
 * Infer a title or caption for a table from text lines immediately preceding it.
 *
 * @param {string[]} lines
 * @param {number} tableStartIndex
 * @returns {string}
 */
function inferTableTitle(lines, tableStartIndex) {
  for (let i = tableStartIndex - 1; i >= Math.max(0, tableStartIndex - 3); i--) {
    const line = lines[i]?.trim()
    if (!line) continue
    // Strip markdown heading hashes, bold asterisks
    const cleaned = line.replace(/^#{1,6}\s+/, '').replace(/^\*\*|\*\*$/g, '').trim()
    if (cleaned.length > 2 && cleaned.length < 80) {
      return cleaned
    }
  }
  return 'Table'
}

/**
 * Extract markdown/pipe-delimited tables from text.
 *
 * @param {string} text - Source chunk or document text.
 * @param {Object} [options]
 * @param {number} [options.page] - Page number if available.
 * @param {string} [options.parentLocator] - Parent chunk locator.
 * @returns {import('../types/table.js').DocTable[]}
 */
export function extractTablesFromText(text, options = {}) {
  if (!text || typeof text !== 'string') return []

  const lines = text.split(/\r?\n/)
  const tables = []
  let tableIndex = 0

  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()

    // Detect potential table header line: starts and/or contains multiple pipes
    if (line.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const startIdx = i
      const rawHeaders = splitMarkdownRow(line)
      const headers = rawHeaders.map((h, colIdx) => h || `Col ${colIdx + 1}`)

      const rows = []
      i += 2 // skip header and separator

      while (i < lines.length && lines[i].trim().includes('|') && lines[i].trim().length > 0) {
        const rowCells = splitMarkdownRow(lines[i])
        // Normalize row length to match headers
        while (rowCells.length < headers.length) {
          rowCells.push('')
        }
        rows.push(rowCells.slice(0, headers.length))
        i++
      }

      if (rows.length > 0) {
        tableIndex++
        const page = options.page
        const pagePrefix = page ? `Page ${page}` : (options.parentLocator || 'Section 1')
        const tableLocator = `${pagePrefix}, Table ${tableIndex}`
        const title = inferTableTitle(lines, startIdx)

        // Flatten into coordinate-indexed cells
        const cells = []
        rows.forEach((row, rowIdx) => {
          const rowHeader = row[0] || `Row ${rowIdx + 1}`
          row.forEach((value, colIdx) => {
            const header = headers[colIdx] || `Col ${colIdx + 1}`
            const cellLocator = `${tableLocator} [Row: "${rowHeader}", Col: "${header}"]`
            cells.push({
              rowIndex: rowIdx,
              colIndex: colIdx,
              value,
              header,
              rowHeader,
              locator: cellLocator,
            })
          })
        })

        tables.push({
          id: `table-${tableIndex}`,
          title: title === 'Table' ? `Table ${tableIndex}` : title,
          headers,
          rows,
          cells,
          page,
          locator: tableLocator,
          rowCount: rows.length,
          colCount: headers.length,
        })
      }
    } else {
      i++
    }
  }

  return tables
}

/**
 * Format a DocTable object into GitHub-flavored Markdown text.
 *
 * @param {import('../types/table.js').DocTable} table
 * @returns {string}
 */
export function formatTableToMarkdown(table) {
  if (!table || !Array.isArray(table.headers) || table.headers.length === 0) {
    return ''
  }

  const headerLine = `| ${table.headers.join(' | ')} |`
  const separatorLine = `| ${table.headers.map(() => '---').join(' | ')} |`
  const rowLines = (table.rows || []).map((row) => `| ${row.join(' | ')} |`)

  const parts = []
  if (table.title) parts.push(`### ${table.title}`)
  parts.push(headerLine, separatorLine, ...rowLines)

  return parts.join('\n')
}

/**
 * Format a DocTable object into RFC 4180 compliant CSV string.
 *
 * @param {import('../types/table.js').DocTable} table
 * @returns {string}
 */
export function formatTableToCSV(table) {
  if (!table || !Array.isArray(table.headers)) return ''

  function escapeCSV(val) {
    const s = String(val ?? '')
    if (s.includes('"') || s.includes(',') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  const lines = []
  lines.push(table.headers.map(escapeCSV).join(','))
  for (const row of table.rows || []) {
    lines.push(row.map(escapeCSV).join(','))
  }

  return lines.join('\n')
}
