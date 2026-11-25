import { openDB } from 'idb'

const DB_NAME = 'documind_db'
const DB_VERSION = 2
const STORE_NAME = 'documents'
// Original files (PDF bytes), kept apart so loading the library stays light
const FILE_STORE = 'files'

let dbPromise = null

/**
 * Initialize or get the existing IndexedDB connection.
 * Handles browser privacy modes or lack of IndexedDB support gracefully.
 */
export async function getDB() {
  if (typeof window === 'undefined' || !window.indexedDB) {
    throw new Error('IndexedDB is not supported in this browser.')
  }

  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          store.createIndex('addedAt', 'addedAt')
          store.createIndex('type', 'type')
        }
        if (!db.objectStoreNames.contains(FILE_STORE)) {
          db.createObjectStore(FILE_STORE, { keyPath: 'id' })
        }
      },
      blocked() {
        console.warn('[DocuMind DB] Database open blocked by another tab.')
      },
      blocking() {
        console.warn('[DocuMind DB] Database connection blocking a newer version.')
      },
      terminated() {
        console.error('[DocuMind DB] Database connection abnormally terminated.')
        dbPromise = null
      },
    })
  }

  return dbPromise
}

/**
 * Retrieve all persistent documents from IndexedDB.
 *
 * @returns {Promise<import('../types/document.js').DocRecord[]>}
 */
export async function getAllDocuments() {
  try {
    const db = await getDB()
    const all = await db.getAllFromIndex(STORE_NAME, 'addedAt')
    // Return newest first
    return all.reverse()
  } catch (err) {
    console.error('[DocuMind DB] Error loading documents:', err)
    throw new Error('Could not load documents from browser storage.')
  }
}

/**
 * Save or update a document in IndexedDB.
 *
 * @param {import('../types/document.js').DocRecord} doc
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function saveDocument(doc) {
  try {
    const db = await getDB()
    // Make sure we mark persistence flag
    const recordToStore = {
      ...doc,
      storedInBrowser: true,
      persistedAt: Date.now(),
    }
    await db.put(STORE_NAME, recordToStore)
    return { success: true }
  } catch (err) {
    console.error('[DocuMind DB] Error saving document:', err)
    if (err.name === 'QuotaExceededError') {
      return {
        success: false,
        error: 'Browser storage quota exceeded. Try deleting older documents to free up space.',
      }
    }
    return {
      success: false,
      error: `Failed to save to browser storage: ${err.message || 'Unknown error'}`,
    }
  }
}

/**
 * Attach passage embeddings to a stored document without changing its
 * other fields (or its place in the library order).
 *
 * @param {string} id
 * @param {{ model: string, dim: number, count: number, data: Float32Array }} vectors
 * @returns {Promise<boolean>}
 */
export async function saveDocumentVectors(id, vectors) {
  try {
    const db = await getDB()
    const record = await db.get(STORE_NAME, id)
    if (!record) return false
    await db.put(STORE_NAME, { ...record, vectors })
    return true
  } catch (err) {
    console.warn('[DocuMind DB] Could not save passage embeddings:', err)
    return false
  }
}

/**
 * Delete a single document by its ID from IndexedDB.
 *
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteDocument(id) {
  try {
    const db = await getDB()
    const tx = db.transaction([STORE_NAME, FILE_STORE], 'readwrite')
    await Promise.all([tx.objectStore(STORE_NAME).delete(id), tx.objectStore(FILE_STORE).delete(id), tx.done])
    return true
  } catch (err) {
    console.error(`[DocuMind DB] Error deleting document ${id}:`, err)
    throw new Error('Could not delete document from browser storage.')
  }
}

/**
 * Clear all persistent documents from IndexedDB.
 *
 * @returns {Promise<boolean>}
 */
export async function clearAllDocuments() {
  try {
    const db = await getDB()
    const tx = db.transaction([STORE_NAME, FILE_STORE], 'readwrite')
    await Promise.all([tx.objectStore(STORE_NAME).clear(), tx.objectStore(FILE_STORE).clear(), tx.done])
    return true
  } catch (err) {
    console.error('[DocuMind DB] Error clearing documents:', err)
    throw new Error('Could not clear browser storage.')
  }
}

/**
 * Keep the original file of a saved document, so the reader can show its
 * real pages. Returns false (and keeps the document) if it cannot be stored.
 *
 * @param {string} id
 * @param {Blob} blob
 * @returns {Promise<boolean>}
 */
export async function saveDocumentFile(id, blob) {
  try {
    const db = await getDB()
    await db.put(FILE_STORE, { id, blob, type: blob.type, size: blob.size })
    return true
  } catch (err) {
    console.warn('[DocuMind DB] Could not keep the original file:', err)
    return false
  }
}

/**
 * The original file of a saved document, or null when none was kept
 * (sample documents, or documents saved before files were kept).
 *
 * @param {string} id
 * @returns {Promise<Blob | null>}
 */
export async function getDocumentFile(id) {
  try {
    const db = await getDB()
    const record = await db.get(FILE_STORE, id)
    return record?.blob || null
  } catch {
    return null
  }
}

/**
 * Estimate storage usage in bytes and quota.
 *
 * @returns {Promise<{ usage: number, quota: number } | null>}
 */
export async function getStorageEstimate() {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate()
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
      }
    } catch {
      return null
    }
  }
  return null
}

