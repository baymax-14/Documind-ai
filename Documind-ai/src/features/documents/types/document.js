/**
 * Document record shapes for DocuMind AI.
 *
 * A "document" progresses through these states:
 *   selected → extracting → ready | failed
 *
 * "selected" means the file was chosen via the picker or drag-and-drop.
 *   At this stage, only metadata (name, type, byte size) is known.
 *
 * "extracting" means the browser is reading and parsing the file bytes.
 *
 * "ready" means text was successfully extracted. The `text` and `chunks`
 *   fields are populated.
 *
 * "failed" means extraction was attempted but could not complete.
 *   The `error` field describes what went wrong.
 */

/** @typedef {'selected' | 'extracting' | 'ready' | 'failed'} DocStatus */

/**
 * A contiguous section of extracted text with a source locator.
 *
 * @typedef {Object} DocChunk
 * @property {number}  index     - Zero-based chunk index within the document.
 * @property {string}  text      - The text content of this chunk.
 * @property {string}  locator   - Human-readable source reference:
 *                                 "Page 3" for PDF, "Section 2" for DOCX/TXT.
 * @property {number}  [page]    - PDF page number (1-based), if applicable.
 * @property {number}  [offset]  - Character offset from document start.
 */

/**
 * A normalized document record.
 *
 * @typedef {Object} DocRecord
 * @property {string}    id          - Unique identifier (crypto.randomUUID).
 * @property {string}    name        - Original file name.
 * @property {string}    type        - Uppercase extension: 'PDF', 'DOCX', 'TXT'.
 * @property {number}    size        - File size in bytes.
 * @property {DocStatus} status      - Current processing state.
 * @property {boolean}   sample      - True for built-in demo documents.
 * @property {number}    addedAt     - Timestamp when the file was selected.
 * @property {number}    [extractedAt] - Timestamp when extraction completed.
 * @property {string}    [text]      - Full extracted text (when status is 'ready').
 * @property {DocChunk[]} [chunks]   - Source chunks with locators.
 * @property {string}    [error]     - Error description (when status is 'failed').
 * @property {boolean}   [storedInBrowser] - True when persisted to local IndexedDB.
 * @property {number}    [persistedAt] - Timestamp when saved to IndexedDB.
 */

/** Supported file extensions for v1. */
export const SUPPORTED_EXTENSIONS = new Set(['pdf', 'docx', 'txt'])

/** Maximum file size in bytes (25 MB). */
export const MAX_FILE_SIZE = 25 * 1024 * 1024

/** Maximum extracted text length in characters (~10 MB of text). */
export const MAX_TEXT_LENGTH = 10 * 1024 * 1024

/**
 * Accept string for <input type="file">.
 * Does not include legacy .doc — no parser is verified for it.
 */
export const FILE_ACCEPT = '.pdf,.docx,.txt'

/**
 * Create a fresh document record from a File object.
 *
 * @param {File} file
 * @returns {DocRecord}
 */
export function createDocRecord(file) {
  return {
    id: crypto.randomUUID(),
    name: file.name,
    type: file.name.split('.').pop().toUpperCase(),
    size: file.size,
    status: 'selected',
    sample: false,
    addedAt: Date.now(),
  }
}

