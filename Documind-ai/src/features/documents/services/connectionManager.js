/**
 * Backend Connection Manager for DocuMind AI.
 *
 * Provides reactive connection state monitoring with periodic health checks,
 * exponential backoff on failure, and graceful degradation to local-only mode.
 */
import { checkBackendHealth } from './backendApi.js'

/** @typedef {'connected' | 'disconnected' | 'checking'} ConnectionState */

const POLL_INTERVAL_MS = 30_000
const MIN_BACKOFF_MS = 5_000
const MAX_BACKOFF_MS = 120_000

/**
 * @typedef {Object} ConnectionInfo
 * @property {ConnectionState} state
 * @property {Object|null} backendInfo - Server health response data.
 * @property {string|null} error - Last error message if disconnected.
 * @property {number} lastCheckedAt - Timestamp of last health check.
 * @property {number} consecutiveFailures - Count of sequential failed checks.
 */

/**
 * Create a connection manager instance that monitors backend availability.
 *
 * @param {Object} [options]
 * @param {(info: ConnectionInfo) => void} [options.onChange] - Callback when state changes.
 * @param {boolean} [options.autoStart=false] - Start polling immediately.
 * @returns {{
 *   getState: () => ConnectionInfo,
 *   checkNow: () => Promise<ConnectionInfo>,
 *   start: () => void,
 *   stop: () => void,
 *   destroy: () => void,
 * }}
 */
export function createConnectionManager(options = {}) {
  const { onChange, autoStart = false } = options

  /** @type {ConnectionInfo} */
  let info = {
    state: 'disconnected',
    backendInfo: null,
    error: null,
    lastCheckedAt: 0,
    consecutiveFailures: 0,
  }

  let timerId = null
  let destroyed = false

  function emit() {
    if (onChange && !destroyed) onChange({ ...info })
  }

  function getBackoffDelay() {
    if (info.consecutiveFailures <= 1) return POLL_INTERVAL_MS
    const delay = Math.min(
      MIN_BACKOFF_MS * Math.pow(2, info.consecutiveFailures - 1),
      MAX_BACKOFF_MS
    )
    return delay
  }

  async function performCheck() {
    if (destroyed) return info

    const prevState = info.state
    info = { ...info, state: 'checking' }
    if (prevState !== 'checking') emit()

    const result = await checkBackendHealth()

    if (destroyed) return info

    if (result.online) {
      info = {
        state: 'connected',
        backendInfo: result.data || null,
        error: null,
        lastCheckedAt: Date.now(),
        consecutiveFailures: 0,
      }
    } else {
      info = {
        state: 'disconnected',
        backendInfo: null,
        error: result.error || 'Backend unreachable',
        lastCheckedAt: Date.now(),
        consecutiveFailures: info.consecutiveFailures + 1,
      }
    }

    emit()
    return { ...info }
  }

  function scheduleNext() {
    if (destroyed) return
    clearTimeout(timerId)
    const delay = info.state === 'connected' ? POLL_INTERVAL_MS : getBackoffDelay()
    timerId = setTimeout(async () => {
      await performCheck()
      scheduleNext()
    }, delay)
  }

  function start() {
    if (destroyed) return
    performCheck().then(() => scheduleNext())
  }

  function stop() {
    clearTimeout(timerId)
    timerId = null
  }

  function destroy() {
    destroyed = true
    stop()
  }

  if (autoStart) start()

  return {
    getState: () => ({ ...info }),
    checkNow: performCheck,
    start,
    stop,
    destroy,
  }
}
