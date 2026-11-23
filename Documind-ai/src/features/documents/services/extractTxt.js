import { MAX_TEXT_LENGTH } from '../types/document.js'
import { chunkRanges, headingBefore } from './chunker.js'

/**
 * Extract text from a plain-text file.
 *
 * Decodes as UTF-8. Packs paragraphs into passages of about 900 characters
 * (see chunker.js), each an exact slice of the source with its offset.
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

  // Pack paragraphs into retrieval-sized passages (exact slices of the source).
  const chunks = chunkRanges(raw).map((r, i) => {
    const heading = headingBefore(raw, r.start)
    return {
      index: i,
      text: raw.slice(r.start, r.end),
      locator: heading ? `Section ${i + 1} · ${heading}` : `Section ${i + 1}`,
      offset: r.start,
      ...(heading ? { heading } : {}),
    }
  })

  return { text: raw, chunks }
}

