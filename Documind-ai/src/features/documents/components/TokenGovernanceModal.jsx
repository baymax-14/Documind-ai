import { useRef, useState } from 'react'
import { useOverlay } from '../hooks/useOverlay.js'
import {
  Check,
  Coins,
  Download,
  RotateCcw,
  ShieldCheck,
  Sliders,
  X,
} from 'lucide-react'
import { copyToClipboard, downloadMarkdownFile } from '../services/export.js'

/**
 * Token Governance & Operational Policy Modal.
 *
 * Displays session token breakdowns, iteration cap enforcement ($k \le 3$),
 * privacy audit verification, and export options.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {Object} props.tracker - Token budget tracker instance.
 * @param {() => void} [props.onReset]
 */
export default function TokenGovernanceModal({
  isOpen = false,
  onClose,
  tracker,
  onReset,
}) {
  const [copied, setCopied] = useState(false)

  const cardRef = useRef(null)
  useOverlay({ active: Boolean(isOpen && tracker), containerRef: cardRef, onClose })

  if (!isOpen || !tracker) return null

  const metrics = tracker.getMetrics()
  const audit = tracker.getAuditSummary()

  const percentUsed = Math.min(100, Math.round(metrics.usageRatio * 100))

  async function handleCopyAudit() {
    const jsonStr = JSON.stringify(audit, null, 2)
    const ok = await copyToClipboard(jsonStr)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleDownloadAudit() {
    const jsonStr = JSON.stringify(audit, null, 2)
    downloadMarkdownFile(jsonStr, `documind-governance-audit-${Date.now()}.json`, 'application/json;charset=utf-8')
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="governance-modal-card"
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="governance-modal-title"
      >
        <header className="governance-modal-header">
          <div className="governance-header-info">
            <span className="governance-header-icon">
              <Coins size={18} />
            </span>
            <div>
              <h2 id="governance-modal-title" className="governance-title-text">
                Token Governance & Audit
              </h2>
              <p className="governance-subtitle-text">
                Operational cost budgeting, bounded agent iteration caps, and privacy guarantees.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="icon-button modal-close-btn"
            onClick={onClose}
            aria-label="Close governance modal"
          >
            <X size={18} />
          </button>
        </header>

        <div className="governance-modal-body">
          {/* Section 1: Session Token Budget & Progress Meter */}
          <section className="governance-section">
            <div className="section-head">
              <Sliders size={15} />
              <h3>Session Token Budget</h3>
            </div>

            <div className="token-progress-card">
              <div className="token-progress-meta">
                <span className="token-consumed-number">
                  {metrics.totalTokens.toLocaleString()} <small>/ {metrics.budget.toLocaleString()} tokens</small>
                </span>
                <span className={`token-percent-badge ${percentUsed > 90 ? 'badge-danger' : percentUsed > 70 ? 'badge-warning' : 'badge-ok'}`}>
                  {percentUsed}% Consumed
                </span>
              </div>

              {/* Visual Progress Bar */}
              <div className="token-progress-track">
                <div
                  className={`token-progress-fill ${percentUsed > 90 ? 'fill-danger' : percentUsed > 70 ? 'fill-warning' : 'fill-ok'}`}
                  style={{ transform: `scaleX(${percentUsed / 100})` }}
                />
              </div>

              {/* Channel Breakdown Grid */}
              <div className="token-channels-grid">
                <div className="channel-box">
                  <span className="channel-label">Prompt Tokens</span>
                  <span className="channel-value">{metrics.promptTokens.toLocaleString()}</span>
                </div>
                <div className="channel-box">
                  <span className="channel-label">Retrieved Evidence</span>
                  <span className="channel-value">{metrics.evidenceTokens.toLocaleString()}</span>
                </div>
                <div className="channel-box">
                  <span className="channel-label">Completion Generated</span>
                  <span className="channel-value">{metrics.completionTokens.toLocaleString()}</span>
                </div>
                <div className="channel-box">
                  <span className="channel-label">Remaining Budget</span>
                  <span className="channel-value">{metrics.remainingBudget.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Agent Retrieval Iteration Policy */}
          <section className="governance-section">
            <div className="section-head">
              <ShieldCheck size={15} />
              <h3>Agent Iteration Policy & Bounds</h3>
            </div>
            <div className="policy-card">
              <div className="policy-row">
                <span className="policy-key">Max Agent Retrieval Iterations:</span>
                <span className="policy-pill">Bounded (k ≤ {metrics.maxIterations})</span>
              </div>
              <div className="policy-row">
                <span className="policy-key">Total Queries Executed:</span>
                <span className="policy-val">{metrics.queryCount} queries</span>
              </div>
              <div className="policy-row">
                <span className="policy-key">Capped Queries Exceeding Limit:</span>
                <span className="policy-val">{metrics.cappedIterationsCount} clamped</span>
              </div>
              <p className="policy-desc">
                DocuMind AI automatically clamps multi-hop recursive queries to a maximum of 3 iterations to guarantee bounded latency, prevent runaway loops, and cap operational cost.
              </p>
            </div>
          </section>

          {/* Section 3: Privacy & Zero Leakage Compliance */}
          <section className="governance-section">
            <div className="privacy-card">
              <h4>🛡️ Zero Raw Document Text Guarantee</h4>
              <p>
                All audit logs and telemetry omit raw document text, passage quotes, and user queries. Only token estimations, latencies, and coordinate locators are recorded.
              </p>
            </div>
          </section>
        </div>

        {/* Modal Footer Actions */}
        <footer className="governance-modal-footer">
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              tracker.reset()
              onReset?.()
            }}
            title="Reset current session token counter"
          >
            <RotateCcw size={14} />
            <span>Reset Budget</span>
          </button>

          <div className="footer-right-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={handleCopyAudit}
              title="Copy structured audit JSON"
            >
              {copied ? <Check size={14} /> : <Download size={14} />}
              <span>{copied ? 'Copied' : 'Copy Audit JSON'}</span>
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={handleDownloadAudit}
              title="Download audit JSON file"
            >
              <Download size={14} />
              <span>Export Audit</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
