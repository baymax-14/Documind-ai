import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  generateGroundedAnswer,
  retrieveEvidenceChunks,
} from '../src/features/documents/services/aiChat.js'

describe('Document Evidence Assistant & Grounding', () => {
  const sampleChunks = [
    {
      docId: 'doc-alpha',
      docName: 'Alpha Study.pdf',
      docType: 'PDF',
      chunkIndex: 0,
      locator: 'Page 1',
      text: 'First empirical finding: user engagement increases when primary citations are verified directly on-device.',
    },
    {
      docId: 'doc-beta',
      docName: 'Beta Strategy.docx',
      docType: 'DOCX',
      chunkIndex: 2,
      locator: 'Paragraph 3',
      text: 'Second empirical finding: data retention rules strictly prevent third-party cloud uploads in healthcare.',
    },
  ]

  it('draws output strictly from retrieved passages without synthetic claims', async () => {
    const result = await generateGroundedAnswer('citations healthcare', sampleChunks)

    assert.equal(result.hasEvidence, true)
    assert.equal(result.citations.length, 2)
    assert.equal(result.excerpts.length, 2)

    // First excerpt & citation
    assert.equal(result.citations[0].id, 1)
    assert.equal(result.citations[0].docId, 'doc-alpha')
    assert.equal(result.citations[0].locator, 'Page 1')
    assert.equal(result.citations[0].text, sampleChunks[0].text)

    // Second excerpt & citation
    assert.equal(result.citations[1].id, 2)
    assert.equal(result.citations[1].docId, 'doc-beta')
    assert.equal(result.citations[1].locator, 'Paragraph 3')
    assert.equal(result.citations[1].text, sampleChunks[1].text)

    // Answer text must quote the exact retrieved chunks
    assert.ok(result.answer.includes(sampleChunks[0].text))
    assert.ok(result.answer.includes(sampleChunks[1].text))

    // Ensure answer does NOT include unsupported canned market statistics
    assert.ok(!result.answer.includes('24% year-over-year'))
    assert.ok(!result.answer.includes('68% of enterprise teams'))
  })

  it('returns explicit no-evidence response with zero citations when no passages match', async () => {
    const emptyResult = await generateGroundedAnswer('unrelated astronomical topic', [])

    assert.equal(emptyResult.hasEvidence, false)
    assert.deepEqual(emptyResult.citations, [])
    assert.deepEqual(emptyResult.excerpts, [])
    assert.match(emptyResult.answer, /No matching passages found in your document library/)
  })

  it('supports graceful cancellation via AbortSignal', async () => {
    const controller = new AbortController()
    const promise = generateGroundedAnswer('test query', sampleChunks, controller.signal)

    // Abort generation immediately
    controller.abort()

    await assert.rejects(
      async () => {
        await promise
      },
      (err) => {
        assert.equal(err.name, 'AbortError')
        assert.match(err.message, /cancelled by user/)
        return true
      }
    )
  })

  it('handles empty questions or single-character questions in retrieval cleanly', () => {
    const emptyQuery = retrieveEvidenceChunks(sampleChunks, '')
    assert.equal(emptyQuery.hasEvidence, false)
    assert.deepEqual(emptyQuery.chunks, [])

    const shortQuery = retrieveEvidenceChunks(sampleChunks, 'x')
    assert.equal(shortQuery.hasEvidence, false)
    assert.deepEqual(shortQuery.chunks, [])
  })
})

