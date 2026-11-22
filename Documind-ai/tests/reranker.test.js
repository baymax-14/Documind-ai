import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  computeCrossAttention,
  calculatePositionalProximity,
  calculateQueryCoverage,
  crossEncodeRerank,
} from '../src/features/documents/services/reranker.js'
import { searchDocuments } from '../src/features/documents/services/search.js'
import { retrieveEvidenceChunks } from '../src/features/documents/services/aiChat.js'
import { SEED_DOCS } from '../src/features/documents/data/seedDocs.js'

describe('Cross-Encoder Neural Re-Ranking Pipeline', () => {
  it('computes cross-token attention density between query and passage', () => {
    const queryTokens = ['market', 'growth', 'retention']
    const densePassage = ['the', 'market', 'experienced', 'rapid', 'growth', 'with', 'high', 'retention']
    const sparsePassage = ['the', 'market', 'expanded', 'slowly']

    const denseScore = computeCrossAttention(queryTokens, densePassage)
    const sparseScore = computeCrossAttention(queryTokens, sparsePassage)

    assert.equal(denseScore, 1.0)
    assert.ok(sparseScore < 0.4)
  })

  it('calculates positional span proximity, rewarding tightly clustered query terms', () => {
    const terms = ['market', 'growth']
    const tightCluster = 'Q3 market growth was 24% across enterprise segments.'
    const scatteredCluster =
      'The market was evaluated in early spring. Several months later, after various factors changed, revenue growth occurred.'

    const tightScore = calculatePositionalProximity(terms, tightCluster)
    const scatteredScore = calculatePositionalProximity(terms, scatteredCluster)

    assert.ok(tightScore > scatteredScore)
    assert.ok(tightScore > 0.7)
    assert.ok(scatteredScore < 0.6)
  })

  it('calculates query coverage ratio excluding trivial stop words', () => {
    const queryTokens = ['what', 'is', 'the', 'retention', 'rate']
    const fullCoverage = 'The customer retention rate was reported at 98%.'
    const partialCoverage = 'The company recorded a high retention level.'

    const fullRatio = calculateQueryCoverage(queryTokens, fullCoverage)
    const partialRatio = calculateQueryCoverage(queryTokens, partialCoverage)

    assert.equal(fullRatio, 1.0)
    assert.equal(partialRatio, 0.5)
  })

  it('re-ranks candidate passages, assigning calibrated neural scores and rank shift deltas', () => {
    const query = 'market growth retention'
    const candidates = [
      {
        id: 'chunk-distant',
        text: 'This passage mentions market trends once, and later discusses general customer retention in an appendix.',
        score: 80,
      },
      {
        id: 'chunk-clustered',
        text: 'Enterprise market growth reached +28% with a 98.2% customer retention rate in Q3.',
        score: 65,
      },
    ]

    const reranked = crossEncodeRerank(query, candidates)

    assert.equal(reranked.length, 2)
    // The tightly clustered candidate with higher density and proximity should climb to #1
    assert.equal(reranked[0].id, 'chunk-clustered')
    assert.ok(reranked[0].rerankScore > reranked[1].rerankScore)
    assert.equal(reranked[0].rerankRank, 1)
    assert.equal(reranked[0].originalRank, 2)
    assert.equal(reranked[0].rankDelta, 1) // Climbed by +1
  })

  it('integrates seamlessly with searchDocuments and retrieveEvidenceChunks', () => {
    const query = 'enterprise research retention rate'
    const searchRes = searchDocuments(SEED_DOCS, query)

    assert.ok(searchRes.totalMatches > 0)
    const topResult = searchRes.results[0]
    assert.ok(topResult.rerankScore !== undefined)
    assert.ok(topResult.rerankScore >= 0 && topResult.rerankScore <= 1.0)
    assert.equal(topResult.rerankMethod, 'cross-encoder')

    const retrieval = retrieveEvidenceChunks(SEED_DOCS, query, 3)
    assert.equal(retrieval.hasEvidence, true)
    assert.ok(retrieval.chunks[0].rerankScore !== undefined)
    assert.equal(retrieval.chunks[0].rerankMethod, 'cross-encoder')
  })

  it('handles empty candidates or invalid inputs safely without exceptions', () => {
    assert.deepEqual(crossEncodeRerank('', []), [])
    assert.deepEqual(crossEncodeRerank('test', null), [])
    assert.deepEqual(crossEncodeRerank('test', []), [])
  })
})
