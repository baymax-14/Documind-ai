import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Cpu,
  FileSearch,
  FileText,
  LayoutGrid,
  Lock,
  RotateCcw,
  Search,
  Sparkles,
} from 'lucide-react'
import Brand from './Brand.jsx'
import './landing.css'

gsap.registerPlugin(useGSAP)

const demoFiles = [
  { type: 'PDF', name: 'Q3 Market Research.pdf', tone: 'butter', pages: '14 pages', words: '4,280 words' },
  { type: 'DOCX', name: 'Product Strategy 2025.docx', tone: 'sky', pages: '8 sections', words: '2,950 words' },
  { type: 'PDF', name: 'Customer Interviews.pdf', tone: 'butter', pages: '19 pages', words: '6,100 words' },
]

const PLAYGROUND_PROMPTS = [
  {
    id: 'market',
    title: 'Q3 Market Expansion',
    question: 'What drove enterprise growth in Q3?',
    doc: 'Q3 Market Research.pdf',
    locator: 'Page 4',
    excerpt: 'Enterprise revenue expanded 42% year-over-year, driven primarily by regulated legal and healthcare teams requiring strictly local, zero-leakage workflow tools.',
    answer: 'Enterprise revenue accelerated by 42% YoY [1], led by adoption across healthcare and legal sectors that mandate strict on-device data retention boundaries.',
  },
  {
    id: 'privacy',
    title: 'Data & Privacy Mandates',
    question: 'How are client documents protected from cloud leaks?',
    doc: 'Product Strategy 2025.docx',
    locator: 'Section 3',
    excerpt: 'All file parsing, indexing, and neural synthesis occurs exclusively in the local browser runtime. Zero document bytes or user prompts are transmitted to cloud endpoints.',
    answer: 'Documents never leave the user machine [1]. Text extraction, indexing, and AI model inference execute 100% client-side via in-browser parsers and WebGPU.',
  },
  {
    id: 'feedback',
    title: 'Customer Interview Findings',
    question: 'What was the primary friction in existing tools?',
    doc: 'Customer Interviews.pdf',
    locator: 'Page 11',
    excerpt: 'Researchers reported significant compliance delays when uploading proprietary briefs to cloud-based LLM APIs, creating an urgent need for an offline-capable workbench.',
    answer: 'Participants cited strict corporate compliance hurdles with cloud LLMs [1], demanding an offline-first workbench with verifiable passage citations.',
  },
]

// Each row is a fact about cloud AI chat tools in general and about DocuMind; each stamp links to its proof.
const LEDGER_ROWS = [
  {
    label: 'Where your file goes',
    them: "Uploaded to the provider's servers",
    us: "Stays in this browser's IndexedDB",
    stamp: 'Local',
    href: '#proof-local',
    proof: 'see how files are stored',
  },
  {
    label: 'Who runs the model',
    them: 'The provider, on its own hardware',
    us: 'Your GPU, with Qwen2.5 0.5B on WebGPU',
    stamp: 'GPU',
    href: '#proof-gpu',
    proof: 'see the on-device model',
  },
  {
    label: 'How you check an answer',
    them: 'Often a summary with no page number',
    us: 'Click the citation and the reader opens on that page',
    stamp: 'p. 11',
    href: '#live-demo',
    proof: 'watch a cited answer',
  },
  {
    label: 'Without internet',
    them: 'Stops working',
    us: 'Keeps working once the 350 MB model is cached',
    stamp: 'Offline',
    href: '#proof-offline',
    proof: 'read about the model download',
  },
]

// The facts each ledger stamp stands for, as rows of the same ruled grammar.
const PROOF_ROWS = [
  {
    id: 'proof-local',
    stamp: 'Local',
    title: 'Files stay in this browser',
    facts: ['Parsed by PDF.js and Mammoth in a web worker', 'Stored in IndexedDB until you delete them', 'Cleared from the workspace storage settings'],
  },
  {
    id: 'proof-gpu',
    stamp: 'GPU',
    title: 'The model runs on your graphics card',
    facts: ['Qwen2.5 0.5B through WebLLM on WebGPU', 'About 350 MB, downloaded once when you ask', 'SmolLM2 360M as a lighter choice, about 230 MB'],
  },
  {
    id: 'proof-cite',
    stamp: 'p. 11',
    title: 'Every answer points to its page',
    facts: ['Citations name the file and the page or section', 'Click one and the reader opens at that passage', 'With no matching passage, DocuMind says so'],
  },
  {
    id: 'proof-offline',
    stamp: 'Offline',
    title: 'Works without internet',
    facts: ['The cached model answers with no network', 'Without WebGPU, search and citations still work', 'No account to sign in to'],
  },
  {
    id: 'proof-formats',
    stamp: '25 MB',
    title: 'Reads PDF, Word and text files',
    facts: ['PDF, DOCX and TXT', 'Up to 25 MB a file', 'Tables found in a file export as CSV'],
  },
]

const SEARCH_QUERY = 'enterprise growth regulated'

// The answer is split into parts so it can stream in token by token.
const ANSWER_PARTS = [
  'Enterprise growth was driven by a ',
  { strong: '42% YoY acceleration' },
  ' in adoption across regulated healthcare and legal sectors ',
  { cite: 1 },
  ', where strict compliance policies forbid uploading proprietary briefs to cloud LLMs ',
  { cite: 2 },
  '.',
]

const DEMO_STEPS = ['Search the evidence', 'Mark the matching passages', 'Answer with page citations']

const TOKEN_STEP_MS = 24
const TOKEN_START_MS = 380

function renderAnswer(onCite) {
  let index = 0
  const nodes = ANSWER_PARTS.map((part, partIndex) => {
    if (typeof part === 'string') {
      return part.split(/(\s+)/).map((chunk, chunkIndex) => {
        if (!chunk || /^\s+$/.test(chunk)) return chunk
        const i = index++
        return <span className="tok" style={{ '--i': i }} key={`${partIndex}-${chunkIndex}`}>{chunk}</span>
      })
    }
    if (part.strong) {
      const i = index++
      return <strong className="tok" style={{ '--i': i }} key={partIndex}>{part.strong}</strong>
    }
    const i = index++
    return (
      <button type="button" className="inline-cite-pill tok-cite" style={{ '--i': i }} key={partIndex} onClick={onCite}>
        [{part.cite}]
      </button>
    )
  })
  return { nodes, count: index }
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: <LayoutGrid size={14} aria-hidden="true" />, extra: <b>3</b> },
  { id: 'search', label: 'Evidence Search', icon: <FileSearch size={14} aria-hidden="true" /> },
  { id: 'assistant', label: 'AI Assistant', icon: <Sparkles size={14} aria-hidden="true" />, extra: <small>WebGPU</small> },
]

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Real checks on the visitor's own browser: nothing here is invented or sent anywhere.
function formatGigabytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return null
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`
}

function useDeviceChecks() {
  const [checks, setChecks] = useState({ gpu: null, gpuName: null, storage: null, model: null })

  useEffect(() => {
    let cancelled = false
    const set = (patch) => { if (!cancelled) setChecks((current) => ({ ...current, ...patch })) }

    async function checkGpu() {
      try {
        if (!navigator.gpu) return set({ gpu: 'none' })
        const adapter = await navigator.gpu.requestAdapter()
        if (!adapter) return set({ gpu: 'none' })
        const info = adapter.info || (adapter.requestAdapterInfo ? await adapter.requestAdapterInfo() : null)
        set({ gpu: 'ready', gpuName: info?.vendor || null })
      } catch {
        set({ gpu: 'none' })
      }
    }

    async function checkStorage() {
      try {
        const estimate = await navigator.storage?.estimate?.()
        const free = estimate ? formatGigabytes((estimate.quota || 0) - (estimate.usage || 0)) : null
        set({ storage: free || 'unknown' })
      } catch {
        set({ storage: 'unknown' })
      }
    }

    async function checkModel() {
      try {
        if (!('caches' in window)) return set({ model: 'unknown' })
        const cached = await caches.has('webllm/model')
        set({ model: cached ? 'cached' : 'missing' })
      } catch {
        set({ model: 'unknown' })
      }
    }

    checkGpu()
    checkStorage()
    checkModel()
    return () => { cancelled = true }
  }, [])

  return checks
}

const SCAN_LINES = [92, 78, 88, 64, 0, 86, 94, 71, 0, 83, 90, 58, 0, 88, 76, 66]
const CITED_LINE = 6

function gpuLabel(checks) {
  if (checks.gpu === 'ready') return 'WebGPU here'
  if (checks.gpu === 'none') return 'No WebGPU: search mode'
  return 'Checking WebGPU'
}

function PageScan({ checks }) {
  const done = checks.gpu && checks.storage && checks.model
  const gpuText = checks.gpu === null ? 'Checking' : checks.gpu === 'ready' ? `Ready${checks.gpuName ? `, ${checks.gpuName}` : ''}` : 'Not available: search mode'
  const storageText = checks.storage === null ? 'Checking' : checks.storage === 'unknown' ? 'Not reported' : `${checks.storage} free`
  const modelText = checks.model === null ? 'Checking' : checks.model === 'cached' ? 'Cached, works offline' : checks.model === 'missing' ? 'Not downloaded yet' : 'Not reported'

  return (
    <div className="scan-panel">
      <span className="cross cross--tl" aria-hidden="true" />
      <span className="cross cross--tr" aria-hidden="true" />
      <span className="cross cross--bl" aria-hidden="true" />
      <span className="cross cross--br" aria-hidden="true" />
      <p className="scan-status" aria-live="polite">
        <span className="scan-dot" aria-hidden="true" />
        {done ? '> Browser checked' : '> Checking this browser'}
      </p>

      <figure className="scan-page" aria-label="A document page with one cited line marked in red">
        <span className="scan-page__head">Customer Interviews.pdf / p. 11</span>
        <div className="scan-page__lines" aria-hidden="true">
          {SCAN_LINES.map((width, index) => (
            width === 0
              ? <span className="scan-gap" key={index} />
              : <span className={`scan-line ${index === CITED_LINE ? 'is-cited' : ''}`} style={{ '--w': `${width}%` }} key={index} />
          ))}
          <span className="scan-beam" />
          <span className="scan-cite" aria-hidden="true" style={{ '--cite-top': `${(100 * (CITED_LINE + 0.5)) / SCAN_LINES.length}%` }}>Cited in answer [1]</span>
        </div>
      </figure>

      <dl className="scan-readout" aria-label="Checks on this browser">
        <div><dt>WebGPU</dt><dd className={checks.gpu === 'ready' ? 'is-ok' : undefined}>{gpuText}</dd></div>
        <div><dt>Storage</dt><dd>{storageText}</dd></div>
        <div><dt>Model</dt><dd className={checks.model === 'cached' ? 'is-ok' : undefined}>{modelText}</dd></div>
      </dl>
    </div>
  )
}

function WorkspacePreview({ introDone, onStepChange, checks }) {
  const [activeTab, setActiveTab] = useState('overview')
  // idle → waiting to autoplay; running → walkthrough playing; done → visitor in control
  const [tour, setTour] = useState('idle')
  const [typed, setTyped] = useState(SEARCH_QUERY.length)
  const [assistantSeen, setAssistantSeen] = useState(false)
  const [indicator, setIndicator] = useState(null)
  const sectionRef = useRef(null)
  const railRef = useRef(null)
  const buttonRefs = useRef({})
  const timers = useRef([])

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  const goTo = useCallback((id) => {
    setActiveTab((current) => {
      if (current === 'assistant' && id !== 'assistant') setAssistantSeen(true)
      return id
    })
  }, [])

  const runTour = useCallback(() => {
    clearTimers()
    const at = (ms, fn) => timers.current.push(setTimeout(fn, ms))
    setTour('running')
    setAssistantSeen(false)
    goTo('search')
    setTyped(0)
    const typeStart = 320
    const typeStep = 42
    for (let i = 1; i <= SEARCH_QUERY.length; i += 1) at(typeStart + i * typeStep, () => setTyped(i))
    const typedAt = typeStart + SEARCH_QUERY.length * typeStep
    at(typedAt + 2300, () => goTo('assistant'))
    at(typedAt + 2300 + 2400, () => setTour('done'))
  }, [clearTimers, goTo])

  const takeControl = useCallback(() => {
    if (tour === 'done') return
    clearTimers()
    setTyped(SEARCH_QUERY.length)
    setTour('done')
  }, [tour, clearTimers])

  // Autoplay the walkthrough once: after the hero intro, while the preview is mostly on screen.
  useEffect(() => {
    if (!introDone || tour !== 'idle') return undefined
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      setTour('done')
      return undefined
    }
    const node = sectionRef.current
    let delay
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || document.hidden) return
      observer.disconnect()
      delay = setTimeout(runTour, 500)
    }, { threshold: 0.55 })
    observer.observe(node)
    return () => {
      observer.disconnect()
      clearTimeout(delay)
    }
  }, [introDone, tour, runTour])

  useEffect(() => clearTimers, [clearTimers])

  // Slide one shared indicator between rail buttons instead of swapping fills.
  useLayoutEffect(() => {
    const rail = railRef.current
    const measure = () => {
      const button = buttonRefs.current[activeTab]
      if (!button || !rail || button.offsetParent === null) return
      setIndicator({ y: button.offsetTop, h: button.offsetHeight })
    }
    measure()
    if (!rail || !('ResizeObserver' in window)) return undefined
    const resize = new ResizeObserver(measure)
    resize.observe(rail)
    return () => resize.disconnect()
  }, [activeTab])

  const queryDone = typed >= SEARCH_QUERY.length
  const streamAnswer = tour === 'running' || !assistantSeen
  // Which of the three demo steps the preview is showing (0 = the library overview).
  const step = activeTab === 'assistant' ? 3 : activeTab === 'search' ? (queryDone ? 2 : 1) : 0

  useEffect(() => {
    onStepChange?.(step)
  }, [step, onStepChange])
  const answer = renderAnswer(() => {
    takeControl()
    goTo('search')
  })
  const chipsDelay = TOKEN_START_MS + answer.count * TOKEN_STEP_MS + 80
  const tourLabel = activeTab === 'search' ? 'Searching the evidence' : activeTab === 'assistant' ? 'Answering with citations' : 'Starting'

  return (
    <section
      className="preview-side"
      aria-label="Interactive workspace preview"
      ref={sectionRef}
      onPointerDown={takeControl}
      onKeyDown={takeControl}
    >
      <div className="preview-caption">
        <span className="sample-mark">Sample files</span>
        {tour === 'running' ? (
          <strong className="preview-tour-status" aria-live="polite">
            <i aria-hidden="true" /> Walkthrough · {tourLabel}
          </strong>
        ) : tour === 'done' && !prefersReducedMotion() ? (
          <button type="button" className="preview-replay" onClick={(event) => { event.stopPropagation(); runTour() }} onPointerDown={(event) => event.stopPropagation()}>
            <RotateCcw size={12} aria-hidden="true" /> Replay walkthrough
          </button>
        ) : (
          <strong>Click tabs to inspect</strong>
        )}
      </div>
      <div className={`workspace-preview ${tour === 'running' ? 'is-touring' : ''}`} data-ui="workspace-preview" aria-label="Interactive preview of the DocuMind workspace">
        <div className="preview-topbar">
          <span className="preview-brand">
            <Brand className="brand-lockup" markClassName="preview-brand-mark" wordmarkClassName="preview-brand-wordmark" />
          </span>
          <div className="preview-top-tags">
            <span className="preview-local">
              <i aria-hidden="true" /> {gpuLabel(checks)}
            </span>
          </div>
        </div>

        <div className="preview-body">
          <aside className="preview-rail" aria-label="Preview workspace navigation" ref={railRef}>
            <div className="preview-workspace">
              <span>A</span>
              <div>
                <strong>Research Lab</strong>
                <small>Local Workspace</small>
              </div>
            </div>
            {indicator && (
              <span
                className="preview-rail-indicator"
                aria-hidden="true"
                style={{ transform: `translateY(${indicator.y}px)`, height: indicator.h }}
              />
            )}
            {TABS.map(({ id, label, icon, extra }) => (
              <button
                key={id}
                type="button"
                ref={(node) => { buttonRefs.current[id] = node }}
                className={`preview-nav-btn ${activeTab === id ? 'active' : ''}`}
                aria-pressed={activeTab === id}
                onClick={() => goTo(id)}
              >
                {icon}
                <span>{label}</span>
                {extra}
              </button>
            ))}
            <div className="preview-rail-note">
              <Lock size={12} aria-hidden="true" style={{ display: 'inline', marginRight: 4 }} />
              Files and model stay in this browser
            </div>
          </aside>

          <div className="preview-content">
            {activeTab === 'overview' && (
              <div className="preview-tab-pane">
                <div className="preview-welcome">
                  <div>
                    <h2>Document Library</h2>
                    <p>3 research files parsed and staged locally in IndexedDB.</p>
                  </div>
                  <span className="preview-demo-tag">Sample</span>
                </div>
                <div className="preview-stats" aria-label="Workspace metrics">
                  <div className="preview-stat mint">
                    <span>Stored Documents</span>
                    <strong>3</strong>
                  </div>
                  <div className="preview-stat blue">
                    <span>On-Device AI Engine</span>
                    <strong>Qwen 2.5</strong>
                    <small>{checks.gpu === 'ready' ? 'Can run here' : checks.gpu === 'none' ? 'Needs WebGPU' : 'Checking'}</small>
                  </div>
                </div>
                <div className="preview-library-heading">
                  <h3>Recent Documents</h3>
                  <span>Local IndexedDB</span>
                </div>
                <ul className="preview-files" aria-label="Sample documents list">
                  {demoFiles.map((file) => (
                    <li className="preview-file" key={file.name}>
                      <span className={`preview-filetype ${file.tone}`}>{file.type}</span>
                      <div className="preview-file-info">
                        <span className="preview-filename">{file.name}</span>
                        <span className="preview-file-meta">{file.pages} · {file.words}</span>
                      </div>
                      <span className="preview-file-demo">Indexed</span>
                    </li>
                  ))}
                </ul>
                <p className="preview-footnote">Parsed in this browser · Ready to search</p>
              </div>
            )}

            {activeTab === 'search' && (
              <div className="preview-tab-pane">
                <div className={`preview-search-bar ${queryDone ? '' : 'is-typing'}`}>
                  <Search size={14} aria-hidden="true" />
                  <input readOnly size={Math.max(typed, 1)} value={SEARCH_QUERY.slice(0, typed)} aria-label="Sample search query" />
                  <kbd>{queryDone ? '2 results' : 'Searching'}</kbd>
                </div>
                {queryDone && (
                  <div className="preview-search-results">
                    <div className="preview-match-card" style={{ '--i': 0 }}>
                      <div className="preview-match-head">
                        <strong>Q3 Market Research.pdf</strong>
                        <span className="preview-locator-chip">Page 4</span>
                      </div>
                      <p>
                        "...Enterprise revenue accelerated by 42% YoY, driven primarily by <mark style={{ '--m': 0 }}>regulated</mark> legal and healthcare sectors requiring <mark style={{ '--m': 1 }}>enterprise growth</mark> tools with zero cloud data retention..."
                      </p>
                    </div>
                    <div className="preview-match-card" style={{ '--i': 1 }}>
                      <div className="preview-match-head">
                        <strong>Customer Interviews.pdf</strong>
                        <span className="preview-locator-chip">Page 11</span>
                      </div>
                      <p>
                        "...Compliance officers at large institutions noted that <mark style={{ '--m': 0 }}>regulated</mark> teams cannot approve cloud APIs, accelerating demand for on-device <mark style={{ '--m': 1 }}>enterprise</mark> workbenches..."
                      </p>
                    </div>
                  </div>
                )}
                <p className="preview-footnote">Keyword search across extracted passages, with page locators</p>
              </div>
            )}

            {activeTab === 'assistant' && (
              <div className={`preview-tab-pane ${streamAnswer ? 'is-streaming' : ''}`} style={{ '--chips-delay': `${chipsDelay}ms` }}>
                <div className="preview-chat-container">
                  <div className="preview-chat-bubble user">
                    <span className="bubble-author">You</span>
                    <p>What were the primary drivers behind enterprise Q3 expansion?</p>
                  </div>
                  <div className="preview-chat-bubble assistant">
                    <div className="bubble-head">
                      <span className="bubble-author">DocuMind Assistant</span>
                      <span className="bubble-tag">
                        <Cpu size={10} aria-hidden="true" /> Sample answer
                      </span>
                    </div>
                    <p className="preview-answer">{answer.nodes}</p>
                    <div className="preview-citations-list">
                      <div className="preview-cite-chip">
                        <span className="cite-idx">[1]</span>
                        <span>Q3 Market Research.pdf · Page 4</span>
                        <ArrowUpRight size={11} aria-hidden="true" />
                      </div>
                      <div className="preview-cite-chip">
                        <span className="cite-idx">[2]</span>
                        <span>Customer Interviews.pdf · Page 11</span>
                        <ArrowUpRight size={11} aria-hidden="true" />
                      </div>
                    </div>
                  </div>
                </div>
                <p className="preview-footnote">Written on your GPU · Each claim links to its page</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function ProofLedger() {
  return (
    <section className="proof-section" id="features" aria-labelledby="features-heading">
      <div className="section-intro numbered">
        <span className="sec-label">/04</span>
        <h2 id="features-heading">The facts behind each stamp</h2>
        <p>
          Each row of the comparison links here. These are the parts of DocuMind you can check for yourself in the workspace.
        </p>
      </div>

      <ol className="proof-ledger">
        {PROOF_ROWS.map((row) => (
          <li className="proof-row" id={row.id} key={row.id}>
            <span className="proof-stamp">{row.stamp}</span>
            <h3>{row.title}</h3>
            <ul>
              {row.facts.map((fact) => <li key={fact}>{fact}</li>)}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  )
}

function GroundingPlayground({ checks }) {
  const [selectedPrompt, setSelectedPrompt] = useState(PLAYGROUND_PROMPTS[0])

  // Arrow keys, Home and End move between the question tabs and focus the new one.
  function onTabKey(event) {
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
    const index = PLAYGROUND_PROMPTS.findIndex((p) => p.id === selectedPrompt.id)
    let next = null
    if (event.key in keys) next = (index + keys[event.key] + PLAYGROUND_PROMPTS.length) % PLAYGROUND_PROMPTS.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = PLAYGROUND_PROMPTS.length - 1
    if (next === null) return
    event.preventDefault()
    setSelectedPrompt(PLAYGROUND_PROMPTS[next])
    document.getElementById(`prompt-tab-${PLAYGROUND_PROMPTS[next].id}`)?.focus()
  }

  return (
    <section className="playground-section" id="interactive-demo" aria-labelledby="playground-heading">
      <div className="section-intro numbered">
        <span className="sec-label">/05</span>
        <h2 id="playground-heading">Pick a question and see the passage it cites</h2>
        <p>
          <span className="sample-mark">Sample files</span> The answer on the right uses only the passage on the left, and names its page.
        </p>
      </div>

      <div className="playground-container">
        <div className="playground-prompt-tabs" role="tablist" aria-label="Sample research questions" onKeyDown={onTabKey}>
          {PLAYGROUND_PROMPTS.map((p) => (
            <button
              key={p.id}
              id={`prompt-tab-${p.id}`}
              type="button"
              role="tab"
              aria-selected={selectedPrompt.id === p.id}
              aria-controls="prompt-panel"
              tabIndex={selectedPrompt.id === p.id ? 0 : -1}
              className={`playground-tab ${selectedPrompt.id === p.id ? 'active' : ''}`}
              onClick={() => setSelectedPrompt(p)}
            >
              <FileText size={15} aria-hidden="true" />
              <span>{p.title}</span>
            </button>
          ))}
        </div>

        <div className="playground-display-split" role="tabpanel" id="prompt-panel" aria-labelledby={`prompt-tab-${selectedPrompt.id}`} tabIndex={0}>
          <div className="playground-panel source-panel">
            <div className="panel-header">
              <span className="panel-stamp">Source</span>
              <span className="panel-doc-meta">
                <strong>{selectedPrompt.doc}</strong> · {selectedPrompt.locator}
              </span>
            </div>
            <div className="panel-content">
              <blockquote className="source-excerpt">
                "{selectedPrompt.excerpt}"
              </blockquote>
            </div>
            <div className="panel-footer">
              <CheckCircle2 size={14} aria-hidden="true" />
              <span>Read in this browser by a web worker</span>
            </div>
          </div>

          <div className="playground-panel answer-panel">
            <div className="panel-header">
              <span className="panel-stamp panel-stamp--mint">Answer</span>
              <span className="panel-doc-meta">
                <Cpu size={12} aria-hidden="true" /> {gpuLabel(checks)}
              </span>
            </div>
            <div className="panel-content">
              <p className="answer-text">
                {selectedPrompt.answer}
              </p>
              <div className="answer-citation-card">
                <span className="cite-badge">[1]</span>
                <span className="cite-doc">{selectedPrompt.doc}</span>
                <span className="cite-loc">{selectedPrompt.locator}</span>
              </div>
            </div>
            <div className="panel-footer action-footer">
              <Link to="/workspace" className="playground-cta">
                Test with your own files <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function PrivacyFAQ() {
  const faqs = [
    {
      q: 'Do my files or questions leave my computer?',
      a: 'Not unless you allow it. Parsing, chunking, search and the on-device model all run in your browser. If you connect a remote model, DocuMind asks before it sends any excerpt.',
    },
    {
      q: 'How does the model run without an API key?',
      a: 'WebLLM runs the model on your graphics card through WebGPU. Its weights, about 350 MB, download once into the browser cache when you ask, and later answers work offline.',
    },
    {
      q: 'What if my device does not support WebGPU?',
      a: 'DocuMind switches to Evidence Preview: it shows the matching passages with their pages, with no model to download.',
    },
    {
      q: 'Which files can I add?',
      a: 'PDF, DOCX and TXT files, up to 25 MB each. Add as many as your browser storage holds, and remove them from the library at any time.',
    },
    {
      q: 'Do I need an account?',
      a: 'No. Open the workspace and add a file; there is nothing to sign up for.',
    },
  ]

  return (
    <section className="faq-section" id="faq" aria-labelledby="faq-heading">
      <div className="section-intro numbered">
        <span className="sec-label">/06</span>
        <h2 id="faq-heading">Questions</h2>
        <p>About your files, the model and the browser.</p>
      </div>

      <div className="faq-list">
        {faqs.map((item) => (
          <article className="faq-row" key={item.q}>
            <h3>{item.q}</h3>
            <p>{item.a}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function LandingPage() {
  const pageRef = useRef(null)
  const [introDone, setIntroDone] = useState(false)
  const [demoStep, setDemoStep] = useState(0)
  const checks = useDeviceChecks()

  useGSAP(() => {
    if (prefersReducedMotion()) {
      setIntroDone(true)
      return undefined
    }

    // Hero sequence: the headline lines rise, the red beam sweeps the page and stops on
    // the cited line; the ledger's stamps press in once when the ledger is reached.
    const intro = gsap.timeline({
      defaults: { ease: 'expo.out' },
      onComplete: () => setIntroDone(true),
    })

    intro
      .from('.cx-hero h1 .line', { yPercent: 105, duration: 0.85, stagger: 0.09, clearProps: 'transform' }, 0.05)
      .from('.cx-hero .sec-label, .cx-sub, .cx-lead', { opacity: 0, y: 10, duration: 0.6, stagger: 0.06, clearProps: 'transform,opacity' }, 0.35)
      .from('.cx-hero .hero-actions > *', { opacity: 0, y: 10, duration: 0.6, stagger: 0.06, clearProps: 'transform,opacity' }, 0.55)
      .from('.scan-line', { scaleX: 0, transformOrigin: 'left center', duration: 0.5, stagger: 0.025, ease: 'power3.out', clearProps: 'transform' }, 0.3)
      .fromTo('.scan-beam', { top: '0%', opacity: 1 }, { top: () => `${(100 * (CITED_LINE + 0.5)) / SCAN_LINES.length}%`, duration: 1.1, ease: 'power2.inOut' }, 0.6)
      .to('.scan-beam', { opacity: 0, duration: 0.3 }, '>')
      .from('.scan-line.is-cited, .scan-cite', { backgroundColor: '#0b0b0b', opacity: 0.6, duration: 0.35 }, '<')

    const ledger = pageRef.current?.querySelector('.ledger-frame')
    const stamps = pageRef.current?.querySelectorAll('.ledger-stamp')
    let observer
    if (ledger && stamps?.length && 'IntersectionObserver' in window) {
      gsap.set(stamps, { scale: 1.4, opacity: 0 })
      observer = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        gsap.to(stamps, { scale: 1, opacity: 1, duration: 0.3, stagger: 0.12, ease: 'power3.in', clearProps: 'transform,opacity' })
      }, { threshold: 0.4 })
      observer.observe(ledger)
    }

    return () => observer?.disconnect()
  }, { scope: pageRef })

  return (
    <div className="landing" ref={pageRef}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="landing-header">
        <Link className="landing-brand" to="/" aria-label="DocuMind AI home">
          <Brand className="brand-lockup" markClassName="landing-brand-mark" wordmarkClassName="landing-wordmark" />
        </Link>
        <nav className="landing-nav" aria-label="Main navigation">
          <a href="#ledger">Compare</a>
          <a href="#live-demo">Live demo</a>
          <a href="#features">Facts</a>
          <a href="#interactive-demo">Try it</a>
          <a href="#faq">Questions</a>
          <Link className="nav-cta" to="/workspace">
            Open workspace <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </nav>
      </header>

          <main id="main-content">
            <section className="cx-hero" aria-labelledby="hero-heading">
              <p className="cx-rail" aria-hidden="true"><span>Document AI, on device</span></p>
              <div className="cx-hero__text">
                <div className="numbered">
                <span className="sec-label">/01</span>
                <h1 id="hero-heading" aria-label="Document AI that stays on your computer">
                  <span className="line-mask" aria-hidden="true"><span className="line">Document AI</span></span>
                  <span className="line-mask" aria-hidden="true"><span className="line">that stays on</span></span>
                  <span className="line-mask" aria-hidden="true"><span className="line">your computer</span></span>
                </h1>
                </div>
                <p className="cx-sub">Local. Cited. Offline.</p>
                <p className="cx-lead">
                  Ask questions across PDF, Word and text files. Every answer cites the page it came from, and the model runs on your own GPU.
                </p>
                <div className="hero-actions">
                  <Link className="button-primary" to="/workspace">
                    Open workspace <ArrowUpRight size={18} aria-hidden="true" />
                  </Link>
                  <a className="text-link" href="#live-demo">
                    Watch a cited answer <span className="bracket" aria-hidden="true">[ ]</span>
                  </a>
                </div>
              </div>
              <PageScan checks={checks} />
            </section>

            <section className="ledger-section" id="ledger" aria-labelledby="ledger-heading">
              <div className="section-intro numbered">
                <span className="sec-label">/02</span>
                <h2 id="ledger-heading">Same question, two tools</h2>
                <p>Four facts about where your files go. Each DocuMind stamp links to its proof further down.</p>
              </div>
              <div className="ledger-frame">
                <table className="ledger" role="table">
                  <caption className="sr-only">The same question asked of a cloud AI chat tool and of DocuMind</caption>
                  <thead>
                    <tr>
                      <th scope="col" className="ledger-corner">Question</th>
                      <th scope="col" className="ledger-them">Cloud AI chat</th>
                      <th scope="col" className="ledger-us">DocuMind</th>
                    </tr>
                  </thead>
                  <tbody role="rowgroup">
                    {LEDGER_ROWS.map((row) => (
                      <tr key={row.label} role="row">
                        <th scope="row" role="rowheader">{row.label}</th>
                        <td data-label="Cloud AI chat" role="cell">{row.them}</td>
                        <td data-label="DocuMind" className="ledger-us" role="cell">
                          <span className="ledger-cell">
                            <a className="ledger-stamp" href={row.href} aria-label={`${row.stamp}: ${row.proof}`}>{row.stamp}</a>
                            <span>{row.us}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="hero-note">No account. PDF, DOCX and TXT up to 25 MB.</p>
            </section>

            <section className="demo-section" id="live-demo" aria-labelledby="demo-heading">
              <div className="demo-copy">
                <div className="numbered">
                  <span className="sec-label">/03</span>
                  <h2 id="demo-heading">Watch it answer from your files</h2>
                </div>
                <p>
                  The preview runs the same three steps as the workspace: it searches every passage, marks the matches, then writes an answer that cites each page it used.
                </p>
                <ol className="demo-steps">
                  {DEMO_STEPS.map((label, index) => (
                    <li key={label} className={demoStep === index + 1 ? 'is-active' : undefined} aria-current={demoStep === index + 1 ? 'step' : undefined}>
                      <span>{String(index + 1).padStart(2, '0')}</span>{label}
                    </li>
                  ))}
                </ol>
              </div>
              <WorkspacePreview introDone={introDone} onStepChange={setDemoStep} checks={checks} />
            </section>

            <ProofLedger />
            <GroundingPlayground checks={checks} />
            <PrivacyFAQ />
          </main>

          <section className="landing-cta" aria-label="Call to action">
            <div className="numbered">
              <span className="sec-label">/07</span>
              <h2>Open your workspace and add a file</h2>
            </div>
            <p>No account and nothing to install. Your files stay in this browser until you delete them.</p>
            <div className="cta-actions">
              <Link className="button-primary" to="/workspace">
                Open workspace <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            </div>
            <span className="cta-shortcut">
              <kbd>Ctrl / ⌘ K</kbd> Quick search available anywhere in workspace
            </span>
          </section>

          <footer className="landing-footer">
            <Link className="footer-brand" to="/">DocuMind AI</Link>
            <p>Files are read and stored in your browser. Excerpts go to a remote model only if you allow it.</p>
            <a href="#features">See the facts <ArrowUpRight size={14} aria-hidden="true" /></a>
          </footer>
          <div className="status-bar">
            <span><i aria-hidden="true" /> Files: local</span>
            <Link className="status-bar__go" to="/workspace">&gt; Open workspace_</Link>
            <span>Formats: PDF / DOCX / TXT</span>
          </div>
    </div>
  )
}

export default LandingPage
