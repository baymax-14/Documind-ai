/**
 * Security, Prompt Injection Sanitization & Integrity Service for DocuMind AI.
 * Protects local and server prompt boundaries against delimiter hijacking,
 * path traversal, and ungrounded citation fabrication.
 */

// Known LLM control tokens and injection delimiters to neutralize
const ADVERSARIAL_DELIMITERS = [
  /<\|im_start\|>/gi,
  /<\|im_end\|>/gi,
  /\[SYSTEM\b[^\]]*\]/gi,
  /\[\/SYSTEM\]/gi,
  /<<SYS>>/gi,
  /<\/SYS>>/gi,
  /```(?:system|admin|root)\b/gi,
  /<\|endoftext\|>/gi,
  /<\|fim_prefix\|>/gi,
  /<\|fim_middle\|>/gi,
  /<\|fim_suffix\|>/gi,
]

/**
 * Sanitize user query input to prevent prompt injection and control delimiter spoofing.
 *
 * @param {string} query - Raw user input query.
 * @param {number} [maxLength=500] - Safe query length limit.
 * @returns {string} Sanitized query string.
 */
export function sanitizeQueryText(query, maxLength = 500) {
  if (typeof query !== 'string') return ''

  let clean = query.trim()

  // Neutralize delimiter injection tags
  for (const pattern of ADVERSARIAL_DELIMITERS) {
    clean = clean.replace(pattern, '')
  }

  // Strip path traversal attempts
  clean = clean.replace(/\.\.[/\\]/g, '')

  // Strip SQL-like injection patterns for safe indexing while preserving legitimate trailing queries
  clean = clean.replace(/;\s*(?:DROP|DELETE|TRUNCATE|ALTER)\s+(?:TABLE|DATABASE|FROM)\b[^;]*;?/gi, ' ')
  clean = clean.replace(/^['";\s-]+/g, '')

  // Clean dangerous control characters while preserving valid unicode
  // eslint-disable-next-line no-control-regex
  clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  // Enforce max length
  if (clean.length > maxLength) {
    clean = clean.slice(0, maxLength).trim()
  }

  return clean
}

/**
 * Sanitize document text extracted from third-party files.
 * Escapes LLM delimiters so malicious document text cannot break out of user prompt contexts.
 *
 * @param {string} text - Raw extracted document text.
 * @returns {string} Sanitized document text.
 */
export function sanitizeDocumentText(text) {
  if (typeof text !== 'string') return ''

  let clean = text

  // Strip null bytes
  clean = clean.replace(/\0/g, '')

  // Neutralize delimiters
  for (const pattern of ADVERSARIAL_DELIMITERS) {
    clean = clean.replace(pattern, (match) => `[escaped: ${match.replace(/[<>[\]|`]/g, '')}]`)
  }

  return clean
}

/**
 * Sanitize an uploaded file's name to prevent path traversal and shell injection.
 *
 * @param {string} filename - Raw file name.
 * @returns {string} Sanitized file name.
 */
export function sanitizeFilename(filename) {
  if (typeof filename !== 'string' || !filename.trim()) {
    return 'unnamed_document.txt'
  }

  let name = filename.trim()

  // Remove directory paths
  name = name.split(/[/\\]/).pop() || 'unnamed_document.txt'

  // Remove control characters and path traversal
  // eslint-disable-next-line no-control-regex
  name = name.replace(/\.\.[/\\]/g, '').replace(/[\x00-\x1F\x7F]/g, '')

  // Remove dangerous characters
  name = name.replace(/[<>:"|?*]/g, '_')

  // Truncate to safe length (120 chars) while preserving extension
  if (name.length > 120) {
    const extIndex = name.lastIndexOf('.')
    if (extIndex > 0) {
      const ext = name.slice(extIndex)
      name = name.slice(0, 120 - ext.length) + ext
    } else {
      name = name.slice(0, 120)
    }
  }

  return name
}

/**
 * Validate that a citation reference is authentic, exists in the target document,
 * and contains actual matching text.
 *
 * @param {object} citation - The citation to verify.
 * @param {import('../types/document.js').DocRecord} document - Parent document.
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateCitationIntegrity(citation, document) {
  if (!citation || !document) {
    return { valid: false, reason: 'Missing citation or document reference' }
  }

  if (citation.docId !== document.id) {
    return { valid: false, reason: 'Citation document ID mismatch (possible IDOR or cross-tenant leakage)' }
  }

  if (!Array.isArray(document.chunks) || document.chunks.length === 0) {
    return { valid: false, reason: 'Document has no indexed text chunks' }
  }

  const chunk = document.chunks.find((c) => c.index === citation.chunkIndex)
  if (!chunk) {
    return { valid: false, reason: `Chunk index ${citation.chunkIndex} does not exist in document` }
  }

  // Verify that the citation text is a genuine substring or high-overlap excerpt of the chunk
  if (citation.text && citation.text.trim()) {
    const citationSnippet = citation.text.trim().toLowerCase()
    const chunkText = (chunk.text || '').toLowerCase()

    if (!chunkText.includes(citationSnippet) && !citationSnippet.includes(chunkText.slice(0, 40))) {
      return { valid: false, reason: 'Citation text does not match underlying source chunk' }
    }
  }

  return { valid: true }
}
