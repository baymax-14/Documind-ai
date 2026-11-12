import { searchDocuments } from './search.js'

/**
 * Retrieve candidate evidence chunks for a question from the document library.
 *
 * @param {import('../types/document.js').DocRecord[]} documents - Active library documents.
 * @param {string} question - User question.
 * @param {number} [maxChunks=3] - Maximum chunks to retrieve.
 * @returns {{ chunks: Array<{ docId: string, docName: string, docType: string, chunkIndex: number, locator: string, page?: number, text: string, score: number }>, hasEvidence: boolean }}
 */
export function retrieveEvidenceChunks(documents, question, maxChunks = 3) {
  if (!question || question.trim().length < 2) {
    return { chunks: [], hasEvidence: false }
  }

  const search = searchDocuments(documents, question)
  if (search.totalMatches === 0) {
    return { chunks: [], hasEvidence: false }
  }

  // Group top matches by unique chunk
  const seen = new Set()
  const candidateChunks = []

  for (const match of search.results) {
    const key = `${match.docId}-${match.chunkIndex}`
    if (seen.has(key)) continue
    seen.add(key)

    const parentDoc = documents.find((d) => d.id === match.docId)
    const fullChunk = parentDoc?.chunks?.find((c) => c.index === match.chunkIndex)
    const chunkText = fullChunk?.text || match.snippet.full

    candidateChunks.push({
      docId: match.docId,
      docName: match.docName,
      docType: match.docType,
      chunkIndex: match.chunkIndex,
      locator: match.locator,
      page: match.page,
      text: chunkText,
      score: match.score,
    })

    if (candidateChunks.length >= maxChunks) break
  }

  return {
    chunks: candidateChunks,
    hasEvidence: candidateChunks.length > 0,
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

  // Simulate local retrieval latency (400ms) with cancellation support
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, 400)
    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timeout)
        reject(new DOMException('Retrieval cancelled by user.', 'AbortError'))
      })
    }
  })

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
