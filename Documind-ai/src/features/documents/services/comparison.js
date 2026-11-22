import { tokenizeQuery } from './search.js'

/**
 * Standard analytical dimensions for cross-document comparison.
 */
export const DEFAULT_COMPARISON_DIMENSIONS = [
  {
    id: 'objectives',
    label: 'Core Objectives & Vision',
    query: 'objectives vision thesis goal purpose expansion growth landscape primary grounded',
    description: 'Compares the foundational thesis, mission, or target market goals.',
  },
  {
    id: 'methodology',
    label: 'Architecture & Methodology',
    query: 'architecture methodology extraction workers wasm pipeline technology approach milestone indexeddb',
    description: 'Compares technical design, algorithmic approach, and operational pipelines.',
  },
  {
    id: 'privacy',
    label: 'Privacy & Data Governance',
    query: 'privacy compliance data boundaries retention confidential security on-device telemetry leakage',
    description: 'Compares privacy guarantees, security restrictions, and compliance boundaries.',
  },
  {
    id: 'findings',
    label: 'Findings & User Feedback',
    query: 'findings customer feedback participant interview researcher survey results constraint frustration',
    description: 'Compares reported outcomes, empirical findings, and user insights.',
  },
  {
    id: 'recommendations',
    label: 'Recommendations & Roadmap',
    query: 'recommendations roadmap milestones future optimize deliver next steps speed memory',
    description: 'Compares strategic recommendations and planned next steps.',
  },
]

/**
 * Find the most relevant chunk in a single document for a given search query.
 *
 * @param {import('../types/document.js').DocRecord} document
 * @param {string} query
 * @returns {{ chunkIndex: number, locator: string, page?: number, text: string, score: number } | null}
 */
export function findTopChunkForDoc(document, query) {
  if (!document || !document.chunks || document.chunks.length === 0 || !query) {
    return null
  }

  const queryTokens = tokenizeQuery(query)
  if (queryTokens.length === 0) return null

  let bestChunk = null
  let maxScore = 0

  for (const chunk of document.chunks) {
    const chunkTokens = tokenizeQuery(chunk.text || '')
    if (chunkTokens.length === 0) continue

    // Count matched query tokens and compute overlap score
    let matches = 0
    for (const qToken of queryTokens) {
      if (chunkTokens.includes(qToken)) {
        matches += 1
      }
    }

    if (matches > 0) {
      // Score based on token overlap weighted by ratio
      const score = (matches / queryTokens.length) * 10 + matches
      if (score > maxScore) {
        maxScore = score
        bestChunk = {
          chunkIndex: chunk.index,
          locator: chunk.locator || `Chunk ${chunk.index + 1}`,
          page: chunk.page,
          text: chunk.text,
          score,
        }
      }
    }
  }

  return bestChunk
}

/**
 * Synthesizes the relationship between document excerpts for a dimension.
 *
 * @param {Array<{ docName: string, hasEvidence: boolean, text: string }>} entries
 * @returns {{ status: 'consensus' | 'contrast' | 'partial' | 'uncovered', summary: string }}
 */
function synthesizeDimension(entries) {
  const withEvidence = entries.filter((e) => e.hasEvidence)

  if (withEvidence.length === 0) {
    return {
      status: 'uncovered',
      summary: 'Neither document contains relevant evidence on this topic.',
    }
  }

  if (withEvidence.length === 1) {
    return {
      status: 'partial',
      summary: `Only ${withEvidence[0].docName} addresses this topic directly.`,
    }
  }

  // Check for common focal keywords across the retrieved texts
  const tokenSets = withEvidence.map((e) => new Set(tokenizeQuery(e.text)))
  let overlapCount = 0

  if (tokenSets.length >= 2) {
    for (const token of tokenSets[0]) {
      if (tokenSets.slice(1).every((set) => set.has(token))) {
        overlapCount += 1
      }
    }
  }

  if (overlapCount >= 2) {
    return {
      status: 'consensus',
      summary: `Both documents share aligned focal points on this topic (${withEvidence.map((e) => e.docName).join(' and ')}).`,
    }
  }

  return {
    status: 'contrast',
    summary: `Documents approach this topic from different perspectives or distinct scopes.`,
  }
}

/**
 * Compare two or more documents across specified analytical dimensions.
 *
 * @param {object} params
 * @param {import('../types/document.js').DocRecord[]} params.documents - Active library documents.
 * @param {string[]} params.docIds - IDs of documents selected for comparison (minimum 2).
 * @param {string[]} [params.dimensionIds] - IDs of dimensions to include from DEFAULT_COMPARISON_DIMENSIONS.
 * @param {string} [params.customDimension] - Optional custom query topic to add to comparison.
 * @returns {{
 *   success: boolean,
 *   error?: string,
 *   documents: Array<{ id: string, name: string, type: string }>,
 *   dimensions: Array<{
 *     id: string,
 *     label: string,
 *     synthesis: { status: 'consensus' | 'contrast' | 'partial' | 'uncovered', summary: string },
 *     entries: Array<{
 *       docId: string,
 *       docName: string,
 *       docType: string,
 *       chunkIndex: number | null,
 *       locator: string,
 *       page?: number,
 *       text: string,
 *       hasEvidence: boolean,
 *     }>
 *   }>
 * }}
 */
export function compareDocuments({
  documents = [],
  docIds = [],
  dimensionIds = null,
  customDimension = '',
}) {
  if (!Array.isArray(docIds) || docIds.length < 2) {
    return {
      success: false,
      error: 'Please select at least 2 documents to run a side-by-side comparison.',
      documents: [],
      dimensions: [],
    }
  }

  const selectedDocs = documents.filter((d) => docIds.includes(d.id))
  if (selectedDocs.length < 2) {
    return {
      success: false,
      error: 'Could not find the selected documents in the active library.',
      documents: [],
      dimensions: [],
    }
  }

  // Determine active dimensions
  let activeDimensions = DEFAULT_COMPARISON_DIMENSIONS
  if (Array.isArray(dimensionIds) && dimensionIds.length > 0) {
    activeDimensions = DEFAULT_COMPARISON_DIMENSIONS.filter((dim) =>
      dimensionIds.includes(dim.id)
    )
  }

  const dimensionsToEvaluate = [...activeDimensions]

  if (customDimension && customDimension.trim().length >= 2) {
    dimensionsToEvaluate.push({
      id: `custom-${Date.now()}`,
      label: `Custom: "${customDimension.trim()}"`,
      query: customDimension.trim(),
      description: `User-specified custom analytical facet.`,
    })
  }

  const comparedDimensions = dimensionsToEvaluate.map((dim) => {
    const entries = selectedDocs.map((doc) => {
      const topChunk = findTopChunkForDoc(doc, dim.query)

      if (topChunk) {
        return {
          docId: doc.id,
          docName: doc.name,
          docType: doc.type,
          chunkIndex: topChunk.chunkIndex,
          locator: topChunk.locator,
          page: topChunk.page,
          text: topChunk.text,
          hasEvidence: true,
        }
      }

      return {
        docId: doc.id,
        docName: doc.name,
        docType: doc.type,
        chunkIndex: null,
        locator: 'N/A',
        page: undefined,
        text: 'No relevant evidence on this topic located in this document.',
        hasEvidence: false,
      }
    })

    const synthesis = synthesizeDimension(entries)

    return {
      id: dim.id,
      label: dim.label,
      synthesis,
      entries,
    }
  })

  return {
    success: true,
    documents: selectedDocs.map((d) => ({ id: d.id, name: d.name, type: d.type })),
    dimensions: comparedDimensions,
  }
}
