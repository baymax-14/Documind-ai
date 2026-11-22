/**
 * Table data structures and type definitions for DocuMind AI (Phase 11).
 */

/**
 * @typedef {Object} TableCell
 * @property {number} rowIndex - 0-based row index.
 * @property {number} colIndex - 0-based column index.
 * @property {string} value - Raw string value of cell.
 * @property {string} header - Column header name.
 * @property {string} [rowHeader] - Leading row label (from column 0).
 * @property {string} locator - Fine-grained cell citation locator.
 */

/**
 * @typedef {Object} DocTable
 * @property {string} id - Unique table identifier.
 * @property {string} [title] - Caption or inferred title above table.
 * @property {string[]} headers - Column header labels.
 * @property {Array<Array<string>>} rows - 2D matrix of cell values.
 * @property {TableCell[]} cells - Flattened indexed cells for coordinate retrieval.
 * @property {number} [page] - 1-based page number if available.
 * @property {string} locator - Table-level locator anchor.
 * @property {number} rowCount - Total number of data rows.
 * @property {number} colCount - Total number of columns.
 */
