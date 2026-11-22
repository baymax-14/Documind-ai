/**
 * Table Retrieval & Contradiction Detection Service for DocuMind AI (Phase 11).
 *
 * Implements fine-grained cell-level search, coordinate citations, and cross-document
 * tabular divergence detection adhering to PaperQA strict provenance guidelines.
 */
import { extractTablesFromText } from './tableParser.js'

/**
 * @typedef {Object} TableMatchResult
 * @property {string} docId
 * @property {string} docName
 * @property {import('../types/table.js').DocTable} table
 * @property {import('../types/table.js').TableCell[]} matchedCells
 * @property {number} score
 */

/**
 * Search across tables in documents for matching keywords or metrics.
 *
 * @param {import('../types/document.js').DocRecord[]} documents
 * @param {string} rawQuery
 * @returns {TableMatchResult[]}
 */
export function searchTables(documents, rawQuery) {
  const query = (rawQuery || '').trim().toLowerCase()
  if (!query || query.length < 2) return []

  const results = []

  for (const doc of documents) {
    if (!doc || doc.status !== 'ready') continue

    // Collect all tables from chunks or document text
    const tables = []

    if (doc.chunks && doc.chunks.length > 0) {
      for (const chunk of doc.chunks) {
        const chunkTables = extractTablesFromText(chunk.text, {
          page: chunk.page,
          parentLocator: chunk.locator,
        })
        tables.push(...chunkTables)
      }
    } else if (doc.text) {
      tables.push(...extractTablesFromText(doc.text))
    }

    for (const table of tables) {
      const matchedCells = []
      let score = 0

      // Match title
      if (table.title?.toLowerCase().includes(query)) {
        score += 50
      }

      // Match headers
      for (const h of table.headers) {
        if (h.toLowerCase().includes(query)) {
          score += 30
        }
      }

      // Match cells
      for (const cell of table.cells) {
        const cellLower = cell.value.toLowerCase()
        if (cellLower.includes(query) || (query.length >= 3 && query.includes(cellLower) && cellLower.length >= 3)) {
          matchedCells.push(cell)
          score += 20
        }
      }

      if (score > 0 || matchedCells.length > 0) {
        results.push({
          docId: doc.id,
          docName: doc.name,
          table,
          matchedCells,
          score,
        })
      }
    }
  }

  results.sort((a, b) => b.score - a.score)
  return results
}

/**
 * Resolve a specific cell coordinate in a table.
 *
 * @param {import('../types/table.js').DocTable} table
 * @param {string|number} rowIdentifier - Row index or row label substring
 * @param {string|number} colIdentifier - Column index or column header substring
 * @returns {import('../types/table.js').TableCell | null}
 */
export function resolveCellCoordinate(table, rowIdentifier, colIdentifier) {
  if (!table || !Array.isArray(table.cells)) return null

  // If numeric indices provided
  if (typeof rowIdentifier === 'number' && typeof colIdentifier === 'number') {
    return table.cells.find((c) => c.rowIndex === rowIdentifier && c.colIndex === colIdentifier) || null
  }

  const rowStr = String(rowIdentifier).toLowerCase()
  const colStr = String(colIdentifier).toLowerCase()

  return (
    table.cells.find((c) => {
      const rowMatches =
        typeof rowIdentifier === 'number'
          ? c.rowIndex === rowIdentifier
          : c.rowHeader?.toLowerCase().includes(rowStr) || String(c.rowIndex) === rowStr

      const colMatches =
        typeof colIdentifier === 'number'
          ? c.colIndex === colIdentifier
          : c.header.toLowerCase().includes(colStr) || String(c.colIndex) === colStr

      return rowMatches && colMatches
    }) || null
  )
}

/**
 * @typedef {Object} TableContradiction
 * @property {string} metricName - Name of the metric or row tested.
 * @property {Array<{
 *   docId: string,
 *   docName: string,
 *   tableId: string,
 *   tableTitle: string,
 *   value: string,
 *   locator: string
 * }>} variants - Conflicting or differing values from each source.
 * @property {boolean} hasContradiction - True if variants differ.
 * @property {string} synthesis - Text summary of divergence.
 */

/**
 * Detect divergence or conflicts for a metric across multiple tables.
 *
 * @param {Array<{ docId: string, docName: string, table: import('../types/table.js').DocTable }>} tableItems
 * @param {string} rowKey - Row label to compare (e.g. "Q3 Revenue" or "Growth Rate").
 * @param {string} colKey - Column to compare (e.g. "Reported" or "Value").
 * @returns {TableContradiction}
 */
export function detectTabularContradictions(tableItems, rowKey, colKey) {
  const variants = []

  for (const item of tableItems) {
    const cell = resolveCellCoordinate(item.table, rowKey, colKey)
    if (cell && cell.value) {
      variants.push({
        docId: item.docId,
        docName: item.docName,
        tableId: item.table.id,
        tableTitle: item.table.title || 'Table',
        value: cell.value.trim(),
        locator: cell.locator,
      })
    }
  }

  // Check unique normalized values
  const uniqueValues = new Set(variants.map((v) => v.value.toLowerCase().replace(/[^\w.%]/g, '')))
  const hasContradiction = uniqueValues.size > 1

  let synthesis = ''
  if (variants.length === 0) {
    synthesis = `No tables found containing metric "${rowKey}" across the selected documents.`
  } else if (!hasContradiction) {
    synthesis = `Consensus across ${variants.length} source(s): "${rowKey}" is reported as ${variants[0].value}.`
  } else {
    const descriptions = variants.map((v) => `${v.docName} reports "${v.value}" [${v.locator}]`)
    synthesis = `Divergence detected for "${rowKey}": ${descriptions.join('; ')}.`
  }

  return {
    metricName: rowKey,
    variants,
    hasContradiction,
    synthesis,
  }
}
