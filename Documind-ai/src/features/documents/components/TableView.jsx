import { useMemo, useState } from 'react'
import {
  Check,
  Copy,
  Download,
  FileSpreadsheet,
  Search,
  Table2,
  ExternalLink,
} from 'lucide-react'
import {
  extractTablesFromText,
  formatTableToMarkdown,
  formatTableToCSV,
} from '../services/tableParser.js'
import { copyToClipboard, downloadMarkdownFile } from '../services/export.js'

/**
 * Interactive Table Matrix & Structural Intelligence Viewer.
 *
 * Displays extracted tables with cell coordinate indexing, interactive
 * locator copying, row/cell filtering, and markdown/CSV export.
 *
 * @param {Object} props
 * @param {import('../types/document.js').DocRecord} [props.document]
 * @param {import('../types/table.js').DocTable[]} [props.tables]
 * @param {(locator: string) => void} [props.onInspectCell]
 */
export default function TableView({ document: doc, tables: propTables, onInspectCell }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedCellLocator, setCopiedCellLocator] = useState(null)
  const [copiedTableId, setCopiedTableId] = useState(null)

  // Extract tables from document if not provided directly
  const tables = useMemo(() => {
    if (propTables && Array.isArray(propTables)) return propTables
    if (!doc) return []

    const extracted = []
    if (doc.chunks && doc.chunks.length > 0) {
      doc.chunks.forEach((chunk) => {
        const t = extractTablesFromText(chunk.text, {
          page: chunk.page,
          parentLocator: chunk.locator,
        })
        extracted.push(...t)
      })
    } else if (doc.text) {
      extracted.push(...extractTablesFromText(doc.text))
    }
    return extracted
  }, [doc, propTables])

  // Filter tables and rows based on search
  const filteredTables = useMemo(() => {
    if (!searchQuery.trim()) return tables
    const q = searchQuery.toLowerCase().trim()

    return tables
      .map((table) => {
        const titleMatch = table.title?.toLowerCase().includes(q)
        const headerMatch = table.headers.some((h) => h.toLowerCase().includes(q))
        const matchingRows = table.rows.filter((row) =>
          row.some((cell) => cell.toLowerCase().includes(q))
        )

        if (titleMatch || headerMatch || matchingRows.length > 0) {
          return {
            ...table,
            rows: titleMatch || headerMatch ? table.rows : matchingRows,
          }
        }
        return null
      })
      .filter(Boolean)
  }, [tables, searchQuery])

  async function handleCopyLocator(cell) {
    if (!cell?.locator) return
    const ok = await copyToClipboard(cell.locator)
    if (ok) {
      setCopiedCellLocator(cell.locator)
      setTimeout(() => setCopiedCellLocator(null), 2500)
    }
    onInspectCell?.(cell.locator)
  }

  async function handleCopyTableMarkdown(table) {
    const md = formatTableToMarkdown(table)
    const ok = await copyToClipboard(md)
    if (ok) {
      setCopiedTableId(table.id)
      setTimeout(() => setCopiedTableId(null), 2000)
    }
  }

  function handleDownloadCSV(table) {
    const csv = formatTableToCSV(table)
    const filename = `${(table.title || 'table').replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`
    downloadMarkdownFile(csv, filename, 'text/csv;charset=utf-8')
  }

  if (tables.length === 0) {
    return (
      <div className="table-empty-state">
        <div className="table-empty-icon-wrap">
          <FileSpreadsheet size={32} />
        </div>
        <h3 className="table-empty-title">No Structured Tables Detected</h3>
        <p className="table-empty-desc">
          This document does not currently contain detected markdown or pipe-delimited data tables.
          Any tables formatted with standard markdown pipes will be automatically indexed into cell coordinates here.
        </p>
      </div>
    )
  }

  return (
    <div className="table-view-container">
      {/* Table search & filter toolbar */}
      <div className="table-toolbar">
        <div className="table-search-bar">
          <Search size={15} className="table-search-icon" aria-hidden="true" />
          <input
            type="text"
            className="table-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search within tables (e.g., Enterprise, $12.4M, Q3)..."
            aria-label="Filter table cells"
          />
          {searchQuery && (
            <button
              type="button"
              className="table-search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Clear table search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="table-meta-summary">
          <span className="table-count-badge">
            <Table2 size={13} />
            {tables.length} {tables.length === 1 ? 'Table' : 'Tables'} ({tables.reduce((acc, t) => acc + t.cells.length, 0)} cells)
          </span>
        </div>
      </div>

      {copiedCellLocator && (
        <div className="table-copied-toast" role="status">
          <Check size={14} />
          <span>Copied: <strong>{copiedCellLocator}</strong></span>
        </div>
      )}

      {/* Tables list */}
      <div className="tables-scroll-list">
        {filteredTables.map((table) => (
          <div key={table.id} className="neo-table-card">
            <div className="table-card-header">
              <div className="table-title-group">
                <span className="table-icon-pill">
                  <Table2 size={15} />
                </span>
                <div>
                  <h4 className="table-title-text">{table.title}</h4>
                  <span className="table-locator-pill">{table.locator}</span>
                </div>
              </div>

              <div className="table-actions-group">
                <button
                  type="button"
                  className="secondary-button table-action-btn"
                  onClick={() => handleCopyTableMarkdown(table)}
                  title="Copy table as Markdown"
                >
                  {copiedTableId === table.id ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedTableId === table.id ? 'Copied' : 'Markdown'}</span>
                </button>
                <button
                  type="button"
                  className="secondary-button table-action-btn"
                  onClick={() => handleDownloadCSV(table)}
                  title="Download as CSV spreadsheet"
                >
                  <Download size={13} />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            {/* Table Matrix Grid */}
            <div className="table-scroll-wrapper">
              <table className="neo-matrix-table">
                <thead>
                  <tr>
                    {table.headers.map((header, colIdx) => (
                      <th key={colIdx} className="neo-matrix-th">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, rowIdx) => {
                    const rowHeader = row[0] || `Row ${rowIdx + 1}`
                    return (
                      <tr key={rowIdx} className="neo-matrix-tr">
                        {row.map((val, colIdx) => {
                          const colHeader = table.headers[colIdx] || `Col ${colIdx + 1}`
                          const cellLocator = `${table.locator} [Row: "${rowHeader}", Col: "${colHeader}"]`
                          const isCopied = copiedCellLocator === cellLocator
                          const isQueryMatch =
                            searchQuery.trim().length > 0 &&
                            val.toLowerCase().includes(searchQuery.toLowerCase().trim())

                          return (
                            <td
                              key={colIdx}
                              className={`neo-matrix-td ${isQueryMatch ? 'td-match' : ''} ${isCopied ? 'td-copied' : ''}`}
                              onClick={() =>
                                handleCopyLocator({
                                  rowIndex: rowIdx,
                                  colIndex: colIdx,
                                  value: val,
                                  header: colHeader,
                                  rowHeader,
                                  locator: cellLocator,
                                })
                              }
                              title={`Click to copy citation coordinate: ${cellLocator}`}
                            >
                              <div className="td-content">
                                <span className="td-text">{val}</span>
                                <ExternalLink size={10} className="td-copy-icon" aria-hidden="true" />
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="table-footer-hint">
              <span>Click a cell to copy where it is: page, table, row and column.</span>
              <span className="table-dims-pill">{table.rowCount} rows × {table.colCount} cols</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
