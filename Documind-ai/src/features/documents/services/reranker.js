/**
 * Second-stage keyword re-ranker for DocuMind AI.
 *
 * A lightweight scoring pass over first-stage keyword results: it rewards
 * passages that contain more of the query's terms (with partial stem matches),
 * where those terms sit close together, and exact phrase matches. It is a
 * heuristic, not a neural cross-encoder; meaning-based ranking comes from the
 * in-browser embeddings in embeddings.js. (Function names are kept for
 * compatibility with existing callers.)
 */

import { tokenizeQuery } from './search.js'

/**
 * Common English stop words to avoid skewing coverage ratios.
 */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'so',
  'what', 'which', 'who', 'whom', 'whose', 'when', 'where', 'why', 'how',
  'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did',
  'to', 'from', 'in', 'out', 'on', 'off', 'over', 'under',
  'for', 'at', 'by', 'with', 'about', 'of'
])

/**
 * Compute cross-token attention score between query tokens and document passage tokens.
 *
 * @param {string[]} queryTokens
 * @param {string[]} passageTokens
 * @returns {number} Normalized attention score between 0.0 and 1.0
 */
export function computeCrossAttention(queryTokens, passageTokens) {
  if (!queryTokens.length || !passageTokens.length) return 0.0

  const passageSet = new Set(passageTokens)
  let totalMatchWeight = 0.0

  for (const q of queryTokens) {
    if (passageSet.has(q)) {
      totalMatchWeight += 1.0
    } else {
      // Partial prefix/stem match
      let partialMatched = false
      for (const p of passageSet) {
        if (p.length >= 4 && q.length >= 4 && (p.startsWith(q.slice(0, 4)) || q.startsWith(p.slice(0, 4)))) {
          totalMatchWeight += 0.65
          partialMatched = true
          break
        }
      }
      if (!partialMatched && q.length >= 5) {
        // Character n-gram overlap heuristic
        for (const p of passageSet) {
          if (p.includes(q.slice(0, 3))) {
            totalMatchWeight += 0.25
            break
          }
        }
      }
    }
  }

  return Math.min(1.0, totalMatchWeight / queryTokens.length)
}

/**
 * Calculate positional span proximity between multiple query terms in a passage.
 * Rewards passages where distinct query terms cluster tightly in the same sentence/clause.
 *
 * @param {string[]} contentQueryTerms
 * @param {string} text
 * @returns {number} Normalized proximity score between 0.0 and 1.0
 */
export function calculatePositionalProximity(contentQueryTerms, text) {
  if (!contentQueryTerms.length || !text) return 0.0
  if (contentQueryTerms.length === 1) {
    // Single term: return 1.0 if found, 0 if not
    return text.toLowerCase().includes(contentQueryTerms[0]) ? 0.8 : 0.0
  }

  const lowerText = text.toLowerCase()
  const positionsByTerm = new Map()

  for (const term of contentQueryTerms) {
    const positions = []
    let idx = lowerText.indexOf(term)
    while (idx !== -1) {
      positions.push(idx)
      idx = lowerText.indexOf(term, idx + term.length)
      if (positions.length >= 5) break // Cap occurrences per term
    }
    if (positions.length > 0) {
      positionsByTerm.set(term, positions)
    }
  }

  // If fewer than 2 terms matched, proximity cannot be computed between distinct terms
  if (positionsByTerm.size < 2) {
    return positionsByTerm.size === 1 ? 0.35 : 0.0
  }

  // Find minimum span encompassing at least 2 distinct terms
  let minSpan = Infinity
  const matchedTerms = Array.from(positionsByTerm.keys())

  for (let i = 0; i < matchedTerms.length; i++) {
    for (let j = i + 1; j < matchedTerms.length; j++) {
      const posA = positionsByTerm.get(matchedTerms[i])
      const posB = positionsByTerm.get(matchedTerms[j])

      for (const a of posA) {
        for (const b of posB) {
          const span = Math.abs(a - b)
          if (span < minSpan) {
            minSpan = span
          }
        }
      }
    }
  }

  if (minSpan === Infinity) return 0.0

  // Exponential decay based on character distance:
  // Tight cluster (< 50 chars, e.g. same sentence): ~0.9 - 1.0
  // Moderate span (50 - 150 chars, same paragraph): ~0.6 - 0.8
  // Wide span (> 300 chars, distant paragraphs): < 0.3
  const proximity = Math.exp(-minSpan / 120.0)
  return Math.max(0.05, Math.min(1.0, proximity))
}

/**
 * Compute query term coverage ratio excluding stop words.
 *
 * @param {string[]} queryTokens
 * @param {string} text
 * @returns {number} Coverage ratio between 0.0 and 1.0
 */
export function calculateQueryCoverage(queryTokens, text) {
  const contentTokens = queryTokens.filter((t) => !STOP_WORDS.has(t) && t.length > 1)
  if (!contentTokens.length) return 1.0

  const lowerText = text.toLowerCase()
  let matchedCount = 0

  for (const token of contentTokens) {
    if (lowerText.includes(token)) {
      matchedCount++
    }
  }

  return matchedCount / contentTokens.length
}

/**
 * Re-ranks a list of candidate passages using Cross-Encoder joint scoring.
 *
 * @template T
 * @param {string} query - The search query or question.
 * @param {Array<T & { text: string, score?: number }>} candidates - Initial candidate results.
 * @param {Object} [options]
 * @param {number} [options.topK] - Limit returned results.
 * @param {boolean} [options.boostExactPhrase=true] - Extra boost for verbatim phrase matches.
 * @returns {Array<T & { rerankScore: number, rerankRank: number, originalRank: number, rankDelta: number, rerankMethod: string }>}
 */
export function crossEncodeRerank(query, candidates, options = {}) {
  if (!query || !candidates || !candidates.length) return []

  const trimmedQuery = query.trim().toLowerCase()
  const queryTokens = tokenizeQuery(trimmedQuery, false)
  const contentTokens = tokenizeQuery(trimmedQuery, true)
  const boostExact = options.boostExactPhrase !== false

  const scored = candidates.map((item, originalIndex) => {
    const text = item.text || item.snippet?.full || ''
    const lowerText = text.toLowerCase()
    const passageTokens = tokenizeQuery(lowerText, false)

    // 1. Joint Cross-Token Attention Density
    const crossAttn = computeCrossAttention(queryTokens, passageTokens)

    // 2. Positional Proximity of Query Terms
    const proximity = calculatePositionalProximity(contentTokens, text)

    // 3. Query Coverage Ratio
    const coverage = calculateQueryCoverage(queryTokens, text)

    // 4. Exact Phrase Bonus
    const exactMatch = boostExact && lowerText.includes(trimmedQuery) ? 1.0 : 0.0

    // 5. Initial Retriever Normalization (30% weight)
    const baseScore = typeof item.score === 'number' ? Math.min(1.0, item.score / 150.0) : 0.5

    // Calibrated Neural Score via Sigmoid transformation:
    // High coverage + close proximity + cross attention produces high confidence (0.85 - 0.99)
    const linearActivation =
      coverage * 2.4 +
      proximity * 1.6 +
      crossAttn * 1.2 +
      exactMatch * 0.8 +
      baseScore * 0.6 -
      1.5

    // Sigmoid: 1 / (1 + exp(-z))
    const sigmoidScore = 1.0 / (1.0 + Math.exp(-linearActivation))
    const rerankScore = Math.round(sigmoidScore * 1000) / 1000

    return {
      ...item,
      rerankScore,
      originalRank: originalIndex + 1,
      rerankMethod: 'term-proximity',
      crossAttentionDensity: Math.round(crossAttn * 100),
      proximityScore: Math.round(proximity * 100),
      coverageRatio: Math.round(coverage * 100),
    }
  })

  // Sort descending by neural rerankScore
  scored.sort((a, b) => b.rerankScore - a.rerankScore)

  // Calculate final ranks and rank delta (rank change compared to initial)
  const reranked = scored.map((item, newIndex) => {
    const rerankRank = newIndex + 1
    const rankDelta = item.originalRank - rerankRank // Positive means climbed up in rank
    return {
      ...item,
      rerankRank,
      rankDelta,
    }
  })

  return options.topK ? reranked.slice(0, options.topK) : reranked
}
