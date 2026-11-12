import { useEffect } from 'react'
import {
  ArrowRight,
  FileText,
  Info,
  ShieldCheck,
  X,
} from 'lucide-react'

/**
 * Modal dialog that explicitly surfaces candidate document chunks
 * and asks for user approval before generating an AI grounded answer.
 *
 * @param {Object} props
 * @param {string} props.question - The question asked by user.
 * @param {Array<{ docId: string, docName: string, docType: string, locator: string, text: string }>} props.chunks - Candidate chunks.
 * @param {() => void} props.onApprove - Callback when approved.
 * @param {() => void} props.onCancel - Callback when cancelled.
 */
function ExcerptConsentModal({ question, chunks, onApprove, onCancel }) {
  // Close on Escape
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <div
      className="consent-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
    >
      <div className="consent-modal">
        <header className="consent-modal-header">
          <div className="consent-title-area">
            <span className="consent-shield-icon">
              <ShieldCheck size={20} aria-hidden="true" />
            </span>
            <div>
              <h3 id="consent-title">Review Document Excerpts</h3>
              <p>Verify the source passages being referenced for your question.</p>
            </div>
          </div>
          <button className="consent-close-btn" onClick={onCancel} aria-label="Cancel">
            <X size={16} />
          </button>
        </header>

        <div className="consent-modal-body">
          <div className="consent-question-box">
            <span className="consent-label">Your Question:</span>
            <p className="consent-question-text">"{question}"</p>
          </div>

          <div className="consent-excerpts-header">
            <span className="consent-label">
              Retrieved Source Passages ({chunks.length}):
            </span>
            <span className="consent-retrieval-tag">Minimum necessary chunks</span>
          </div>

          <div className="consent-chunks-list">
            {chunks.map((chunk, idx) => (
              <article key={idx} className="consent-chunk-card">
                <div className="consent-chunk-meta">
                  <span className={`file-icon file-${chunk.docType.toLowerCase()} consent-file-icon`}>
                    {chunk.docType}
                  </span>
                  <span className="consent-doc-name">{chunk.docName}</span>
                  <span className="consent-locator-badge">
                    <FileText size={11} aria-hidden="true" /> {chunk.locator}
                  </span>
                </div>
                <p className="consent-chunk-text">"{chunk.text}"</p>
              </article>
            ))}
          </div>

          <div className="consent-privacy-banner">
            <Info size={15} aria-hidden="true" />
            <span>
              <strong>Simulated Grounded AI Engine:</strong> In this release, reasoning runs locally in-browser. Zero file bytes or excerpts leave your machine.
            </span>
          </div>
        </div>

        <footer className="consent-modal-footer">
          <button className="secondary-button" onClick={onCancel}>
            Cancel
          </button>
          <button className="primary-button consent-approve-btn" onClick={onApprove}>
            <span>Approve & Generate Answer</span>
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        </footer>
      </div>
    </div>
  )
}

export default ExcerptConsentModal

