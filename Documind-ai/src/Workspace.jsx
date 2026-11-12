import { useEffect, useMemo, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { Physics2DPlugin } from 'gsap/Physics2DPlugin'
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  CheckCircle2,
  Database,
  FilePlus2,
  FileSearch,
  FolderOpen,
  GitCompareArrows,
  HardDrive,
  Info,
  LayoutGrid,
  List,
  Loader,
  Menu,
  MessageSquareText,
  Moon,
  PlusCircle,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  Sun,
  Trash2,
  X,
} from 'lucide-react'
import Brand from './Brand.jsx'
import {
  FILE_ACCEPT,
  useDocumentImport,
  PrivacyNotice,
  DocumentReader,
  SearchResultsView,
  ExcerptConsentModal,
  AiAssistantView,
  searchDocuments,
  retrieveEvidenceChunks,
  generateGroundedAnswer,
  SEED_DOCS,
} from './features/documents/index.js'

gsap.registerPlugin(useGSAP, Physics2DPlugin)

function formatSize(bytes) {
  if (!bytes) return '0 KB'
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function App() {
  const [dark, setDark] = useState(false)
  const [query, setQuery] = useState('')
  const [searchMode, setSearchMode] = useState('files') // 'files' | 'evidence' | 'ai'
  const [view, setView] = useState('list')
  const [filter, setFilter] = useState('All files')
  const [ascending, setAscending] = useState(false)
  const [notice, setNotice] = useState('')
  const [fileBurst, setFileBurst] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)

  // Document Reader state
  const [readerDoc, setReaderDoc] = useState(null)
  const [readerChunkIndex, setReaderChunkIndex] = useState(0)
  const [readerQuery, setReaderQuery] = useState('')

  // Milestone 4: AI Assistant & Excerpt Consent state
  const [aiMessages, setAiMessages] = useState([])
  const [isAiGenerating, setIsAiGenerating] = useState(false)
  const [pendingConsent, setPendingConsent] = useState(null) // { question, chunks }
  const abortControllerRef = useRef(null)

  const greeting = getGreeting()
  const fileRef = useRef(null)
  const searchRef = useRef(null)
  const mobileMenuButtonRef = useRef(null)
  const mobileTopbarRef = useRef(null)
  const workspaceRef = useRef(null)
  const uploadMarkRef = useRef(null)

  const {
    stagedDocs,
    libraryDocs,
    storageEstimate,
    privacyAccepted,
    acceptPrivacy,
    addFiles: importFiles,
    retryExtraction,
    dismissStaged,
    dismissAllStaged,
    saveStagedToLibrary,
    saveAllReadyStaged,
    deleteLibraryDoc,
    clearLibrary,
  } = useDocumentImport({
    seedDocs: SEED_DOCS,
    onNotice: setNotice,
  })

  const storedCount = libraryDocs.filter((d) => d.storedInBrowser).length
  const demoCount = libraryDocs.filter((d) => d.sample).length
  const stagedReadyCount = stagedDocs.filter((d) => d.status === 'ready').length
  const stagedExtractingCount = stagedDocs.filter((d) => d.status === 'extracting').length

  // GSAP Particle Burst on File Add
  useGSAP(() => {
    if (!fileBurst || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const particles = uploadMarkRef.current?.querySelectorAll('[data-file-particle]')
    if (!particles?.length) return

    const angles = [-155, -130, -105, -80, -55, -30, -5]
    particles.forEach((particle, index) => {
      gsap.fromTo(
        particle,
        { x: 0, y: 0, rotation: 0, opacity: 1 },
        {
          duration: 0.68,
          rotation: index % 2 ? 38 : -38,
          opacity: 0,
          physics2D: { velocity: 72, angle: angles[index], gravity: 150 },
          onComplete: () => gsap.set(particle, { clearProps: 'transform,opacity' }),
        }
      )
    })
  }, { scope: workspaceRef, dependencies: [fileBurst], revertOnUpdate: true })

  // Global Keyboard Shortcuts
  useEffect(() => {
    function handleShortcut(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  // Close overlays on Escape
  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        if (readerDoc) {
          setReaderDoc(null)
          return
        }
        if (pendingConsent) {
          setPendingConsent(null)
          return
        }
        if (confirmClearOpen) {
          setConfirmClearOpen(false)
          return
        }
        if (mobileMenuOpen) {
          setMobileMenuOpen(false)
          mobileMenuButtonRef.current?.focus()
        }
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [mobileMenuOpen, confirmClearOpen, readerDoc, pendingConsent])

  useEffect(() => {
    if (mobileMenuOpen) mobileTopbarRef.current?.querySelector('.mobile-nav a')?.focus()
  }, [mobileMenuOpen])

  useEffect(() => {
    if (!notice) return undefined
    const timeout = window.setTimeout(() => setNotice(''), 4500)
    return () => window.clearTimeout(timeout)
  }, [notice])

  // Filtered documents for file view
  const filteredDocs = useMemo(() => {
    const q = query.toLowerCase()
    const matches = libraryDocs.filter((doc) => {
      const nameMatch = searchMode === 'files' ? doc.name.toLowerCase().includes(q) : true
      const typeMatch = filter === 'All files' || doc.type === filter
      return nameMatch && typeMatch
    })
    return [...matches].sort((a, b) =>
      ascending
        ? a.name.localeCompare(b.name)
        : (b.persistedAt || b.addedAt || 0) - (a.persistedAt || a.addedAt || 0)
    )
  }, [libraryDocs, query, filter, ascending, searchMode])

  // On-device full-text search results across chunks
  const contentSearchResults = useMemo(() => {
    if (searchMode !== 'evidence' || !query.trim() || query.trim().length < 2) {
      return { query: '', totalMatches: 0, results: [] }
    }
    return searchDocuments(libraryDocs, query)
  }, [libraryDocs, query, searchMode])

  function handleFiles(files) {
    const incoming = Array.from(files)
    if (incoming.length === 0) return

    if (!privacyAccepted) {
      setNotice('Please review the privacy notice before adding files.')
      return
    }

    setFileBurst((current) => current + 1)
    importFiles(files)
  }

  function handleInspectPassage(docId, chunkIndex) {
    const doc = libraryDocs.find((d) => d.id === docId)
    if (doc) {
      setReaderDoc(doc)
      setReaderChunkIndex(chunkIndex)
      setReaderQuery(query)
    }
  }

  function handleOpenReader(doc) {
    setReaderDoc(doc)
    setReaderChunkIndex(0)
    setReaderQuery('')
  }

  // Milestone 4: Trigger AI question with explicit per-query consent
  function handleInitiateAiQuestion(question) {
    const retrieval = retrieveEvidenceChunks(libraryDocs, question, 3)

    // Open the Excerpt Consent dialog so user can inspect and approve candidate chunks
    setPendingConsent({
      question,
      chunks: retrieval.chunks,
    })
  }

  // Execute AI generation once consent is approved
  async function handleApproveConsentAndGenerate() {
    if (!pendingConsent) return
    const { question, chunks } = pendingConsent
    setPendingConsent(null)

    // Append user message
    const userMsg = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: question,
      timestamp: Date.now(),
    }
    setAiMessages((prev) => [...prev, userMsg])
    setIsAiGenerating(true)

    abortControllerRef.current = new AbortController()

    try {
      const response = await generateGroundedAnswer(
        question,
        chunks,
        abortControllerRef.current.signal
      )

      const assistantMsg = {
        id: crypto.randomUUID(),
        sender: 'assistant',
        text: response.answer,
        citations: response.citations,
        hasEvidence: response.hasEvidence,
        timestamp: Date.now(),
      }
      setAiMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      if (err.name !== 'AbortError') {
        const errorMsg = {
          id: crypto.randomUUID(),
          sender: 'assistant',
          text: 'Generation failed or encountered an error. You may retry or ask a different question.',
          timestamp: Date.now(),
        }
        setAiMessages((prev) => [...prev, errorMsg])
      }
    } finally {
      setIsAiGenerating(false)
      abortControllerRef.current = null
    }
  }

  function handleCancelAiGeneration() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsAiGenerating(false)
      setNotice('Excerpt retrieval stopped.')
    }
  }
  function closeMobileMenu() {
    setMobileMenuOpen(false)
    mobileMenuButtonRef.current?.focus()
  }

  function keepFocusInMobileMenu(event) {
    if (!mobileMenuOpen || event.key !== 'Tab') return
    const controls = mobileTopbarRef.current?.querySelectorAll('a[href], button:not([disabled])')
    const first = controls?.[0]
    const last = controls?.[controls.length - 1]
    const menuButton = mobileMenuButtonRef.current
    const active = document.activeElement
    if (event.shiftKey && (active === first || active === menuButton)) {
      event.preventDefault()
      ;(active === menuButton ? last : menuButton)?.focus()
    } else if (!event.shiftKey && (active === last || active === menuButton)) {
      event.preventDefault()
      ;(active === last ? menuButton : first)?.focus()
    }
  }

  return (
    <div ref={workspaceRef} className={dark ? 'app dark' : 'app'}>
      <aside className="sidebar" aria-label="Workspace navigation">
        <a className="brand" href="#dashboard" aria-label="DocuMind AI workspace">
          <Brand className="brand-lockup" markClassName="brand-mark" wordmarkClassName="brand-name" />
        </a>
        <div className="workspace-switcher">
          <span className="workspace-icon">A</span>
          <span>
            <strong>Anand's workspace</strong>
            <small>Local browser library</small>
          </span>
        </div>
        <nav className="nav-links" aria-label="Main navigation">
          <span className="nav-heading">Workspace</span>
          <a
            className={`nav-link ${searchMode === 'files' ? 'active' : ''}`}
            href="#dashboard"
            onClick={() => setSearchMode('files')}
          >
            <LayoutGrid size={17} /> Overview
          </a>
          <a
            className={`nav-link ${searchMode === 'evidence' ? 'active' : ''}`}
            href="#search"
            onClick={() => {
              setSearchMode('evidence')
              searchRef.current?.focus()
            }}
          >
            <FileSearch size={17} /> Search Evidence
          </a>
          <button
            className={`nav-link ${searchMode === 'ai' ? 'active' : ''}`}
            type="button"
            onClick={() => setSearchMode('ai')}
          >
            <Sparkles size={17} /> Evidence Assistant <span className="nav-count">{aiMessages.length || 'New'}</span>
          </button>
          <a className="nav-link" href="#documents" onClick={() => setSearchMode('files')}>
            <FolderOpen size={17} /> Documents <span className="nav-count">{libraryDocs.length}</span>
          </a>
          <span className="nav-heading nav-heading-lower">Manage</span>
          <button
            className="nav-link nav-disabled"
            type="button"
            title="Document comparison is planned for a future milestone"
            onClick={() => setNotice('Document comparison is planned, but not available yet.')}
          >
            <GitCompareArrows size={17} /> Compare <span className="planned">Planned</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          {storageEstimate && storageEstimate.usage > 0 && (
            <div
              className="storage-badge"
              title={`Estimated browser storage quota: ${(storageEstimate.quota / (1024 * 1024 * 1024)).toFixed(1)} GB`}
            >
              <HardDrive size={14} aria-hidden="true" />
              <span>~{(storageEstimate.usage / (1024 * 1024)).toFixed(1)} MB used locally</span>
            </div>
          )}
          <button
            className="user-row"
            type="button"
            onClick={() => setNotice('Account settings are not available in this local-first release.')}
          >
            <span className="avatar">AM</span>
            <span>
              <strong>Anand</strong>
              <small>Workspace owner</small>
            </span>
            <Settings2 size={16} />
          </button>
        </div>
      </aside>

      <main className="page" id="dashboard">
        <header ref={mobileTopbarRef} className="mobile-topbar" onKeyDown={keepFocusInMobileMenu}>
          <a className="brand" href="#dashboard" aria-label="DocuMind AI workspace">
            <Brand className="brand-lockup" markClassName="brand-mark" wordmarkClassName="brand-name" />
          </a>
          <div className="mobile-header-actions">
            <button
              ref={mobileMenuButtonRef}
              className="icon-button"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
            <button
              className="icon-button theme-button"
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
          </div>
          {mobileMenuOpen && (
            <nav className="mobile-nav" id="mobile-navigation" aria-label="Mobile navigation">
              <span className="nav-heading">Workspace</span>
              <a
                className={`nav-link ${searchMode === 'files' ? 'active' : ''}`}
                href="#dashboard"
                onClick={() => {
                  setSearchMode('files')
                  closeMobileMenu()
                }}
              >
                <LayoutGrid size={17} /> Overview
              </a>
              <a
                className={`nav-link ${searchMode === 'evidence' ? 'active' : ''}`}
                href="#search"
                onClick={() => {
                  setSearchMode('evidence')
                  closeMobileMenu()
                }}
              >
                <FileSearch size={17} /> Search Evidence
              </a>
              <button
                className={`nav-link ${searchMode === 'ai' ? 'active' : ''}`}
                type="button"
                onClick={() => {
                  setSearchMode('ai')
                  closeMobileMenu()
                }}
              >
                <Sparkles size={17} /> Evidence Assistant
              </button>
              <a
                className="nav-link"
                href="#documents"
                onClick={() => {
                  setSearchMode('files')
                  closeMobileMenu()
                }}
              >
                <FolderOpen size={17} /> Documents <span className="nav-count">{libraryDocs.length}</span>
              </a>
              <div className="mobile-menu-note">
                <strong>Local-first storage</strong>
                <span>Documents are stored in this browser's IndexedDB. Nothing leaves your device.</span>
              </div>
            </nav>
          )}
        </header>

        <div className="page-inner" inert={mobileMenuOpen}>
          <div className="top-actions">
            <span className="environment-tag">
              <Database size={13} aria-hidden="true" style={{ marginRight: '5px' }} /> Local IndexedDB
            </span>
            <button
              className="icon-button theme-button desktop-theme"
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
          </div>

          <section className="welcome-row">
            <div>
              <p className="greeting">{greeting}, Anand</p>
              <h1>Your document workspace</h1>
              <p className="subtitle">
                Search passages, inspect cited locators, and preview grounded evidence excerpts from your documents.
              </p>
            </div>
          </section>

          {!privacyAccepted && <PrivacyNotice onAccept={acceptPrivacy} />}

          {/* Upload Area */}
          <section
            className="upload-panel"
            onDragEnter={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false)
            }}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              handleFiles(event.dataTransfer.files)
            }}
          >
            <div className={`drop-zone ${dragging ? 'is-dragging' : ''}`}>
              <div className="upload-mark" ref={uploadMarkRef}>
                <FilePlus2 size={24} aria-hidden="true" />
                {Array.from({ length: 7 }, (_, index) => (
                  <span key={index} className="upload-particle" data-file-particle aria-hidden="true" />
                ))}
              </div>
              <div className="drop-copy">
                <h2>Select documents to extract</h2>
                <p>
                  Drop files here or choose from your computer. Files are read in this browser and staged for your review.
                </p>
                <span className="format-note">PDF, DOCX, or TXT. Maximum 25 MB per file.</span>
              </div>
              <button
                className="secondary-button"
                onClick={() => {
                  if (!privacyAccepted) {
                    setNotice('Please review the privacy notice before adding files.')
                    return
                  }
                  fileRef.current?.click()
                }}
              >
                Choose files
              </button>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept={FILE_ACCEPT}
                hidden
                onChange={(event) => {
                  handleFiles(event.target.files)
                  event.target.value = ''
                }}
              />
            </div>
            <div className="prototype-strip">
              <span className="prototype-icon">
                <Info size={17} aria-hidden="true" />
              </span>
              <p>
                <strong>Stored in this browser</strong> Text extraction runs on-device. Saved documents are stored in IndexedDB on this device and persist across reloads. No file bytes or text are sent to any server.
              </p>
            </div>
          </section>

          {/* Staging / Import Queue */}
          {stagedDocs.length > 0 && (
            <section className="staging-section" aria-label="Document staging queue">
              <div className="staging-header">
                <div>
                  <h3 className="staging-title">
                    Import Queue <span className="staging-badge">{stagedDocs.length}</span>
                  </h3>
                  <p className="staging-desc">
                    Review extracted text and click <strong>Add to local library</strong> to save files in this browser's IndexedDB.
                  </p>
                </div>
                <div className="staging-actions">
                  {stagedReadyCount > 0 && (
                    <button
                      className="primary-button staging-save-all"
                      onClick={saveAllReadyStaged}
                      title="Save all ready documents to browser storage"
                    >
                      <PlusCircle size={16} aria-hidden="true" />
                      Save all ready ({stagedReadyCount})
                    </button>
                  )}
                  <button
                    className="secondary-button staging-cancel-all"
                    onClick={dismissAllStaged}
                    title="Dismiss all staged files"
                  >
                    Dismiss queue
                  </button>
                </div>
              </div>

              <div className="staging-list">
                {stagedDocs.map((doc) => (
                  <article key={doc.id} className={`staging-card ${doc.status === 'failed' ? 'staging-card-failed' : ''}`}>
                    <span className={`file-icon file-${doc.type.toLowerCase()}`}>{doc.type}</span>
                    <div className="staging-card-info">
                      <h4 title={doc.name}>{doc.name}</h4>
                      <p className="staging-card-sub">
                        {formatSize(doc.size)}
                        {doc.status === 'extracting' && ' · Extracting text on-device…'}
                        {doc.status === 'ready' && ` · ${doc.chunks?.length || 0} sections extracted`}
                        {doc.status === 'failed' && ` · ${doc.error || 'Extraction failed'}`}
                      </p>
                    </div>

                    <div className="staging-item-actions">
                      {doc.status === 'extracting' && (
                        <span className="staging-status-pill status-extracting">
                          <Loader size={13} className="spin-icon" aria-hidden="true" /> Reading…
                        </span>
                      )}
                      {doc.status === 'ready' && (
                        <button
                          className="primary-button save-single-btn"
                          onClick={() => saveStagedToLibrary(doc.id)}
                          aria-label={`Save ${doc.name} to local library`}
                        >
                          <PlusCircle size={15} aria-hidden="true" /> Add to library
                        </button>
                      )}
                      {doc.status === 'failed' && (
                        <button
                          className="doc-action-button"
                          onClick={() => retryExtraction(doc.id)}
                          aria-label={`Retry extracting ${doc.name}`}
                          title="Retry extraction"
                        >
                          <RefreshCw size={14} />
                        </button>
                      )}
                      <button
                        className="doc-action-button"
                        onClick={() => dismissStaged(doc.id)}
                        aria-label={`Dismiss ${doc.name}`}
                        title="Dismiss from queue"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* Active Extraction Banner if any are extracting */}
          {stagedExtractingCount > 0 && (
            <div className="extraction-progress" role="status" aria-live="polite">
              <Loader size={16} className="spin-icon" aria-hidden="true" />
              <span>Extracting text on-device from {stagedExtractingCount} document{stagedExtractingCount === 1 ? '' : 's'}…</span>
            </div>
          )}

          {/* Main Library & Search Section */}
          <section className="library-section" id="documents">
            <div className="section-heading">
              <div>
                <h2>Documents, Evidence & Assistant</h2>
                <p>Browse saved documents, search extracted passages, or preview grounded evidence excerpts.</p>
              </div>
              <div className="library-counts">
                <span className="count-label">{demoCount} demo</span>
                <span className="count-label count-label-stored">
                  <Database size={12} aria-hidden="true" style={{ marginRight: '4px' }} />
                  {storedCount} stored in browser
                </span>
                {storedCount > 0 && (
                  <button
                    className="clear-library-btn"
                    onClick={() => setConfirmClearOpen(true)}
                    title="Clear all stored documents from browser storage"
                  >
                    <Trash2 size={13} aria-hidden="true" /> Clear stored
                  </button>
                )}
              </div>
            </div>

            {/* Clear Library Confirmation Dialog */}
            {confirmClearOpen && (
              <div className="confirm-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="clear-modal-title">
                <div className="confirm-modal">
                  <div className="confirm-modal-header">
                    <AlertCircle size={22} className="confirm-icon" aria-hidden="true" />
                    <h3 id="clear-modal-title">Clear local browser library?</h3>
                  </div>
                  <p>
                    This will permanently delete all <strong>{storedCount} document{storedCount === 1 ? '' : 's'}</strong> and their extracted text from this browser's IndexedDB. Built-in demo files will remain.
                  </p>
                  <div className="confirm-modal-actions">
                    <button
                      className="primary-button confirm-danger-btn"
                      onClick={() => {
                        clearLibrary()
                        setConfirmClearOpen(false)
                      }}
                    >
                      Yes, clear library
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() => setConfirmClearOpen(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Search Mode Switcher Tabs */}
            <div className="search-mode-tabs" role="tablist" aria-label="Search target mode">
              <button
                role="tab"
                aria-selected={searchMode === 'files'}
                className={`search-mode-tab ${searchMode === 'files' ? 'active' : ''}`}
                onClick={() => setSearchMode('files')}
              >
                <FolderOpen size={15} aria-hidden="true" />
                <span>Files</span>
              </button>
              <button
                role="tab"
                aria-selected={searchMode === 'evidence'}
                className={`search-mode-tab ${searchMode === 'evidence' ? 'active' : ''}`}
                onClick={() => {
                  setSearchMode('evidence')
                  searchRef.current?.focus()
                }}
              >
                <FileSearch size={15} aria-hidden="true" />
                <span>Search Evidence</span>
              </button>
              <button
                role="tab"
                aria-selected={searchMode === 'ai'}
                className={`search-mode-tab ${searchMode === 'ai' ? 'active' : ''}`}
                onClick={() => setSearchMode('ai')}
              >
                <Sparkles size={15} aria-hidden="true" />
                <span>Evidence Assistant</span>
              </button>
            </div>

            {/* AI Assistant View (Active when searchMode === 'ai') */}
            {searchMode === 'ai' && (
              <AiAssistantView
                messages={aiMessages}
                isGenerating={isAiGenerating}
                onAskQuestion={handleInitiateAiQuestion}
                onCancelGeneration={handleCancelAiGeneration}
                onClearChat={() => setAiMessages([])}
                onInspectCitation={handleInspectPassage}
              />
            )}

            {/* Search and Toolbar (Active when NOT in AI mode) */}
            {searchMode !== 'ai' && (
              <div className="library-toolbar">
                <label className="search-box">
                  <Search size={17} aria-hidden="true" />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={
                      searchMode === 'evidence'
                        ? 'Search terms or phrases across document passages…'
                        : 'Search by file name…'
                    }
                    aria-label={
                      searchMode === 'evidence'
                        ? 'Search document contents'
                        : 'Search documents by file name'
                    }
                  />
                  <kbd>Ctrl / ⌘ K</kbd>
                </label>

                <div className="toolbar-actions">
                  <label className="filter-select">
                    <span>Type</span>
                    <select
                      value={filter}
                      onChange={(event) => setFilter(event.target.value)}
                      aria-label="Filter documents by file type"
                    >
                      <option>All files</option>
                      <option>PDF</option>
                      <option>DOCX</option>
                      <option>TXT</option>
                    </select>
                  </label>

                  <button
                    className="filter-button sort-button"
                    onClick={() => setAscending(!ascending)}
                    aria-label={`Sort ${ascending ? 'by most recently added' : 'by file name'}`}
                  >
                    {ascending ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                    <span>{ascending ? 'Name' : 'Recent'}</span>
                  </button>

                  <div className="view-toggle" role="group" aria-label="Document layout">
                    <button
                      className={view === 'list' ? 'selected' : ''}
                      onClick={() => setView('list')}
                      aria-label="List view"
                      aria-pressed={view === 'list'}
                    >
                      <List size={17} />
                    </button>
                    <button
                      className={view === 'grid' ? 'selected' : ''}
                      onClick={() => setView('grid')}
                      aria-label="Grid view"
                      aria-pressed={view === 'grid'}
                    >
                      <LayoutGrid size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Evidence Search Results View (Active in Evidence mode) */}
            {searchMode === 'evidence' ? (
              <SearchResultsView
                query={contentSearchResults.query}
                results={contentSearchResults.results}
                totalMatches={contentSearchResults.totalMatches}
                onInspect={handleInspectPassage}
                onClear={() => setQuery('')}
              />
            ) : null}

            {/* Document Library Card View (Active in Files mode) */}
            {searchMode === 'files' ? (
              filteredDocs.length ? (
                <div className={view === 'list' ? 'document-list' : 'document-grid'}>
                  {filteredDocs.map((doc) => (
                    <article key={doc.id} className="document-card">
                      <span className={`file-icon file-${doc.type.toLowerCase()}`}>{doc.type}</span>
                      <div className="doc-main">
                        <h3 title={doc.name}>{doc.name}</h3>
                        <p className="doc-subtitle">
                          {doc.sample ? (
                            `Demo example, ${formatSize(doc.size)}`
                          ) : (
                            <>
                              Stored in this browser, {formatSize(doc.size)}
                              {doc.chunks?.length ? ` · ${doc.chunks.length} section${doc.chunks.length === 1 ? '' : 's'}` : ''}
                            </>
                          )}
                        </p>
                      </div>

                      <div className="doc-card-actions">
                        <button
                          className="doc-inspect-btn"
                          onClick={() => handleOpenReader(doc)}
                          title={`Read extracted text of ${doc.name}`}
                          aria-label={`Read extracted text of ${doc.name}`}
                        >
                          <BookOpen size={13} aria-hidden="true" />
                          <span>Read</span>
                        </button>

                        {doc.sample ? (
                          <span className="doc-status sample-status">Sample</span>
                        ) : (
                          <span className="doc-status status-stored" title="Persisted in browser IndexedDB">
                            <CheckCircle2 size={12} aria-hidden="true" /> Stored in browser
                          </span>
                        )}

                        <button
                          className="doc-action-button doc-delete-btn"
                          onClick={() => deleteLibraryDoc(doc.id)}
                          aria-label={`Delete ${doc.name}`}
                          title={doc.sample ? 'Dismiss sample' : 'Delete from browser storage'}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-search">
                  <FolderOpen size={28} />
                  <strong>No matching documents</strong>
                  <span>Try another file name or choose a different file type.</span>
                  <button
                    className="secondary-button empty-reset"
                    onClick={() => {
                      setQuery('')
                      setFilter('All files')
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )
            ) : null}
          </section>

          <footer className="page-footer">
            <span>
              DocuMind AI · Stored in this browser's local database.
            </span>
            <span>
              Local evidence search & grounded excerpt preview. Zero data transmitted to third-party endpoints.
            </span>
          </footer>
        </div>

        {/* Excerpt Consent Modal (Appears before sending chunks to AI) */}
        {pendingConsent && (
          <ExcerptConsentModal
            question={pendingConsent.question}
            chunks={pendingConsent.chunks}
            onApprove={handleApproveConsentAndGenerate}
            onCancel={() => setPendingConsent(null)}
          />
        )}

        {/* Document Reader Overlay View */}
        {readerDoc && (
          <DocumentReader
            doc={readerDoc}
            initialChunkIndex={readerChunkIndex}
            initialQuery={readerQuery}
            onClose={() => setReaderDoc(null)}
          />
        )}

        {notice && (
          <div className="toast" role="status">
            <Check size={17} />
            <span>{notice}</span>
            <button onClick={() => setNotice('')} aria-label="Dismiss notification">
              <X size={16} />
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
