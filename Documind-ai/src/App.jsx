import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, ArrowDown, ArrowUp, ArrowUpRight, Check, ChevronDown, FileText, FileUp, FolderOpen, LayoutGrid, List, Menu, Moon, Search, Settings2, Sparkles, Sun, Upload, X } from 'lucide-react'

const seedDocs = [
  { name: 'Q3 Market Research.pdf', type: 'PDF', size: 2.4 * 1024 * 1024, added: 4, sample: true },
  { name: 'Product Strategy 2025.docx', type: 'DOCX', size: 856 * 1024, added: 3, sample: true },
  { name: 'Customer Interviews.pdf', type: 'PDF', size: 1.8 * 1024 * 1024, added: 2, sample: true },
  { name: 'Brand Guidelines.pdf', type: 'PDF', size: 4.1 * 1024 * 1024, added: 1, sample: true },
]

const acceptedTypes = new Set(['pdf', 'doc', 'docx', 'txt'])
const maxFileSize = 25 * 1024 * 1024

function formatSize(bytes) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function App() {
  const [dark, setDark] = useState(false)
  const [query, setQuery] = useState('')
  const [docs, setDocs] = useState(seedDocs)
  const [view, setView] = useState('list')
  const [filter, setFilter] = useState('All files')
  const [ascending, setAscending] = useState(false)
  const [notice, setNotice] = useState('')
  const [dragging, setDragging] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const fileRef = useRef(null)
  const searchRef = useRef(null)
  const addedThisSession = docs.filter((doc) => !doc.sample).length

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
      if (event.key === 'Escape') setMobileMenuOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

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
    const incoming = Array.from(files)
    const valid = incoming.filter((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase()
      return acceptedTypes.has(extension) && file.size <= maxFileSize
    })
    const rejected = incoming.length - valid.length
    if (valid.length) {
      setDocs((current) => [...valid.map((file, index) => ({
        name: file.name,
        type: file.name.split('.').pop().toUpperCase(),
        size: file.size,
        added: Date.now() + index,
        sample: false,
      })), ...current])
      setNotice(`${valid.length} file${valid.length === 1 ? '' : 's'} added to this browser session. No file was uploaded.`)
    } else if (rejected) {
      setNotice('Choose PDF, DOC, DOCX, or TXT files up to 25 MB.')
    }
    if (valid.length && rejected) setNotice(`${valid.length} file${valid.length === 1 ? '' : 's'} added. ${rejected} unsupported or oversized file${rejected === 1 ? ' was' : 's were'} skipped.`)
  }

  function cycleFilter() {
    const options = ['All files', 'PDF', 'DOC', 'DOCX', 'TXT']
    setFilter((current) => options[(options.indexOf(current) + 1) % options.length])
  }

  return <div className={dark ? 'app dark' : 'app'}>
    <aside className="sidebar" aria-label="Workspace navigation">
      <a className="brand" href="#dashboard" aria-label="DocuMind AI workspace">
        <span className="brand-mark" aria-hidden="true"><FileText size={20} strokeWidth={2.4} /></span>
        <span className="brand-name">documind<span>.ai</span></span>
      </a>
      <div className="workspace-switcher"><span className="workspace-icon">A</span><span><strong>Anand’s workspace</strong><small>Local prototype</small></span><ChevronDown size={16} /></div>
      <nav className="nav-links" aria-label="Main navigation">
        <span className="nav-heading">Workspace</span>
        <a className="nav-link active" href="#dashboard"><LayoutGrid size={17} /> Overview</a>
        <a className="nav-link" href="#documents"><FolderOpen size={17} /> Documents <span className="nav-count">{docs.length}</span></a>
        <button className="nav-link nav-disabled" type="button" title="AI assistant is not connected in this prototype" onClick={() => setNotice('AI chat is planned, but not connected in this prototype.')}><Sparkles size={17} /> AI assistant <span className="planned">Planned</span></button>
        <span className="nav-heading nav-heading-lower">Manage</span>
        <button className="nav-link nav-disabled" type="button" title="Document comparison is planned" onClick={() => setNotice('Document comparison is planned, but not available yet.')}><Settings2 size={17} /> Compare <span className="planned">Planned</span></button>
      </nav>
      <div className="sidebar-bottom">
        <div className="local-note"><span className="local-indicator" /><span><strong>Local-only prototype</strong><small>Files stay in this page session</small></span></div>
        <button className="user-row" type="button" onClick={() => setNotice('Account settings are not available in this prototype.')}><span className="avatar">AM</span><span><strong>Anand</strong><small>Workspace owner</small></span><Settings2 size={16} /></button>
      </div>
    </aside>

    <main className="page" id="dashboard">
      <header className="mobile-topbar">
        <a className="brand" href="#dashboard" aria-label="DocuMind AI workspace"><span className="brand-mark"><FileText size={19} /></span><span className="brand-name">documind<span>.ai</span></span></a>
        <div className="mobile-header-actions"><button className="icon-button" aria-expanded={mobileMenuOpen} aria-controls="mobile-navigation" aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}</button><button className="icon-button theme-button" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setDark(!dark)}>{dark ? <Sun size={19} /> : <Moon size={19} />}</button></div>
        {mobileMenuOpen && <nav className="mobile-nav" id="mobile-navigation" aria-label="Mobile navigation"><span className="nav-heading">Workspace</span><a className="nav-link active" href="#dashboard" onClick={() => setMobileMenuOpen(false)}><LayoutGrid size={17} /> Overview</a><a className="nav-link" href="#documents" onClick={() => setMobileMenuOpen(false)}><FolderOpen size={17} /> Documents <span className="nav-count">{docs.length}</span></a><button className="nav-link nav-disabled" type="button" onClick={() => { setMobileMenuOpen(false); setNotice('AI chat is planned, but not connected in this prototype.') }}><Sparkles size={17} /> AI assistant <span className="planned">Planned</span></button><div className="mobile-menu-note"><strong>Local-only prototype</strong><span>Files stay in this page session.</span></div></nav>}
      </header>

      <div className="page-inner">
        <div className="top-actions"><span className="environment-tag"><span /> Local prototype</span><button className="icon-button theme-button desktop-theme" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setDark(!dark)}>{dark ? <Sun size={19} /> : <Moon size={19} />}</button></div>

        <section className="welcome-row">
          <div><h1>Workspace overview</h1><p className="subtitle">A clear place to begin with your documents.</p></div>
          <button className="primary-button" onClick={() => fileRef.current?.click()}><Upload size={18} /> Add documents <ArrowUpRight size={17} /></button>
        </section>

        <section className="upload-panel" onDragEnter={(event) => { event.preventDefault(); setDragging(true) }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false) }} onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files) }}>
          <div className={`drop-zone ${dragging ? 'is-dragging' : ''}`}>
            <div className="upload-mark"><FileUp size={24} /></div>
            <div className="drop-copy"><h2>Add documents to your workspace</h2><p>Choose files or drop them here. They’ll appear in this browser session only.</p><span className="format-note">PDF, DOC, DOCX, TXT <span>·</span> Up to 25 MB each</span></div>
            <button className="secondary-button" onClick={() => fileRef.current?.click()}>Choose files <ArrowUpRight size={16} /></button>
            <input ref={fileRef} type="file" multiple accept=".pdf,.doc,.docx,.txt" hidden onChange={(event) => { addFiles(event.target.files); event.target.value = '' }} />
          </div>
          <div className="prototype-strip"><span className="prototype-icon"><Activity size={16} /></span><p><strong>What works here</strong> File selection, filename search, and local display. AI analysis, cloud upload, and document processing aren’t connected yet.<span className="prototype-extra">Search by name, filter by file type, or switch the list to grid view.</span></p></div>
        </section>

        <section className="stats-row" aria-label="Workspace status">
          <div className="stat-card stat-mint"><span className="stat-label">Files in this workspace</span><strong>{docs.length}</strong><span className="stat-note">Including sample documents</span></div>
          <div className="stat-card stat-blue"><span className="stat-label">Added this session</span><strong>{addedThisSession}</strong><span className="stat-note">Stored in page memory only</span></div>
          <div className="stat-card stat-yellow"><span className="stat-label">AI analyses</span><strong>0</strong><span className="stat-note">AI services aren’t connected</span></div>
        </section>

        <section className="library-section" id="documents">
          <div className="section-heading"><div><h2>Documents</h2><p>Sample files and items added in this session.</p></div><span className="count-label">{filtered.length} shown</span></div>
          <div className="library-toolbar">
            <label className="search-box"><Search size={17} aria-hidden="true" /><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by file name" aria-label="Search documents by file name" /><kbd>Ctrl K</kbd></label>
            <div className="toolbar-actions">
              <button className="filter-button" onClick={cycleFilter} aria-label={`Filter file type, currently ${filter}`}><Settings2 size={16} /> <span>{filter}</span><ChevronDown size={14} /></button>
              <button className="filter-button sort-button" onClick={() => setAscending(!ascending)} aria-label={`Sort ${ascending ? 'by most recently added' : 'by file name'}`}>{ascending ? <ArrowUp size={16} /> : <ArrowDown size={16} />} <span>{ascending ? 'Name' : 'Recent'}</span></button>
              <div className="view-toggle" aria-label="Document layout">
                <button className={view === 'list' ? 'selected' : ''} onClick={() => setView('list')} aria-label="List view" aria-pressed={view === 'list'}><List size={17} /></button>
                <button className={view === 'grid' ? 'selected' : ''} onClick={() => setView('grid')} aria-label="Grid view" aria-pressed={view === 'grid'}><LayoutGrid size={16} /></button>
              </div>
            </div>
          </div>

          {filtered.length ? <div className={view === 'list' ? 'document-list' : 'document-grid'}>
            {filtered.map((doc) => <article key={`${doc.name}-${doc.added}`} className="document-card">
              <span className={`file-icon file-${doc.type.toLowerCase()}`}>{doc.type}</span>
              <div className="doc-main"><h3 title={doc.name}>{doc.name}</h3><p className="doc-subtitle">{doc.sample ? 'Example file' : 'Added in this session'} <span>·</span> {formatSize(doc.size)}</p></div>
              <span className={`doc-status ${doc.sample ? 'sample-status' : 'session-status'}`}>{doc.sample ? 'Sample' : 'Local'}</span>
            </article>)}
          </div> : <div className="empty-search"><FolderOpen size={23} /><strong>No matching documents</strong><span>Try another file name or choose a different file type.</span></div>}
        </section>

        <footer className="page-footer"><span>DocuMind AI <span>·</span> Local prototype</span><span>Files are not uploaded or processed.</span></footer>
      </div>
      {notice && <div className="toast" role="status"><Check size={17} /><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss notification"><X size={16} /></button></div>}
    </main>
  </div>
}

export default App
