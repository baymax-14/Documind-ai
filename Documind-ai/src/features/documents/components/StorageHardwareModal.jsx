import { useEffect, useRef } from 'react'
import {
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
 * Storage & hardware diagnostics for the local prototype.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {Object} [props.gpuInfo]
 * @param {Object} [props.storageEstimate]
 * @param {number} props.docCount
 * @param {number} props.storedCount
 * @param {string} props.modelStatus
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
  onClearLibrary,
}) {
  const modalRef = useRef(null)
  const closeButtonRef = useRef(null)
  const returnFocusRef = useRef(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return undefined

    returnFocusRef.current = document.activeElement
    closeButtonRef.current?.focus()

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }

      if (e.key !== 'Tab') return
      const focusable = modalRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable?.length) {
        e.preventDefault()
        modalRef.current?.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      returnFocusRef.current?.focus?.()
    }
  }, [isOpen])

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
              <h2 id="storage-modal-title">Storage &amp; Hardware</h2>
              <p>Current browser storage and hardware capability</p>
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
                  <span className="spec-label">AI model</span>
                  <span className="spec-value">Not connected in this prototype</span>
                </div>
                <div className="diag-spec-item">
                  <span className="spec-label">Model downloads</span>
                  <span className="spec-value">Not connected</span>
                </div>
                <div className="diag-spec-item">
                  <span className="spec-label">AI runtime status</span>
                  <span className="spec-value status-highlight">
                    {modelStatus === 'ready'
                      ? 'Demo engine active; no model inference'
                      : modelStatus === 'downloading'
                      ? 'Demo setup progress; no model download'
                      : 'Evidence preview; no model loaded'}
                  </span>
                </div>
              </div>

            </article>
          </div>

          <div className="diag-privacy-seal">
            <div className="seal-text">
              <h4>Prototype status</h4>
              <p>This prototype uses browser storage. Server uploads, cloud processing, and real AI inference are not connected.</p>
            </div>
          </div>
        </div>

        <footer className="storage-modal-footer">
          <span className="modal-footer-note">
            DocuMind AI · Local Workbench v0.1.0
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

