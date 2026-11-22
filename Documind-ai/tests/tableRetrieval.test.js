import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  searchTables,
  resolveCellCoordinate,
  detectTabularContradictions,
} from '../src/features/documents/services/tableRetrieval.js'

describe('Table Retrieval & Contradiction Detection Service (Phase 11)', () => {
  const doc1 = {
    id: 'doc-1',
    name: 'Report A.pdf',
    status: 'ready',
    chunks: [
      {
        index: 0,
        page: 1,
        locator: 'Page 1',
        text: `
### Revenue Breakdown
| Segment | Q3 Revenue |
| :--- | :--- |
| Enterprise | $12.4M |
| Academic | $3.2M |
`,
      },
    ],
  }

  const doc2 = {
    id: 'doc-2',
    name: 'Report B.pdf',
    status: 'ready',
    chunks: [
      {
        index: 0,
        page: 2,
        locator: 'Page 2',
        text: `
### Revenue Breakdown
| Segment | Q3 Revenue |
| :--- | :--- |
| Enterprise | $14.8M |
| Academic | $3.2M |
`,
      },
    ],
  }

  it('searches tables by keyword or numerical term', () => {
    const numResults = searchTables([doc1], '$12.4M')
    assert.equal(numResults.length, 1)
    assert.equal(numResults[0].docId, 'doc-1')
    assert.equal(numResults[0].matchedCells.length, 1)
    assert.equal(numResults[0].matchedCells[0].value, '$12.4M')
    assert.equal(numResults[0].matchedCells[0].locator, 'Page 1, Table 1 [Row: "Enterprise", Col: "Q3 Revenue"]')

    const textResults = searchTables([doc1], 'Enterprise')
    assert.equal(textResults.length, 1)
    assert.equal(textResults[0].matchedCells.length, 1)
    assert.equal(textResults[0].matchedCells[0].value, 'Enterprise')
    assert.equal(textResults[0].matchedCells[0].locator, 'Page 1, Table 1 [Row: "Enterprise", Col: "Segment"]')
  })

  it('resolves cell coordinate by row and column labels', () => {
    const results = searchTables([doc1], 'Revenue')
    const table = results[0].table

    const cell = resolveCellCoordinate(table, 'Academic', 'Revenue')
    assert.ok(cell)
    assert.equal(cell.value, '$3.2M')
    assert.equal(cell.rowIndex, 1)
    assert.equal(cell.colIndex, 1)
  })

  it('detects consensus across documents when table values match', () => {
    const resA = searchTables([doc1], 'Academic')[0]
    const resB = searchTables([doc2], 'Academic')[0]

    const comp = detectTabularContradictions(
      [
        { docId: doc1.id, docName: doc1.name, table: resA.table },
        { docId: doc2.id, docName: doc2.name, table: resB.table },
      ],
      'Academic',
      'Q3 Revenue'
    )

    assert.equal(comp.hasContradiction, false)
    assert.match(comp.synthesis, /Consensus across 2 source\(s\)/)
    assert.match(comp.synthesis, /\$3\.2M/)
  })

  it('detects contradiction/divergence when table values differ and cites both sources', () => {
    const resA = searchTables([doc1], 'Enterprise')[0]
    const resB = searchTables([doc2], 'Enterprise')[0]

    const comp = detectTabularContradictions(
      [
        { docId: doc1.id, docName: doc1.name, table: resA.table },
        { docId: doc2.id, docName: doc2.name, table: resB.table },
      ],
      'Enterprise',
      'Q3 Revenue'
    )

    assert.equal(comp.hasContradiction, true)
    assert.match(comp.synthesis, /Divergence detected/i)
    assert.match(comp.synthesis, /Report A\.pdf reports "\$12\.4M"/)
    assert.match(comp.synthesis, /Report B\.pdf reports "\$14\.8M"/)
    assert.equal(comp.variants.length, 2)
  })

  it('handles search queries with no matching tables gracefully', () => {
    const results = searchTables([doc1], 'Cryptocurrency')
    assert.deepEqual(results, [])
  })
})
