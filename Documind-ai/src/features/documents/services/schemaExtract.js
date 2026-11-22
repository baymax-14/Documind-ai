import { tokenizeQuery } from './search.js'
import { findTopChunkForDoc } from './comparison.js'

/**
 * Standard structured schemas for extraction workflows.
 */
export const EXTRACTION_SCHEMAS = {
  RESEARCH_PAPER: {
    id: 'RESEARCH_PAPER',
    name: 'Research Paper Schema',
    description: 'Extracts core research hypothesis, technical methodology, empirical findings, and limitations.',
    fields: [
      { key: 'objective', label: 'Research Objective & Scope', query: 'objective hypothesis thesis purpose goal problem investigated' },
      { key: 'methodology', label: 'Methodology & Architecture', query: 'methodology architecture experimental design workers pipeline algorithm' },
      { key: 'key_findings', label: 'Key Empirical Findings', query: 'findings results outcomes data metrics accuracy precision performance' },
      { key: 'limitations', label: 'Limitations & Constraints', query: 'limitations constraints risks boundary challenges weaknesses' },
    ],
  },
  LEGAL_AGREEMENT: {
    id: 'LEGAL_AGREEMENT',
    name: 'Legal & Compliance Schema',
    description: 'Extracts participating parties, governance terms, privacy rules, and obligations.',
    fields: [
      { key: 'parties', label: 'Identified Parties & Stakeholders', query: 'participant party researcher customer organization client' },
      { key: 'governance_scope', label: 'Governance & Privacy Scope', query: 'privacy compliance policy retention confidential boundary data' },
      { key: 'obligations', label: 'Restrictions & Prohibitions', query: 'forbidden strictly constrain prohibited forbidden constraint requirement' },
      { key: 'next_actions', label: 'Required Actions & Milestones', query: 'recommendations deliver optimize roadmap action next steps' },
    ],
  },
  MARKET_ANALYSIS: {
    id: 'MARKET_ANALYSIS',
    name: 'Market & Business Report Schema',
    description: 'Extracts reporting timelines, quantitative metrics, customer cohorts, and recommendations.',
    fields: [
      { key: 'reporting_period', label: 'Reporting Period / Timeline', query: 'period quarter year q1 q2 q3 q4 timeline date milestone' },
      { key: 'growth_metrics', label: 'Quantitative Growth Metrics', query: 'percentage growth expansion expansion rate statistics percent drivers metrics' },
      { key: 'customer_segments', label: 'Primary Target Segments', query: 'customer segments researchers legal enterprise audience cohort' },
      { key: 'strategic_recommendations', label: 'Strategic Recommendations', query: 'recommendations roadmap maintain optimize deliver priority action' },
    ],
  },
}

/**
 * Distills a concise value statement from an extracted chunk.
 *
 * @param {string} text
 * @param {string} query
 * @returns {string} Distilled key takeaway.
 */
function distillFieldValue(text, query) {
  if (!text) return ''

  const sentences = text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 20)

  if (sentences.length === 0) return text.slice(0, 150)

  const queryTokens = tokenizeQuery(query)
  let bestSentence = sentences[0]
  let maxScore = -1

  for (const s of sentences) {
    const sTokens = tokenizeQuery(s)
    let hits = 0
    for (const t of queryTokens) {
      if (sTokens.includes(t)) hits += 1
    }
    if (hits > maxScore) {
      maxScore = hits
      bestSentence = s
    }
  }

  return bestSentence
}

/**
 * Extract structured schema fields from a document with strict grounding.
 *
 * @param {object} params
 * @param {import('../types/document.js').DocRecord} params.document - Active document.
 * @param {keyof typeof EXTRACTION_SCHEMAS} [params.schemaId='RESEARCH_PAPER'] - Predefined schema ID.
 * @param {Array<{ key: string, label: string, query: string }>} [params.customFields] - Optional custom schema.
 * @returns {{
 *   documentId: string,
 *   documentName: string,
 *   schemaName: string,
 *   extractedAt: string,
 *   fields: Array<{
 *     key: string,
 *     label: string,
 *     value: string | null,
 *     excerpt: string,
 *     locator: string,
 *     page?: number,
 *     chunkIndex: number | null,
 *     hasEvidence: boolean,
 *     confidence: 'high' | 'medium' | 'none',
 *   }>
 * }}
 */
export function extractStructuredData({
  document,
  schemaId = 'RESEARCH_PAPER',
  customFields = null,
}) {
  const schema = EXTRACTION_SCHEMAS[schemaId] || EXTRACTION_SCHEMAS.RESEARCH_PAPER
  const fieldDefs = Array.isArray(customFields) && customFields.length > 0 ? customFields : schema.fields

  if (!document || !Array.isArray(document.chunks) || document.chunks.length === 0) {
    return {
      documentId: document?.id || 'unknown',
      documentName: document?.name || 'Untitled Document',
      schemaName: schema.name,
      extractedAt: new Date().toISOString(),
      fields: fieldDefs.map((f) => ({
        key: f.key,
        label: f.label,
        value: null,
        excerpt: '',
        locator: 'N/A',
        page: undefined,
        chunkIndex: null,
        hasEvidence: false,
        confidence: 'none',
      })),
    }
  }

  const extractedFields = fieldDefs.map((f) => {
    const topChunk = findTopChunkForDoc(document, f.query)

    if (topChunk && topChunk.score >= 1) {
      const distilled = distillFieldValue(topChunk.text, f.query)
      return {
        key: f.key,
        label: f.label,
        value: distilled,
        excerpt: topChunk.text,
        locator: topChunk.locator,
        page: topChunk.page,
        chunkIndex: topChunk.chunkIndex,
        hasEvidence: true,
        confidence: topChunk.score >= 3 ? 'high' : 'medium',
      }
    }

    return {
      key: f.key,
      label: f.label,
      value: null,
      excerpt: 'No supporting evidence located for this schema field in document.',
      locator: 'N/A',
      page: undefined,
      chunkIndex: null,
      hasEvidence: false,
      confidence: 'none',
    }
  })

  return {
    documentId: document.id,
    documentName: document.name,
    schemaName: schema.name,
    extractedAt: new Date().toISOString(),
    fields: extractedFields,
  }
}

/**
 * Serialize extracted schema data into pretty-printed JSON.
 *
 * @param {ReturnType<typeof extractStructuredData>} extractionResult
 * @returns {string} Formatted JSON string.
 */
export function exportStructuredDataToJson(extractionResult) {
  return JSON.stringify(extractionResult, null, 2)
}
