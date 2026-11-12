/**
 * Common English stop words to avoid diluting natural language question retrieval.
 */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'so',
  'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
  'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did',
  'to', 'from', 'in', 'out', 'on', 'off', 'over', 'under', 'again',
  'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how',
  'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'can', 'will', 'just', 'should', 'now', 'about'
])

/**
 * Clean and tokenize a search query into normalized search terms.
 * Strips punctuation and returns clean tokens.
 *
 * @param {string} query
 * @param {boolean} [filterStopWords=false]
 * @returns {string[]}
 */
export function tokenizeQuery(query, filterStopWords = false) {
  if (!query || typeof query !== 'string') return []
  const tokens = query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0)

  if (filterStopWords) {
    const meaningful = tokens.filter((t) => !STOP_WORDS.has(t) && t.length > 1)
    return meaningful.length > 0 ? meaningful : tokens
  }

  return tokens
}

/**
 * Extract a contextual snippet around a match position in text.
 *
 * @param {string} text       - Full chunk text.
 * @param {number} matchStart - Start index of the matched substring.
 * @param {number} matchLen   - Length of the matched substring.
 * @param {number} radius     - Number of characters of context on each side.
 * @returns {import('./search.js').SearchSnippet}
 */
export function extractSnippet(text, matchStart, matchLen, radius = 60) {
  const start = Math.max(0, matchStart - radius)
  const end = Math.min(text.length, matchStart + matchLen + radius)

  const prefix = (start > 0 ? '…' : '') + text.slice(start, matchStart)
  const match = text.slice(matchStart, matchStart + matchLen)
  const suffix = text.slice(matchStart + matchLen, end) + (end < text.length ? '…' : '')

  return {
    prefix,
    match,
    suffix,
    full: prefix + match + suffix,
  }
}

/**
 * Search across a collection of documents and their extracted chunks.
 * Handles both keyword matching and natural language question retrieval.
 *
 * @param {import('../types/document.js').DocRecord[]} documents - Documents to search.
 * @param {string} rawQuery - Search string.
 * @returns {{ query: string, totalMatches: number, results: import('./search.js').SearchResultItem[] }}
 */
export function searchDocuments(documents, rawQuery) {
  const query = (rawQuery || '').trim()
  if (query.length < 2) {
    return { query, totalMatches: 0, results: [] }
  }

  const allTerms = tokenizeQuery(query, false)
  const contentTerms = tokenizeQuery(query, true)
  if (allTerms.length === 0) {
    return { query, totalMatches: 0, results: [] }
  }

  const lowerQuery = query.toLowerCase()
  const results = []

  for (const doc of documents) {
    if (!doc || doc.status !== 'ready') continue

    const chunks = doc.chunks && doc.chunks.length > 0
      ? doc.chunks
      : doc.text
        ? [{ index: 0, locator: 'Section 1', text: doc.text, offset: 0 }]
        : []

    for (const chunk of chunks) {
      if (!chunk.text) continue

      const chunkLower = chunk.text.toLowerCase()
      let chunkScore = 0
      let primaryMatchStart = -1
      let primaryMatchLen = 0

      // 1. Exact phrase match bonus
      const exactIndex = chunkLower.indexOf(lowerQuery)
      if (exactIndex !== -1) {
        chunkScore += 120
        primaryMatchStart = exactIndex
        primaryMatchLen = query.length
      }

      // 2. Meaningful content term matches (weighted heavily)
      let contentTermsMatched = 0
      for (const term of contentTerms) {
        const termIndex = chunkLower.indexOf(term)
        if (termIndex !== -1) {
          contentTermsMatched++
          chunkScore += 25
          if (primaryMatchStart === -1) {
            primaryMatchStart = termIndex
            primaryMatchLen = term.length
          }
        }
      }

      // 3. Overall terms matched
      let allTermsMatched = 0
      for (const term of allTerms) {
        if (chunkLower.includes(term)) {
          allTermsMatched++
          chunkScore += 5
        }
      }

      // Match criteria:
      // - Exact phrase matched, OR
      // - At least half of meaningful content terms matched, OR
      // - 70% of all tokens matched
      const isContentMatch =
        contentTerms.length > 0 &&
        (contentTermsMatched === contentTerms.length ||
         contentTermsMatched >= Math.max(1, Math.ceil(contentTerms.length * 0.5)))

      const isAllTokenMatch =
        allTerms.length > 1 && allTermsMatched >= Math.ceil(allTerms.length * 0.7)

      if (exactIndex !== -1 || isContentMatch || isAllTokenMatch) {
        const locator =
          chunk.locator ||
          (chunk.page ? `Page ${chunk.page}` : `Section ${chunk.index + 1}`)
        const snippet = extractSnippet(
          chunk.text,
          primaryMatchStart >= 0 ? primaryMatchStart : 0,
          primaryMatchLen > 0 ? primaryMatchLen : 10
        )

        results.push({
          id: `${doc.id}-${chunk.index}`,
          docId: doc.id,
          docName: doc.name,
          docType: doc.type,
          sample: Boolean(doc.sample),
          chunkIndex: chunk.index,
          locator,
          page: chunk.page,
          snippet,
          score: chunkScore,
        })
      }
    }
  }

  // Sort by highest score first
  results.sort((a, b) => b.score - a.score)

  return {
    query,
    totalMatches: results.length,
    results,
  }
}
