import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  Maximize2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import {
  groupDocumentByPages,
  estimateBoundingBox,
  calculateZoomMetrics,
  bboxToStyle,
} from '../services/visualGrounding.js'
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
            aria-label="Previous Page"
            title="Previous Page"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="visual-page-badge">
            Page {currentPage} of {pages.length}
          </span>
          <button
            type="button"
            className="secondary-button visual-tool-btn"
            onClick={() => setCurrentPage((p) => Math.min(pages.length, p + 1))}
            disabled={currentPage >= pages.length}
            aria-label="Next Page"
            title="Next Page"
          >
            <ChevronRight size={14} />
          </button>
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
                  const bbox = estimateBoundingBox(
                    chunk,
                    activePage.chunks.map((c) => c.text).join('\n\n')
                  )
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
                        <ExternalLink size={11} aria-hidden="true" />
                      </div>
                      <p className="chunk-body-text">{chunk.text}</p>

                      {/* Visual Bounding Box Region */}
                      <div
                        className={`visual-bbox-overlay ${isCited ? 'bbox-highlighted' : ''}`}
                        style={bboxToStyle(bbox)}
                        aria-hidden="true"
                      >
                        <span className="bbox-label">{chunk.locator}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Page Footer */}
              <div className="page-card-footer">
                <span>DocuMind AI Grounded Provenance Engine</span>
                <span>Page {activePage.pageNumber} / {pages.length}</span>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
