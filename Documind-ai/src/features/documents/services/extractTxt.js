import { MAX_TEXT_LENGTH } from '../types/document.js'

/**
 * Extract text from a plain-text file.
 *
 * Decodes as UTF-8. Splits into paragraph-based chunks
 * separated by blank lines, with character offsets.
 *
 * @param {File} file
 * @returns {Promise<{ text: string, chunks: import('../types/document.js').DocChunk[] }>}
 */
export async function extractTxt(file) {
  let raw

  try {
    raw = await file.text()
  } catch {
    throw new Error(`Could not read ${file.name}. The file may be corrupted or not a valid text file.`)
  }

  if (!raw || raw.trim().length === 0) {
    throw new Error(`${file.name} contains no readable text.`)
  }

  if (raw.length > MAX_TEXT_LENGTH) {
    throw new Error(
      `${file.name} contains ${(raw.length / 1_000_000).toFixed(1)}M characters, ` +
      `which exceeds the ${(MAX_TEXT_LENGTH / 1_000_000).toFixed(0)}M character limit.`
    )
  }

  // Detect binary content: if more than 5% of the first 4KB are control characters
  // (excluding \n, \r, \t), this is probably not a text file.
  const sample = raw.slice(0, 4096)
  let controlCount = 0
  for (let i = 0; i < sample.length; i++) {
    const code = sample.charCodeAt(i)
    if (code < 32 && code !== 10 && code !== 13 && code !== 9) controlCount++
  }
  if (sample.length > 0 && controlCount / sample.length > 0.05) {
    throw new Error(`${file.name} does not appear to be a valid text file.`)
  }

  // Split into paragraph chunks by blank lines.
  const paragraphs = raw.split(/\n\s*\n/)
  const chunks = []
  let offset = 0

  for (let i = 0; i < paragraphs.length; i++) {
    const text = paragraphs[i].trim()
    if (text.length === 0) {
      // Advance offset past the blank separator
      offset = raw.indexOf(paragraphs[i], offset) + paragraphs[i].length
      continue
    }

    const actualOffset = raw.indexOf(paragraphs[i], offset)

    chunks.push({
      index: chunks.length,
      text,
      locator: `Section ${chunks.length + 1}`,
      offset: actualOffset >= 0 ? actualOffset : offset,
    })

    offset = actualOffset >= 0 ? actualOffset + paragraphs[i].length : offset + paragraphs[i].length
  }

  // If no paragraph breaks, treat the whole content as one chunk
  if (chunks.length === 0) {
    chunks.push({
      index: 0,
      text: raw.trim(),
      locator: 'Section 1',
      offset: 0,
    })
  }

  return { text: raw, chunks }
}

