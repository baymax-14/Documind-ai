import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart2,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  Loader,
  Maximize2,
  Send,
  Sparkles,
  TrendingUp,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import {
  groupDocumentByPages,
  calculateZoomMetrics,
  bboxToStyle,
} from '../services/visualGrounding.js'
import {
  detectPageVisualElements,
  reasonOverChartWithVLM,
  VLM_PROMPT_TEMPLATES,
} from '../services/chartReasoning.js'
import { copyToClipboard } from '../services/export.js'
import ReadableText from './ReadableText.jsx'
import RealPdfPage, { RealPdfThumb } from './RealPdfPage.jsx'

/**
 * Interactive Visual Page Preview & Bounding Box Grounding Component.
 *
 * Renders high-fidelity page representations with a thumbnail strip,
 * zoom controls, and citation bounding box overlays with click-to-copy locators.
 *
 * @param {Object} props
 * @param {import('../types/document.js').DocRecord} props.document
 * @param {number} [props.initialPage=1]
 * @param {number} [props.highlightChunkIndex] - Passage to bring into view.
 * @param {number} [props.markedChunkIndex] - Passage to mark (only when there is a reason).
 * @param {string} [props.markedLabel] - Why it is marked, e.g. "Cited in the answer".
 * @param {(text: string) => import('react').ReactNode} [props.renderText] - e.g. search highlighting.
 * @param {(locator: string) => void} [props.onInspectPassage]
 */
export default function PageVisualPreview({
  document: doc,
  initialPage = 1,
  highlightChunkIndex,
  markedChunkIndex,
  markedLabel = 'Cited in the answer',
  renderText,
  onInspectPassage,
}) {
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [zoomPercent, setZoomPercent] = useState(100)
  const [copiedLocator, setCopiedLocator] = useState(null)
  const [selectedChartForVLM, setSelectedChartForVLM] = useState(null)
  const [isVlmAnalyzing, setIsVlmAnalyzing] = useState(false)
  const [vlmResult, setVlmResult] = useState(null)
  const [customVlmQuestion, setCustomVlmQuestion] = useState('')
  const [activePromptType, setActivePromptType] = useState('summarize')
  const [copiedVlm, setCopiedVlm] = useState(false)
  const pageContainerRef = useRef(null)
  // The saved original PDF, when one was kept: { pdf, render }
  const [original, setOriginal] = useState(null)

  useEffect(() => {
    setOriginal(null)
    if (!doc?.hasOriginal) return undefined
    let cancelled = false
    let close = null
    import('../services/pdfRender.js').then(async (mod) => {
      close = () => mod.closeStoredPdf(doc.id)
      const pdf = await mod.openStoredPdf(doc.id)
      if (!cancelled && pdf) setOriginal({ pdf, render: mod.renderPdfPage })
    }).catch(() => {})
    return () => {
      cancelled = true
      close?.()
    }
  }, [doc?.id, doc?.hasOriginal])

  // Group document into pages; with the original, every page is listed,
  // including pages that have no text (blank or not yet recognised)
  const pages = useMemo(() => {
    const grouped = groupDocumentByPages(doc)
    const total = original?.pdf?.numPages
    if (!total) return grouped
    const byNumber = new Map(grouped.map((p) => [p.pageNumber, p]))
    return Array.from({ length: total }, (_, i) =>
      byNumber.get(i + 1) || { pageNumber: i + 1, title: `Page ${i + 1}`, chunks: [], highlightBoxes: [], textLength: 0 }
    )
  }, [doc, original])

  // Sync initial page or highlight chunk
  useEffect(() => {
    if (highlightChunkIndex !== undefined && highlightChunkIndex !== null && doc?.chunks) {
      const targetChunk = doc.chunks.find((c) => c.index === highlightChunkIndex)
      if (targetChunk?.page) {
        setCurrentPage(targetChunk.page)
      }
    }
  }, [highlightChunkIndex, doc])

  const activePage = useMemo(() => {
    return pages.find((p) => p.pageNumber === currentPage) || pages[0] || null
  }, [pages, currentPage])

  // Detect visual charts, plots, and figures on active page
  const visualFigures = useMemo(() => {
    return detectPageVisualElements(activePage)
  }, [activePage])

  // Clear chart inspector when navigating pages unless current chart is on new page
  useEffect(() => {
    setSelectedChartForVLM(null)
    setVlmResult(null)
    setCustomVlmQuestion('')
  }, [currentPage])

  async function handleTriggerVLM(chart, promptType = 'summarize', question = '') {
    if (!chart) return
    setIsVlmAnalyzing(true)
    setActivePromptType(promptType)
    try {
      const res = await reasonOverChartWithVLM({
        chart,
        question,
        promptType,
      })
      setVlmResult(res)
    } catch (err) {
      console.error('[DocuMind AI] Figure analysis error:', err)
    } finally {
      setIsVlmAnalyzing(false)
    }
  }

  async function handleCopyVlmResult() {
    if (!vlmResult) return
    const textToCopy = `**${vlmResult.chartTitle}** (${vlmResult.visualLocator})\n${vlmResult.groundedAnswer}\n\nTrend: ${vlmResult.trendAnalysis}`
    const ok = await copyToClipboard(textToCopy)
    if (ok) {
      setCopiedVlm(true)
      setTimeout(() => setCopiedVlm(false), 2000)
    }
  }

  // Handle zoom
  function handleZoomIn() {
    setZoomPercent((prev) => Math.min(180, prev + 15))
  }

  function handleZoomOut() {
    setZoomPercent((prev) => Math.max(60, prev - 15))
  }

  function handleResetZoom() {
    setZoomPercent(100)
  }

  // Keyboard navigation for page flipping (Arrow keys / PageUp / PageDown)
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        setCurrentPage((p) => Math.max(1, p - 1))
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault()
        setCurrentPage((p) => Math.min(pages.length, p + 1))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pages.length])

  async function handleCopyCitation(chunk) {
    if (!chunk?.locator) return
    const ok = await copyToClipboard(chunk.locator)
    if (ok) {
      setCopiedLocator(chunk.locator)
      setTimeout(() => setCopiedLocator(null), 2500)
    }
    onInspectPassage?.(chunk.locator)
  }

  if (!doc || pages.length === 0) {
    return (
      <div className="visual-preview-empty">
        <Eye size={32} />
        <p>No visual page layout available for this document.</p>
      </div>
    )
  }

  const zoomMetrics = calculateZoomMetrics(620, zoomPercent)

  return (
    <div className="visual-preview-container">
      {/* Visual Navigation Toolbar */}
      <header className="visual-toolbar">
        <div className="visual-page-stepper">
          <button
            type="button"
            className="secondary-button visual-tool-btn"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            aria-label="Previous Page (Left Arrow)"
            title="Previous Page (Left Arrow)"
          >
            <ChevronLeft size={14} />
          </button>
          <div className="visual-page-badge" title="Type a number or use arrows to jump to any page">
            <span>Page</span>
            <input
              type="number"
              min={1}
              max={pages.length}
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10)
                if (!isNaN(val) && val >= 1 && val <= pages.length) {
                  setCurrentPage(val)
                }
              }}
              className="visual-page-input"
              aria-label="Jump to page number"
            />
            <span>of {pages.length}</span>
          </div>
          <button
            type="button"
            className="secondary-button visual-tool-btn"
            onClick={() => setCurrentPage((p) => Math.min(pages.length, p + 1))}
            disabled={currentPage >= pages.length}
            aria-label="Next Page (Right Arrow)"
            title="Next Page (Right Arrow)"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Center Document Context */}
        <div className="visual-toolbar-center">
          <span className="visual-doc-badge" title={doc.name}>
            {doc.name}
          </span>
        </div>

        {/* Zoom Controls */}
        <div className="visual-zoom-controls">
          <button
            type="button"
            className="secondary-button visual-tool-btn"
            onClick={handleZoomOut}
            title="Zoom out"
            aria-label="Zoom out"
          >
            <ZoomOut size={14} />
          </button>
          <span className="visual-zoom-text">{zoomPercent}%</span>
          <button
            type="button"
            className="secondary-button visual-tool-btn"
            onClick={handleZoomIn}
            title="Zoom in"
            aria-label="Zoom in"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            className="secondary-button visual-tool-btn"
            onClick={handleResetZoom}
            title="Reset Zoom to 100%"
            aria-label="Reset Zoom"
          >
            <Maximize2 size={13} />
          </button>
        </div>

        {/* Visual Charts & VLM Figures Pill */}
        {visualFigures.length > 0 && (
          <div className="visual-figures-indicator-group">
            <button
              type="button"
              className={`secondary-button visual-tool-btn visual-figures-pill-btn ${
                selectedChartForVLM ? 'active' : ''
              }`}
              onClick={() => {
                if (selectedChartForVLM) {
                  setSelectedChartForVLM(null)
                } else {
                  setSelectedChartForVLM(visualFigures[0])
                  handleTriggerVLM(visualFigures[0], 'summarize')
                }
              }}
              title="Inspect values found in figure and table passages"
            >
              <BarChart2 size={13} aria-hidden="true" />
              <span>Figures & Charts ({visualFigures.length})</span>
              <span className="vlm-active-dot" />
            </button>
          </div>
        )}
      </header>

      {copiedLocator && (
        <div className="visual-copied-toast" role="status">
          <Check size={14} />
          <span>Citation copied: <strong>{copiedLocator}</strong></span>
        </div>
      )}

      {/* Workspace Area: Thumbnails + Visual Page Canvas */}
      <div className="visual-workspace">
        {/* Thumbnail Navigation Strip */}
        <aside className="visual-thumbnail-strip" aria-label="Page thumbnail strip">
          <div className="thumbnail-strip-header">
            <span>Pages ({pages.length})</span>
          </div>
          <div className="thumbnail-list">
            {pages.map((p) => {
              const hasCitedChunk =
                markedChunkIndex !== undefined &&
                markedChunkIndex !== null &&
                p.chunks.some((c) => c.index === markedChunkIndex)

              return (
                <button
                  key={p.pageNumber}
                  type="button"
                  className={`thumbnail-card ${currentPage === p.pageNumber ? 'active' : ''} ${
                    hasCitedChunk ? 'has-citation' : ''
                  }`}
                  onClick={() => setCurrentPage(p.pageNumber)}
                  title={`Jump to Page ${p.pageNumber}`}
                >
                  <div className={`thumbnail-sheet ${original ? 'is-real' : ''}`}>
                    {original ? (
                      <>
                        <RealPdfThumb pdf={original.pdf} render={original.render} pageNumber={p.pageNumber} />
                        {hasCitedChunk && <div className="thumb-marker" />}
                      </>
                    ) : (
                    <div className="thumbnail-sheet-lines">
                      <div className="thumb-line full" />
                      <div className="thumb-line mid" />
                      <div className="thumb-line short" />
                      {hasCitedChunk && <div className="thumb-marker" />}
                    </div>
                    )}
                  </div>
                  <span className="thumbnail-num">Page {p.pageNumber}</span>
                </button>
              )
            })}
          </div>
        </aside>

        {/* Main Rendered Page Canvas Viewport */}
        <main className="visual-viewport" ref={pageContainerRef}>
          {activePage && (
            <div
              className="visual-page-card"
              style={{ width: `${zoomMetrics.width}px` }}
              role="region"
              aria-label={`Visual page ${activePage.pageNumber}`}
            >
              {/* Printable Header Bar */}
              <div className="page-card-header">
                <span className="page-meta-doc">{doc.name}</span>
                <span className="page-meta-number">Page {activePage.pageNumber}</span>
              </div>

              {original && (
                <RealPdfPage
                  pdf={original.pdf}
                  render={original.render}
                  pageNumber={activePage.pageNumber}
                  width={zoomMetrics.width}
                  chunks={activePage.chunks}
                  markedChunkIndex={markedChunkIndex}
                  markedLabel={markedLabel}
                  docName={doc.name}
                />
              )}

              {/* Page Body with Text Content and Bounding Box Highlights */}
              <div className={`page-card-surface ${original ? 'is-under-original' : ''}`}>
                {original && (
                  <h3 className="real-page-text-heading">
                    {activePage.chunks.length ? 'Text read from this page' : 'No text was read from this page'}
                  </h3>
                )}
                {activePage.chunks.map((chunk) => {
                  const isCited =
                    markedChunkIndex !== undefined &&
                    markedChunkIndex !== null &&
                    markedChunkIndex === chunk.index

                  return (
                    <div
                      key={chunk.index}
                      className={`visual-chunk-block ${isCited ? 'chunk-cited' : ''}`}
                    >
                      <div className="chunk-locator-row">
                        <span className="chunk-locator-pill">{chunk.locator}</span>
                        {chunk.ocr && (
                          <span className="chunk-ocr-tag" title="This text was recognised from a scanned page and may contain mistakes">
                            Read by OCR
                          </span>
                        )}
                        {isCited && <span className="chunk-cited-tag">{markedLabel}</span>}
                        <button
                          type="button"
                          className="chunk-copy-citation"
                          onClick={() => handleCopyCitation(chunk)}
                          aria-label={`Copy citation, ${doc.name}, ${chunk.locator}`}
                        >
                          <Copy size={12} aria-hidden="true" />
                          <span>Copy citation</span>
                        </button>
                      </div>
                      <ReadableText className="chunk-body-text" text={chunk.text} renderText={renderText} />
                    </div>
                  )
                })}

                {/* Figure and table passage overlays (positioned on the text view only) */}
                {!original && visualFigures.map((fig) => (
                  <div
                    key={fig.id}
                    className={`visual-chart-overlay ${selectedChartForVLM?.id === fig.id ? 'active' : ''}`}
                    style={bboxToStyle(fig.bbox)}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedChartForVLM(fig)
                      handleTriggerVLM(fig, 'summarize')
                    }}
                    title={`Inspect the values in ${fig.title}`}
                  >
                    <div className="visual-chart-tag">
                      <BarChart2 size={12} aria-hidden="true" />
                      <span>{fig.title}</span>
                      <span className="vlm-chip">Values</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Page Footer */}
              <div className="page-card-footer">
                <span>{original ? 'Original page, with the text read from it' : 'Extracted text, not the original page layout'}</span>
                <span>Page {activePage.pageNumber} / {pages.length}</span>
              </div>
            </div>
          )}
        </main>

        {/* Figure values inspector */}
        {selectedChartForVLM && (
          <aside className="vlm-inspector-drawer" aria-label="Figure values inspector">
            <div className="vlm-inspector-header">
              <div className="vlm-title-group">
                <div className="vlm-badge">
                  <Sparkles size={12} aria-hidden="true" />
                  <span>Figure values from text</span>
                </div>
                <h4>{selectedChartForVLM.title}</h4>
                <span className="vlm-source-locator">
                  {selectedChartForVLM.sourceLocator} · BBox: [{selectedChartForVLM.bbox.top}%, {selectedChartForVLM.bbox.left}%]
                </span>
              </div>
              <button
                type="button"
                className="vlm-close-btn"
                onClick={() => setSelectedChartForVLM(null)}
                aria-label="Close figure inspector"
                title="Close figure inspector"
              >
                <X size={15} />
              </button>
            </div>

            {/* Quick Action Prompt Chips */}
            <div className="vlm-prompt-chips">
              {VLM_PROMPT_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  className={`vlm-chip-btn ${activePromptType === tpl.id ? 'active' : ''}`}
                  onClick={() => handleTriggerVLM(selectedChartForVLM, tpl.id)}
                  disabled={isVlmAnalyzing}
                >
                  {tpl.label}
                </button>
              ))}
            </div>

            {/* Custom Question Input */}
            <form
              className="vlm-question-form"
              onSubmit={(e) => {
                e.preventDefault()
                if (!customVlmQuestion.trim() || isVlmAnalyzing) return
                handleTriggerVLM(selectedChartForVLM, 'custom', customVlmQuestion.trim())
              }}
            >
              <input
                type="text"
                placeholder="Ask about a value in this figure…"
                value={customVlmQuestion}
                onChange={(e) => setCustomVlmQuestion(e.target.value)}
                className="vlm-input"
              />
              <button
                type="submit"
                className="primary-button vlm-submit-btn"
                disabled={isVlmAnalyzing || !customVlmQuestion.trim()}
                title="Look up values"
              >
                {isVlmAnalyzing ? <Loader size={13} className="spin" /> : <Send size={13} />}
              </button>
            </form>

            {/* Reasoning Output */}
            <div className="vlm-reasoning-body">
              {isVlmAnalyzing ? (
                <div className="vlm-loading-state">
                  <Loader size={20} className="spin" />
                  <p>Reading values…</p>
                </div>
              ) : vlmResult ? (
                <div className="vlm-result-card">
                  <div className="vlm-meta-bar">
                    <span className="vlm-model-tag" title="Values are read from the passage text; no image model is used">
                      <Sparkles size={11} /> {vlmResult.method}
                    </span>
                    <span className="vlm-confidence-badge">
                      {vlmResult.answered ? `${vlmResult.extractedMetrics.length} values` : 'Not answered'}
                    </span>
                    <button
                      type="button"
                      className="vlm-copy-btn"
                      onClick={handleCopyVlmResult}
                      title="Copy result"
                    >
                      {copiedVlm ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedVlm ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="vlm-answer-text">
                    <p>{vlmResult.groundedAnswer}</p>
                  </div>

                  {vlmResult.trendAnalysis && (
                    <div className="vlm-trend-box">
                      <TrendingUp size={13} />
                      <span>{vlmResult.trendAnalysis}</span>
                    </div>
                  )}

                  {vlmResult.extractedMetrics && vlmResult.extractedMetrics.length > 0 && (
                    <div className="vlm-metrics-table-wrapper">
                      <h5>Values found ({vlmResult.extractedMetrics.length})</h5>
                      <div className="vlm-metrics-table">
                        {vlmResult.extractedMetrics.map((m, idx) => (
                          <div key={idx} className="vlm-metric-row">
                            <span className="vlm-m-label">{m.label}</span>
                            <span className="vlm-m-val">{m.value}</span>
                            {m.trend && <span className="vlm-m-trend">{m.trend}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
