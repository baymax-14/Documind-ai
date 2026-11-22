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

/**
 * Interactive Visual Page Preview & Bounding Box Grounding Component.
 *
 * Renders high-fidelity page representations with a thumbnail strip,
 * zoom controls, and citation bounding box overlays with click-to-copy locators.
 *
 * @param {Object} props
 * @param {import('../types/document.js').DocRecord} props.document
 * @param {number} [props.initialPage=1]
 * @param {number} [props.highlightChunkIndex]
 * @param {(locator: string) => void} [props.onInspectPassage]
 */
export default function PageVisualPreview({
  document: doc,
  initialPage = 1,
  highlightChunkIndex,
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

  // Group document into pages
  const pages = useMemo(() => {
    return groupDocumentByPages(doc)
  }, [doc])

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
      console.error('[DocuMind AI] VLM Reasoning error:', err)
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
              title="Inspect detected figures and run Multimodal VLM reasoning"
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
                highlightChunkIndex !== undefined &&
                p.chunks.some((c) => c.index === highlightChunkIndex)

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
                  <div className="thumbnail-sheet">
                    <div className="thumbnail-sheet-lines">
                      <div className="thumb-line full" />
                      <div className="thumb-line mid" />
                      <div className="thumb-line short" />
                      {hasCitedChunk && <div className="thumb-marker" />}
                    </div>
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

              {/* Page Body with Text Content and Bounding Box Highlights */}
              <div className="page-card-surface">
                {activePage.chunks.map((chunk) => {
                  const isCited =
                    highlightChunkIndex !== undefined &&
                    highlightChunkIndex === chunk.index

                  return (
                    <div
                      key={chunk.index}
                      className={`visual-chunk-block ${isCited ? 'chunk-cited' : ''}`}
                      onClick={() => handleCopyCitation(chunk)}
                      title={`Click to copy verified citation: ${chunk.locator}`}
                    >
                      <div className="chunk-locator-pill">
                        <span>{chunk.locator}</span>
                        {isCited && <span className="chunk-cited-tag">Cited Evidence</span>}
                        <ExternalLink size={11} aria-hidden="true" />
                      </div>
                      <p className="chunk-body-text">{chunk.text}</p>
                    </div>
                  )
                })}

                {/* Visual Chart & Figure Overlays with Multimodal VLM anchors */}
                {visualFigures.map((fig) => (
                  <div
                    key={fig.id}
                    className={`visual-chart-overlay ${selectedChartForVLM?.id === fig.id ? 'active' : ''}`}
                    style={bboxToStyle(fig.bbox)}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedChartForVLM(fig)
                      handleTriggerVLM(fig, 'summarize')
                    }}
                    title={`Click to open Multimodal VLM Reasoning for ${fig.title}`}
                  >
                    <div className="visual-chart-tag">
                      <BarChart2 size={12} aria-hidden="true" />
                      <span>{fig.title}</span>
                      <span className="vlm-chip">VLM Ready</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Page Footer */}
              <div className="page-card-footer">
                <span>DocuMind AI Grounded Provenance Engine</span>
                <span>Page {activePage.pageNumber} / {pages.length}</span>
              </div>
            </div>
          )}
        </main>

        {/* Multimodal VLM Chart Inspector Drawer */}
        {selectedChartForVLM && (
          <aside className="vlm-inspector-drawer" aria-label="Multimodal VLM Chart Inspector">
            <div className="vlm-inspector-header">
              <div className="vlm-title-group">
                <div className="vlm-badge">
                  <Sparkles size={12} aria-hidden="true" />
                  <span>Multimodal VLM Reasoning</span>
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
                aria-label="Close VLM Inspector"
                title="Close VLM Inspector"
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
                placeholder="Ask VLM about this figure..."
                value={customVlmQuestion}
                onChange={(e) => setCustomVlmQuestion(e.target.value)}
                className="vlm-input"
              />
              <button
                type="submit"
                className="primary-button vlm-submit-btn"
                disabled={isVlmAnalyzing || !customVlmQuestion.trim()}
                title="Run VLM inference"
              >
                {isVlmAnalyzing ? <Loader size={13} className="spin" /> : <Send size={13} />}
              </button>
            </form>

            {/* Reasoning Output */}
            <div className="vlm-reasoning-body">
              {isVlmAnalyzing ? (
                <div className="vlm-loading-state">
                  <Loader size={20} className="spin" />
                  <p>Multimodal VLM analyzing visual coordinates and data points...</p>
                  <span>Model: Qwen2-VL-2B-Instruct</span>
                </div>
              ) : vlmResult ? (
                <div className="vlm-result-card">
                  <div className="vlm-meta-bar">
                    <span className="vlm-model-tag">
                      <Sparkles size={11} /> {vlmResult.vlmModel}
                    </span>
                    <span className="vlm-confidence-badge">
                      {Math.round(vlmResult.confidenceScore * 100)}% Grounded
                    </span>
                    <button
                      type="button"
                      className="vlm-copy-btn"
                      onClick={handleCopyVlmResult}
                      title="Copy VLM interpretation"
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
                      <h5>Extracted Quantitative Series ({vlmResult.extractedMetrics.length})</h5>
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
