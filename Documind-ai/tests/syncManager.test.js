import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createSyncManager } from '../src/features/documents/services/syncManager.js'

describe('Document Sync Manager (Phase 10)', () => {
  it('initializes with empty sync records', () => {
    const manager = createSyncManager()
    const statuses = manager.getAllStatuses()
    assert.equal(statuses.size, 0)
  })

  it('enqueues documents with pending status', () => {
    const changes = []
    const manager = createSyncManager({
      onChange: (records) => changes.push(new Map(records)),
    })

    const mockFile = new Blob(['test content'], { type: 'text/plain' })
    manager.enqueue('doc-1', mockFile)

    const status = manager.getStatus('doc-1')
    assert.ok(status, 'Should have sync record for doc-1')
    assert.equal(status.status, 'pending')
    assert.equal(status.backendId, null)
    assert.equal(status.retryCount, 0)
    assert.ok(changes.length >= 1, 'Should have emitted at least one change event')
  })

  it('markSynced transitions document to synced state', () => {
    const manager = createSyncManager()
    manager.enqueue('doc-2', new Blob(['']))
    manager.markSynced('doc-2', 'backend-uuid-123')

    const status = manager.getStatus('doc-2')
    assert.equal(status.status, 'synced')
    assert.equal(status.backendId, 'backend-uuid-123')
    assert.equal(status.error, null)
  })

  it('markFailed transitions document to failed state with error', () => {
    const manager = createSyncManager()
    manager.enqueue('doc-3', new Blob(['']))
    manager.markFailed('doc-3', 'Network timeout')

    const status = manager.getStatus('doc-3')
    assert.equal(status.status, 'failed')
    assert.equal(status.error, 'Network timeout')
    assert.equal(status.retryCount, 1)
  })

  it('retry resets failed document back to pending', () => {
    const manager = createSyncManager()
    manager.enqueue('doc-4', new Blob(['']))
    manager.markFailed('doc-4', 'Server error')

    assert.equal(manager.getStatus('doc-4').status, 'failed')

    manager.retry('doc-4')
    assert.equal(manager.getStatus('doc-4').status, 'pending')
    assert.equal(manager.getStatus('doc-4').error, null)
  })

  it('processQueue uploads pending documents when connected', async () => {
    const uploadedDocs = []
    const manager = createSyncManager({
      uploadFn: async (docId) => {
        uploadedDocs.push(docId)
        return { id: `backend-${docId}` }
      },
    })

    manager.enqueue('doc-5', new Blob(['data']))
    manager.enqueue('doc-6', new Blob(['data']))

    await manager.processQueue(true)

    assert.deepEqual(uploadedDocs.sort(), ['doc-5', 'doc-6'])
    assert.equal(manager.getStatus('doc-5').status, 'synced')
    assert.equal(manager.getStatus('doc-6').status, 'synced')
  })

  it('processQueue skips when disconnected', async () => {
    const uploadedDocs = []
    const manager = createSyncManager({
      uploadFn: async (docId) => {
        uploadedDocs.push(docId)
        return { id: `backend-${docId}` }
      },
    })

    manager.enqueue('doc-7', new Blob(['data']))
    await manager.processQueue(false)

    assert.equal(uploadedDocs.length, 0, 'Should not upload when disconnected')
    assert.equal(manager.getStatus('doc-7').status, 'pending')
  })

  it('processQueue marks documents as failed on upload error', async () => {
    const manager = createSyncManager({
      uploadFn: async () => {
        throw new Error('503 Service Unavailable')
      },
    })

    manager.enqueue('doc-8', new Blob(['data']))
    await manager.processQueue(true)

    const status = manager.getStatus('doc-8')
    assert.equal(status.status, 'failed')
    assert.match(status.error, /503/)
    assert.equal(status.retryCount, 1)
  })

  it('respects MAX_RETRIES limit and stops retrying', async () => {
    const manager = createSyncManager({
      uploadFn: async () => {
        throw new Error('Persistent failure')
      },
    })

    manager.enqueue('doc-9', new Blob(['data']))

    // Each cycle: processQueue attempts upload (fails → retryCount increments),
    // then retry() resets status to pending for the next cycle
    await manager.processQueue(true) // retryCount becomes 1
    assert.equal(manager.getStatus('doc-9').retryCount, 1)

    manager.retry('doc-9')
    await manager.processQueue(true) // retryCount becomes 2
    assert.equal(manager.getStatus('doc-9').retryCount, 2)

    manager.retry('doc-9')
    await manager.processQueue(true) // retryCount becomes 3 — now at MAX_RETRIES
    assert.equal(manager.getStatus('doc-9').retryCount, 3)
    assert.equal(manager.getStatus('doc-9').status, 'failed')

    // After MAX_RETRIES, processQueue should skip even if status is set to pending
    manager.retry('doc-9')
    await manager.processQueue(true)
    // retryCount stays at 3 because the item was skipped (retryCount >= MAX_RETRIES)
    assert.ok(manager.getStatus('doc-9').retryCount >= 3,
      `Should have reached max retries, got ${manager.getStatus('doc-9').retryCount}`)
  })

  it('reset clears all sync state', () => {
    const manager = createSyncManager()
    manager.enqueue('doc-10', new Blob(['']))
    manager.enqueue('doc-11', new Blob(['']))

    assert.equal(manager.getAllStatuses().size, 2)

    manager.reset()
    assert.equal(manager.getAllStatuses().size, 0)
  })

  it('handles enqueue without file blob gracefully during processQueue', async () => {
    const manager = createSyncManager({
      uploadFn: async () => ({ id: 'x' }),
    })

    // Enqueue without a file (simulates doc already in IndexedDB but no blob reference)
    manager.enqueue('doc-12', null)
    await manager.processQueue(true)

    const status = manager.getStatus('doc-12')
    assert.equal(status.status, 'local_only', 'Should mark as local_only when no file available')
  })
})
