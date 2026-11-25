import React from 'react'
import { AlertTriangle } from 'lucide-react'

// The recovery screen follows the instrument-sheet system: grey ground, a white
// panel in a 1px ink frame, square corners, no shadows, red only for the failure.
const FRAME = '1px solid var(--ink, #0b0b0b)'

const buttonBase = {
  minHeight: '44px',
  padding: '10px 16px',
  border: FRAME,
  borderRadius: 0,
  fontFamily: 'var(--body, ui-monospace, monospace)',
  fontWeight: 700,
  fontSize: '13px',
  cursor: 'pointer',
}

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[DocuMind AI] Caught application error:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleNavigate = (path) => {
    window.location.href = path
  }

  render() {
    if (this.state.hasError) {
      // Offer the other page as the way out, so leaving never reloads the page that failed
      const inWorkspace = window.location.pathname.startsWith('/workspace')
      const elsewhere = inWorkspace
        ? { label: 'Go to home page', path: '/' }
        : { label: 'Open workspace', path: '/workspace' }

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--paper, #f1f1ef)',
          padding: '24px',
          fontFamily: 'var(--body, ui-monospace, monospace)',
          color: 'var(--ink, #0b0b0b)'
        }}>
          <div role="alert" style={{
            maxWidth: '520px',
            width: '100%',
            background: 'var(--surface, #ffffff)',
            border: FRAME,
            borderRadius: 0,
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--red-text, #a50d0b)',
              border: FRAME,
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 700,
              width: 'fit-content'
            }}>
              <AlertTriangle size={14} strokeWidth={2.25} aria-hidden="true" /> Application recovery
            </div>

            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>
              Something went wrong on this page
            </h2>

            <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.55, color: 'var(--muted, #55554f)' }}>
              An unexpected error stopped the page from drawing. Your documents and chats in browser storage are safe.
            </p>

            {this.state.error && (
              <pre style={{
                margin: 0,
                padding: '12px',
                background: 'var(--paper, #f1f1ef)',
                border: '1px solid var(--line, rgba(11, 11, 11, 0.14))',
                borderRadius: 0,
                fontSize: '12px',
                fontFamily: 'var(--body, ui-monospace, monospace)',
                overflowX: 'auto',
                color: 'var(--red-text, #a50d0b)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {this.state.error.message || String(this.state.error)}
              </pre>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{ ...buttonBase, flex: 1, background: 'var(--ink, #0b0b0b)', color: 'var(--paper, #f1f1ef)' }}
              >
                Reload page
              </button>
              <button
                type="button"
                onClick={() => this.handleNavigate(elsewhere.path)}
                style={{ ...buttonBase, background: 'var(--surface, #ffffff)', color: 'var(--ink, #0b0b0b)' }}
              >
                {elsewhere.label}
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
