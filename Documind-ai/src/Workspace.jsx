import { useEffect, useMemo, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { Physics2DPlugin } from 'gsap/Physics2DPlugin'
import { ArrowDown, ArrowUp, Check, FilePlus2, FolderOpen, GitCompareArrows, Info, LayoutGrid, List, Menu, MessageSquareText, Moon, Search, Settings2, Sun, X } from 'lucide-react'
import Brand from './Brand.jsx'

gsap.registerPlugin(useGSAP, Physics2DPlugin)

const seedDocs = [
  { name: 'Q3 Market Research.pdf', type: 'PDF', size: 2.4 * 1024 * 1024, added: 4, sample: true },
  { name: 'Product Strategy 2025.docx', type: 'DOCX', size: 856 * 1024, added: 3, sample: true },
  { name: 'Customer Interviews.pdf', type: 'PDF', size: 1.8 * 1024 * 1024, added: 2, sample: true },
  { name: 'Brand Guidelines.pdf', type: 'PDF', size: 4.1 * 1024 * 1024, added: 1, sample: true },
]

const acceptedTypes = new Set(['pdf', 'doc', 'docx', 'txt'])
const maxFileSize = 25 * 1024 * 1024

function fileIdentity(file) {
  return [file.name.toLocaleLowerCase(), file.size, file.lastModified || 0].join('::')
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function App() {
  const [dark, setDark] = useState(false)
  const [query, setQuery] = useState('')
  const [docs, setDocs] = useState(seedDocs)
  const [view, setView] = useState('list')
  const [filter, setFilter] = useState('All files')
  const [ascending, setAscending] = useState(false)
  const [notice, setNotice] = useState('')
  const [fileBurst, setFileBurst] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const fileRef = useRef(null)
  const searchRef = useRef(null)
  const mobileMenuButtonRef = useRef(null)
  const mobileTopbarRef = useRef(null)
  const workspaceRef = useRef(null)
  const uploadMarkRef = useRef(null)
  const addedThisSession = docs.filter((doc) => !doc.sample).length

  useGSAP(() => {
    if (!fileBurst || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const particles = uploadMarkRef.current?.querySelectorAll('[data-file-particle]')
    if (!particles?.length) return

    const angles = [-155, -130, -105, -80, -55, -30, -5]
    particles.forEach((particle, index) => {
      gsap.fromTo(particle,
        { x: 0, y: 0, rotation: 0, opacity: 1 },
        {
          duration: 0.68,
          rotation: index % 2 ? 38 : -38,
          opacity: 0,
          physics2D: { velocity: 72, angle: angles[index], gravity: 150 },
          onComplete: () => gsap.set(particle, { clearProps: 'transform,opacity' }),
        },
      )
    })
  }, { scope: workspaceRef, dependencies: [fileBurst], revertOnUpdate: true })

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

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false)
        mobileMenuButtonRef.current?.focus()
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [mobileMenuOpen])

  useEffect(() => {
    if (mobileMenuOpen) mobileTopbarRef.current?.querySelector('.mobile-nav a')?.focus()
  }, [mobileMenuOpen])

  useEffect(() => {
    if (!notice) return undefined
    const timeout = window.setTimeout(() => setNotice(''), 4200)
    return () => window.clearTimeout(timeout)
  }, [notice])

  const filtered = useMemo(() => {
    const matches = docs.filter((doc) => doc.name.toLowerCase().includes(query.toLowerCase()) && (filter === 'All files' || doc.type === filter))
    return [...matches].sort((a, b) => ascending ? a.name.localeCompare(b.name) : b.added - a.added)
  }, [docs, query, filter, ascending])

  function addFiles(files) {
    const incoming = Array.from(files || [])
    const seen = new Set(docs.filter((doc) => !doc.sample).map(fileIdentity))
    const accepted = []
    const rejected = { unsupported: 0, oversized: 0, duplicate: 0 }

    incoming.forEach((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (!acceptedTypes.has(extension)) {
        rejected.unsupported += 1
        return
      }
      if (file.size > maxFileSize) {
        rejected.oversized += 1
        return
      }

      const identity = fileIdentity(file)
      if (seen.has(identity)) {
        rejected.duplicate += 1
        return
      }
      seen.add(identity)
      accepted.push(file)
    })

    if (accepted.length) {
      setFileBurst((current) => current + 1)
      setDocs((current) => [...accepted.map((file, index) => ({
        name: file.name,
        type: file.name.split('.').pop().toUpperCase(),
        size: file.size,
        lastModified: file.lastModified,
        added: Date.now() + index,
        sample: false,
      })), ...current])
    }

    const skipped = Object.values(rejected).reduce((total, count) => total + count, 0)
    if (!accepted.length && !skipped) return

    const details = [
      rejected.unsupported && `${rejected.unsupported} unsupported`,
      rejected.oversized && `${rejected.oversized} over 25 MB`,
      rejected.duplicate && `${rejected.duplicate} already listed`,
    ].filter(Boolean).join(', ')
    const added = accepted.length
      ? `${accepted.length} file name${accepted.length === 1 ? '' : 's'} listed for this session`
      : ''
    const skippedMessage = details ? `${added ? '; ' : ''}${details} skipped` : ''
    setNotice(`${added}${skippedMessage}. No file bytes were read or uploaded.`)
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

  return <div ref={workspaceRef} className={dark ? 'app dark' : 'app'}>
    <aside className="sidebar" aria-label="Workspace navigation">
      <a className="brand" href="#dashboard" aria-label="DocuMind AI workspace">
        <Brand className="brand-lockup" markClassName="brand-mark" wordmarkClassName="brand-name" />
      </a>
      <div className="workspace-switcher"><span className="workspace-icon">A</span><span><strong>Anand’s workspace</strong><small>Browser session</small></span></div>
      <nav className="nav-links" aria-label="Main navigation">
        <span className="nav-heading">Workspace</span>
        <a className="nav-link active" href="#dashboard"><LayoutGrid size={17} /> Overview</a>
        <a className="nav-link" href="#documents"><FolderOpen size={17} /> Documents <span className="nav-count">{docs.length}</span></a>
        <button className="nav-link nav-disabled" type="button" title="AI assistant is not connected in this prototype" onClick={() => setNotice('AI chat is planned, but not connected in this prototype.')}><MessageSquareText size={17} /> AI assistant <span className="planned">Planned</span></button>
        <span className="nav-heading nav-heading-lower">Manage</span>
        <button className="nav-link nav-disabled" type="button" title="Document comparison is planned" onClick={() => setNotice('Document comparison is planned, but not available yet.')}><GitCompareArrows size={17} /> Compare <span className="planned">Planned</span></button>
      </nav>
      <div className="sidebar-bottom">
        <button className="user-row" type="button" onClick={() => setNotice('Account settings are not available in this prototype.')}><span className="avatar">AM</span><span><strong>Anand</strong><small>Workspace owner</small></span><Settings2 size={16} /></button>
      </div>
    </aside>

    <main className="page" id="dashboard">
      <header ref={mobileTopbarRef} className="mobile-topbar" onKeyDown={keepFocusInMobileMenu}>
        <a className="brand" href="#dashboard" aria-label="DocuMind AI workspace"><Brand className="brand-lockup" markClassName="brand-mark" wordmarkClassName="brand-name" /></a>
        <div className="mobile-header-actions"><button ref={mobileMenuButtonRef} className="icon-button" aria-expanded={mobileMenuOpen} aria-controls="mobile-navigation" aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}</button><button className="icon-button theme-button" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setDark(!dark)}>{dark ? <Sun size={19} /> : <Moon size={19} />}</button></div>
        {mobileMenuOpen && <nav className="mobile-nav" id="mobile-navigation" aria-label="Mobile navigation"><span className="nav-heading">Workspace</span><a className="nav-link active" href="#dashboard" onClick={closeMobileMenu}><LayoutGrid size={17} /> Overview</a><a className="nav-link" href="#documents" onClick={closeMobileMenu}><FolderOpen size={17} /> Documents <span className="nav-count">{docs.length}</span></a><button className="nav-link nav-disabled" type="button" onClick={() => { closeMobileMenu(); setNotice('AI chat is planned, but not connected in this prototype.') }}><MessageSquareText size={17} /> AI assistant <span className="planned">Planned</span></button><div className="mobile-menu-note"><strong>Local-only prototype</strong><span>Names, types, and sizes are listed temporarily.</span></div></nav>}
      </header>

      <div className="page-inner" inert={mobileMenuOpen}>
        <div className="top-actions"><span className="environment-tag">Local prototype</span><button className="icon-button theme-button desktop-theme" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setDark(!dark)}>{dark ? <Sun size={19} /> : <Moon size={19} />}</button></div>

        <section className="welcome-row">
          <div><h1>Your document workspace</h1><p className="subtitle">Select files for this session or browse the demo examples below.</p></div>
        </section>

        <section className="upload-panel" onDragEnter={(event) => { event.preventDefault(); setDragging(true) }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false) }} onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files) }}>
          <div className={`drop-zone ${dragging ? 'is-dragging' : ''}`}>
            <div className="upload-mark" ref={uploadMarkRef}>
              <FilePlus2 size={24} aria-hidden="true" />
              {Array.from({ length: 7 }, (_, index) => <span key={index} className="upload-particle" data-file-particle aria-hidden="true" />)}
            </div>
            <div className="drop-copy"><h2>Select files for this session</h2><p>Choose supported documents or drop them here. Only file names, types, and sizes appear in this page.</p><span className="format-note">PDF, DOC, DOCX, or TXT. Maximum 25 MB per file.</span></div>
            <button className="secondary-button" onClick={() => fileRef.current?.click()}>Choose files</button>
            <input ref={fileRef} type="file" multiple accept=".pdf,.doc,.docx,.txt" hidden onChange={(event) => { addFiles(event.target.files); event.target.value = '' }} />
          </div>
          <div className="prototype-strip"><span className="prototype-icon"><Info size={17} aria-hidden="true" /></span><p><strong>This is a local prototype</strong> Files are not uploaded, saved, processed, or analyzed. AI answers and citations are not connected.</p></div>
        </section>

        <section className="library-section" id="documents">
          <div className="section-heading"><div><h2>Documents</h2><p>Demo examples and files selected this session.</p></div><div className="library-counts"><span className="count-label">{docs.length - addedThisSession} demo</span><span className="count-label">{addedThisSession} selected</span></div></div>
          <div className="library-toolbar">
            <label className="search-box"><Search size={17} aria-hidden="true" /><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by file name" aria-label="Search documents by file name" /><kbd>Ctrl / ⌘ K</kbd></label>
            <div className="toolbar-actions">
              <label className="filter-select"><span>Type</span><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter documents by file type"><option>All files</option><option>PDF</option><option>DOC</option><option>DOCX</option><option>TXT</option></select></label>
              <button className="filter-button sort-button" onClick={() => setAscending(!ascending)} aria-label={`Sort ${ascending ? 'by most recently added' : 'by file name'}`}>{ascending ? <ArrowUp size={16} /> : <ArrowDown size={16} />} <span>{ascending ? 'Name' : 'Recent'}</span></button>
              <div className="view-toggle" role="group" aria-label="Document layout">
                <button className={view === 'list' ? 'selected' : ''} onClick={() => setView('list')} aria-label="List view" aria-pressed={view === 'list'}><List size={17} /></button>
                <button className={view === 'grid' ? 'selected' : ''} onClick={() => setView('grid')} aria-label="Grid view" aria-pressed={view === 'grid'}><LayoutGrid size={16} /></button>
              </div>
            </div>
          </div>

          {filtered.length ? <div className={view === 'list' ? 'document-list' : 'document-grid'}>
            {filtered.map((doc) => <article key={`${doc.name}-${doc.added}`} className="document-card">
              <span className={`file-icon file-${doc.type.toLowerCase()}`}>{doc.type}</span>
              <div className="doc-main"><h3 title={doc.name}>{doc.name}</h3><p className="doc-subtitle">{doc.sample ? 'Demo example' : 'Selected this session'}, {formatSize(doc.size)}</p></div>
              <span className={`doc-status ${doc.sample ? 'sample-status' : 'session-status'}`}>{doc.sample ? 'Sample' : 'Session'}</span>
            </article>)}
          </div> : docs.length
            ? <div className="empty-search"><FolderOpen size={23} /><strong>No matching documents</strong><span>Try another file name or choose a different file type.</span></div>
            : <div className="empty-search"><FolderOpen size={23} /><strong>No documents yet</strong><span>Choose files above to add names for this session.</span></div>}
        </section>

        <footer className="page-footer"><span>DocuMind AI. Local prototype.</span><span>Files are not uploaded or processed.</span></footer>
      </div>
      {notice && <div className="toast" role="status"><Check size={17} /><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss notification"><X size={16} /></button></div>}
    </main>
  </div>
}

export default App
