/**
 * Citation-Preserving Exporter Service for DocuMind AI.
 * Exports synthesized answers, comparisons, and evidence passages
 * to structured Markdown with verifiable academic-style footnotes.
 */

/**
 * Format a cross-document comparison result into Markdown with footnotes.
 *
 * @param {object} comparisonResult - The output of compareDocuments().
 * @returns {string} Clean Markdown report.
 */
export function exportComparisonToMarkdown(comparisonResult) {
  if (!comparisonResult || !comparisonResult.documents) {
    return '# DocuMind AI — Document Comparison Report\n\nNo comparison data available.\n'
  }

  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19)
  const docNames = comparisonResult.documents.map((d) => `\`${d.name}\` (${d.type})`).join(', ')

  let md = `# DocuMind AI — Cross-Document Comparison Report\n\n`
  md += `**Generated:** ${timestamp} UTC  \n`
  md += `**Compared Documents:** ${docNames}  \n`
  md += `**Integrity:** 100% on-device evidence extraction with verifiable locators.  \n\n`
  md += `---\n\n`

  const footnotes = []
  let footnoteCounter = 1

  for (const dim of comparisonResult.dimensions || []) {
    md += `## ${dim.label}\n\n`
    md += `> ${dim.synthesis.summary}\n\n`

    for (const entry of dim.entries || []) {
      if (entry.hasEvidence) {
        const fnId = footnoteCounter++
        footnotes.push({
          id: fnId,
          docName: entry.docName,
          locator: entry.locator,
          excerpt: entry.text.trim(),
        })

        md += `### ${entry.docName}\n`
        md += `"${entry.text.trim()}"[^${fnId}]\n\n`
      } else {
        md += `### ${entry.docName}\n`
        md += `*No matching evidence found in this document.*  \n\n`
      }
    }

    md += `---\n\n`
  }

  // Append verifiable footnotes
  if (footnotes.length > 0) {
    md += `## Verifiable Citations & Footnotes\n\n`
    for (const fn of footnotes) {
      md += `[^${fn.id}]: **${fn.docName}** (${fn.locator}): "${fn.excerpt}"\n`
    }
    md += `\n`
  }

  return md
}

/**
 * Format AI assistant conversation messages into Markdown with citations.
 *
 * @param {Array<any>} messages - Messages array from AiAssistantView.
 * @returns {string} Markdown conversation transcript.
 */
export function exportAiChatToMarkdown(messages = []) {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19)
  let md = `# DocuMind AI — Grounded Intelligence Transcript\n\n`
  md += `**Exported:** ${timestamp} UTC  \n`
  md += `**Boundary:** Client-side local execution with verifiable source citations.  \n\n`
  md += `---\n\n`

  let footnoteCounter = 1
  const footnotes = []

  for (const msg of messages) {
    const role = msg.sender === 'user' ? 'Question' : 'DocuMind Assistant'
    md += `### ${role}\n\n`

    if (msg.sender === 'assistant' && msg.citations && msg.citations.length > 0) {
      let bodyText = msg.text
      const citationsForMsg = []

      for (const cit of msg.citations) {
        const fnId = footnoteCounter++
        citationsForMsg.push(`[^${fnId}]`)
        footnotes.push({
          id: fnId,
          docName: cit.docName,
          locator: cit.locator,
          text: cit.text || cit.snippet,
        })
      }

      md += `${bodyText}\n\n`
      md += `*Sources cited:* ${citationsForMsg.join(' ')}\n\n`
    } else {
      md += `${msg.text}\n\n`
    }

    md += `---\n\n`
  }

  if (footnotes.length > 0) {
    md += `## Source Locators & Verification Notes\n\n`
    for (const fn of footnotes) {
      md += `[^${fn.id}]: **${fn.docName}** (${fn.locator}): "${(fn.text || '').trim()}"\n`
    }
    md += `\n`
  }

  return md
}

/**
 * Download arbitrary text as a file in the browser.
 *
 * @param {string} content
 * @param {string} filename
 * @param {string} [mimeType='text/markdown;charset=utf-8']
 */
export function downloadMarkdownFile(content, filename = 'documind-report.md', mimeType = 'text/markdown;charset=utf-8') {
  if (typeof window === 'undefined') return

  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

/**
 * Copy text to clipboard with fallback.
 *
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fallback below
    }
  }

  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      const success = document.execCommand('copy')
      document.body.removeChild(textarea)
      return success
    } catch {
      return false
    }
  }

  return false
}
