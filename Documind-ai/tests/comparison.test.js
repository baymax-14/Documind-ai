import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  compareDocuments,
  findTopChunkForDoc,
  DEFAULT_COMPARISON_DIMENSIONS,
} from '../src/features/documents/services/comparison.js'
import { SEED_DOCS } from '../src/features/documents/data/seedDocs.js'

describe('Cross-Document Comparison Service', () => {
  it('rejects comparisons with fewer than 2 documents', () => {
    const singleDocResult = compareDocuments({
      documents: SEED_DOCS,
      docIds: ['demo-1'],
    })
    assert.equal(singleDocResult.success, false)
    assert.match(singleDocResult.error, /at least 2 documents/i)

    const emptyResult = compareDocuments({
      documents: SEED_DOCS,
      docIds: [],
    })
    assert.equal(emptyResult.success, false)
  })

  it('accurately locates top-scoring chunk for a given query in a document', () => {
    const doc = SEED_DOCS.find((d) => d.id === 'demo-1')
    assert.ok(doc)

    const topChunk = findTopChunkForDoc(doc, 'privacy data-retention policies constraints')
    assert.ok(topChunk)
    assert.equal(topChunk.chunkIndex, 1)
    assert.equal(topChunk.locator, 'Page 2')
    assert.match(topChunk.text, /data-retention policies/i)
  })

  it('returns null when document has no matching tokens for query', () => {
    const doc = SEED_DOCS.find((d) => d.id === 'demo-1')
    const noMatch = findTopChunkForDoc(doc, 'astronomy astrophysics telescope galaxy')
    assert.equal(noMatch, null)
  })

  it('runs side-by-side comparison across default analytical dimensions', () => {
    const result = compareDocuments({
      documents: SEED_DOCS,
      docIds: ['demo-1', 'demo-2'],
    })

    assert.equal(result.success, true)
    assert.equal(result.documents.length, 2)
    assert.equal(result.dimensions.length, DEFAULT_COMPARISON_DIMENSIONS.length)

    // Check objectives dimension
    const objDim = result.dimensions.find((d) => d.id === 'objectives')
    assert.ok(objDim)
    assert.ok(objDim.synthesis)
    assert.equal(objDim.entries.length, 2)

    // Both documents discuss vision, goals, and core thesis
    const demo1Entry = objDim.entries.find((e) => e.docId === 'demo-1')
    const demo2Entry = objDim.entries.find((e) => e.docId === 'demo-2')
    assert.ok(demo1Entry?.hasEvidence)
    assert.ok(demo2Entry?.hasEvidence)
    assert.ok(demo1Entry.locator)
    assert.ok(demo2Entry.locator)
  })

  it('supports custom topic comparison and flags missing evidence gracefully', () => {
    const customTopic = 'clinical trial dosage biochemical protocol'
    const result = compareDocuments({
      documents: SEED_DOCS,
      docIds: ['demo-2', 'demo-3'],
      customDimension: customTopic,
    })

    assert.equal(result.success, true)
    const customDim = result.dimensions.find((d) => d.id.startsWith('custom-'))
    assert.ok(customDim)
    assert.match(customDim.label, /clinical trial dosage/i)

    // demo-3 has clinical trial researcher interview, demo-2 does not
    const demo3Entry = customDim.entries.find((e) => e.docId === 'demo-3')
    const demo2Entry = customDim.entries.find((e) => e.docId === 'demo-2')
    assert.equal(demo3Entry.hasEvidence, true)
    assert.equal(demo2Entry.hasEvidence, false)
    assert.equal(customDim.synthesis.status, 'partial')
  })
})
