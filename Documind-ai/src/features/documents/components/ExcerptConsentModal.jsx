import { useEffect } from 'react'
// ESLint's base unused-vars rule does not count JSX member tags as variable references.
// eslint-disable-next-line no-unused-vars
import { motion, useReducedMotion } from 'motion/react'
import {
  ArrowRight,
  FileText,
  Info,
  ShieldCheck,
  X,
} from 'lucide-react'

/**
 * Modal dialog that explicitly surfaces candidate document chunks
 * and asks for user review before displaying retrieved excerpts.
 *
 * @param {Object} props
 * @param {string} props.question - The question asked by user.
 * @param {Array<{ docId: string, docName: string, docType: string, locator: string, text: string }>} props.chunks - Candidate chunks.
 * @param {() => void} props.onApprove - Callback when approved.
 * @param {() => void} props.onCancel - Callback when cancelled.
 */
function ExcerptConsentModal({ question, chunks, onApprove, onCancel }) {
  const reduceMotion = useReducedMotion()
  // Close on Escape
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <motion.div
      className="consent-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
    >
      <motion.div
        className="consent-modal"
        initial={{ opacity: 0, y: reduceMotion ? 0 : 12, scale: reduceMotion ? 1 : 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
      >
        <header className="consent-modal-header">
          <div className="consent-title-area">
            <span className="consent-shield-icon">
              <ShieldCheck size={20} aria-hidden="true" />
            </span>
            <div>
              <h3 id="consent-title">Review Retrieved Excerpts</h3>
              <p>Inspect the local source passages retrieved for your query before displaying them.</p>
            </div>
          </div>
          <button className="consent-close-btn" onClick={onCancel} aria-label="Cancel">
            <X size={16} />
          </button>
        </header>

        <div className="consent-modal-body">
          <div className="consent-question-box">
            <span className="consent-label">Your Query:</span>
            <p className="consent-question-text">"{question}"</p>
          </div>

          <div className="consent-excerpts-header">
            <span className="consent-label">
              Retrieved Local Passages ({chunks.length}):
            </span>
            <span className="consent-retrieval-tag">Keyword match preview</span>
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
              <strong>Local Keyword Retrieval Prototype:</strong> In this release, passage retrieval runs locally in-browser. Zero file bytes or excerpts leave your machine, and no external AI model is connected.
            </span>
          </div>
        </div>

        <footer className="consent-modal-footer">
          <button className="secondary-button" onClick={onCancel}>
            Cancel
          </button>
          <button className="primary-button consent-approve-btn" onClick={onApprove}>
            <span>Confirm & View Excerpts</span>
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        </footer>
      </motion.div>
    </motion.div>
  )
}

export default ExcerptConsentModal
