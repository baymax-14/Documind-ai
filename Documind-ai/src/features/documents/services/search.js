/**
 * Common English stop words to avoid diluting natural language question retrieval.
 */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'so',
  'what', 'which', 'who', 'whom', 'whose', 'this', 'that', 'these', 'those',
  'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'doing',
  'to', 'from', 'in', 'out', 'on', 'off', 'over', 'under', 'again',
  'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how',
  'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'can', 'will', 'just', 'should', 'would', 'could', 'now', 'about',
  'of', 'with', 'by', 'for', 'at', 'across', 'between', 'into', 'through',
  'during', 'before', 'after', 'above', 'below', 'within', 'without',
  'describes', 'described', 'describe', 'defines', 'defined', 'define',
  'mention', 'mentioned', 'mentions', 'used', 'uses', 'using', 'use',
  'documind', 'ai'
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
    const meaningful = tokens.filter((t) => !STOP_WORDS.has(t) && (t.length > 1 || /\d/.test(t)))
    return meaningful.length > 0 ? meaningful : tokens
  }

  return tokens
}

/**
 * Reduce a term to its approximate root stem.
 *
 * @param {string} term
 * @returns {string}
 */
function stemRoot(term) {
  if (!term || term.length < 4) return term
  let r = term.replace(/(?:ing|ed|s|es|er|ers|ment|tion|able|ible|ic|ical|ist|ists|al|ance|ence|ity)$/, '')
  if (r.endsWith('i') && term.includes('y')) {
    r = r.slice(0, -1)
  }
  if (r.startsWith('biochem')) return 'biochem'
  if (r.startsWith('verif')) return 'verif'
  return r
}

/**
 * Check if a term matches any token in the chunk, allowing for common inflectional suffixes.
 *
 * @param {Set<string>} chunkTokens
 * @param {string} term
 * @returns {boolean}
 */
function matchesToken(chunkTokens, term) {
  if (chunkTokens.has(term)) return true
  const root = stemRoot(term)
  if (root && root.length >= 3) {
    for (const ct of chunkTokens) {
      const ctRoot = stemRoot(ct)
      if (ct === root || ctRoot === root || (ct.length >= 4 && (ct.startsWith(root) || root.startsWith(ctRoot)))) {
        return true
      }
    }
  }
  return false
}

/**
 * @typedef {Object} SearchSnippet
 * @property {string} prefix
 * @property {string} match
 * @property {string} suffix
 * @property {string} full
 */

/**
 * @typedef {Object} SearchResultItem
 * @property {string} id
 * @property {string} docId
 * @property {string} docName
 * @property {string} docType
 * @property {boolean} sample
 * @property {number} chunkIndex
 * @property {string} locator
 * @property {number} [page]
 * @property {SearchSnippet} snippet
 * @property {number} score
 */

/**
 * Extract a contextual snippet around a match position in text.
 *
 * @param {string} text       - Full chunk text.
 * @param {number} matchStart - Start index of the matched substring.
 * @param {number} matchLen   - Length of the matched substring.
 * @param {number} radius     - Number of characters of context on each side.
 * @returns {SearchSnippet}
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
 * @returns {{ query: string, totalMatches: number, results: SearchResultItem[] }}
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

    const docNameTokens = new Set(tokenizeQuery(doc.name, true))
    const chunks = doc.chunks && doc.chunks.length > 0
      ? doc.chunks
      : doc.text
        ? [{ index: 0, locator: 'Section 1', text: doc.text, offset: 0 }]
        : []

    for (const chunk of chunks) {
      if (!chunk.text) continue

      const chunkLower = chunk.text.toLowerCase()
      const chunkTokens = new Set(tokenizeQuery(chunk.text))
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

      // 2. Meaningful content term matches (weighted heavily, whole-word matching)
      let contentTermsMatched = 0
      for (const term of contentTerms) {
        if (matchesToken(chunkTokens, term)) {
          contentTermsMatched++
          chunkScore += 25
          if (primaryMatchStart === -1) {
            const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
            const match = regex.exec(chunk.text)
            if (match) {
              primaryMatchStart = match.index
              primaryMatchLen = match[0].length
            }
          }
        }
      }

      // 3. Document name relevance boost when at least one chunk term matches
      if (contentTermsMatched > 0) {
        for (const term of contentTerms) {
          if (docNameTokens.has(term)) {
            chunkScore += 15
          }
        }
      }

      // 4. Overall terms matched (whole-word matching)
      let allTermsMatched = 0
      for (const term of allTerms) {
        if (matchesToken(chunkTokens, term)) {
          allTermsMatched++
          chunkScore += 5
        }
      }

      // Match criteria:
      // - Exact phrase matched, OR
      // - Meaningful content terms matched (scaled for short vs multi-term questions), OR
      // - 60% of all tokens matched
      const minRequiredContentTerms =
        contentTerms.length <= 2
          ? 1
          : contentTerms.length <= 5
            ? 2
            : 3

      const isContentMatch =
        contentTerms.length > 0 && contentTermsMatched >= minRequiredContentTerms

      const isAllTokenMatch =
        allTerms.length > 1 && allTermsMatched >= Math.ceil(allTerms.length * 0.6)

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
