import { searchDocuments } from './search.js'
import { denseSearch, reciprocalRankFusion } from './embeddings.js'

/** Best-match similarity required when no passage matched any keyword. */
const DENSE_ONLY_MIN_SIMILARITY = 0.5

/**
 * Retrieve candidate evidence chunks for a question from the document library.
 *
 * Keyword retrieval always runs. When a query embedding and passage vectors are
 * supplied, passages are also ranked by meaning and the two rankings are merged
 * with Reciprocal Rank Fusion, so a question can find a passage that answers it
 * in different words ("how much did sales grow" → "revenue expanded 42%").
 *
 * @param {import('../types/document.js').DocRecord[]} documents - Active library documents.
 * @param {string} question - User question.
 * @param {number} [maxChunks=3] - Maximum chunks to retrieve.
 * @param {Object} [semantic]
 * @param {Float32Array | null} [semantic.queryVector]
 * @param {(docId: string) => any} [semantic.vectorsFor]
 * @returns {{ chunks: Array<{ docId: string, docName: string, docType: string, chunkIndex: number, locator: string, page?: number, text: string, score: number }>, hasEvidence: boolean, method: 'keyword' | 'hybrid' }}
 */
export function retrieveEvidenceChunks(documents, question, maxChunks = 3, semantic = {}) {
  if (!question || question.trim().length < 2) {
    return { chunks: [], hasEvidence: false, method: 'keyword' }
  }

  // 1. Keyword ranking, with a relevance floor that filters incidental
  //    single-word hits for multi-term queries.
  const search = searchDocuments(documents, question)
  const queryWords = question.trim().split(/\s+/)
  const minScore = queryWords.length >= 4 ? 45 : 20
  const lexical = []
  const seen = new Set()
  for (const match of search.results) {
    if (match.score < minScore) continue
    const key = `${match.docId}-${match.chunkIndex}`
    if (seen.has(key)) continue
    seen.add(key)
    lexical.push({ key, match })
  }

  // 2. Meaning ranking (only when the search model is on and passages are indexed)
  const dense = semantic.queryVector
    ? denseSearch(documents, semantic.queryVector, semantic.vectorsFor).map((h) => ({
        key: `${h.docId}-${h.chunkIndex}`,
        hit: h,
      }))
    : []
  const method = dense.length > 0 || semantic.queryVector ? 'hybrid' : 'keyword'

  // With no keyword support at all, only a clearly related passage counts.
  const denseOnlyTooWeak = lexical.length === 0 && (dense[0]?.hit.similarity ?? 0) < DENSE_ONLY_MIN_SIMILARITY
  if ((lexical.length === 0 && dense.length === 0) || denseOnlyTooWeak) {
    return { chunks: [], hasEvidence: false, method }
  }

  // 3. Fuse (a single list fuses to its own order)
  const fused = reciprocalRankFusion([lexical, dense])
  const lexByKey = new Map(lexical.map((l) => [l.key, l.match]))
  const denseByKey = new Map(dense.map((d) => [d.key, d.hit]))
  const ranked = [...fused.entries()].sort((a, b) => b[1] - a[1])

  const candidateChunks = []
  for (const [key, fusedScore] of ranked) {
    const match = lexByKey.get(key)
    const hit = denseByKey.get(key)
    const docId = match?.docId ?? hit.docId
    const chunkIndex = match?.chunkIndex ?? hit.chunkIndex
    const parentDoc = documents.find((d) => d.id === docId)
    const fullChunk = parentDoc?.chunks?.find((c) => c.index === chunkIndex)
    const chunkText = fullChunk?.text || match?.snippet?.full
    if (!chunkText) continue

    candidateChunks.push({
      docId,
      docName: match?.docName ?? parentDoc?.name,
      docType: match?.docType ?? parentDoc?.type,
      chunkIndex,
      locator:
        match?.locator ||
        fullChunk?.locator ||
        (fullChunk?.page ? `Page ${fullChunk.page}` : `Section ${chunkIndex + 1}`),
      page: match?.page ?? fullChunk?.page,
      bbox: fullChunk?.bbox,
      text: chunkText,
      score: match?.score ?? 0,
      similarity: hit ? Math.round(hit.similarity * 1000) / 1000 : undefined,
      fusedScore,
      rerankScore: match?.rerankScore,
      rerankRank: match?.rerankRank,
      rankDelta: match?.rankDelta,
      rerankMethod: match && hit ? 'hybrid' : hit ? 'semantic' : 'keyword',
    })

    if (candidateChunks.length >= maxChunks) break
  }

  return {
    chunks: candidateChunks,
    hasEvidence: candidateChunks.length > 0,
    method,
  }
}

/**
 * Generate a grounded evidence preview based on retrieved document chunks.
 *
 * Pure evidence preview: Surfaces only the actual retrieved text excerpts and
 * their exact locators (page/paragraph). Does not add ungrounded claims,
 * synthetic recommendations, or simulated model hallucinations.
 *
 * @param {string} question - The user query.
 * @param {Array<{ docId: string, docName: string, docType: string, chunkIndex: number, locator: string, page?: number, text: string }>} retrievedChunks
 * @param {AbortSignal} [signal] - Optional cancellation signal.
 * @returns {Promise<{ answer: string, excerpts: Array<any>, citations: Array<any>, hasEvidence: boolean }>}
 */
export async function generateGroundedAnswer(question, retrievedChunks, signal) {
  // Check if already aborted
  if (signal?.aborted) {
    throw new DOMException('Retrieval cancelled by user.', 'AbortError')
  }

  // Yield once so a caller can still cancel before the result is built.
  await Promise.resolve()
  if (signal?.aborted) {
    throw new DOMException('Retrieval cancelled by user.', 'AbortError')
  }

  if (!retrievedChunks || retrievedChunks.length === 0) {
    return {
      answer:
        'No matching passages found in your document library for this query. Try searching for specific terms in the Evidence tab or verify that relevant documents are added to your library.',
      excerpts: [],
      citations: [],
      hasEvidence: false,
    }
  }

  // Format citations directly from retrieved chunks without synthetic claims
  const citations = retrievedChunks.map((chunk, index) => ({
    id: index + 1,
    docId: chunk.docId,
    docName: chunk.docName,
    docType: chunk.docType,
    chunkIndex: chunk.chunkIndex,
    locator: chunk.locator,
    page: chunk.page,
    text: chunk.text,
    rerankScore: chunk.rerankScore,
    rerankMethod: chunk.rerankMethod || 'keyword',
  }))

  const count = citations.length
  const intro =
    count === 1
      ? 'Found 1 relevant passage in your documents matching this query:'
      : `Found ${count} relevant passages in your documents matching this query:`

  const formattedPassages = citations
    .map(
      (c) =>
        `[${c.id}] ${c.docName} (${c.locator}):\n"${c.text.trim()}"`
    )
    .join('\n\n')

  return {
    answer: `${intro}\n\n${formattedPassages}`,
    excerpts: citations,
    citations,
    hasEvidence: true,
  }
}
