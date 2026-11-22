import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  extractTablesFromText,
  formatTableToMarkdown,
  formatTableToCSV,
} from '../src/features/documents/services/tableParser.js'

describe('Table Parser Service (Phase 11)', () => {
  it('extracts a pipe-delimited markdown table with headers and rows', () => {
    const text = `
Here is the performance report:

### Q3 Financial Overview
| Quarter | Growth | Retention |
| :--- | :--- | :--- |
| Q1 | 12% | 94% |
| Q2 | 18% | 95% |
| Q3 | 24% | 96% |

Additional commentary follows.
`
    const tables = extractTablesFromText(text, { page: 2 })
    assert.equal(tables.length, 1)

    const table = tables[0]
    assert.equal(table.title, 'Q3 Financial Overview')
    assert.equal(table.page, 2)
    assert.equal(table.locator, 'Page 2, Table 1')
    assert.deepEqual(table.headers, ['Quarter', 'Growth', 'Retention'])
    assert.equal(table.rowCount, 3)
    assert.equal(table.colCount, 3)

    assert.equal(table.rows[0][0], 'Q1')
    assert.equal(table.rows[2][1], '24%')

    // Verify cell coordinate indexing
    assert.equal(table.cells.length, 9)
    const cellQ3 = table.cells.find((c) => c.value === '24%')
    assert.ok(cellQ3)
    assert.equal(cellQ3.rowIndex, 2)
    assert.equal(cellQ3.colIndex, 1)
    assert.equal(cellQ3.header, 'Growth')
    assert.equal(cellQ3.rowHeader, 'Q3')
    assert.equal(cellQ3.locator, 'Page 2, Table 1 [Row: "Q3", Col: "Growth"]')
  })

  it('handles multiple tables in the same chunk with stable sequential locators', () => {
    const text = `
| Dimension | Score |
| --- | --- |
| Recall | 85% |

Second section:

| Model | Memory |
| --- | --- |
| Qwen | 350MB |
`
    const tables = extractTablesFromText(text, { parentLocator: 'Paragraph 2' })
    assert.equal(tables.length, 2)
    assert.equal(tables[0].locator, 'Paragraph 2, Table 1')
    assert.equal(tables[1].locator, 'Paragraph 2, Table 2')
  })

  it('formats DocTable object to clean Markdown table with title', () => {
    const table = {
      title: 'Benchmark Metrics',
      headers: ['Metric', 'Target', 'Actual'],
      rows: [
        ['Recall', '85%', '85.3%'],
        ['Abstention', '100%', '100%'],
      ],
    }

    const md = formatTableToMarkdown(table)
    assert.match(md, /### Benchmark Metrics/)
    assert.match(md, /\| Metric \| Target \| Actual \|/)
    assert.match(md, /\| Recall \| 85% \| 85.3% \|/)
  })

  it('formats DocTable object to RFC 4180 CSV with quotes when needed', () => {
    const table = {
      headers: ['Feature', 'Notes, Specs'],
      rows: [
        ['Search', 'Instant full-text'],
        ['Storage', 'Local, zero-cloud'],
      ],
    }

    const csv = formatTableToCSV(table)
    assert.match(csv, /"Notes, Specs"/)
    assert.match(csv, /"Local, zero-cloud"/)
  })

  it('returns empty array when text contains no tabular data', () => {
    const text = 'This is plain paragraph text without any pipe separators or tables.'
    const tables = extractTablesFromText(text)
    assert.equal(tables.length, 0)
  })

  it('tolerates empty or null input gracefully', () => {
    assert.deepEqual(extractTablesFromText(null), [])
    assert.deepEqual(extractTablesFromText(''), [])
    assert.equal(formatTableToMarkdown(null), '')
    assert.equal(formatTableToCSV(null), '')
  })
})
