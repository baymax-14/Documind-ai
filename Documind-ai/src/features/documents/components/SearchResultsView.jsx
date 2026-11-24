import {
  ArrowRight,
  ExternalLink,
  FileText,
  Search,
  X,
  Zap,
} from 'lucide-react'

/**
 * Display search results across document chunks with matching excerpts
 * and click-through navigation to inspect source locators.
 *
 * @param {Object} props
 * @param {string} props.query - Active search query.
 * @param {import('../services/search.js').SearchResultItem[]} props.results - Matching results.
 * @param {number} props.totalMatches - Total match count.
 * @param {(docId: string, chunkIndex: number) => void} props.onInspect - Callback to open Reader at passage.
 * @param {() => void} props.onClear - Clear search callback.
 */
const EXAMPLE_SEARCHES = ['retention', 'privacy', 'growth']

function SearchResultsView({ query, results, totalMatches, onInspect, onClear, onTryQuery }) {
  if (!query || query.trim().length < 2) {
    return (
      <section className="search-start" aria-label="Search passages">
        <p>Type a word or phrase to find every passage that contains it, across all your documents.</p>
        {onTryQuery && (
          <div className="search-start-examples">
            <span>Try</span>
            {EXAMPLE_SEARCHES.map((q) => (
              <button key={q} type="button" className="ai-strip-btn" onClick={() => onTryQuery(q)}>
                {q}
              </button>
            ))}
          </div>
        )}
      </section>
    )
  }

  return (
    <section className="search-results-section" aria-label="Evidence search results">
      <div className="search-results-header">
        <div className="search-results-title">
          <Search size={18} aria-hidden="true" />
          <h3>
            Passages matching <span className="search-query-tag">"{query}"</span>
          </h3>
          <span className="search-count-pill">{totalMatches} passage{totalMatches === 1 ? '' : 's'}</span>
          <span className="neural-rerank-active-badge">
            <Zap size={11} aria-hidden="true" />
            <span>Closest matches first</span>
          </span>
        </div>
        <button
          className="search-clear-btn"
          onClick={onClear}
        >
          <X size={15} /> Clear search
        </button>
      </div>

      <div className="search-evidence-note">
        <FileText size={14} aria-hidden="true" />
        <span>
          Searches the text of your documents in this browser. <strong>Inspect passage</strong> opens it in its document.
        </span>
      </div>

      {totalMatches > 0 ? (
        <div className="search-cards-list">
          {results.map((result) => (
            <article key={result.id} className="evidence-card">
              <div className="evidence-card-header">
                <div className="evidence-doc-meta">
                  <span className={`file-icon file-${result.docType.toLowerCase()} evidence-file-icon`}>
                    {result.docType}
                  </span>
                  <div>
                    <h4 title={result.docName}>{result.docName}</h4>
                    <div className="evidence-tags-row">
                      <span className="evidence-locator-tag">
                        {result.locator}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  className="primary-button inspect-passage-btn"
                  onClick={() => onInspect(result.docId, result.chunkIndex)}
                  title={`Open ${result.docName} at ${result.locator}`}
                >
                  <span>Inspect passage</span>
                  <ArrowRight size={14} aria-hidden="true" />
                </button>
              </div>

              <div className="evidence-snippet">
                <p>
                  {result.snippet.prefix}
                  <mark className="search-highlight">{result.snippet.match}</mark>
                  {result.snippet.suffix}
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="search-empty-state">
          <Search size={26} aria-hidden="true" />
          <h4>No matching passages found</h4>
          <p>
            No extracted documents contain "{query}". Try checking your spelling or searching for broader terms.
          </p>
        </div>
      )}
    </section>
  )
}

export default SearchResultsView

