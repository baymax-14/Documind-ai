import { extractPdf } from './extractPdf.js'
import { extractDocx } from './extractDocx.js'
import { extractTxt } from './extractTxt.js'

/**
 * Extract text from a document file.
 *
 * Routes to the correct parser based on file extension.
 * Returns the extracted text and source chunks.
 *
 * @param {File} file - A validated File object (PDF, DOCX, or TXT).
 * @returns {Promise<{ text: string, chunks: import('../types/document.js').DocChunk[] }>}
 * @throws {Error} If the file cannot be read, parsed, or has no extractable text.
 */
export async function extractDocument(file) {
  const extension = file.name.split('.').pop()?.toLowerCase()

  switch (extension) {
    case 'pdf':
      return extractPdf(file)
    case 'docx':
      return extractDocx(file)
    case 'txt':
      return extractTxt(file)
    default:
      throw new Error(`No parser available for .${extension} files.`)
  }
}

