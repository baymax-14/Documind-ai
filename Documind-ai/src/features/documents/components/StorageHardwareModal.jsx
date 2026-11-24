import { useRef } from 'react'
import { useOverlay } from '../hooks/useOverlay.js'
import {
  Cloud,
  Cpu,
  Database,
  HardDrive,
  Trash2,
  X,
} from 'lucide-react'

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 MB'
  const mb = bytes / (1024 * 1024)
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  return `${(mb / 1024).toFixed(1)} GB`
}

/**
 * Storage, device and connection details. Also home to the server status
 * and token usage that used to sit in the page header.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {Object} [props.gpuInfo]
 * @param {Object} [props.storageEstimate]
 * @param {number} props.docCount
 * @param {number} props.storedCount
 * @param {string} props.modelStatus
 * @param {string} [props.activeModelName]
 * @param {{ state: string, error?: string, backendInfo?: Object }} [props.connectionInfo]
 * @param {() => void} [props.onCheckConnection]
 * @param {{ totalTokens: number, budget: number }} [props.tokenMetrics]
 * @param {() => void} [props.onOpenTokenDetails]
 * @param {() => void} props.onClearLibrary
 */
function StorageHardwareModal({
  isOpen,
  onClose,
  gpuInfo,
  storageEstimate,
  docCount,
  storedCount,
  modelStatus,
  activeModelName = '',
  connectionInfo = { state: 'disconnected' },
  onCheckConnection,
  tokenMetrics = null,
  onOpenTokenDetails,
  onClearLibrary,
}) {
  const modalRef = useRef(null)
  const closeButtonRef = useRef(null)

  useOverlay({ active: isOpen, containerRef: modalRef, onClose })

  if (!isOpen) return null

  const usagePercent =
    storageEstimate?.quota > 0
      ? Math.min(100, Math.max(1, (storageEstimate.usage / storageEstimate.quota) * 100))
      : 0

  return (
    <div
      className="storage-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="storage-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="storage-modal" ref={modalRef} tabIndex={-1}>
        <header className="storage-modal-header">
          <div className="storage-modal-title">
            <span className="storage-modal-badge">
              <Database size={18} aria-hidden="true" />
            </span>
            <div>
              <h2 id="storage-modal-title">Storage and device</h2>
              <p>What this browser stores, what this device can run, and any server connection</p>
            </div>
          </div>
          <button
            className="storage-close-btn"
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close diagnostics dialog (Esc)"
            title="Close dialog (Esc)"
          >
            <X size={18} />
          </button>
        </header>

        <div className="storage-modal-body">
          {/* Grid of Diagnostics Cards */}
          <div className="storage-cards-grid">
            {/* 1. IndexedDB Storage */}
            <article className="diag-card diag-storage">
              <div className="diag-card-head">
                <span className="diag-icon mint">
                  <HardDrive size={18} aria-hidden="true" />
                </span>
                <div>
                  <h3>Storage in this browser</h3>
                  <span className="diag-status-pill pill-mint">On this device</span>
                </div>
              </div>

              <div className="diag-metric-row">
                <div className="diag-metric">
                  <small>Documents in Library</small>
                  <strong>{docCount}</strong>
                  <span>({storedCount} saved in browser)</span>
                </div>
                <div className="diag-metric">
                  <small>Storage Allocated</small>
                  <strong>{formatBytes(storageEstimate?.usage || 0)}</strong>
                  <span>of ~{formatBytes(storageEstimate?.quota || 0)} quota</span>
                </div>
              </div>

              <div className="diag-progress-bar" role="progressbar" aria-valuenow={usagePercent} aria-valuemin="0" aria-valuemax="100">
                <div
                  className="diag-progress-fill"
                  style={{ transform: `scaleX(${usagePercent === 0 ? 0 : Math.max(2, usagePercent) / 100})` }}
                />
              </div>

                <p className="diag-desc">
                Documents you save are kept in this browser's database (IndexedDB) on this device. They are not uploaded anywhere.
              </p>

              {storedCount > 0 && (
                <div className="diag-action-row">
                  <button
                    className="diag-danger-btn"
                    onClick={() => {
                      onClearLibrary()
                      onClose()
                    }}
                  >
                    <Trash2 size={13} aria-hidden="true" /> Clear Stored Documents
                  </button>
                </div>
              )}
            </article>

            {/* 2. WebGPU & Model Engine */}
            <article className="diag-card diag-webgpu">
              <div className="diag-card-head">
                <span className="diag-icon sky">
                  <Cpu size={18} aria-hidden="true" />
                </span>
                <div>
                  <h3>WebGPU capability</h3>
                  {gpuInfo?.supported ? (
                    <span className="diag-status-pill pill-green">Adapter available</span>
                  ) : gpuInfo ? (
                    <span className="diag-status-pill pill-yellow">Adapter unavailable</span>
                  ) : (
                    <span className="diag-status-pill pill-yellow">Checking adapter</span>
                  )}
                </div>
              </div>

              <div className="diag-specs-list">
                <div className="diag-spec-item">
                  <span className="spec-label">WebGPU Adapter</span>
                  <span className="spec-value">
                    {gpuInfo?.supported ? (
                      gpuInfo.info?.vendor ? `${gpuInfo.info.vendor} (${gpuInfo.info.architecture || 'Discrete'})` : 'Supported & Available'
                    ) : gpuInfo ? (
                      'Unavailable'
                    ) : (
                      'Checking availability'
                    )}
                  </span>
                </div>
                <div className="diag-spec-item">
                  <span className="spec-label">On-device model</span>
                  <span className={`spec-value ${modelStatus === 'error' ? 'status-highlight' : ''}`}>
                    {modelStatus === 'ready'
                      ? `${activeModelName || 'Model'} loaded and writing answers`
                      : modelStatus === 'downloading'
                      ? 'Downloading…'
                      : modelStatus === 'error'
                      ? 'Setup failed; showing passages only'
                      : gpuInfo && !gpuInfo.supported
                      ? 'Not available on this device; showing passages only'
                      : 'None loaded; showing passages only'}
                  </span>
                </div>
                <div className="diag-spec-item">
                  <span className="spec-label">Faster 16-bit models</span>
                  <span className="spec-value">
                    {gpuInfo?.supported ? (gpuInfo.info?.shaderF16 ? 'Supported' : 'Not supported; uses the 32-bit versions') : '—'}
                  </span>
                </div>
              </div>

            </article>

            {/* 3. Server connection and token usage */}
            <article className="diag-card diag-connection">
              <div className="diag-card-head">
                <span className="diag-icon">
                  <Cloud size={18} aria-hidden="true" />
                </span>
                <div>
                  <h3>Server and usage</h3>
                  <span className="diag-status-pill">
                    {connectionInfo.state === 'connected'
                      ? 'Server connected'
                      : connectionInfo.state === 'checking'
                      ? 'Checking…'
                      : 'Working in this browser only'}
                  </span>
                </div>
              </div>

              <div className="diag-specs-list">
                <div className="diag-spec-item">
                  <span className="spec-label">DocuMind server</span>
                  <span className="spec-value">
                    {connectionInfo.state === 'connected'
                      ? `Connected${connectionInfo.backendInfo?.environment ? ` (${connectionInfo.backendInfo.environment})` : ''}. Questions ask before they are sent.`
                      : 'None connected. Nothing is sent anywhere.'}
                  </span>
                </div>
                <div className="diag-spec-item">
                  <span className="spec-label">Tokens used this session</span>
                  <span className="spec-value">
                    {(tokenMetrics?.totalTokens || 0).toLocaleString()} of {(tokenMetrics?.budget || 100000).toLocaleString()} (counted only when a model writes an answer)
                  </span>
                </div>
              </div>

              <div className="diag-action-row">
                <button type="button" className="secondary-button" onClick={onCheckConnection}>
                  Check server again
                </button>
                {onOpenTokenDetails && (
                  <button type="button" className="secondary-button" onClick={onOpenTokenDetails}>
                    Token details
                  </button>
                )}
              </div>
            </article>
          </div>

          <div className="diag-privacy-seal">
            <div className="seal-text">
              <h4>What leaves this device</h4>
              <p>Documents and questions stay in this browser unless you send a question to a connected server. Only model files are downloaded, and only when you turn them on.</p>
            </div>
          </div>
        </div>

        <footer className="storage-modal-footer">
          <span className="modal-footer-note">
            DocuMind AI 0.1.0
          </span>
          <button className="primary-button" onClick={onClose}>
            Done
          </button>
        </footer>
      </div>
    </div>
  )
}

export default StorageHardwareModal

