import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  Check,
  Copy,
  Download,
  FileCode2,
  FileText,
  Layers,
  Sparkles,
  X,
} from 'lucide-react'
import {
  generateSectionSummary,
  exportSummaryToMarkdown,
} from '../services/summarize.js'
import {
  EXTRACTION_SCHEMAS,
  extractStructuredData,
  exportStructuredDataToJson,
} from '../services/schemaExtract.js'
import {
  copyToClipboard,
  downloadMarkdownFile,
} from '../services/export.js'

export default function DocumentWorkflowsModal({
  document,
  initialTab = 'summary', // 'summary' | 'extract'
  isOpen = false,
  onClose,
  onInspectPassage,
}) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const [selectedSchemaId, setSelectedSchemaId] = useState('RESEARCH_PAPER')
  const [copied, setCopied] = useState(false)

  // Sync initial tab when opened
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab)
      setCopied(false)
    }
  }, [isOpen, initialTab])

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Generate summary
  const summaryResult = useMemo(() => {
    if (!document) return null
    return generateSectionSummary(document)
  }, [document])

  // Generate structured extraction
  const extractionResult = useMemo(() => {
    if (!document) return null
    return extractStructuredData({
      document,
      schemaId: selectedSchemaId,
    })
  }, [document, selectedSchemaId])

  if (!isOpen || !document) return null

  async function handleCopySummary() {
    if (!summaryResult) return
    const md = exportSummaryToMarkdown(summaryResult)
    const ok = await copyToClipboard(md)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleDownloadSummary() {
    if (!summaryResult) return
    const md = exportSummaryToMarkdown(summaryResult)
    const slug = document.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_')
    downloadMarkdownFile(md, `${slug}-summary.md`)
  }

  async function handleCopyJson() {
    if (!extractionResult) return
    const jsonStr = exportStructuredDataToJson(extractionResult)
    const ok = await copyToClipboard(jsonStr)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleDownloadJson() {
    if (!extractionResult) return
    const jsonStr = exportStructuredDataToJson(extractionResult)
    const slug = document.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_')
    downloadMarkdownFile(jsonStr, `${slug}-extracted.json`, 'application/json;charset=utf-8')
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="workflow-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="workflow-modal-title"
      >
        {/* Modal Header */}
        <header className="workflow-modal-header">
          <div className="workflow-header-info">
            <span className={`file-icon file-${document.type.toLowerCase()}`}>
              {document.type}
            </span>
            <div>
              <h2 id="workflow-modal-title" className="workflow-modal-doc-title">
                {document.name}
              </h2>
              <p className="workflow-modal-subtitle">
                {activeTab === 'summary'
                  ? 'Hierarchical section summary anchored to verifiable source passages.'
                  : 'Structured entity extraction with supporting excerpt citations.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="icon-button modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </header>

        {/* Modal Tab Switcher */}
        <div className="workflow-modal-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'summary'}
            className={`workflow-tab ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            <FileText size={15} />
            <span>Section-Aware Summary</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'extract'}
            className={`workflow-tab ${activeTab === 'extract' ? 'active' : ''}`}
            onClick={() => setActiveTab('extract')}
          >
            <Layers size={15} />
            <span>Structured Extraction</span>
          </button>

          {/* Action Export Buttons */}
          <div className="workflow-tab-actions">
            {activeTab === 'summary' ? (
              <>
                <button
                  type="button"
                  className="secondary-button workflow-action-sm"
                  onClick={handleCopySummary}
                  title="Copy summary as Markdown with footnotes"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  className="secondary-button workflow-action-sm"
                  onClick={handleDownloadSummary}
                  title="Download Markdown report file"
                >
                  <Download size={14} />
                  <span>Export</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="secondary-button workflow-action-sm"
                  onClick={handleCopyJson}
                  title="Copy extracted schema as formatted JSON"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>
                <button
                  type="button"
                  className="secondary-button workflow-action-sm"
                  onClick={handleDownloadJson}
                  title="Download JSON schema extraction file"
                >
                  <Download size={14} />
                  <span>Export JSON</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="workflow-modal-body">
          {activeTab === 'summary' && summaryResult && (
            <div className="summary-tab-content">
              {summaryResult.sections.length === 0 ? (
                <div className="empty-notice">No sections or text chunks available in this document.</div>
              ) : (
                <div className="summary-sections-stack">
                  {summaryResult.sections.map((sec) => (
                    <article key={sec.id} className="summary-section-card">
                      <div className="section-card-header">
                        <h4>{sec.title}</h4>
                        <div className="section-header-meta">
                          <span className="locator-badge">{sec.locator}</span>
                          {onInspectPassage && (
                            <button
                              type="button"
                              className="inspect-source-link"
                              onClick={() => {
                                onClose?.()
                                onInspectPassage(document.id, sec.chunkIndex)
                              }}
                              title="Jump to passage in Reader"
                            >
                              <BookOpen size={12} /> Inspect Source
                            </button>
                          )}
                        </div>
                      </div>

                      <ul className="takeaways-list">
                        {sec.takeaways.map((point, pIdx) => (
                          <li key={pIdx}>{point}</li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'extract' && extractionResult && (
            <div className="extraction-tab-content">
              {/* Schema Selection Controls */}
              <div className="schema-selector-bar">
                <label className="schema-label">
                  <span>Target Extraction Schema:</span>
                  <select
                    value={selectedSchemaId}
                    onChange={(e) => setSelectedSchemaId(e.target.value)}
                    className="schema-dropdown"
                  >
                    {Object.values(EXTRACTION_SCHEMAS).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="schema-desc">
                  {EXTRACTION_SCHEMAS[selectedSchemaId]?.description}
                </p>
              </div>

              {/* Extracted Fields Grid */}
              <div className="extracted-fields-stack">
                {extractionResult.fields.map((field) => (
                  <div key={field.key} className="field-card">
                    <div className="field-card-top">
                      <div className="field-label-group">
                        <span className="field-key-tag">{field.key}</span>
                        <h5>{field.label}</h5>
                      </div>

                      <div className="field-status-group">
                        {field.hasEvidence ? (
                          <span className={`confidence-pill confidence-${field.confidence}`}>
                            {field.confidence.toUpperCase()} CONFIDENCE
                          </span>
                        ) : (
                          <span className="confidence-pill confidence-missing">
                            NO EVIDENCE FOUND
                          </span>
                        )}
                        <span className="locator-badge">{field.locator}</span>
                      </div>
                    </div>

                    {field.hasEvidence ? (
                      <div className="field-content-box">
                        <p className="field-value-text">
                          <strong>Extracted Value:</strong> {field.value}
                        </p>
                        <blockquote className="field-excerpt-quote">
                          "{field.excerpt}"
                        </blockquote>

                        {onInspectPassage && field.chunkIndex !== null && (
                          <div className="field-footer-action">
                            <button
                              type="button"
                              className="inspect-source-link"
                              onClick={() => {
                                onClose?.()
                                onInspectPassage(document.id, field.chunkIndex)
                              }}
                              title="Jump to highlighted passage in Reader"
                            >
                              <BookOpen size={12} /> Inspect Source Passage
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="field-empty-box">
                        <p className="field-missing-notice">
                          *No supporting passage located in document for this schema attribute.*
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
