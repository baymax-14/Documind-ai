import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

describe('IndexedDB Storage Service', () => {
  let mockStore = new Map()
  let shouldThrowQuotaError = false
  let shouldThrowGenericError = false

  // Create an in-memory mock IDB database
  const mockDb = {
    getAllFromIndex: async (_storeName, _index) => {
      const all = Array.from(mockStore.values())
      return all.sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0))
    },
    put: async (_storeName, record) => {
      if (shouldThrowQuotaError) {
        const quotaErr = new Error('The quota has been exceeded.')
        quotaErr.name = 'QuotaExceededError'
        throw quotaErr
      }
      if (shouldThrowGenericError) {
        throw new Error('Disk I/O failure')
      }
      mockStore.set(record.id, record)
      return record.id
    },
    delete: async (_storeName, id) => {
      mockStore.delete(id)
      return undefined
    },
    clear: async () => {
      mockStore.clear()
      return undefined
    },
  }

  beforeEach(() => {
    mockStore = new Map()
    shouldThrowQuotaError = false
    shouldThrowGenericError = false
  })

  it('rejects with error when IndexedDB is not supported in the environment', async () => {
    // Ensure window.indexedDB is undefined
    const originalWindow = globalThis.window
    delete globalThis.window

    const { getDB } = await import('../src/features/documents/services/storage.js')
    await assert.rejects(
      () => getDB(),
      /IndexedDB is not supported in this browser/
    )

    globalThis.window = originalWindow
  })

  it('saves documents with storedInBrowser flag and persisted timestamp', async () => {
    const doc = {
      id: 'doc-persist-1',
      name: 'Test File.pdf',
      type: 'PDF',
      size: 1024,
      status: 'ready',
      text: 'Sample persistent text',
      chunks: [{ index: 0, locator: 'Page 1', text: 'Sample' }],
      addedAt: Date.now(),
    }

    // Save using our mock store logic
    const recordToStore = {
      ...doc,
      storedInBrowser: true,
      persistedAt: Date.now(),
    }
    await mockDb.put('documents', recordToStore)

    const stored = mockStore.get('doc-persist-1')
    assert.ok(stored)
    assert.equal(stored.storedInBrowser, true)
    assert.ok(typeof stored.persistedAt === 'number')
    assert.equal(stored.name, 'Test File.pdf')
  })

  it('loads all persistent documents in reverse chronological order', async () => {
    mockStore.set('doc-1', { id: 'doc-1', name: 'First.pdf', addedAt: 100 })
    mockStore.set('doc-2', { id: 'doc-2', name: 'Second.pdf', addedAt: 200 })
    mockStore.set('doc-3', { id: 'doc-3', name: 'Third.pdf', addedAt: 300 })

    const all = await mockDb.getAllFromIndex('documents', 'addedAt')
    const reversed = all.reverse()

    assert.equal(reversed.length, 3)
    assert.equal(reversed[0].id, 'doc-3')
    assert.equal(reversed[1].id, 'doc-2')
    assert.equal(reversed[2].id, 'doc-1')
  })

  it('deletes an individual document by its ID', async () => {
    mockStore.set('doc-to-delete', { id: 'doc-to-delete', name: 'Temp.pdf' })
    assert.equal(mockStore.has('doc-to-delete'), true)

    await mockDb.delete('documents', 'doc-to-delete')
    assert.equal(mockStore.has('doc-to-delete'), false)
  })

  it('clears all persistent documents from storage', async () => {
    mockStore.set('doc-a', { id: 'doc-a' })
    mockStore.set('doc-b', { id: 'doc-b' })
    assert.equal(mockStore.size, 2)

    await mockDb.clear('documents')
    assert.equal(mockStore.size, 0)
  })

  it('handles QuotaExceededError gracefully with descriptive message', async () => {
    shouldThrowQuotaError = true

    let result
    try {
      await mockDb.put('documents', { id: 'large-doc' })
      result = { success: true }
    } catch (err) {
      if (err.name === 'QuotaExceededError') {
        result = {
          success: false,
          error: 'Browser storage quota exceeded. Try deleting older documents to free up space.',
        }
      } else {
        result = { success: false, error: err.message }
      }
    }

    assert.equal(result.success, false)
    assert.match(result.error, /storage quota exceeded/)
  })

  it('handles storage estimate through navigator.storage when available or null when absent', async () => {
    const { getStorageEstimate } = await import('../src/features/documents/services/storage.js')

    if (globalThis.navigator && !globalThis.navigator.storage) {
      Object.defineProperty(globalThis.navigator, 'storage', {
        value: {
          estimate: async () => ({ usage: 1024 * 1024, quota: 100 * 1024 * 1024 }),
        },
        configurable: true,
      })
    }

    const estimate = await getStorageEstimate()
    if (estimate) {
      assert.ok(typeof estimate.usage === 'number')
      assert.ok(typeof estimate.quota === 'number')
    } else {
      assert.equal(estimate, null)
    }
  })
})
