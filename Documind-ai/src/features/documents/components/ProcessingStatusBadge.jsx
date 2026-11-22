import { AlertCircle, CheckCircle2, Cloud, HardDrive, Loader2, RefreshCw } from 'lucide-react'

/**
 * Visual badge indicating document sync and backend processing status.
 *
 * @param {Object} props
 * @param {'local_only' | 'pending' | 'uploading' | 'processing' | 'synced' | 'failed'} props.status
 * @param {string} [props.error] - Error message if failed.
 * @param {() => void} [props.onRetry] - Retry callback for failed sync.
 * @param {string} [props.className]
 */
export default function ProcessingStatusBadge({ status, error, onRetry, className = '' }) {
  if (!status || status === 'local_only') {
    return (
      <span
        className={`processing-badge badge-local ${className}`}
        title="Stored securely in browser IndexedDB. Not transmitted to server."
      >
        <HardDrive size={11} aria-hidden="true" />
        <span>Local</span>
      </span>
    )
  }

  if (status === 'pending') {
    return (
      <span
        className={`processing-badge badge-pending ${className}`}
        title="Queued for backend sync when connection is active."
      >
        <Loader2 size={11} className="spin-icon" aria-hidden="true" />
        <span>Sync queued</span>
      </span>
    )
  }

  if (status === 'uploading') {
    return (
      <span
        className={`processing-badge badge-uploading ${className}`}
        title="Uploading document binary to server..."
      >
        <Cloud size={11} className="pulse-icon" aria-hidden="true" />
        <span>Uploading…</span>
      </span>
    )
  }

  if (status === 'processing') {
    return (
      <span
        className={`processing-badge badge-processing ${className}`}
        title="Server is parsing, chunking, and indexing embeddings..."
      >
        <Loader2 size={11} className="spin-icon" aria-hidden="true" />
        <span>Ingesting…</span>
      </span>
    )
  }

  if (status === 'synced') {
    return (
      <span
        className={`processing-badge badge-synced ${className}`}
        title="Document is indexed in backend vector collection and ready for hybrid QA."
      >
        <CheckCircle2 size={11} aria-hidden="true" />
        <span>Synced</span>
      </span>
    )
  }

  if (status === 'failed') {
    return (
      <span
        className={`processing-badge badge-failed ${className}`}
        title={error || 'Sync failed. Click retry to re-queue upload.'}
      >
        <AlertCircle size={11} aria-hidden="true" />
        <span>Failed</span>
        {onRetry && (
          <button
            type="button"
            className="badge-retry-btn"
            onClick={(e) => {
              e.stopPropagation()
              onRetry()
            }}
            aria-label="Retry sync"
            title="Retry sync"
          >
            <RefreshCw size={10} aria-hidden="true" />
          </button>
        )}
      </span>
    )
  }

  return null
}
