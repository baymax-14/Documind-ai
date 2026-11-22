/**
 * DocuMind AI — Backend API Client
 *
 * Connects the React workspace to the FastAPI + PostgreSQL + Qdrant server.
 * Handles document upload, status polling, content extraction, PaperQA grounded QA,
 * and cross-document comparison workflows.
 */

const DEFAULT_API_BASE = 'http://localhost:8000/api/v1'

export const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || DEFAULT_API_BASE

/**
 * Checks backend liveness and database connectivity.
 * @returns {Promise<{ online: boolean, data?: any, error?: string }>}
 */
export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(2500),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return { online: true, data }
  } catch (err) {
    return { online: false, error: err.message }
  }
}

/**
 * Uploads a document to the backend ingestion pipeline.
 *
 * @param {File} file
 * @returns {Promise<any>}
 */
export async function uploadDocumentToBackend(file) {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_BASE_URL}/documents`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.detail || errData.error || `Upload failed with status ${res.status}`)
  }

  return await res.json()
}

/**
 * Lists documents owned by the active user on the backend.
 *
 * @returns {Promise<any[]>}
 */
export async function listBackendDocuments() {
  const res = await fetch(`${API_BASE_URL}/documents`, {
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`Failed to list backend documents: HTTP ${res.status}`)
  }

  return await res.json()
}

/**
 * Retrieves full document details including its indexed text and chunks.
 *
 * @param {string} documentId
 * @returns {Promise<any>}
 */
export async function getBackendDocumentContent(documentId) {
  const res = await fetch(`${API_BASE_URL}/documents/${documentId}/content`, {
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`Failed to get document content: HTTP ${res.status}`)
  }

  return await res.json()
}

/**
 * Retries ingestion/parsing for a failed document.
 *
 * @param {string} documentId
 * @returns {Promise<any>}
 */
export async function reprocessBackendDocument(documentId) {
  const res = await fetch(`${API_BASE_URL}/documents/${documentId}/reprocess`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`Failed to reprocess document: HTTP ${res.status}`)
  }

  return await res.json()
}

/**
 * Deletes a document from the backend.
 *
 * @param {string} documentId
 * @returns {Promise<boolean>}
 */
export async function deleteBackendDocument(documentId) {
  const res = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
    method: 'DELETE',
  })

  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete document: HTTP ${res.status}`)
  }

  return true
}

/**
 * Asks a grounded question over authorized documents.
 *
 * @param {Object} params
 * @param {string} params.question
 * @param {string[]} [params.documentIds]
 * @param {string} [params.conversationId]
 * @returns {Promise<any>}
 */
export async function askBackendQuestion({ question, documentIds, conversationId }) {
  const res = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      question,
      document_ids: documentIds && documentIds.length > 0 ? documentIds : null,
      conversation_id: conversationId || null,
    }),
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.detail || errData.error || `Chat request failed: HTTP ${res.status}`)
  }

  return await res.json()
}

/**
 * Resolves a citation ID to its verified document chunk and exact excerpt.
 *
 * @param {string} citationId
 * @returns {Promise<any>}
 */
export async function resolveBackendCitation(citationId) {
  const res = await fetch(`${API_BASE_URL}/citations/${citationId}`, {
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`Failed to resolve citation: HTTP ${res.status}`)
  }

  return await res.json()
}

/**
 * Runs multi-document comparison via the backend hybrid retrieval engine.
 *
 * @param {Object} params
 * @param {string[]} params.documentIds
 * @param {string[]} [params.dimensions]
 * @param {string} [params.customTopic]
 * @param {AbortSignal} [params.signal]
 * @returns {Promise<any>}
 */
export async function compareBackendDocuments({ documentIds, dimensions, customTopic, signal }) {
  const res = await fetch(`${API_BASE_URL}/workflows/compare`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      document_ids: documentIds,
      dimensions: dimensions || null,
      custom_topic: customTopic || null,
    }),
    signal,
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.detail || errData.error || `Comparison failed: HTTP ${res.status}`)
  }

  return await res.json()
}

/**
 * Generates an enterprise-formatted Markdown report with footnotes via the backend.
 *
 * @param {Object} params
 * @param {string} params.reportType - 'comparison' | 'chat'
 * @param {Object} params.data
 * @param {AbortSignal} [params.signal]
 * @returns {Promise<{ markdown_content: string, filename: string }>}
 */
export async function exportBackendReport({ reportType, data, signal }) {
  const res = await fetch(`${API_BASE_URL}/workflows/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      report_type: reportType,
      data,
    }),
    signal,
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.detail || errData.error || `Export failed: HTTP ${res.status}`)
  }

  return await res.json()
}

/**
 * Request section-aware document summary from backend.
 *
 * @param {string} documentId
 * @param {AbortSignal} [signal]
 * @returns {Promise<any>}
 */
export async function summarizeBackendDocument(documentId, signal) {
  const res = await fetch(`${API_BASE_URL}/workflows/summarize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ document_id: documentId }),
    signal,
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.detail || `Summarization failed: HTTP ${res.status}`)
  }

  return await res.json()
}

/**
 * Request structured schema extraction from backend.
 *
 * @param {Object} params
 * @param {string} params.documentId
 * @param {string} [params.schemaId='RESEARCH_PAPER']
 * @param {AbortSignal} [params.signal]
 * @returns {Promise<any>}
 */
export async function extractBackendStructuredData({ documentId, schemaId = 'RESEARCH_PAPER', signal }) {
  const res = await fetch(`${API_BASE_URL}/workflows/extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ document_id: documentId, schema_id: schemaId }),
    signal,
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.detail || `Extraction failed: HTTP ${res.status}`)
  }

  return await res.json()
}
