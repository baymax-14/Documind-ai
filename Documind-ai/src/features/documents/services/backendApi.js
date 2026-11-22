/**
 * DocuMind AI — Backend API Client
 *
 * Connects the React workspace to the FastAPI + PostgreSQL + Qdrant server.
 * Handles document upload, status polling, content extraction, and PaperQA grounded QA.
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
 * Retrieves extracted document chunks and locators.
 *
 * @param {string} documentId
 * @returns {Promise<any>}
 */
export async function getBackendDocumentContent(documentId) {
  const res = await fetch(`${API_BASE_URL}/documents/${documentId}/content`, {
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`Failed to retrieve document content: HTTP ${res.status}`)
  }

  return await res.json()
}

/**
 * Requests backend to re-run ingestion and hybrid indexing for a document.
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
 * Soft-deletes a document and purges its stored bytes and vector index.
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
