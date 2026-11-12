import { extractTxt } from './extractTxt.js'

/**
 * Extract text from a document file.
 *
 * Routes to the correct parser based on file extension.
 * Heavy parsers (PDF.js, mammoth) are lazy-loaded on demand to optimize
 * initial bundle size.
 *
 * @param {File} file - A validated File object (PDF, DOCX, or TXT).
 * @returns {Promise<{ text: string, chunks: import('../types/document.js').DocChunk[] }>}
 * @throws {Error} If the file cannot be read, parsed, or has no extractable text.
 */
export async function extractDocument(file) {
  const extension = file.name.split('.').pop()?.toLowerCase()

  switch (extension) {
    case 'pdf': {
      const { extractPdf } = await import('./extractPdf.js')
      return extractPdf(file)
    }
    case 'docx': {
      const { extractDocx } = await import('./extractDocx.js')
      return extractDocx(file)
    }
    case 'txt':
      return extractTxt(file)
    default:
      throw new Error(`No parser available for .${extension} files.`)
  }
}
