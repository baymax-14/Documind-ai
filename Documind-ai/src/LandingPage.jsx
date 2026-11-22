import { useLayoutEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollSmoother } from 'gsap/ScrollSmoother'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Cpu,
  Database,
  FileSearch,
  FileText,
  FolderOpen,
  HelpCircle,
  LayoutGrid,
  Lock,
  MessageSquareText,
  Search,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react'
import Brand from './Brand.jsx'
import './landing.css'

gsap.registerPlugin(useGSAP, ScrollTrigger, ScrollSmoother, ScrambleTextPlugin)

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

function WorkspacePreview() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <section className="preview-side" aria-label="Interactive workspace preview">
      <div className="preview-caption">
        <span>Interactive preview</span>
        <strong>Click tabs to inspect</strong>
      </div>
      <div className="workspace-preview" data-ui="workspace-preview" aria-label="Interactive preview of the DocuMind workspace">
        <div className="preview-topbar">
          <span className="preview-brand">
            <Brand className="brand-lockup" markClassName="preview-brand-mark" wordmarkClassName="preview-brand-wordmark" />
          </span>
          <div className="preview-top-tags">
            <span className="preview-local">
              <i aria-hidden="true" /> WebGPU On-Device
            </span>
          </div>
        </div>

        <div className="preview-body">
          <aside className="preview-rail" aria-label="Preview workspace navigation">
            <div className="preview-workspace">
              <span>A</span>
              <div>
                <strong>Research Lab</strong>
                <small>Local Workspace</small>
              </div>
            </div>
            <button
              type="button"
              className={`preview-nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <LayoutGrid size={14} aria-hidden="true" />
              <span>Overview</span>
              <b>3</b>
            </button>
            <button
              type="button"
              className={`preview-nav-btn ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              <FileSearch size={14} aria-hidden="true" />
              <span>Evidence Search</span>
            </button>
            <button
              type="button"
              className={`preview-nav-btn ${activeTab === 'assistant' ? 'active' : ''}`}
              onClick={() => setActiveTab('assistant')}
            >
              <Sparkles size={14} aria-hidden="true" />
              <span>AI Assistant</span>
              <small>WebGPU</small>
            </button>
            <div className="preview-rail-note">
              <Lock size={12} aria-hidden="true" style={{ display: 'inline', marginRight: 4 }} />
              100% on-device · Zero server calls
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
                  <span className="preview-demo-tag">Ready</span>
                </div>
                <div className="preview-stats" aria-label="Workspace metrics">
                  <div className="preview-stat mint">
                    <span>Stored Documents</span>
                    <strong>3</strong>
                  </div>
                  <div className="preview-stat blue">
                    <span>On-Device AI Engine</span>
                    <strong>Qwen 2.5</strong>
                    <small>WebGPU Active</small>
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
                <p className="preview-footnote">Parsed locally in browser · Ready for instant evidence retrieval</p>
              </div>
            )}

            {activeTab === 'search' && (
              <div className="preview-tab-pane">
                <div className="preview-search-bar">
                  <Search size={14} aria-hidden="true" />
                  <input readOnly value="enterprise growth regulated" aria-label="Sample search query" />
                  <kbd>2 results</kbd>
                </div>
                <div className="preview-search-results">
                  <div className="preview-match-card">
                    <div className="preview-match-head">
                      <strong>Q3 Market Research.pdf</strong>
                      <span className="preview-locator-chip">Page 4</span>
                    </div>
                    <p>
                      "...Enterprise revenue accelerated by 42% YoY, driven primarily by <mark>regulated</mark> legal and healthcare sectors requiring <mark>enterprise growth</mark> tools with zero cloud data retention..."
                    </p>
                  </div>
                  <div className="preview-match-card">
                    <div className="preview-match-head">
                      <strong>Customer Interviews.pdf</strong>
                      <span className="preview-locator-chip">Page 11</span>
                    </div>
                    <p>
                      "...Compliance officers at large institutions noted that <mark>regulated</mark> teams cannot approve cloud APIs, accelerating demand for on-device <mark>enterprise</mark> workbenches..."
                    </p>
                  </div>
                </div>
                <p className="preview-footnote">Sub-millisecond keyword retrieval across extracted passage chunks</p>
              </div>
            )}

            {activeTab === 'assistant' && (
              <div className="preview-tab-pane">
                <div className="preview-chat-container">
                  <div className="preview-chat-bubble user">
                    <span className="bubble-author">You</span>
                    <p>What were the primary drivers behind enterprise Q3 expansion?</p>
                  </div>
                  <div className="preview-chat-bubble assistant">
                    <div className="bubble-head">
                      <span className="bubble-author">DocuMind Assistant</span>
                      <span className="bubble-tag">
                        <Cpu size={10} aria-hidden="true" /> On-Device WebGPU Model
                      </span>
                    </div>
                    <p>
                      Enterprise growth was driven by a <strong>42% YoY acceleration</strong> in adoption across regulated healthcare and legal sectors <button type="button" className="inline-cite-pill" onClick={() => setActiveTab('search')}>[1]</button>, where strict compliance policies forbid uploading proprietary briefs to cloud LLMs <button type="button" className="inline-cite-pill" onClick={() => setActiveTab('search')}>[2]</button>.
                    </p>
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
                <p className="preview-footnote">Synthesized on your GPU · Every claim anchored to exact reader locators</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function CapabilitiesBento() {
  return (
    <section className="capabilities-bar" id="features" aria-labelledby="features-heading">
      <div className="bento-header reveal-on-scroll">
        <h2 id="features-heading">Architecture designed for absolute trust</h2>
        <p>
          Traditional AI document tools send your confidential files to remote servers. DocuMind runs the entire pipeline—from PDF parsing to neural LLM inference—purely in your local browser.
        </p>
      </div>

      <div className="bento-grid">
        <article className="bento-card card-wide card-mint reveal-on-scroll" style={{ '--reveal-delay': '0ms' }}>
          <div className="card-top">
            <span className="card-icon"><Cpu size={24} aria-hidden="true" /></span>
            <span className="bento-tag tag-mint">WebGPU Accelerated</span>
          </div>
          <div className="card-body">
            <h3>On-Device Neural Model Synthesis</h3>
            <p>
              Run modern quantized language models (Qwen 2.5 0.5B) directly on your local GPU via WebLLM and Apache TVM. Model weight shards (~350 MB) download once into your browser's persistent Cache API and execute completely offline without cloud API tokens.
            </p>
          </div>
          <div className="card-spec-row">
            <span><Zap size={13} aria-hidden="true" /> Zero Cloud Uploads</span>
            <span><Database size={13} aria-hidden="true" /> Cache API Persistence</span>
            <span><Lock size={13} aria-hidden="true" /> Apache 2.0 Open Weights</span>
          </div>
        </article>

        <article className="bento-card card-butter reveal-on-scroll" style={{ '--reveal-delay': '60ms' }}>
          <div className="card-top">
            <span className="card-icon"><FileSearch size={22} aria-hidden="true" /></span>
            <span className="bento-tag tag-butter">Sub-millisecond</span>
          </div>
          <div className="card-body">
            <h3>Deterministic Passage Search</h3>
            <p>
              Tokenized, stop-word filtered keyword retrieval across thousands of document passages in milliseconds. Immediate highlighted matches with exact page and paragraph locators.
            </p>
          </div>
          <div className="card-pill-row">
            <span className="feature-pill">Exact Page Locators</span>
            <span className="feature-pill">Zero Hallucinations</span>
          </div>
        </article>

        <article className="bento-card card-sky reveal-on-scroll" style={{ '--reveal-delay': '120ms' }}>
          <div className="card-top">
            <span className="card-icon"><BookOpen size={22} aria-hidden="true" /></span>
            <span className="bento-tag tag-sky">Direct Nav</span>
          </div>
          <div className="card-body">
            <h3>Verifiable Passage Citations</h3>
            <p>
              Every response is strictly bounded to retrieved evidence. Click any citation chip to instantly open the Document Reader at the cited chunk with smooth auto-scroll.
            </p>
          </div>
          <div className="card-pill-row">
            <span className="feature-pill">Passage-Level Anchors</span>
            <span className="feature-pill">One-Click Reader Jump</span>
          </div>
        </article>

        <article className="bento-card card-wide card-white reveal-on-scroll" style={{ '--reveal-delay': '180ms' }}>
          <div className="card-top">
            <span className="card-icon"><Shield size={24} aria-hidden="true" /></span>
            <span className="bento-tag tag-mint">Zero Telemetry</span>
          </div>
          <div className="card-body">
            <h3>Client-Side Privacy Vault</h3>
            <p>
              Client-side PDF and DOCX parsers decode file bytes in background Web Workers. Documents persist securely in your browser's IndexedDB. No accounts, no cookies, no user tracking, and no external proxies.
            </p>
          </div>
          <div className="card-spec-row">
            <span><Database size={13} aria-hidden="true" /> IndexedDB Storage</span>
            <span><Cpu size={13} aria-hidden="true" /> Web Worker Parsers</span>
            <span><Shield size={13} aria-hidden="true" /> Zero Telemetry</span>
          </div>
        </article>
      </div>
    </section>
  )
}

function GroundingPlayground() {
  const [selectedPrompt, setSelectedPrompt] = useState(PLAYGROUND_PROMPTS[0])

  return (
    <section className="playground-section" id="interactive-demo" aria-labelledby="playground-heading">
      <div className="playground-intro reveal-on-scroll">
        <h2 id="playground-heading">Inspect how verifiable grounding works</h2>
        <p>
          Select a sample research query to see how DocuMind isolates matching source passages and links answers directly to original page citations without hallucinations.
        </p>
      </div>

      <div className="playground-container reveal-on-scroll">
        <div className="playground-prompt-tabs" role="tablist" aria-label="Sample research questions">
          {PLAYGROUND_PROMPTS.map((p) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={selectedPrompt.id === p.id}
              className={`playground-tab ${selectedPrompt.id === p.id ? 'active' : ''}`}
              onClick={() => setSelectedPrompt(p)}
            >
              <FileText size={15} aria-hidden="true" />
              <span>{p.title}</span>
            </button>
          ))}
        </div>

        <div className="playground-display-split">
          <div className="playground-panel source-panel">
            <div className="panel-header">
              <span className="panel-badge butter">Retrieved Source Passage</span>
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
              <span>Extracted locally via Web Worker parser</span>
            </div>
          </div>

          <div className="playground-panel answer-panel">
            <div className="panel-header">
              <span className="panel-badge mint">Grounded Answer</span>
              <span className="panel-doc-meta">
                <Cpu size={12} aria-hidden="true" /> On-Device WebGPU
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
                <span className="cite-verified">Verified Passage</span>
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

function HowItWorks() {
  return (
    <section className="how-section" id="how-it-works" aria-labelledby="how-heading">
      <div className="how-intro reveal-on-scroll">
        <div>
          <h2 id="how-heading">A clear, verifiable path through your research</h2>
        </div>
        <p>
          Start with local file selection, search evidence passages, and ask questions with verifiable citations. No remote AI model connected without your explicit permission.
        </p>
      </div>

      <ol className="steps-list">
        <li className="step-item step-available reveal-on-scroll" style={{ '--reveal-delay': '0ms' }}>
          <div>
            <span className="step-num-pill">01</span>
            <h3>Add Documents Locally</h3>
            <p>
              Select PDF, DOCX, or TXT files up to 25 MB. Text extraction executes in background browser workers; files are persisted in local IndexedDB. Zero cloud uploads.
            </p>
          </div>
          <span className="step-status">100% In-Browser</span>
        </li>
        <li className="step-item step-available reveal-on-scroll" style={{ '--reveal-delay': '70ms' }}>
          <div>
            <span className="step-num-pill">02</span>
            <h3>Search Evidence or Query AI</h3>
            <p>
              Query across document chunks with sub-millisecond keyword retrieval, or synthesize answers directly on your GPU using local Qwen 2.5 on-device inference.
            </p>
          </div>
          <span className="step-status">Dual-Mode Inference</span>
        </li>
        <li className="step-item step-citations reveal-on-scroll" style={{ '--reveal-delay': '140ms' }}>
          <div>
            <span className="step-num-pill">03</span>
            <h3>Verify Every Citation</h3>
            <p>
              Every statement links directly to bracketed citations. Click any citation to open the full Document Reader right at the source page and paragraph offset.
            </p>
          </div>
          <span className="step-status">Verifiable Grounding</span>
        </li>
      </ol>
    </section>
  )
}

function PrivacyFAQ() {
  const faqs = [
    {
      q: 'Do my documents or questions ever leave my machine?',
      a: 'Never. Document parsing (PDF, DOCX, TXT), chunking, indexing, and neural AI inference run 100% locally in your browser. No files, text snippets, or questions are ever sent to an external server.',
    },
    {
      q: 'How does the on-device AI model run without an API key?',
      a: 'DocuMind uses WebGPU and WebLLM to compile optimized shaders directly on your graphics hardware. Weights (~350 MB) download once from CDN into your browser\'s Cache API for instant offline inference.',
    },
    {
      q: 'What if my device does not support WebGPU?',
      a: 'DocuMind automatically falls back to deterministic local Evidence Preview. You get exact keyword excerpts and verified citations with zero model weight downloads required.',
    },
    {
      q: 'What file formats and sizes are supported?',
      a: 'DocuMind handles PDF, DOCX, and TXT files up to 25 MB per file. You can add multiple files, organize them in your local library, and manage browser storage at any time.',
    },
  ]

  return (
    <section className="faq-section" id="faq" aria-labelledby="faq-heading">
      <div className="faq-intro reveal-on-scroll">
        <h2 id="faq-heading">Frequently asked questions</h2>
        <p>Everything you need to know about DocuMind's privacy guarantees and local technology stack.</p>
      </div>

      <div className="faq-grid reveal-on-scroll">
        {faqs.map((item, idx) => (
          <article className="faq-card" key={idx}>
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

  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const canUseSmoothScroll = window.matchMedia('(min-width: 901px) and (hover: hover) and (pointer: fine)').matches
    const smoother = canUseSmoothScroll ? ScrollSmoother.create({
      wrapper: '#smooth-wrapper',
      content: '#smooth-content',
      smooth: 0.7,
      effects: false,
    }) : null
    const headingLines = pageRef.current?.querySelectorAll('[data-scramble-text]')

    if (headingLines?.length) {
      const intro = gsap.timeline({ defaults: { ease: 'power2.out' } })
      headingLines.forEach((line) => {
        intro.to(line, {
          duration: 0.72,
          scrambleText: {
            text: line.dataset.scrambleText,
            chars: 'lowerCase',
            speed: 0.35,
          },
        }, line === headingLines[0] ? 0.2 : '-=0.34')
      })
      const previewRows = pageRef.current?.querySelectorAll('.preview-file')
      if (previewRows?.length) intro.fromTo(previewRows, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.32, stagger: 0.055 }, '-=0.22')
    }

    return () => {
      smoother?.kill()
    }
  }, { scope: pageRef })

  useLayoutEffect(() => {
    const root = pageRef.current
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!root || reduceMotion || !('IntersectionObserver' in window)) return undefined

    const targets = root.querySelectorAll('.reveal-on-scroll')
    if (!targets.length) return undefined
    document.documentElement.dataset.motionReady = 'true'
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' })
    targets.forEach((target) => observer.observe(target))
    function revealFocused(event) {
      event.target.closest('.reveal-on-scroll')?.classList.add('is-visible')
    }
    root.addEventListener('focusin', revealFocused)
    return () => {
      observer.disconnect()
      root.removeEventListener('focusin', revealFocused)
      delete document.documentElement.dataset.motionReady
    }
  }, [])

  return (
    <div className="landing" ref={pageRef}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="landing-header">
        <Link className="landing-brand" to="/" aria-label="DocuMind AI home">
          <Brand className="brand-lockup" markClassName="landing-brand-mark" wordmarkClassName="landing-wordmark" />
        </Link>
        <nav className="landing-nav" aria-label="Main navigation">
          <a href="#features">Capabilities</a>
          <a href="#interactive-demo">Live Demo</a>
          <a href="#how-it-works">How it works</a>
          <a href="#faq">FAQ</a>
          <Link className="nav-cta" to="/workspace">
            Open workspace <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </nav>
      </header>

      <div id="smooth-wrapper">
        <div id="smooth-content">
          <main id="main-content">
            <div className="landing-split">
              <section className="hero-copy" aria-labelledby="hero-heading">
                <div className="hero-inner">
                  <h1 className="reveal-on-scroll" id="hero-heading" aria-label="Understand your documents faster.">
                    <span className="hero-heading-line" data-scramble-text="Understand your" aria-hidden="true">Understand your</span>
                    <span className="hero-heading-line" data-scramble-text="documents faster." aria-hidden="true">documents faster.</span>
                  </h1>

                  <p className="hero-support reveal-on-scroll" style={{ '--reveal-delay': '70ms' }}>
                    The private document workspace for research and reports. Extract, search, and synthesize insights entirely in your browser using local WebGPU acceleration. User files and queries never leave your machine.
                  </p>

                  <div className="hero-actions reveal-on-scroll" style={{ '--reveal-delay': '140ms' }}>
                    <Link className="button-primary" to="/workspace">
                      Open your workspace <ArrowRight size={18} aria-hidden="true" />
                    </Link>
                    <a className="text-link" href="#interactive-demo">
                      Try live demo <ArrowRight size={16} aria-hidden="true" />
                    </a>
                  </div>

                  <div className="hero-trust-bar reveal-on-scroll" style={{ '--reveal-delay': '180ms' }}>
                    <div className="trust-pill">
                      <Lock size={13} aria-hidden="true" /> Zero Cloud Uploads
                    </div>
                    <div className="trust-pill">
                      <Cpu size={13} aria-hidden="true" /> WebGPU On-Device
                    </div>
                    <div className="trust-pill">
                      <FileSearch size={13} aria-hidden="true" /> Exact Citations
                    </div>
                    <div className="trust-pill">
                      <Database size={13} aria-hidden="true" /> Browser IndexedDB
                    </div>
                  </div>

                  <aside className="prototype-note reveal-on-scroll" style={{ '--reveal-delay': '210ms' }} aria-label="Privacy guarantee">
                    <strong>Local-first privacy guarantee</strong>
                    <p>
                      Files added to the workspace are parsed on-device and stored in your browser's IndexedDB. Optional on-device AI runs directly on your GPU; weights are cached locally and no data is ever sent to external servers.
                    </p>
                  </aside>
                </div>
              </section>
              <WorkspacePreview />
            </div>

            <CapabilitiesBento />
            <GroundingPlayground />
            <HowItWorks />
            <PrivacyFAQ />
          </main>

          <section className="landing-cta reveal-on-scroll" aria-label="Call to action">
            <h2>Ready to work smarter with your documents?</h2>
            <p>Start browsing demo files or add your own in the local workspace. No registration or credit card required.</p>
            <div className="cta-actions">
              <Link className="button-primary" to="/workspace">
                Open your workspace <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
            <span className="cta-shortcut">
              <kbd>Ctrl / ⌘ K</kbd> Quick search available anywhere in workspace
            </span>
          </section>

          <footer className="landing-footer">
            <Link className="footer-brand" to="/">DocuMind AI</Link>
            <p>Local-first workspace · Files and queries run on-device and are never sent to a server.</p>
            <a href="#how-it-works">How it works <ArrowUpRight size={14} aria-hidden="true" /></a>
          </footer>
        </div>
      </div>
    </div>
  )
}

export default LandingPage
