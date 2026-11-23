/**
 * Semantic (meaning-based) retrieval helpers.
 *
 * Passages are embedded on the user's device with a small sentence-embedding
 * model (BGE small, ~34 MB, run by transformers.js in a Web Worker). Only the
 * model weights are downloaded; document text and questions never leave the
 * browser. This module holds the pure parts (vector math, dense search and rank
 * fusion) so they can be tested in Node without the model.
 */

export const EMBEDDING_MODEL = 'Xenova/bge-small-en-v1.5'
export const EMBEDDING_DIM = 384
export const EMBEDDING_SIZE_DISPLAY = '~34 MB'
/** BGE models expect this instruction in front of search queries (not passages). */
export const QUERY_PREFIX = 'Represent this sentence for searching relevant passages: '

/**
 * Minimum cosine similarity for a passage found only by meaning (no keyword
 * match) to count as evidence. Measured on bge-small: related question/passage
 * pairs score ~0.48–0.6, unrelated ones ~0.2–0.4.
 */
export const MIN_DENSE_SIMILARITY = 0.45
/** Dense candidates must also be within this distance of the best match. */
const DENSE_RELATIVE_WINDOW = 0.12
/** Reciprocal Rank Fusion constant. */
const RRF_K = 60

/**
 * Text that is embedded for a chunk: its heading (when known) gives the model
 * context the passage itself may lack.
 *
 * @param {{ text: string, heading?: string }} chunk
 * @returns {string}
 */
export function passageEmbeddingText(chunk) {
  return chunk.heading ? `${chunk.heading}\n${chunk.text}` : chunk.text
}

/**
 * Dot product of a normalised query vector with row `row` of a packed matrix.
 *
 * @param {Float32Array} query
 * @param {Float32Array} matrix - Rows of `dim` floats, already normalised.
 * @param {number} row
 * @param {number} dim
 * @returns {number}
 */
export function cosineAt(query, matrix, row, dim) {
  let s = 0
  const base = row * dim
  for (let k = 0; k < dim; k++) s += query[k] * matrix[base + k]
  return s
}

/**
 * Rank every embedded chunk in the library by similarity to the query.
 *
 * @param {Array<any>} documents
 * @param {Float32Array} queryVector
 * @param {(docId: string) => ({ model: string, dim: number, data: Float32Array, count: number } | null | undefined)} vectorsFor
 * @param {{ limit?: number, minSimilarity?: number }} [opts]
 * @returns {Array<{ docId: string, chunkIndex: number, similarity: number }>}
 */
export function denseSearch(documents, queryVector, vectorsFor, opts = {}) {
  const { limit = 20, minSimilarity = MIN_DENSE_SIMILARITY } = opts
  if (!queryVector || typeof vectorsFor !== 'function') return []

  const hits = []
  for (const doc of documents) {
    if (!doc || doc.status !== 'ready' || !doc.chunks?.length) continue
    const vecs = vectorsFor(doc.id)
    if (!vecs || vecs.model !== EMBEDDING_MODEL || vecs.count !== doc.chunks.length) continue
    for (let i = 0; i < vecs.count; i++) {
      const similarity = cosineAt(queryVector, vecs.data, i, vecs.dim)
      if (similarity >= minSimilarity) {
        hits.push({ docId: doc.id, chunkIndex: doc.chunks[i].index, similarity })
      }
    }
  }
  hits.sort((a, b) => b.similarity - a.similarity)
  if (hits.length === 0) return []
  const floor = hits[0].similarity - DENSE_RELATIVE_WINDOW
  return hits.filter((h) => h.similarity >= floor).slice(0, limit)
}

/**
 * Merge ranked lists with Reciprocal Rank Fusion.
 *
 * @param {Array<Array<{ key: string }>>} lists - Each list best-first.
 * @returns {Map<string, number>} key → fused score
 */
export function reciprocalRankFusion(lists) {
  const scores = new Map()
  for (const list of lists) {
    list.forEach((item, rank) => {
      scores.set(item.key, (scores.get(item.key) || 0) + 1 / (RRF_K + rank + 1))
    })
  }
  return scores
}
