import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Cloud,
  Cpu,
  Database,
  Eye,
  FilePlus2,
  FileSearch,
  FileText,
  FolderOpen,
  GitCompareArrows,
  HardDrive,
  Info,
  LayoutGrid,
  Layers,
  List,
  Loader,
  Lock,
  Menu,
  MessageSquareText,
  Moon,
  PlusCircle,
  RefreshCw,
  ScanText,
  Search,
  Sparkles,
  Sun,
  Trash2,
  X,
} from 'lucide-react'
import Brand from './Brand.jsx'
import { SAMPLE_PROMPTS } from './features/documents/data/samplePrompts.js'
import {
  FILE_ACCEPT,
  useDocumentImport,
  PrivacyNotice,
  SearchResultsView,
  searchDocuments,
  retrieveEvidenceChunks,
  checkWebGPUSupport,
  initializeOnDeviceEngine,
  generateAnswerWithFallback,
  DEFAULT_MODEL_ID,
  EVALUATED_MODELS,
  useSemanticIndex,
  SEED_DOCS,
  StorageHardwareModal,
  createConnectionManager,
  createSyncManager,
  saveConversation,
  listConversations,
  askBackendQuestion,
  uploadDocumentToBackend,
  ProcessingStatusBadge,
  createTokenBudgetTracker,
} from './features/documents/index.js'

const DocumentReader = lazy(() => import('./features/documents/components/DocumentReader.jsx'))
const AiAssistantView = lazy(() => import('./features/documents/components/AiAssistantView.jsx'))
const ComparisonView = lazy(() => import('./features/documents/components/ComparisonView.jsx'))
const DocumentWorkflowsModal = lazy(() => import('./features/documents/components/DocumentWorkflowsModal.jsx'))
const ConversationHistoryModal = lazy(() => import('./features/documents/components/ConversationHistoryModal.jsx'))
const TokenGovernanceModal = lazy(() => import('./features/documents/components/TokenGovernanceModal.jsx'))

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

function safeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9)
}

function App() {
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem('documind_theme')
      if (saved) return saved === 'dark'
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('documind_theme', dark ? 'dark' : 'light')
    } catch {
      // Ignore private browsing or quota errors
    }
    if (dark) {
      document.documentElement.classList.add('dark')
      document.body.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
      document.body.classList.remove('dark')
    }
    // The theme belongs to the workspace only; leaving it must not restyle the landing page.
    return () => {
      document.documentElement.classList.remove('dark')
      document.body.classList.remove('dark')
    }
  }, [dark])

  // Each tab keeps its own search text, so a passage search never filters the file list
  const [fileQuery, setFileQuery] = useState('')
  const [evidenceQuery, setEvidenceQuery] = useState('')
  const [searchMode, setSearchMode] = useState('files') // 'files' | 'evidence' | 'ai' | 'compare'
  const query = searchMode === 'evidence' ? evidenceQuery : fileQuery
  const setQuery = searchMode === 'evidence' ? setEvidenceQuery : setFileQuery
  const [view, setView] = useState('list')
  const [filter, setFilter] = useState('All files')
  const [ascending, setAscending] = useState(false)
  const [notice, setNotice] = useState('')
  const [dragging, setDragging] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)

  // Document Reader state
  const [readerDoc, setReaderDoc] = useState(null)
  const [readerChunkIndex, setReaderChunkIndex] = useState(0)
  const [readerQuery, setReaderQuery] = useState('')
  // Which passage the reader marks, and why: { index, label } or null
  const [readerMark, setReaderMark] = useState(null)
  const [readerViewMode, setReaderViewMode] = useState('text')

  // Milestone 4: AI Assistant & Excerpt Consent state
  const [aiMessages, setAiMessages] = useState([])
  const [isAiGenerating, setIsAiGenerating] = useState(false)
  const [pendingConsent, setPendingConsent] = useState(null) // { question, chunks }
  const abortControllerRef = useRef(null)

  // Phase 6: On-Device AI Model State
  const [modelStatus, setModelStatus] = useState('not_configured')
  const [modelProgress, setModelProgress] = useState({ progress: 0, text: '' })
  const [modelError, setModelError] = useState('')
  const [gpuInfo, setGpuInfo] = useState(null)
  const [storageModalOpen, setStorageModalOpen] = useState(false)
  const [workflowModal, setWorkflowModal] = useState(null) // { doc, tab: 'summary' | 'extract' } | null
  const engineRef = useRef(null)
  const [selectedModelId, setSelectedModelId] = useState(() => {
    try {
      const saved = localStorage.getItem('documind_model_id')
      return EVALUATED_MODELS.some((m) => m.id === saved) ? saved : DEFAULT_MODEL_ID
    } catch {
      return DEFAULT_MODEL_ID
    }
  })
  const [activeModelName, setActiveModelName] = useState('')

  function handleSelectModel(id) {
    setSelectedModelId(id)
    try {
      localStorage.setItem('documind_model_id', id)
    } catch {
      // Preference just won't be remembered.
    }
  }
  const modelAbortRef = useRef(null)

  // Phase 10: Backend Connection, Sync & Conversation Persistence State
  const [connectionInfo, setConnectionInfo] = useState({
    state: 'disconnected',
    backendInfo: null,
    error: null,
    lastCheckedAt: 0,
    consecutiveFailures: 0,
  })
  const connManagerRef = useRef(null)
  const syncManagerRef = useRef(null)
  const [syncStatuses, setSyncStatuses] = useState(new Map())
  const [activeConversationId, setActiveConversationId] = useState(() => safeId())
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [convCount, setConvCount] = useState(0)

  // Restore latest conversation on mount and count saved conversations
  useEffect(() => {
    listConversations()
      .then((records) => {
        if (records && records.length > 0) {
          setConvCount(records.length)
          const latest = records[0]
          if (latest && Array.isArray(latest.messages) && latest.messages.length > 0) {
            setActiveConversationId(latest.id)
            setAiMessages(latest.messages)
          }
        }
      })
      .catch(() => {})
  }, [])

  // Phase 13: Token Governance & Operational Budgeting
  const tokenTrackerRef = useRef(null)
  if (!tokenTrackerRef.current) {
    tokenTrackerRef.current = createTokenBudgetTracker()
  }
  const [tokenMetrics, setTokenMetrics] = useState(() => tokenTrackerRef.current.getMetrics())
  const [governanceModalOpen, setGovernanceModalOpen] = useState(false)

  // Initialize Connection Manager
  useEffect(() => {
    // Poll the optional backend only when one is configured; in local-only mode the
    // status pill can still check on demand.
    const manager = createConnectionManager({
      onChange: (info) => setConnectionInfo(info),
      autoStart: Boolean(import.meta.env.VITE_API_BASE_URL),
    })
    connManagerRef.current = manager
    return () => manager.destroy()
  }, [])

  // Initialize Sync Manager
  useEffect(() => {
    const syncMgr = createSyncManager({
      uploadFn: async (_docId, file) => {
        return await uploadDocumentToBackend(file)
      },
      onChange: (statuses) => setSyncStatuses(statuses),
    })
    syncManagerRef.current = syncMgr
    return () => syncMgr.reset()
  }, [])

  // Process sync queue when backend connects
  useEffect(() => {
    if (connectionInfo.state === 'connected' && syncManagerRef.current) {
      syncManagerRef.current.processQueue(true)
    }
  }, [connectionInfo.state])

  useEffect(() => {
    checkWebGPUSupport().then((res) => {
      setGpuInfo(res)
      if (!res.supported) {
        setModelStatus('unsupported')
      }
    })
  }, [])

  async function handleStartModelDownload(modelId = selectedModelId) {
    // Answers are only as good as the passages found, so turn on meaning search too.
    if (semantic.status === 'off') semantic.enable()
    setModelStatus('downloading')
    setModelError('')
    setModelProgress({ progress: 0.05, text: 'Starting download…' })
    modelAbortRef.current = new AbortController()

    try {
      const engine = await initializeOnDeviceEngine({
        modelId,
        onProgress: (p) => setModelProgress(p),
        signal: modelAbortRef.current.signal,
      })
      engineRef.current = engine
      setActiveModelName(engine.modelName || '')
      setModelStatus('ready')
      setNotice(`${engine.modelName || 'On-device model'} is ready.`)
    } catch (err) {
      if (err.name === 'AbortError') {
        setModelStatus('not_configured')
        setNotice('Model setup cancelled.')
      } else {
        setModelStatus('error')
        setModelError(err.message || 'Failed to initialize model.')
      }
    } finally {
      modelAbortRef.current = null
    }
  }

  function handleCancelModelDownload() {
    if (modelAbortRef.current) {
      modelAbortRef.current.abort()
      modelAbortRef.current = null
      setModelStatus('not_configured')
      setNotice('Model download cancelled.')
    }
  }

  async function handleUnloadModel() {
    if (engineRef.current?.unload) {
      await engineRef.current.unload()
    }
    engineRef.current = null
    setActiveModelName('')
    setModelStatus('not_configured')
    setNotice('Model unloaded. Answers now show the matching passages only.')
  }

  const greeting = getGreeting()
  const fileRef = useRef(null)
  const searchRef = useRef(null)
  const mobileMenuButtonRef = useRef(null)
  const mobileTopbarRef = useRef(null)

  const {
    stagedDocs,
    libraryDocs,
    storageEstimate,
    privacyAccepted,
    acceptPrivacy,
    addFiles: importFiles,
    retryExtraction,
    recognizeScanned,
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

  // Meaning-based passage search (in-browser embeddings, opt-in)
  const semantic = useSemanticIndex(libraryDocs)

  const storedCount = libraryDocs.filter((d) => d.storedInBrowser).length
  // Once the reader has their own documents saved, the upload area shrinks to
  // one line so asking and reading come first (it grows again while dragging).
  const uploadCompact = storedCount > 0 && privacyAccepted && !dragging
  const demoCount = libraryDocs.filter((d) => d.sample).length
  const stagedReadyCount = stagedDocs.filter((d) => d.status === 'ready').length
  const stagedExtractingCount = stagedDocs.filter((d) => d.status === 'extracting').length

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
        if (workflowModal) {
          setWorkflowModal(null)
          return
        }
        if (pendingConsent) {
          setPendingConsent(null)
          return
        }
        if (storageModalOpen) {
          setStorageModalOpen(false)
          return
        }
        if (confirmClearOpen) {
          setConfirmClearOpen(false)
          return
        }
        if (historyModalOpen) {
          setHistoryModalOpen(false)
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
  }, [mobileMenuOpen, confirmClearOpen, readerDoc, workflowModal, pendingConsent, storageModalOpen, historyModalOpen])

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

    importFiles(files)
  }

  /**
   * Open a document in the reader at a passage.
   * @param {string} docId
   * @param {number} chunkIndex
   * @param {string | null} [reason] - Label for the marked passage. Omitted: taken
   *   from the current tab. null: open at the passage without marking it.
   */
  function handleInspectPassage(docId, chunkIndex, reason) {
    const doc = libraryDocs.find((d) => d.id === docId || d.backendId === docId || d.name === docId)
    if (doc) {
      const index = chunkIndex || 0
      setReaderDoc(doc)
      setReaderChunkIndex(index)
      // Only a passage search carries its words into the reader as a highlight;
      // an assistant citation opens the document unfiltered.
      setReaderQuery(searchMode === 'evidence' ? evidenceQuery : '')
      const label = reason !== undefined
        ? reason
        : searchMode === 'ai' ? 'Cited in the answer' : searchMode === 'compare' ? 'Compared passage' : 'Search match'
      setReaderMark(label ? { index, label } : null)
      setReaderViewMode('text')
    }
  }

  function handleOpenReader(doc, mode = 'text') {
    setReaderDoc(doc)
    setReaderChunkIndex(0)
    setReaderQuery('')
    setReaderMark(null)
    setReaderViewMode(mode)
  }

  function handleOpenSummarizer(doc) {
    setWorkflowModal({ doc, tab: 'summary' })
  }

  function handleOpenExtractor(doc) {
    setWorkflowModal({ doc, tab: 'extract' })
  }

  // Milestone 4: Trigger AI question with explicit per-query consent
  function askSampleQuestion(question) {
    setSearchMode('ai')
    handleInitiateAiQuestion(question)
    // Bring the assistant into view once it has rendered
    requestAnimationFrame(() => {
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      document.getElementById('documents')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    })
  }

  async function handleInitiateAiQuestion(question) {
    const queryVector = await semantic.embedQuery(question)
    const retrieval = retrieveEvidenceChunks(libraryDocs, question, 5, {
      queryVector,
      vectorsFor: semantic.vectorsFor,
    })

    const payload = { question, chunks: retrieval.chunks, retrieval: retrieval.method }

    // Everything below runs in this browser (the on-device model included), and
    // every passage used is listed under the answer, so it runs at once. Only a
    // connected server receives the question, so that asks first, inline.
    if (connectionInfo.state === 'connected') {
      setPendingConsent(payload)
    } else {
      generateAnswer(payload)
    }
  }

  // Inline confirmation before a question goes to the connected server
  function handleSendToServer() {
    if (!pendingConsent) return
    const payload = pendingConsent
    setPendingConsent(null)
    generateAnswer(payload)
  }

  function handleAnswerLocally() {
    if (!pendingConsent) return
    const payload = pendingConsent
    setPendingConsent(null)
    generateAnswer({ ...payload, localOnly: true })
  }

  async function generateAnswer({ question, chunks, retrieval, localOnly = false }) {

    const convId = activeConversationId || safeId()
    if (!activeConversationId) setActiveConversationId(convId)

    // Append user message
    const userMsg = {
      id: safeId(),
      sender: 'user',
      text: question,
      timestamp: Date.now(),
    }
    const updatedWithUser = [...aiMessages, userMsg]
    setAiMessages(updatedWithUser)
    setIsAiGenerating(true)

    abortControllerRef.current = new AbortController()

    try {
      let assistantMsg = null

      // Hybrid Backend Intelligence: attempt server-grounded QA when connected
      if (!localOnly && connectionInfo.state === 'connected') {
        try {
          const backendRes = await askBackendQuestion({
            question,
            conversationId: convId,
          })
          if (backendRes && backendRes.answer) {
            assistantMsg = {
              id: backendRes.message_id || safeId(),
              sender: 'assistant',
              text: backendRes.answer,
              citations: (backendRes.citations || []).map((c, i) => ({
                id: i + 1,
                docId: c.document_id,
                docName: c.document_name || 'Document',
                page: c.page,
                locator: c.source_locator || (c.page ? `Page ${c.page}` : 'Section'),
                text: c.excerpt || '',
                excerpt: c.excerpt || '',
                validationStatus: c.validation_status,
                chunkIndex: 0,
                chunkId: c.chunk_id,
                boundingBox: c.bounding_box || null,
                rerankScore: c.rerank_score,
                rerankMethod: c.rerank_method || 'backend',
              })),
              hasEvidence: Boolean(backendRes.evidence_count > 0),
              isRealModel: true,
              isBackendGrounded: true,
              timestamp: Date.now(),
            }
          }
        } catch (backendErr) {
          // Graceful fallback to local evidence preview
          console.warn('[DocuMind AI] Backend QA failed, falling back to local:', backendErr.message)
        }
      }

      // Local Fallback (on-device model or deterministic evidence preview)
      if (!assistantMsg) {
        const streamId = safeId()
        let streamStarted = false
        const response = await generateAnswerWithFallback({
          question,
          retrievedChunks: chunks,
          engine: engineRef.current,
          signal: abortControllerRef.current.signal,
          // Show the answer as the model writes it.
          onToken: (_delta, soFar) => {
            const draft = {
              id: streamId,
              sender: 'assistant',
              text: soFar,
              streaming: true,
              isRealModel: true,
              retrieval,
              modelName: engineRef.current?.modelName,
              timestamp: Date.now(),
            }
            if (!streamStarted) {
              streamStarted = true
              setAiMessages([...updatedWithUser, draft])
            } else {
              setAiMessages((prev) => prev.map((m) => (m.id === streamId ? draft : m)))
            }
          },
        })

        assistantMsg = {
          id: streamId,
          sender: 'assistant',
          text: response.answer,
          citations: response.citations,
          citedIds: response.citedIds,
          uncited: response.uncited,
          hasEvidence: response.hasEvidence,
          isRealModel: response.isRealModel,
          modelName: response.modelName,
          retrieval,
          timestamp: Date.now(),
        }
      }

      // Phase 13: Record Token Governance Usage
      if (tokenTrackerRef.current && assistantMsg?.text && (assistantMsg.isRealModel || assistantMsg.isBackendGrounded)) {
        tokenTrackerRef.current.recordUsage({
          promptText: question,
          evidenceText: (chunks || []).map((c) => c?.text || '').join('\n'),
          completionText: assistantMsg.text,
          iterations: 1,
        })
        setTokenMetrics(tokenTrackerRef.current.getMetrics())
      }

      const finalMessages = [...updatedWithUser, assistantMsg]
      setAiMessages(finalMessages)

      // Persist conversation across browser reloads
      saveConversation(convId, finalMessages)
        .then(() => listConversations().then((r) => setConvCount(r.length)).catch(() => {}))
        .catch(() => {})
    } catch (err) {
      if (err.name === 'AbortError') {
        // Keep whatever the model wrote before it was stopped, marked as partial.
        setAiMessages((prev) => prev.map((m) => (
          m.streaming ? { ...m, streaming: false, uncited: false, text: `${m.text} [stopped]` } : m
        )))
      } else {
        const errorMsg = {
          id: safeId(),
          sender: 'assistant',
          text: 'Generation failed or encountered an error. You may retry or ask a different question.',
          timestamp: Date.now(),
        }
        const errorMessages = [...updatedWithUser, errorMsg]
        setAiMessages(errorMessages)
        saveConversation(convId, errorMessages)
          .then(() => listConversations().then((r) => setConvCount(r.length)).catch(() => {}))
          .catch(() => {})
      }
    } finally {
      setIsAiGenerating(false)
      abortControllerRef.current = null
    }
  }

  function handleSelectConversation(conv) {
    if (conv && Array.isArray(conv.messages)) {
      setActiveConversationId(conv.id)
      setAiMessages(conv.messages)
      setSearchMode('ai')
      setNotice(`Loaded conversation "${conv.title}".`)
    }
  }

  function handleNewConversation() {
    setActiveConversationId(safeId())
    setAiMessages([])
    setSearchMode('ai')
    setNotice('Started a new conversation.')
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
    <div className={dark ? 'app dark' : 'app'}>
      <aside className="sidebar" aria-label="Workspace navigation">
        <a className="brand" href="#dashboard" aria-label="DocuMind AI workspace">
          <Brand className="brand-lockup" markClassName="brand-mark" wordmarkClassName="brand-name" markSize={26} />
        </a>
        <div className="workspace-switcher">
          <span className="workspace-icon" aria-hidden="true"><HardDrive size={15} /></span>
          <span>
            <strong>Your workspace</strong>
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
            <Sparkles size={17} /> Evidence Assistant <span className="nav-count" title={aiMessages.length ? `${aiMessages.length} messages in this conversation` : undefined}>{aiMessages.length || 'New'}{aiMessages.length > 0 && <span className="sr-only"> messages</span>}</span>
          </button>
          <button
            className={`nav-link ${searchMode === 'compare' ? 'active' : ''}`}
            type="button"
            onClick={() => setSearchMode('compare')}
          >
            <GitCompareArrows size={17} /> Compare Documents
          </button>
          <button
            className="nav-link"
            type="button"
            onClick={() => setHistoryModalOpen(true)}
          >
            <Clock size={17} /> Chat History {convCount > 0 && <span className="nav-count">{convCount}</span>}
          </button>
          <a className="nav-link" href="#documents" onClick={() => setSearchMode('files')}>
            <FolderOpen size={17} /> Documents <span className="nav-count">{libraryDocs.length}</span>
          </a>
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
        </div>
      </aside>

      <main className="page" id="dashboard">
        <header ref={mobileTopbarRef} className="mobile-topbar" onKeyDown={keepFocusInMobileMenu}>
          <a className="brand" href="#dashboard" aria-label="DocuMind AI workspace">
            <Brand className="brand-lockup" markClassName="brand-mark" wordmarkClassName="brand-name" markSize={26} />
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
              <button
                className={`nav-link ${searchMode === 'compare' ? 'active' : ''}`}
                type="button"
                onClick={() => {
                  setSearchMode('compare')
                  closeMobileMenu()
                }}
              >
                <GitCompareArrows size={17} /> Compare Documents
              </button>
              <button
                className="nav-link"
                type="button"
                onClick={() => {
                  setHistoryModalOpen(true)
                  closeMobileMenu()
                }}
              >
                <Clock size={17} /> Chat History {convCount > 0 && <span className="nav-count">{convCount}</span>}
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
                <span>Documents are saved in this browser. Nothing leaves your device.</span>
              </div>
            </nav>
          )}
        </header>

        <div className="page-inner" inert={mobileMenuOpen}>
          <div className="top-actions">
            {connectionInfo.state === 'connected' && (
              <button
                className="hardware-status-pill"
                onClick={() => setStorageModalOpen(true)}
              >
                <Cloud size={14} aria-hidden="true" />
                <span>Server connected</span>
                <span className="status-indicator indicator-green" />
              </button>
            )}
            <button
              className="hardware-status-pill"
              onClick={() => setStorageModalOpen(true)}
            >
              <Cpu size={14} aria-hidden="true" />
              <span>Storage and device</span>
            </button>
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
              <h1>Your document workspace</h1>
              <p className="subtitle">
                <span className="greeting">{greeting}.</span> Ask questions, find passages and check each answer against the page it came from.
              </p>
            </div>
          </section>

          {storedCount === 0 && demoCount > 0 && aiMessages.length === 0 && (
            <section className="sample-start" aria-labelledby="sample-start-title">
              <div className="sample-start-copy">
                <h2 id="sample-start-title">Try it on the sample documents</h2>
                <p>
                  {demoCount} sample files are already loaded. Ask one of these to see a cited answer, or add your own files below.
                </p>
              </div>
              <div className="sample-start-prompts">
                {SAMPLE_PROMPTS.slice(0, 3).map((prompt) => (
                  <button key={prompt} type="button" className="ai-prompt-chip" onClick={() => askSampleQuestion(prompt)}>
                    <span>{prompt}</span>
                    <ArrowRight size={13} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {!privacyAccepted && <PrivacyNotice onAccept={acceptPrivacy} />}

          {/* Upload Area */}
          <section
            className={`upload-panel ${uploadCompact ? 'is-compact' : ''}`}
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
              <div className="upload-mark">
                <FilePlus2 size={24} aria-hidden="true" />
              </div>
              <div className="drop-copy">
                <h2>{uploadCompact ? 'Add documents' : 'Select documents to extract'}</h2>
                {uploadCompact ? (
                  <p className="drop-compact-note">Drop files here: PDF, DOCX or TXT up to 25 MB, read in this browser.</p>
                ) : (
                <>
                <p>
                  Drop files here or choose from your computer. Files are read in this browser and staged for your review.
                </p>
                <div className="drop-formats-row">
                  <span className="format-tag tag-pdf">PDF</span>
                  <span className="format-tag tag-docx">DOCX</span>
                  <span className="format-tag tag-txt">TXT</span>
                  <span className="format-limit">Max 25 MB</span>
                  <span className="format-privacy">
                    <Lock size={11} aria-hidden="true" /> 100% on-device
                  </span>
                </div>
                </>
                )}
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
            {!uploadCompact && (
              <div className="prototype-strip">
                <span className="prototype-icon">
                  <Info size={17} aria-hidden="true" />
                </span>
                <p>
                  <strong>Stored in this browser</strong> Text is read on this device. Saved documents stay in this browser across visits and are never sent to a server.
                </p>
              </div>
            )}
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
                        {doc.status === 'ready' && doc.ocrPages?.length > 0 && ` · ${doc.ocrPages.length} read by text recognition`}
                        {doc.status === 'ready' && doc.scannedPages?.length > 0 && ` · ${doc.scannedPages.length} scanned page${doc.scannedPages.length === 1 ? '' : 's'} not read yet`}
                        {doc.status === 'needs-ocr' && ` · Scanned PDF: ${doc.scannedPages?.length || 0} page${doc.scannedPages?.length === 1 ? '' : 's'} with no text layer`}
                        {doc.status === 'recognizing' && (doc.ocrProgress?.phase === 'pages'
                          ? ` · Reading scanned page ${doc.ocrProgress.page} of ${doc.ocrProgress.total}…`
                          : ` · Preparing text recognition${doc.ocrProgress?.fraction ? ` (${Math.round(doc.ocrProgress.fraction * 100)}%)` : ''}…`)}
                        {doc.status === 'failed' && ` · ${doc.error || 'Extraction failed'}`}
                      </p>
                    </div>

                    <div className="staging-item-actions">
                      {doc.status === 'extracting' && (
                        <span className="staging-status-pill status-extracting">
                          <Loader size={13} className="spin-icon" aria-hidden="true" /> Reading…
                        </span>
                      )}
                      {(doc.status === 'needs-ocr' || (doc.status === 'ready' && doc.scannedPages?.length > 0)) && (
                        <button
                          className={doc.status === 'needs-ocr' ? 'primary-button save-single-btn' : 'secondary-button'}
                          onClick={() => recognizeScanned(doc.id)}
                          aria-label={`Read the scanned pages of ${doc.name} with text recognition`}
                          title="Recognises the text on scanned pages in this browser. Downloads about 7 MB from this site the first time."
                        >
                          <ScanText size={15} aria-hidden="true" /> Read scanned pages (~7 MB once)
                        </button>
                      )}
                      {doc.status === 'recognizing' && (
                        <span className="staging-status-pill status-extracting" role="status">
                          <Loader size={13} className="spin-icon" aria-hidden="true" /> Recognising…
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
                      className="secondary-button"
                      onClick={() => setConfirmClearOpen(false)}
                    >
                      Keep my documents
                    </button>
                    <button
                      className="primary-button confirm-danger-btn"
                      onClick={() => {
                        clearLibrary()
                        setConfirmClearOpen(false)
                      }}
                    >
                      Delete all saved documents
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
              <button
                role="tab"
                aria-selected={searchMode === 'compare'}
                className={`search-mode-tab ${searchMode === 'compare' ? 'active' : ''}`}
                onClick={() => setSearchMode('compare')}
              >
                <GitCompareArrows size={15} aria-hidden="true" />
                <span>Compare</span>
              </button>
            </div>

            {/* AI Assistant View (Active when searchMode === 'ai') */}
            {searchMode === 'ai' && (
              <Suspense
                fallback={
                  <div className="ai-chat-section panel-loading" role="status">
                    <Loader size={18} className="spin-icon" aria-hidden="true" />
                    <span>Loading the assistant…</span>
                  </div>
                }
              >
                <AiAssistantView
                  messages={aiMessages}
                  isGenerating={isAiGenerating}
                  onAskQuestion={handleInitiateAiQuestion}
                  pendingServerQuestion={pendingConsent}
                  onSendToServer={handleSendToServer}
                  onAnswerLocally={handleAnswerLocally}
                  onCancelServerQuestion={() => setPendingConsent(null)}
                  onCancelGeneration={handleCancelAiGeneration}
                  onClearChat={() => {
                    setAiMessages([])
                    setActiveConversationId(safeId())
                  }}
                  onInspectCitation={handleInspectPassage}
                  onOpenHistory={() => setHistoryModalOpen(true)}
                  onNewChat={handleNewConversation}
                  isBackendConnected={connectionInfo.state === 'connected'}
                  modelStatus={modelStatus}
                  modelProgress={modelProgress}
                  modelError={modelError}
                  onStartModelDownload={handleStartModelDownload}
                  onCancelModelDownload={handleCancelModelDownload}
                  onUnloadModel={handleUnloadModel}
                  models={EVALUATED_MODELS}
                  selectedModelId={selectedModelId}
                  onSelectModel={handleSelectModel}
                  activeModelName={activeModelName}
                  semantic={semantic}
                />
              </Suspense>
            )}

            {/* Cross-Document Comparison View (Active when searchMode === 'compare') */}
            {searchMode === 'compare' && (
              <Suspense
                fallback={
                  <div className="comparison-view panel-loading" role="status">
                    <Loader size={18} className="spin-icon" aria-hidden="true" />
                    <span>Loading Compare…</span>
                  </div>
                }
              >
                <ComparisonView
                  documents={libraryDocs}
                  onInspectPassage={handleInspectPassage}
                />
              </Suspense>
            )}

            {/* Search and Toolbar (Active when in Files or Evidence mode) */}
            {searchMode !== 'ai' && searchMode !== 'compare' && (
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

                {searchMode === 'files' && (
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
                    aria-label={`Sort order: ${ascending ? 'by name' : 'most recent first'}. Change sort order`}
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
                )}
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
                onTryQuery={(q) => setEvidenceQuery(q)}
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
                        <button className="doc-inspect-btn doc-ask-btn" onClick={() => { setSearchMode('ai'); handleInitiateAiQuestion(`What are the key takeaways and findings from ${doc.name}?`); }} title={`Ask AI Assistant about ${doc.name}`} aria-label={`Ask AI Assistant about ${doc.name}`}>
                          <Sparkles size={13} aria-hidden="true" />
                          <span>Ask</span>
                        </button>
                        <button
                          className="doc-inspect-btn"
                          onClick={() => handleOpenReader(doc, 'text')}
                          aria-label={`Read ${doc.name}`}
                        >
                          <BookOpen size={13} aria-hidden="true" />
                          <span>Read</span>
                        </button>
                        <button
                          className="doc-inspect-btn doc-pages-btn"
                          onClick={() => handleOpenReader(doc, 'visual')}
                          aria-label={`Page view of ${doc.name}`}
                        >
                          <Eye size={13} aria-hidden="true" />
                          <span>Page view</span>
                        </button>
                        <button
                          className="doc-inspect-btn"
                          onClick={() => handleOpenSummarizer(doc)}
                          title={`Generate section summary of ${doc.name}`}
                          aria-label={`Generate section summary of ${doc.name}`}
                        >
                          <FileText size={13} aria-hidden="true" />
                          <span>Summary</span>
                        </button>
                        <button
                          className="doc-inspect-btn"
                          onClick={() => handleOpenExtractor(doc)}
                          title={`Extract structured data from ${doc.name}`}
                          aria-label={`Extract structured data from ${doc.name}`}
                        >
                          <Layers size={13} aria-hidden="true" />
                          <span>Extract</span>
                        </button>

                        {doc.sample ? (
                          <span className="doc-status sample-status">Sample</span>
                        ) : (
                          <ProcessingStatusBadge
                            status={syncStatuses.get(doc.id)?.status || 'local_only'}
                            error={syncStatuses.get(doc.id)?.error}
                            onRetry={() => syncManagerRef.current?.retry(doc.id)}
                          />
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
              DocuMind AI · Documents are saved in this browser.
            </span>
            <span>
              Search and answers run in this browser.
            </span>
          </footer>
        </div>

        {/* Storage & WebGPU Hardware Diagnostics Modal */}
        <StorageHardwareModal
          isOpen={storageModalOpen}
          onClose={() => setStorageModalOpen(false)}
          gpuInfo={gpuInfo}
          storageEstimate={storageEstimate}
          docCount={libraryDocs.length}
          storedCount={storedCount}
          modelStatus={modelStatus}
          activeModelName={activeModelName}
          connectionInfo={connectionInfo}
          onCheckConnection={() => connManagerRef.current?.checkNow()}
          tokenMetrics={tokenMetrics}
          onOpenTokenDetails={() => {
            setStorageModalOpen(false)
            setGovernanceModalOpen(true)
          }}
          onClearLibrary={() => setConfirmClearOpen(true)}
        />

        {/* Persistent Conversation History Modal */}
        <Suspense fallback={null}>
          <ConversationHistoryModal
            isOpen={historyModalOpen}
            onClose={() => {
              setHistoryModalOpen(false)
              listConversations().then((r) => setConvCount(r.length)).catch(() => {})
            }}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
          />
        </Suspense>

        {/* Phase 13: Token Governance & Operational Budget Modal */}
        {governanceModalOpen && (
          <Suspense fallback={null}>
            <TokenGovernanceModal
              isOpen={governanceModalOpen}
              onClose={() => setGovernanceModalOpen(false)}
              tracker={tokenTrackerRef.current}
              onReset={() => setTokenMetrics(tokenTrackerRef.current.getMetrics())}
            />
          </Suspense>
        )}

        {/* Document Section Summary & Structured Extraction Modal */}
        {workflowModal && (
          <Suspense fallback={null}>
            <DocumentWorkflowsModal
              document={workflowModal.doc}
              initialTab={workflowModal.tab}
              isOpen={Boolean(workflowModal)}
              onClose={() => setWorkflowModal(null)}
              onInspectPassage={handleInspectPassage}
            />
          </Suspense>
        )}

        {readerDoc && (
          <DocumentReader
            key={readerDoc.id}
            doc={readerDoc}
            initialChunkIndex={readerChunkIndex}
            initialQuery={readerQuery}
            markedChunk={readerMark}
            initialViewMode={readerViewMode}
            onClose={() => setReaderDoc(null)}
            fromAssistant={searchMode === 'ai'}
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
