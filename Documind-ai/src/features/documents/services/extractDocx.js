import mammoth from 'mammoth'
import { MAX_TEXT_LENGTH } from '../types/document.js'
import { chunkRanges, headingBefore } from './chunker.js'

/**
 * Extract text from a DOCX file using mammoth.
 *
 * Reads the file as an ArrayBuffer in the browser,
 * extracts raw text, and packs paragraphs into retrieval-sized passages.
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

  // Pack paragraphs into retrieval-sized passages (exact slices of the source).
  const chunks = chunkRanges(text, { separator: /\n+/ }).map((r, i) => {
    const heading = headingBefore(text, r.start)
    return {
      index: i,
      text: text.slice(r.start, r.end),
      locator: heading ? `Section ${i + 1} · ${heading}` : `Section ${i + 1}`,
      offset: r.start,
      ...(heading ? { heading } : {}),
    }
  })

  return { text, chunks }
}

