import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  searchDocuments,
  tokenizeQuery,
  extractSnippet,
} from '../src/features/documents/services/search.js'
import { retrieveEvidenceChunks } from '../src/features/documents/services/aiChat.js'
import { SEED_DOCS } from '../src/features/documents/data/seedDocs.js'

describe('Full-Text Search & Retrieval', () => {
  it('tokenizes queries by stripping punctuation and handling stop-words', () => {
    const rawTokens = tokenizeQuery('What is the Q3 market growth rate?')
    assert.ok(rawTokens.includes('q3'))
    assert.ok(rawTokens.includes('market'))
    assert.ok(rawTokens.includes('growth'))
    assert.ok(rawTokens.includes('rate'))

    // When filterStopWords is true, stop words are filtered out
    const filteredTokens = tokenizeQuery('What is the Q3 market growth rate?', true)
    assert.ok(filteredTokens.includes('q3'))
    assert.ok(filteredTokens.includes('market'))
    assert.ok(filteredTokens.includes('growth'))
    assert.ok(filteredTokens.includes('rate'))
    assert.ok(!filteredTokens.includes('is'))
    assert.ok(!filteredTokens.includes('the'))
  })

  it('ranks multi-term query matches by keyword density and coverage', () => {
    const testDocs = [
      {
        id: 'doc-low',
        name: 'Single Mention.txt',
        type: 'TXT',
        status: 'ready',
        chunks: [
          {
            index: 0,
            locator: 'Section 1',
            text: 'This document mentions market analysis once in passing.',
          },
        ],
      },
      {
        id: 'doc-high',
        name: 'High Relevance.txt',
        type: 'TXT',
        status: 'ready',
        chunks: [
          {
            index: 0,
            locator: 'Section 1',
            text: 'Market analysis for Q3 shows high market growth and market expansion across sectors.',
          },
        ],
      },
    ]

    const results = searchDocuments(testDocs, 'market analysis growth')
    assert.ok(results.totalMatches >= 2)
    // First result should be the doc with multiple matching terms and occurrences
    assert.equal(results.results[0].docId, 'doc-high')
    assert.ok(results.results[0].score > results.results[1].score)
  })

  it('extracts contextual snippets with prefix, match, suffix, and full segments', () => {
    const fullText =
      'Prefix context leading into the target keyword which is highlighted for evidence verification purposes.'
    const targetWord = 'highlighted'
    const matchStart = fullText.indexOf(targetWord)
    const snippet = extractSnippet(fullText, matchStart, targetWord.length, 20)

    assert.equal(snippet.match, targetWord)
    assert.ok(snippet.prefix.length > 0)
    assert.ok(snippet.suffix.length > 0)
    assert.ok(snippet.full.includes(targetWord))
  })

  it('returns zero results cleanly for non-matching queries or short inputs', () => {
    const emptyQuery = searchDocuments(SEED_DOCS, '')
    assert.equal(emptyQuery.totalMatches, 0)
    assert.equal(emptyQuery.results.length, 0)

    const singleChar = searchDocuments(SEED_DOCS, 'a')
    assert.equal(singleChar.totalMatches, 0)
    assert.equal(singleChar.results.length, 0)

    const noMatch = searchDocuments(SEED_DOCS, 'supercalifragilistic12345')
    assert.equal(noMatch.totalMatches, 0)
    assert.equal(noMatch.results.length, 0)
  })

  it('retrieves candidate chunks with exact chunkIndex and locator for citation verification', () => {
    const query = 'market analysis'
    const { chunks, hasEvidence } = retrieveEvidenceChunks(SEED_DOCS, query, 3)

    assert.equal(hasEvidence, true)
    assert.ok(chunks.length > 0 && chunks.length <= 3)

    const first = chunks[0]
    assert.ok(first.docId)
    assert.equal(typeof first.chunkIndex, 'number')
    assert.ok(first.locator)
    assert.ok(first.text)

    // Verify the retrieved chunk matches the original document chunk exactly
    const parent = SEED_DOCS.find((d) => d.id === first.docId)
    assert.ok(parent)
    const exactChunk = parent.chunks.find((c) => c.index === first.chunkIndex)
    assert.ok(exactChunk)
    assert.equal(first.text, exactChunk.text)
    assert.equal(first.locator, exactChunk.locator)
  })
})
