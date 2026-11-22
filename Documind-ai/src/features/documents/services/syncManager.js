/**
 * Document Sync Manager for DocuMind AI.
 *
 * Manages dual-track document upload between local IndexedDB and backend server.
 * Tracks per-document sync state, queues uploads when backend is available,
 * and handles reconnection sync.
 */

/** @typedef {'local_only' | 'pending' | 'uploading' | 'processing' | 'synced' | 'failed'} SyncStatus */

/**
 * @typedef {Object} SyncRecord
 * @property {string} docId - Document ID.
 * @property {SyncStatus} status - Current sync state.
 * @property {string|null} backendId - Backend document ID after upload.
 * @property {string|null} error - Error message if failed.
 * @property {number} lastAttemptAt - Timestamp of last sync attempt.
 * @property {number} retryCount - Number of upload retry attempts.
 */

const MAX_RETRIES = 3

/**
 * Create a sync manager instance.
 *
 * @param {Object} options
 * @param {(docId: string, file: File|Blob) => Promise<any>} options.uploadFn - Backend upload function.
 * @param {(records: Map<string, SyncRecord>) => void} [options.onChange] - State change callback.
 * @returns {{
 *   getStatus: (docId: string) => SyncRecord | undefined,
 *   getAllStatuses: () => Map<string, SyncRecord>,
 *   enqueue: (docId: string, file: File|Blob) => void,
 *   markSynced: (docId: string, backendId: string) => void,
 *   markFailed: (docId: string, error: string) => void,
 *   retry: (docId: string) => void,
 *   processQueue: (isConnected: boolean) => Promise<void>,
 *   reset: () => void,
 * }}
 */
export function createSyncManager(options = {}) {
  const { uploadFn, onChange } = options

  /** @type {Map<string, SyncRecord>} */
  const records = new Map()

  /** @type {Map<string, File|Blob>} */
  const pendingFiles = new Map()

  let processing = false

  function emit() {
    if (onChange) onChange(new Map(records))
  }

  function getStatus(docId) {
    return records.get(docId)
  }

  function getAllStatuses() {
    return new Map(records)
  }

  function enqueue(docId, file) {
    if (!docId) return

    records.set(docId, {
      docId,
      status: 'pending',
      backendId: null,
      error: null,
      lastAttemptAt: 0,
      retryCount: 0,
    })

    if (file) {
      pendingFiles.set(docId, file)
    }

    emit()
  }

  function markSynced(docId, backendId) {
    const existing = records.get(docId)
    records.set(docId, {
      ...(existing || { docId, lastAttemptAt: 0, retryCount: 0 }),
      docId,
      status: 'synced',
      backendId: backendId || null,
      error: null,
    })
    pendingFiles.delete(docId)
    emit()
  }

  function markFailed(docId, error) {
    const existing = records.get(docId)
    records.set(docId, {
      ...(existing || { docId, backendId: null, lastAttemptAt: 0, retryCount: 0 }),
      docId,
      status: 'failed',
      error: error || 'Unknown error',
      lastAttemptAt: Date.now(),
      retryCount: (existing?.retryCount || 0) + 1,
    })
    emit()
  }

  function retry(docId) {
    const existing = records.get(docId)
    if (!existing) return

    records.set(docId, {
      ...existing,
      status: 'pending',
      error: null,
    })
    emit()
  }

  async function processQueue(isConnected) {
    if (!isConnected || processing || !uploadFn) return
    processing = true

    const pending = [...records.entries()]
      .filter(([, r]) => r.status === 'pending' && r.retryCount < MAX_RETRIES)

    for (const [docId, record] of pending) {
      const file = pendingFiles.get(docId)
      if (!file) {
        // No file data available; mark as local_only
        records.set(docId, { ...record, status: 'local_only' })
        emit()
        continue
      }

      // Update status to uploading
      records.set(docId, { ...record, status: 'uploading', lastAttemptAt: Date.now() })
      emit()

      try {
        const result = await uploadFn(docId, file)
        const backendId = result?.id || result?.document_id || docId
        markSynced(docId, backendId)
      } catch (err) {
        markFailed(docId, err.message || 'Upload failed')
      }
    }

    processing = false
  }

  function reset() {
    records.clear()
    pendingFiles.clear()
    processing = false
    emit()
  }

  return {
    getStatus,
    getAllStatuses,
    enqueue,
    markSynced,
    markFailed,
    retry,
    processQueue,
    reset,
  }
}
