import { useEffect, useMemo, useRef, useState } from 'react'
import { gsap, useGSAP, prefersReducedMotion, EASE_ARRIVE, EASE_PRESS } from '../../../gsap.js'
import {
  ArrowLeft,
  BookOpen,
  Check,
  Copy,
  Eye,
  FileText,
  Search,
  Table2,
  X,
} from 'lucide-react'
import { extractTablesFromText } from '../services/tableParser.js'
import { passageContainsAllTerms } from '../services/search.js'
import TableView from './TableView.jsx'
import PageVisualPreview from './PageVisualPreview.jsx'
import ReadableText from './ReadableText.jsx'
import { useOverlay } from '../hooks/useOverlay.js'

function formatSize(bytes) {
  if (!bytes) return '0 KB'
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/**
 * Split text and highlight occurrences of search terms.
 *
 * @param {string} text
 * @param {string} query
 */
function HighlightedText({ text, query }) {
  if (!query || !query.trim()) return <>{text}</>

  const terms = query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (terms.length === 0) return <>{text}</>

  // Build regex matching any term safely
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(regex)

  return (
    <>
      {parts.map((part, i) => {
        const isMatch = terms.some((t) => t.toLowerCase() === part.toLowerCase())
        return isMatch ? (
          <mark key={i} className="reader-mark">
            {part}
          </mark>
        ) : (
          part
        )
      })}
    </>
  )
}

/**
 * Extracted-Text Document Reader View for DocuMind AI.
 * Displays all extracted sections/chunks with their original locators,
 * auto-scrolls to cited matches, and allows in-document search.
 *
 * @param {Object} props
 * @param {import('../types/document.js').DocRecord} props.doc - Document to inspect.
 * @param {number} [props.initialChunkIndex] - Chunk to scroll into view.
 * @param {string} [props.initialQuery] - Search words to underline. The document opens
 *   whole; the reader can then choose to show only the passages that contain them.
 * @param {() => void} props.onClose - Dismiss callback.
 * @param {boolean} [props.fromAssistant] - Whether opened from assistant citation.
 * @param {'text' | 'visual' | 'tables'} [props.initialViewMode='text'] - Initial view mode.
 * @param {{ index: number, label: string } | null} [props.markedChunk] - Passage to mark, and why
 *   (a citation, a search match). Nothing is marked when the document was simply opened.
 */
function DocumentReader({
  doc,
  initialChunkIndex = 0,
  initialQuery = '',
  onClose,
  fromAssistant = false,
  initialViewMode = 'text',
  markedChunk = null,
}) {
  const [filterQuery, setFilterQuery] = useState('')
  // Words carried over from a search are underlined, never used to hide passages
  const highlightQuery = filterQuery || initialQuery
  const [selectedChunk, setSelectedChunk] = useState(initialChunkIndex)
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState(initialViewMode)

  const readerRef = useRef(null)
  const chunkRefs = useRef(new Map())

  // Focus moves into the reader, Tab stays inside, Esc closes it, and focus
  // returns to the citation or button that opened it.
  useOverlay({ active: Boolean(doc), containerRef: readerRef, onClose })

  // Opening: the backdrop fades and the sheet rises a few pixels into place.
  useGSAP(() => {
    const overlay = readerRef.current
    if (!overlay) return
    const sheet = overlay.querySelector('.reader-container')
    const still = prefersReducedMotion()
    gsap.from(overlay, { opacity: 0, duration: 0.2, ease: 'power1.out', clearProps: 'opacity' })
    gsap.from(sheet, {
      opacity: 0,
      y: still ? 0 : 12,
      duration: 0.24,
      ease: EASE_ARRIVE,
      clearProps: 'opacity,transform',
    })
  }, { scope: readerRef })

  // Landing on the marked passage: once it has scrolled into view its red tint
  // settles in and its label presses down, so the eye goes to the cited place.
  useGSAP(() => {
    if (!markedChunk || viewMode !== 'text') return
    const block = chunkRefs.current.get(markedChunk.index)
    if (!block) return
    const tag = block.querySelector('.reader-mark-tag')
    const tl = gsap.timeline({ delay: 0.35 })
    tl.from(block, {
      backgroundColor: 'rgba(0, 0, 0, 0)',
      borderColor: 'rgba(0, 0, 0, 0)',
      duration: 0.45,
      ease: 'power2.out',
      clearProps: 'backgroundColor,borderColor',
    })
    if (tag && !prefersReducedMotion()) {
      tl.from(tag, { scale: 1.25, opacity: 0, duration: 0.22, ease: EASE_PRESS, clearProps: 'transform,opacity' }, 0.15)
    }
  }, { dependencies: [markedChunk?.index, viewMode], scope: readerRef })

  // Extract tables from document if any exist
  const docTables = useMemo(() => {
    if (!doc) return []
    const extracted = []
    if (doc.chunks && doc.chunks.length > 0) {
      doc.chunks.forEach((chunk) => {
        extracted.push(...extractTablesFromText(chunk.text, { page: chunk.page, parentLocator: chunk.locator }))
      })
    } else if (doc.text) {
      extracted.push(...extractTablesFromText(doc.text))
    }
    return extracted
  }, [doc])

  const chunks = useMemo(() => {
    if (doc?.chunks && doc.chunks.length > 0) return doc.chunks
    if (doc?.text) {
      return [{ index: 0, locator: 'Section 1', text: doc.text, offset: 0 }]
    }
    return []
  }, [doc])

  // Filter passages by the words typed (all of them, in any order), matched the
  // way passage search matches them, so a search's passages survive the filter
  const displayedChunks = useMemo(() => {
    if (!filterQuery || !filterQuery.trim()) return chunks
    return chunks.filter((c) => passageContainsAllTerms(c.text, filterQuery))
  }, [chunks, filterQuery])

  // Auto-scroll to target chunk on open
  useEffect(() => {
    if (initialChunkIndex !== undefined && initialChunkIndex !== null) {
      setSelectedChunk(initialChunkIndex)
      const timer = setTimeout(() => {
        const el = chunkRefs.current.get(initialChunkIndex)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 120)
      return () => clearTimeout(timer)
    }
  }, [initialChunkIndex])

  // Copy full document text
  function handleCopy() {
    if (!doc?.text && chunks.length === 0) return
    const textToCopy = doc?.text || chunks.map((c) => c.text).join('\n\n')
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function scrollToChunk(index) {
    setSelectedChunk(index)
    const el = chunkRefs.current.get(index)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (!doc) return null

  return (
    <div
      className="reader-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Extracted text reader: ${doc.name}`}
      ref={readerRef}
    >
      <div className="reader-container">
        {/* Top bar */}
        <header className="reader-topbar">
          <div className="reader-title-area">
            <span className={`file-icon file-${doc.type.toLowerCase()} reader-icon`}>
              {doc.type}
            </span>
            <div className="reader-title-text">
              <h2>{doc.name}</h2>
              <p>
                {doc.sample ? 'Demo example' : 'Stored in this browser'} · {formatSize(doc.size)} ·{' '}
                {chunks.length} {doc.type === 'PDF' ? 'page' : 'section'}
                {chunks.length === 1 ? '' : 's'} extracted
              </p>
            </div>
          </div>

          <div className="reader-top-actions">
            <div className="reader-view-toggle-bar">
              <button
                type="button"
                className={`reader-toggle-btn ${viewMode === 'text' ? 'active' : ''}`}
                aria-pressed={viewMode === 'text'}
                onClick={() => setViewMode('text')}
                title="The whole document as one text, with page markers"
              >
                <FileText size={13} aria-hidden="true" />
                <span>Read</span>
              </button>
              <button
                type="button"
                className={`reader-toggle-btn ${viewMode === 'visual' ? 'active' : ''}`}
                aria-pressed={viewMode === 'visual'}
                onClick={() => setViewMode('visual')}
                title="One page at a time, showing the text extracted from that page"
              >
                <Eye size={13} aria-hidden="true" />
                <span>Page view</span>
              </button>
              {docTables.length > 0 && (
                <button
                  type="button"
                  className={`reader-toggle-btn ${viewMode === 'tables' ? 'active' : ''}`}
                  aria-pressed={viewMode === 'tables'}
                  onClick={() => setViewMode('tables')}
                  title="View extracted tables"
                >
                  <Table2 size={13} />
                  <span>Tables ({docTables.length})</span>
                </button>
              )}
            </div>

            <div className="reader-search-input">
              <Search size={14} aria-hidden="true" />
              <input
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filter passages…"
                aria-label="Show only passages containing these words"
              />
              {filterQuery && (
                <button
                  className="reader-clear-search"
                  onClick={() => setFilterQuery('')}
                  aria-label="Clear filter"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <button
              className="reader-action-btn"
              onClick={handleCopy}
              title="Copy extracted text to clipboard"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy text'}</span>
            </button>

            <button
              className={`reader-close-btn ${fromAssistant ? 'reader-return-btn' : ''}`}
              onClick={onClose}
              aria-label={fromAssistant ? 'Back to the assistant (Esc)' : 'Close the reader (Esc)'}
            >
              {fromAssistant ? <ArrowLeft size={16} aria-hidden="true" /> : <X size={18} aria-hidden="true" />}
              <span>{fromAssistant ? 'Back to assistant' : 'Close'}</span>
              <kbd>Esc</kbd>
            </button>
          </div>
        </header>

        {/* Reader Body: Section rail + Reading content OR Table View OR Visual Page Preview */}
        {viewMode === 'tables' ? (
          <div className="reader-tables-pane">
            <TableView document={doc} tables={docTables} />
          </div>
        ) : viewMode === 'visual' ? (
          <div className="reader-visual-pane">
            <PageVisualPreview
              document={doc}
              highlightChunkIndex={selectedChunk}
              markedChunkIndex={markedChunk?.index}
              markedLabel={markedChunk?.label}
              renderText={(t) => <HighlightedText text={t} query={highlightQuery} />}
              onInspectPassage={(locator) => {
                navigator.clipboard.writeText(locator)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
            />
          </div>
        ) : (
          <div className="reader-body">
            {/* Section jumper rail */}
            <aside className="reader-rail" aria-label="Passages in this document">
              <div className="reader-rail-header">
                <BookOpen size={14} aria-hidden="true" />
                <span>Jump to ({chunks.length})</span>
              </div>
              <nav className="reader-nav-list">
                {chunks.map((c) => (
                  <button
                    key={c.index}
                    className={`reader-nav-item ${selectedChunk === c.index ? 'active' : ''}`}
                    onClick={() => scrollToChunk(c.index)}
                  >
                    <span className="reader-nav-locator">{c.locator}</span>
                    <span className="reader-nav-snippet">
                      {c.text.replace(/[#|*]+|:?-{3,}:?/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40)}…
                    </span>
                  </button>
                ))}
              </nav>
            </aside>

            {/* Main Reading Surface */}
            <main className="reader-content" tabIndex={0}>
              {filterQuery.trim() && displayedChunks.length > 0 && (
                <div className="reader-filter-status" role="status">
                  <span>
                    Showing {displayedChunks.length} of {chunks.length} passages containing all of “{filterQuery.trim()}”
                  </span>
                  <button type="button" className="ai-strip-btn" onClick={() => setFilterQuery('')}>
                    Show the whole document
                  </button>
                </div>
              )}
              {!filterQuery.trim() && initialQuery.trim() && (
                <div className="reader-filter-status" role="status">
                  <span>Your search words “{initialQuery.trim()}” are underlined.</span>
                  <button type="button" className="ai-strip-btn" onClick={() => setFilterQuery(initialQuery.trim())}>
                    Show only those passages
                  </button>
                </div>
              )}
              {displayedChunks.length > 0 ? (
                displayedChunks.map((chunk, i) => {
                  const isMarked = markedChunk && markedChunk.index === chunk.index
                  const newPlace = i === 0 || displayedChunks[i - 1].locator !== chunk.locator
                  return (
                  <article
                    key={chunk.index}
                    ref={(el) => {
                      if (el) chunkRefs.current.set(chunk.index, el)
                      else chunkRefs.current.delete(chunk.index)
                    }}
                    className={`reader-chunk ${isMarked ? 'reader-chunk-highlight' : ''} ${newPlace ? 'is-new-place' : ''}`}
                    id={`chunk-${chunk.index}`}
                  >
                    <div className="reader-chunk-header">
                      {(newPlace || isMarked) && (
                        <span className="reader-locator-badge">
                          <FileText size={12} aria-hidden="true" /> {chunk.locator}
                        </span>
                      )}
                      {isMarked && (
                        <span className="reader-mark-tag">{markedChunk.label}</span>
                      )}
                      <button
                        className="reader-copy-passage"
                        onClick={() => {
                          navigator.clipboard.writeText(chunk.text)
                          setCopied(true)
                          setTimeout(() => setCopied(false), 1500)
                        }}
                        aria-label={`Copy the text of ${chunk.locator}`}
                        title="Copy this passage's text"
                      >
                        <Copy size={12} aria-hidden="true" />
                      </button>
                    </div>
                    <div className="reader-chunk-text">
                      <ReadableText
                        text={chunk.text}
                        renderText={(t) => <HighlightedText text={t} query={highlightQuery} />}
                      />
                    </div>
                  </article>
                  )
                })
              ) : (
                <div className="reader-empty">
                  <Search size={24} aria-hidden="true" />
                  <p>No passages in this document matched "{filterQuery}".</p>
                  <button className="secondary-button" onClick={() => setFilterQuery('')}>
                    Clear filter
                  </button>
                </div>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  )
}

export default DocumentReader

