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
function SearchResultsView({ query, results, totalMatches, onInspect, onClear }) {
  if (!query || query.trim().length < 2) return null

  return (
    <section className="search-results-section" aria-label="Evidence search results">
      <div className="search-results-header">
        <div className="search-results-title">
          <Search size={18} aria-hidden="true" />
          <h3>
            Evidence matches for <span className="search-query-tag">"{query}"</span>
          </h3>
          <span className="search-count-pill">{totalMatches} passage{totalMatches === 1 ? '' : 's'}</span>
          <span className="neural-rerank-active-badge" title="Results re-ranked by how many query terms appear and how close together they are">
            <Zap size={11} aria-hidden="true" />
            <span>Term-proximity re-ranked</span>
          </span>
        </div>
        <button
          className="search-clear-btn"
          onClick={onClear}
          aria-label="Clear content search"
          title="Clear search"
        >
          <X size={15} /> Clear search
        </button>
      </div>

      <div className="search-evidence-note">
        <FileText size={14} aria-hidden="true" />
        <span>
          Local full-text search across extracted document text. Click <strong>Inspect passage</strong> to jump directly to the cited source locator.
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
                      {result.rerankScore !== undefined && (
                        <span
                          className="evidence-rerank-pill"
                          title={`Re-rank score: ${Math.round(result.rerankScore * 100)}% · Initial Rank #${result.originalRank || 1}${result.rankDelta ? ` (Shift: ${result.rankDelta > 0 ? `+${result.rankDelta}` : result.rankDelta})` : ''}`}
                        >
                          <Zap size={10} aria-hidden="true" />
                          <span>Re-Rank: {Math.round(result.rerankScore * 100)}%</span>
                          {result.rankDelta > 0 && <span className="rerank-climb-badge">+{result.rankDelta}</span>}
                        </span>
                      )}
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

