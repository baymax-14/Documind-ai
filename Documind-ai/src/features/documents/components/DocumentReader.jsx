import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  BookOpen,
  Check,
  Copy,
  FileText,
  Search,
  X,
} from 'lucide-react'

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
 * @param {string} [props.initialQuery] - Search query to highlight.
 * @param {() => void} props.onClose - Dismiss callback.
 * @param {boolean} [props.fromAssistant] - Whether opened from assistant citation.
 */
function DocumentReader({ doc, initialChunkIndex = 0, initialQuery = '', onClose, fromAssistant = false }) {
  const [filterQuery, setFilterQuery] = useState(initialQuery)
  const [selectedChunk, setSelectedChunk] = useState(initialChunkIndex)
  const [copied, setCopied] = useState(false)

  const readerRef = useRef(null)
  const chunkRefs = useRef(new Map())

  const chunks = useMemo(() => {
    if (doc?.chunks && doc.chunks.length > 0) return doc.chunks
    if (doc?.text) {
      return [{ index: 0, locator: 'Section 1', text: doc.text, offset: 0 }]
    }
    return []
  }, [doc])

  // Filter chunks if in-document search query is active
  const displayedChunks = useMemo(() => {
    if (!filterQuery || !filterQuery.trim()) return chunks
    const q = filterQuery.toLowerCase().trim()
    return chunks.filter((c) => c.text.toLowerCase().includes(q))
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

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

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
            {fromAssistant && (
              <button
                className="reader-action-btn reader-return-btn"
                onClick={onClose}
                title="Return to Assistant conversation (Esc)"
              >
                <ArrowLeft size={14} aria-hidden="true" />
                <span>Back to Assistant</span>
              </button>
            )}

            <div className="reader-search-input">
              <Search size={14} aria-hidden="true" />
              <input
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filter in document…"
                aria-label="Filter passages in this document"
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
              className="reader-close-btn"
              onClick={onClose}
              aria-label="Close document reader (Esc)"
              title="Close reader (Esc)"
            >
              <X size={18} />
              <kbd>Esc</kbd>
            </button>
          </div>
        </header>

        {/* Reader Body: Section rail + Reading content */}
        <div className="reader-body">
          {/* Section jumper rail */}
          <aside className="reader-rail" aria-label="Section locator jumper">
            <div className="reader-rail-header">
              <BookOpen size={14} aria-hidden="true" />
              <span>Locators ({chunks.length})</span>
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
                    {c.text.slice(0, 40)}…
                  </span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Main Reading Surface */}
          <main className="reader-content" tabIndex={0}>
            {displayedChunks.length > 0 ? (
              displayedChunks.map((chunk) => (
                <article
                  key={chunk.index}
                  ref={(el) => {
                    if (el) chunkRefs.current.set(chunk.index, el)
                    else chunkRefs.current.delete(chunk.index)
                  }}
                  className={`reader-chunk ${selectedChunk === chunk.index ? 'reader-chunk-highlight' : ''}`}
                  id={`chunk-${chunk.index}`}
                >
                  <div className="reader-chunk-header">
                    <span className="reader-locator-badge">
                      <FileText size={12} aria-hidden="true" /> {chunk.locator}
                    </span>
                    <button
                      className="reader-copy-passage"
                      onClick={() => {
                        navigator.clipboard.writeText(chunk.text)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 1500)
                      }}
                      title="Copy this section text"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                  <div className="reader-chunk-text">
                    <HighlightedText text={chunk.text} query={filterQuery} />
                  </div>
                </article>
              ))
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
      </div>
    </div>
  )
}

export default DocumentReader

