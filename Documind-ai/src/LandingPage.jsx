import { useEffect, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollSmoother } from 'gsap/ScrollSmoother'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, FileSearch, FolderOpen, LayoutGrid, MessageSquareText, Sparkles } from 'lucide-react'
import Brand from './Brand.jsx'
import './landing.css'

gsap.registerPlugin(useGSAP, ScrollTrigger, ScrollSmoother, ScrambleTextPlugin, MotionPathPlugin)

const demoFiles = [
  { type: 'PDF', name: 'Q3 Market Research.pdf', tone: 'butter' },
  { type: 'DOCX', name: 'Product Strategy 2025.docx', tone: 'sky' },
  { type: 'PDF', name: 'Customer Interviews.pdf', tone: 'butter' },
]

function WorkspacePreview() {
  return <section className="preview-side" aria-label="Demo product preview">
    <div className="preview-caption"><span>Workspace preview</span><strong>Demo content</strong></div>
    <div className="workspace-preview" data-ui="workspace-preview" aria-label="Preview of the DocuMind workspace with demo documents">
      <div className="preview-topbar">
        <span className="preview-brand"><Brand className="brand-lockup" markClassName="preview-brand-mark" wordmarkClassName="preview-brand-wordmark" /></span>
        <span className="preview-local"><i aria-hidden="true" /> Local prototype</span>
      </div>
      <div className="preview-body">
        <aside className="preview-rail" aria-label="Demo workspace navigation">
          <div className="preview-workspace"><span>A</span><div><strong>Research workspace</strong><small>Demo</small></div></div>
          <div className="preview-nav active"><LayoutGrid size={14} aria-hidden="true" /> Overview</div>
          <div className="preview-nav"><FolderOpen size={14} aria-hidden="true" /> Documents <b>3</b></div>
          <div className="preview-nav preview-muted"><Sparkles size={14} aria-hidden="true" /> Assistant <small>Prototype</small></div>
          <div className="preview-rail-note">Files are not uploaded or analyzed.</div>
        </aside>
        <div className="preview-content">
          <div className="preview-welcome"><div><h2>Workspace overview</h2><p>Demo documents for research.</p></div><span className="preview-demo-tag">Demo</span></div>
          <div className="preview-stats" aria-label="Demo workspace status">
            <div className="preview-stat mint"><span>Demo files</span><strong>3</strong></div>
            <div className="preview-stat blue"><span>AI models</span><strong>0</strong><small>Not connected</small></div>
          </div>
          <div className="preview-library-heading"><h3>Documents</h3><span>Demo content</span></div>
          <ul className="preview-files" aria-label="Sample documents, all demo content">
            {demoFiles.map((file) => <li className="preview-file" key={file.name}>
              <span className={`preview-filetype ${file.tone}`}>{file.type}</span>
              <span className="preview-filename">{file.name}</span>
              <span className="preview-file-demo">Demo</span>
            </li>)}
          </ul>
          <p className="preview-footnote">Example files only · Nothing has been analyzed</p>
        </div>
      </div>
    </div>
  </section>
}

function CapabilitiesBar() {
  return <section className="capabilities-bar" aria-label="Key capabilities">
    <div className="capabilities-inner">
      <div className="capability-item reveal-on-scroll" style={{ '--reveal-delay': '0ms' }}>
        <span className="capability-icon cap-mint"><FileSearch size={20} aria-hidden="true" /></span>
        <div><h3>Evidence search</h3><p>Find exact passages and cited locators across extracted documents.</p></div>
        <span className="capability-tag tag-available">Available</span>
      </div>
      <div className="capability-item reveal-on-scroll" style={{ '--reveal-delay': '70ms' }}>
        <span className="capability-icon cap-sky"><MessageSquareText size={20} aria-hidden="true" /></span>
        <div><h3>Document assistant</h3><p>Ask questions to retrieve exact excerpts and citations from your documents.</p></div>
        <span className="capability-tag tag-available">Available</span>
      </div>
      <div className="capability-item reveal-on-scroll" style={{ '--reveal-delay': '140ms' }}>
        <span className="capability-icon cap-butter"><FolderOpen size={20} aria-hidden="true" /></span>
        <div><h3>Local workspace</h3><p>Select and browse files right in your browser. No uploads needed.</p></div>
        <span className="capability-tag tag-available">Available</span>
      </div>
    </div>
  </section>
}

function HowItWorks() {
  return <section className="how-section" id="how-it-works" aria-labelledby="how-heading">
    <div className="how-intro reveal-on-scroll">
      <h2 id="how-heading">A simple path through your research</h2>
      <p>Start with local file selection, search evidence passages, and ask questions with verifiable citations.</p>
    </div>
    <svg className="workflow-route" viewBox="0 0 1000 56" role="presentation" aria-hidden="true">
      <path id="workflow-motion-path" d="M165 33 C300 33 350 17 500 17 C650 17 700 33 835 33" />
      <g id="workflow-marker" transform="translate(165 33)">
        <rect x="-8" y="-11" width="16" height="21" rx="1" />
        <path d="M2 -11v6h6M-4 -1h8M-4 3h8" />
      </g>
    </svg>
    <ol className="steps-list">
      <li className="step-item step-available reveal-on-scroll" style={{ '--reveal-delay': '0ms' }}>
        <div><h3>Add documents</h3><p>Select PDF, DOCX, or TXT files to extract text locally in your browser. Files stay on your device and are never sent to a server.</p></div>
        <span className="step-status">Available in this prototype</span>
      </li>
      <li className="step-item step-available reveal-on-scroll" style={{ '--reveal-delay': '70ms' }}>
        <div><h3>Search evidence</h3><p>Search across extracted document chunks and jump directly into the reader at the cited page or paragraph.</p></div>
        <span className="step-status">Available in this release</span>
      </li>
      <li className="step-item step-citations reveal-on-scroll" style={{ '--reveal-delay': '140ms' }}>
        <div><h3>Grounded evidence excerpts</h3><p>Review candidate source passages with verifiable citations linked directly to exact document locators. No remote AI model connected.</p></div>
        <span className="step-status">Available in this release</span>
      </li>
    </ol>
  </section>
}

function LandingPage() {
  const pageRef = useRef(null)

  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const smoother = ScrollSmoother.create({
      wrapper: '#smooth-wrapper',
      content: '#smooth-content',
      smooth: 0.7,
      smoothTouch: 0.1,
      effects: false,
    })
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

    const workflowMarker = pageRef.current?.querySelector('#workflow-marker')
    const workflowPath = pageRef.current?.querySelector('#workflow-motion-path')
    const workflowSection = pageRef.current?.querySelector('#how-it-works')
    let workflowObserver
    if (workflowMarker && workflowPath && window.matchMedia('(min-width: 901px)').matches) {
      const followWorkflow = () => gsap.to(workflowMarker, {
          duration: 1.4,
          ease: 'power2.inOut',
          motionPath: { path: workflowPath, align: workflowPath, alignOrigin: [0.5, 0.5] },
        })
      workflowObserver = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return
        followWorkflow()
        workflowObserver.disconnect()
      }, { threshold: 0.12 })
      workflowObserver.observe(workflowSection)
    }

    return () => {
      workflowObserver?.disconnect()
      smoother.kill()
    }
  }, { scope: pageRef })

  useEffect(() => {
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

  return <div className="landing" ref={pageRef}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="landing-header">
      <Link className="landing-brand" to="/" aria-label="DocuMind AI home">
        <Brand className="brand-lockup" markClassName="landing-brand-mark" wordmarkClassName="landing-wordmark" />
      </Link>
      <nav className="landing-nav" aria-label="Main navigation">
        <a href="#how-it-works">How it works</a>
        <Link className="nav-cta" to="/workspace">Open workspace <ArrowUpRight size={16} aria-hidden="true" /></Link>
      </nav>
    </header>

    <div id="smooth-wrapper">
      <div id="smooth-content">
        <main id="main-content">
          <div className="landing-split">
            <WorkspacePreview />
            <section className="hero-copy" aria-labelledby="hero-heading">
              <div className="hero-inner">
                <h1 className="reveal-on-scroll" id="hero-heading" aria-label="Understand your documents faster.">
                  <span className="hero-heading-line" data-scramble-text="Understand your" aria-hidden="true">Understand your</span>
                  <span className="hero-heading-line" data-scramble-text="documents faster." aria-hidden="true">documents faster.</span>
                </h1>
                <p className="hero-support reveal-on-scroll" style={{ '--reveal-delay': '70ms' }}>A workspace for research and reports. Extract and search document text entirely in your browser; remote services and cloud AI models are not connected.</p>
                <div className="hero-actions reveal-on-scroll" style={{ '--reveal-delay': '140ms' }}>
                  <Link className="button-primary" to="/workspace">Open your workspace <ArrowRight size={18} aria-hidden="true" /></Link>
                  <a className="text-link" href="#how-it-works">See how it works <ArrowRight size={16} aria-hidden="true" /></a>
                </div>
                <aside className="prototype-note reveal-on-scroll" style={{ '--reveal-delay': '210ms' }} aria-label="Prototype limitation">
                  <strong>Local prototype</strong>
                  <p>Files added to the workspace are parsed on-device and stored in your browser's IndexedDB. Remote server uploads and third-party AI models are not connected.</p>
                </aside>
              </div>
            </section>
          </div>

          <CapabilitiesBar />
          <HowItWorks />
        </main>

        <section className="landing-cta reveal-on-scroll" aria-label="Call to action">
          <h2>Ready to work smarter with your documents?</h2>
          <p>Start browsing demo files or add your own in the local workspace.</p>
          <Link className="button-primary" to="/workspace">Open your workspace <ArrowRight size={18} aria-hidden="true" /></Link>
        </section>

        <footer className="landing-footer">
          <Link className="footer-brand" to="/">DocuMind AI</Link>
          <p>Local prototype · Files are processed on-device and never sent to a server.</p>
          <a href="#how-it-works">How it works <ArrowUpRight size={14} aria-hidden="true" /></a>
        </footer>
      </div>
    </div>
  </div>
}

export default LandingPage
