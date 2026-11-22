/**
 * Persistent Conversation History Store for DocuMind AI.
 *
 * Uses IndexedDB (`documind_conversations`) to persist AI chat conversations
 * across page refreshes. Supports CRUD operations, auto-title generation,
 * and listing with metadata.
 */

const DB_NAME = 'documind_conversations'
const DB_VERSION = 1
const STORE_NAME = 'conversations'

/**
 * @typedef {Object} ConversationRecord
 * @property {string} id - Unique conversation ID.
 * @property {string} title - Auto-generated or user-set title.
 * @property {Array<Object>} messages - Array of chat message objects.
 * @property {number} createdAt - Timestamp of creation.
 * @property {number} updatedAt - Timestamp of last update.
 * @property {number} messageCount - Total message count.
 */

/**
 * Open or create the conversations IndexedDB database.
 *
 * @returns {Promise<IDBDatabase>}
 */
export function getConversationDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment.'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('updatedAt', 'updatedAt', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Generate a concise title from the first user message in a conversation.
 *
 * @param {Array<Object>} messages
 * @returns {string}
 */
export function generateConversationTitle(messages) {
  const firstUserMsg = messages.find((m) => m.sender === 'user')
  if (!firstUserMsg || !firstUserMsg.text) return 'Untitled conversation'

  const text = firstUserMsg.text.trim()
  if (text.length <= 60) return text
  return text.slice(0, 57).trimEnd() + '…'
}

/**
 * Save or update a conversation in IndexedDB.
 *
 * @param {string} id - Conversation ID.
 * @param {Array<Object>} messages - Chat messages.
 * @param {string} [title] - Optional explicit title.
 * @returns {Promise<ConversationRecord>}
 */
export async function saveConversation(id, messages, title) {
  if (!id || !Array.isArray(messages)) {
    throw new Error('saveConversation requires a valid id and messages array.')
  }

  const db = await getConversationDB()
  const now = Date.now()

  // Try to get existing record for createdAt
  const existing = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(id)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })

  const record = {
    id,
    title: title || generateConversationTitle(messages),
    messages,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    messageCount: messages.length,
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.put(record)
    request.onsuccess = () => resolve(record)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Load a conversation by ID.
 *
 * @param {string} id
 * @returns {Promise<ConversationRecord|null>}
 */
export async function loadConversation(id) {
  if (!id) return null
  const db = await getConversationDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(id)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

/**
 * List all conversations, ordered by most recently updated.
 *
 * @returns {Promise<ConversationRecord[]>}
 */
export async function listConversations() {
  const db = await getConversationDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()
    request.onsuccess = () => {
      const records = request.result || []
      records.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      resolve(records)
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Delete a conversation by ID.
 *
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteConversation(id) {
  if (!id) return false
  const db = await getConversationDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(id)
    request.onsuccess = () => resolve(true)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Delete all conversations.
 *
 * @returns {Promise<boolean>}
 */
export async function clearAllConversations() {
  const db = await getConversationDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.clear()
    request.onsuccess = () => resolve(true)
    request.onerror = () => reject(request.error)
  })
}
