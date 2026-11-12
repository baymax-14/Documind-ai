import mammoth from 'mammoth'
import { MAX_TEXT_LENGTH } from '../types/document.js'

/**
 * Extract text from a DOCX file using mammoth.
 *
 * Reads the file as an ArrayBuffer in the browser,
 * extracts raw text, and splits into paragraph-based chunks.
 *
 * @param {File} file
 * @returns {Promise<{ text: string, chunks: import('../types/document.js').DocChunk[] }>}
 */
export async function extractDocx(file) {
  let buffer

  try {
    buffer = await file.arrayBuffer()
  } catch {
    throw new Error(`Could not read ${file.name}. The file may be corrupted.`)
  }

  let result

  try {
    result = await mammoth.extractRawText({ arrayBuffer: buffer })
  } catch (err) {
    // mammoth throws on encrypted, corrupted, or non-DOCX files
    if (err.message?.includes('password') || err.message?.includes('encrypt')) {
      throw new Error(`${file.name} appears to be password-protected. Encrypted documents are not supported yet.`)
    }
    throw new Error(`Could not extract text from ${file.name}. The file may be corrupted or not a valid DOCX document.`)
  }

  const text = result.value

  if (!text || text.trim().length === 0) {
    throw new Error(`${file.name} contains no readable text. The document may be empty or contain only images.`)
  }

  if (text.length > MAX_TEXT_LENGTH) {
    throw new Error(
      `${file.name} contains ${(text.length / 1_000_000).toFixed(1)}M characters, ` +
      `which exceeds the ${(MAX_TEXT_LENGTH / 1_000_000).toFixed(0)}M character limit.`
    )
  }

  // Log any warnings from mammoth (images skipped, unsupported features, etc.)
  if (result.messages?.length) {
    const warnings = result.messages
      .filter((m) => m.type === 'warning')
      .map((m) => m.message)
    if (warnings.length) {
      console.warn(`[extractDocx] ${file.name}:`, warnings)
    }
  }

  // Split into paragraphs (mammoth returns text with newlines between paragraphs)
  const paragraphs = text.split(/\n+/)
  const chunks = []
  let offset = 0

  for (let i = 0; i < paragraphs.length; i++) {
    const content = paragraphs[i].trim()
    if (content.length === 0) {
      offset += paragraphs[i].length + 1
      continue
    }

    const actualOffset = text.indexOf(paragraphs[i], offset)

    chunks.push({
      index: chunks.length,
      text: content,
      locator: `Paragraph ${chunks.length + 1}`,
      offset: actualOffset >= 0 ? actualOffset : offset,
    })

    offset = (actualOffset >= 0 ? actualOffset : offset) + paragraphs[i].length + 1
  }

  if (chunks.length === 0) {
    chunks.push({
      index: 0,
      text: text.trim(),
      locator: 'Paragraph 1',
      offset: 0,
    })
  }

  return { text, chunks }
}

