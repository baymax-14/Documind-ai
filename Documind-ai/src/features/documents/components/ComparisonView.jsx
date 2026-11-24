import { useRef, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  Check,
  Copy,
  Download,
  FileSearch,
  FileText,
  GitCompareArrows,
  HelpCircle,
  Layers,
  Plus,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react'
import {
  compareDocuments,
  DEFAULT_COMPARISON_DIMENSIONS,
} from '../services/comparison.js'
import {
  copyToClipboard,
  downloadMarkdownFile,
  exportComparisonToMarkdown,
} from '../services/export.js'
import ReadableText from './ReadableText.jsx'
import { gsap, useGSAP, prefersReducedMotion } from '../../../gsap.js'

/**
 * Status styling map for comparison synthesis badges.
 */
const STATUS_META = {
  covered: {
    label: 'In every document',
    className: 'badge-consensus',
  },
  partial: {
    label: 'In some documents',
    className: 'badge-partial',
  },
  uncovered: {
    label: 'Not found',
    className: 'badge-uncovered',
  },
}

export default function ComparisonView({
  documents = [],
  onInspectPassage,
}) {
  // Pre-select the first two documents by default if available
  const [selectedDocIds, setSelectedDocIds] = useState(() => {
    return documents.slice(0, 2).map((d) => d.id)
  })

  const [selectedDimensionIds, setSelectedDimensionIds] = useState(() => {
    return DEFAULT_COMPARISON_DIMENSIONS.map((d) => d.id)
  })

  const [customDimension, setCustomDimension] = useState('')
  const [activeCustomTopic, setActiveCustomTopic] = useState('')
  const [comparisonResult, setComparisonResult] = useState(null)
  const resultsHeadingRef = useRef(null)

  // Results render below the setup controls, often off-screen: bring them into
  // view and move focus to their heading so keyboard and screen-reader users
  // land on them too.
  useGSAP(() => {
    const heading = resultsHeadingRef.current
    if (!comparisonResult || !heading) return
    const done = () => heading.focus({ preventScroll: true })
    if (prefersReducedMotion()) {
      heading.scrollIntoView({ block: 'start' })
      done()
      return
    }
    gsap.to(window, {
      scrollTo: { y: heading, offsetY: 24, autoKill: true },
      duration: 0.5,
      ease: 'power2.inOut',
      onComplete: done,
      onInterrupt: done,
    })
  }, { dependencies: [comparisonResult] })
  const [isComparing, setIsComparing] = useState(false)
  const [copied, setCopied] = useState(false)

  // Toggle document selection
  function handleToggleDoc(docId) {
    setSelectedDocIds((prev) => {
      if (prev.includes(docId)) {
        return prev.filter((id) => id !== docId)
      }
      return [...prev, docId]
    })
  }

  // Toggle dimension selection
  function handleToggleDimension(dimId) {
    setSelectedDimensionIds((prev) => {
      if (prev.includes(dimId)) {
        // Prevent deselecting everything
        if (prev.length <= 1) return prev
        return prev.filter((id) => id !== dimId)
      }
      return [...prev, dimId]
    })
  }

  // Execute comparison
  function handleRunComparison() {
    if (selectedDocIds.length < 2) return

    setIsComparing(true)

    // Slight delay for tactile feedback
    setTimeout(() => {
      const result = compareDocuments({
        documents,
        docIds: selectedDocIds,
        dimensionIds: selectedDimensionIds,
        customDimension: activeCustomTopic,
      })

      setComparisonResult(result)
      setIsComparing(false)
    }, 280)
  }

  function handleAddCustomDimension(e) {
    e.preventDefault()
    if (!customDimension.trim()) return
    setActiveCustomTopic(customDimension.trim())
    setCustomDimension('')
  }

  function handleRemoveCustomTopic() {
    setActiveCustomTopic('')
    if (comparisonResult) {
      // Re-run without custom topic
      const result = compareDocuments({
        documents,
        docIds: selectedDocIds,
        dimensionIds: selectedDimensionIds,
        customDimension: '',
      })
      setComparisonResult(result)
    }
  }

  async function handleCopyMarkdown() {
    if (!comparisonResult) return
    const md = exportComparisonToMarkdown(comparisonResult)
    const ok = await copyToClipboard(md)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    }
  }

  function handleDownloadMarkdown() {
    if (!comparisonResult) return
    const md = exportComparisonToMarkdown(comparisonResult)
    const timestamp = new Date().toISOString().slice(0, 10)
    downloadMarkdownFile(md, `documind-comparison-${timestamp}.md`)
  }

  const canCompare = selectedDocIds.length >= 2

  return (
    <div className="comparison-view" aria-label="Cross-Document Comparison Workbench">
      {/* Configuration Header */}
      <div className="comparison-config-card">
        <div className="comparison-config-header">
          <div>
            <div className="comparison-title-row">
              <GitCompareArrows size={22} aria-hidden="true" />
              <h2>Cross-Document Comparison</h2>
            </div>
            <p className="comparison-description">
              Choose 2 or more documents to read their passages on each topic side by side, each with its page.
            </p>
          </div>

          {comparisonResult && (
            <div className="comparison-export-actions">
              <button
                className="secondary-button comparison-btn-sm"
                onClick={handleCopyMarkdown}
                title="Copy structured report as Markdown with footnotes"
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                <span>{copied ? 'Copied Markdown' : 'Copy Markdown'}</span>
              </button>
              <button
                className="secondary-button comparison-btn-sm"
                onClick={handleDownloadMarkdown}
                title="Download report file with verifiable citation footnotes"
              >
                <Download size={15} />
                <span>Export Report</span>
              </button>
            </div>
          )}
        </div>

        {/* Document Selection Section */}
        <div className="config-section">
          <div className="config-section-title">
            <Layers size={16} aria-hidden="true" />
            <span>Select Documents to Compare</span>
            <span className="selection-count-badge">
              {selectedDocIds.length} of {documents.length} selected
            </span>
          </div>

          {documents.length === 0 ? (
            <p className="empty-hint">No documents found in library. Add documents to compare.</p>
          ) : (
            <div className="doc-selector-pills">
              {documents.map((doc) => {
                const isSelected = selectedDocIds.includes(doc.id)
                return (
                  <button
                    key={doc.id}
                    type="button"
                    className={`doc-pill ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleToggleDoc(doc.id)}
                    aria-pressed={isSelected}
                  >
                    <span className="doc-pill-check">
                      {isSelected ? <Check size={13} /> : null}
                    </span>
                    <span className="doc-pill-name">{doc.name}</span>
                    <span className="doc-pill-type">{doc.type}</span>
                  </button>
                )
              })}
            </div>
          )}

          {selectedDocIds.length < 2 && (
            <p className="validation-warning">
              Select at least 2 documents to unlock comparison.
            </p>
          )}
        </div>

        {/* Dimension Selection Section */}
        <div className="config-section">
          <div className="config-section-title">
            <FileSearch size={16} aria-hidden="true" />
            <span>Comparison Dimensions</span>
          </div>

          <div className="dimension-chips">
            {DEFAULT_COMPARISON_DIMENSIONS.map((dim) => {
              const isActive = selectedDimensionIds.includes(dim.id)
              return (
                <button
                  key={dim.id}
                  type="button"
                  className={`dimension-chip ${isActive ? 'active' : ''}`}
                  onClick={() => handleToggleDimension(dim.id)}
                  title={dim.description}
                  aria-pressed={isActive}
                >
                  {isActive && <Check size={12} />}
                  <span>{dim.label}</span>
                </button>
              )
            })}

            {activeCustomTopic && (
              <span className="dimension-chip active custom-chip">
                <span>Custom: "{activeCustomTopic}"</span>
                <button
                  type="button"
                  className="chip-remove-btn"
                  onClick={handleRemoveCustomTopic}
                  aria-label="Remove custom dimension"
                >
                  <X size={12} />
                </button>
              </span>
            )}
          </div>

          {/* Custom Dimension Input */}
          <form className="custom-topic-form" onSubmit={handleAddCustomDimension}>
            <label className="sr-only" htmlFor="custom-topic-input">Custom topic to compare</label>
            <input
              id="custom-topic-input"
              type="text"
              placeholder="Add custom topic to compare (e.g., pricing, scalability, safety)..."
              value={customDimension}
              onChange={(e) => setCustomDimension(e.target.value)}
              className="custom-topic-input"
            />
            <button
              type="submit"
              className="secondary-button custom-topic-btn"
              disabled={!customDimension.trim()}
            >
              <Plus size={14} /> Add Topic
            </button>
          </form>
        </div>

        {/* Action Trigger */}
        <div className="config-footer">
          <button
            className="primary-button run-comparison-btn"
            disabled={!canCompare || isComparing}
            onClick={handleRunComparison}
          >
            {isComparing ? (
              <>
                <RefreshCw size={16} className="spin" /> Comparing Evidence...
              </>
            ) : (
              <>
                <GitCompareArrows size={17} /> Compare Selected Documents
              </>
            )}
          </button>
        </div>
      </div>

      {/* Comparison Results Area */}
      {comparisonResult && comparisonResult.success && (
        <div className="comparison-results" aria-live="polite">
          <div className="results-header">
            <h3 ref={resultsHeadingRef} tabIndex={-1}>Comparison Matrix</h3>
            <span className="matrix-meta-pill">
              {comparisonResult.dimensions.length} Dimensions Evaluated Across {comparisonResult.documents.length} Sources
            </span>
          </div>

          <div className="dimensions-stack">
            {comparisonResult.dimensions.map((dim) => {
              const statusMeta = STATUS_META[dim.synthesis.status] || STATUS_META.partial

              return (
                <article key={dim.id} className="dimension-card">
                  <header className="dimension-card-header">
                    <div className="dimension-title-group">
                      <h4>{dim.label}</h4>
                      <span className={`status-pill ${statusMeta.className}`}>
                        {statusMeta.label}
                      </span>
                    </div>
                    <p className="synthesis-text">
                      {dim.synthesis.summary}
                    </p>
                  </header>

                  <div
                    className="dimension-matrix-grid"
                    style={{
                      gridTemplateColumns: `repeat(${comparisonResult.documents.length}, minmax(0, 1fr))`,
                    }}
                  >
                    {dim.entries.map((entry) => (
                      <div key={entry.docId} className="matrix-doc-column">
                        <div className="doc-column-header">
                          <span className="column-doc-name">{entry.docName}</span>
                          <span className="column-doc-type">{entry.docType}</span>
                        </div>

                        {entry.hasEvidence ? (
                          <div className="excerpt-box">
                            <ReadableText className="excerpt-quote" text={entry.text} />

                            <div className="excerpt-footer">
                              <span className="locator-tag">{entry.locator}</span>
                              {onInspectPassage && entry.chunkIndex !== null && (
                                <button
                                  type="button"
                                  className="inspect-source-link"
                                  onClick={() => onInspectPassage(entry.docId, entry.chunkIndex)}
                                  title="Jump to highlighted passage in Reader"
                                >
                                  <BookOpen size={12} /> Inspect Source
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="excerpt-box empty-evidence">
                            <p className="no-evidence-note">
                              No matching passage located on this topic.
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
