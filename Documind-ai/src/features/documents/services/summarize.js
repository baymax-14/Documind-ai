import { tokenizeQuery } from './search.js'

/**
 * Common analytical section headers inferred from document text chunks.
 */
const SECTION_KEYWORDS = [
  { title: 'Executive Summary & Overview', keywords: ['summary', 'overview', 'introduction', 'thesis', 'vision', 'background'] },
  { title: 'Methodology & Architecture', keywords: ['methodology', 'architecture', 'methods', 'design', 'milestone', 'pipeline', 'extraction', 'system'] },
  { title: 'Findings & Key Results', keywords: ['findings', 'results', 'data', 'metrics', 'outcomes', 'analysis', 'survey', 'growth'] },
  { title: 'Governance & Privacy Constraints', keywords: ['privacy', 'compliance', 'security', 'retention', 'confidential', 'boundary', 'constraint'] },
  { title: 'Recommendations & Next Steps', keywords: ['recommendations', 'roadmap', 'conclusions', 'next', 'future', 'action', 'steps'] },
]

/**
 * Infer the best section title for a given chunk of text.
 *
 * @param {string} text
 * @param {number} chunkIndex
 * @returns {string} Inferred section label.
 */
export function inferSectionTitle(text, chunkIndex) {
  if (!text) return `Section ${chunkIndex + 1}`

  // If first line starts with a clear heading-like phrase
  const firstLine = text.trim().split('\n')[0].replace(/^[#*-]\s*/, '').trim()
  if (firstLine.length > 3 && firstLine.length < 60 && !firstLine.includes('.')) {
    return firstLine
  }

  const tokens = tokenizeQuery(text)
  let bestTitle = `Section ${chunkIndex + 1}`
  let maxScore = 0

  for (const candidate of SECTION_KEYWORDS) {
    let score = 0
    for (const kw of candidate.keywords) {
      if (tokens.includes(kw)) score += 1
    }
    if (score > maxScore) {
      maxScore = score
      bestTitle = candidate.title
    }
  }

  return bestTitle
}

/**
 * Extract key bullet takeaways from a chunk text without synthetic claims.
 *
 * @param {string} text
 * @returns {string[]} Array of key grounded sentence takeaways.
 */
export function extractTakeawaysFromText(text) {
  if (!text || !text.trim()) return []

  // Split into sentences
  const sentences = text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 25 && s.length <= 320)

  // Deduplicate and return top informative sentences
  return Array.from(new Set(sentences)).slice(0, 3)
}

/**
 * Generate a section-aware grounded document summary.
 *
 * @param {import('../types/document.js').DocRecord} document - Active library document.
 * @returns {{
 *   documentId: string,
 *   documentName: string,
 *   documentType: string,
 *   totalChunks: number,
 *   sections: Array<{
 *     id: string,
 *     title: string,
 *     locator: string,
 *     page?: number,
 *     chunkIndex: number,
 *     takeaways: string[],
 *     fullExcerpt: string,
 *   }>
 * }}
 */
export function generateSectionSummary(document) {
  if (!document || !Array.isArray(document.chunks) || document.chunks.length === 0) {
    return {
      documentId: document?.id || 'unknown',
      documentName: document?.name || 'Untitled Document',
      documentType: document?.type || 'TXT',
      totalChunks: 0,
      sections: [],
    }
  }

  const sections = document.chunks.map((chunk, idx) => {
    const title = inferSectionTitle(chunk.text || '', idx)
    const takeaways = extractTakeawaysFromText(chunk.text || '')
    const locator = chunk.locator || (chunk.page ? `Page ${chunk.page}` : `Chunk ${idx + 1}`)

    return {
      id: `sec-${idx}`,
      title,
      locator,
      page: chunk.page,
      chunkIndex: chunk.index ?? idx,
      takeaways: takeaways.length > 0 ? takeaways : [chunk.text.slice(0, 160) + '...'],
      fullExcerpt: chunk.text || '',
    }
  })

  return {
    documentId: document.id,
    documentName: document.name,
    documentType: document.type,
    totalChunks: document.chunks.length,
    sections,
  }
}

/**
 * Format a section-aware summary into clean Markdown with verifiable footnotes.
 *
 * @param {ReturnType<typeof generateSectionSummary>} summary
 * @returns {string} Markdown representation.
 */
export function exportSummaryToMarkdown(summary) {
  if (!summary || !summary.sections || summary.sections.length === 0) {
    return `# DocuMind AI — Document Summary\n\nNo sections available for summary.\n`
  }

  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19)
  let md = `# DocuMind AI — Grounded Section Summary\n\n`
  md += `**Document:** \`${summary.documentName}\` (${summary.documentType})  \n`
  md += `**Generated:** ${timestamp} UTC  \n`
  md += `**Boundary:** On-device section-anchored extraction.  \n\n`
  md += `---\n\n`

  const footnotes = []
  let footnoteCounter = 1

  for (const sec of summary.sections) {
    const fnId = footnoteCounter++
    footnotes.push({
      id: fnId,
      docName: summary.documentName,
      locator: sec.locator,
      excerpt: sec.fullExcerpt.trim(),
    })

    md += `### ${sec.title} (${sec.locator})\n\n`
    for (const point of sec.takeaways) {
      md += `- ${point} [^${fnId}]\n`
    }
    md += `\n`
  }

  md += `---\n\n`
  md += `## Verifiable Citations & Footnotes\n\n`
  for (const fn of footnotes) {
    md += `[^${fn.id}]: **${fn.docName}** (${fn.locator}): "${fn.excerpt}"\n`
  }
  md += `\n`

  return md
}
