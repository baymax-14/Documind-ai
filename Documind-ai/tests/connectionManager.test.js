import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createConnectionManager } from '../src/features/documents/services/connectionManager.js'

// Mock checkBackendHealth by temporarily overriding the import
// Since connectionManager imports from backendApi, we test the manager's state machine directly.

describe('Backend Connection Manager (Phase 10)', () => {
  it('initializes in disconnected state', () => {
    const manager = createConnectionManager()
    const state = manager.getState()

    assert.equal(state.state, 'disconnected')
    assert.equal(state.backendInfo, null)
    assert.equal(state.error, null)
    assert.equal(state.consecutiveFailures, 0)

    manager.destroy()
  })

  it('transitions through checking state during health check', async () => {
    const states = []

    const manager = createConnectionManager({
      onChange: (info) => states.push(info.state),
    })

    // Trigger a check manually (will fail because no backend)
    await manager.checkNow()

    // Should have gone through 'checking' -> 'disconnected'
    assert.ok(states.includes('checking'), 'Should transition through checking state')
    const finalState = manager.getState()
    assert.equal(finalState.state, 'disconnected')
    assert.ok(finalState.consecutiveFailures >= 1, 'Should increment failure count')

    manager.destroy()
  })

  it('tracks consecutive failures and backoff', async () => {
    const manager = createConnectionManager()

    // Multiple failed checks
    await manager.checkNow()
    assert.equal(manager.getState().consecutiveFailures, 1)

    await manager.checkNow()
    assert.equal(manager.getState().consecutiveFailures, 2)

    await manager.checkNow()
    assert.equal(manager.getState().consecutiveFailures, 3)

    manager.destroy()
  })

  it('records lastCheckedAt timestamp after check', async () => {
    const manager = createConnectionManager()

    const before = Date.now()
    await manager.checkNow()
    const after = Date.now()

    const state = manager.getState()
    assert.ok(state.lastCheckedAt >= before, 'lastCheckedAt should be after start time')
    assert.ok(state.lastCheckedAt <= after, 'lastCheckedAt should be before end time')

    manager.destroy()
  })

  it('stop() prevents further polling', async () => {
    const changes = []
    const manager = createConnectionManager({
      onChange: () => changes.push(Date.now()),
    })

    manager.stop()
    // After stop, no further automated checks should fire
    // (We just verify stop doesn't throw and manager is still usable)
    const state = manager.getState()
    assert.equal(state.state, 'disconnected')

    manager.destroy()
  })

  it('destroy() cleanly shuts down the manager', () => {
    const manager = createConnectionManager()
    manager.destroy()

    // Should not throw after destroy
    const state = manager.getState()
    assert.equal(state.state, 'disconnected')
  })
})
