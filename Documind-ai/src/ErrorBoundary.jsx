import React from 'react'

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

  handleResetAndGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--paper, #fdfbf7)',
          padding: '24px',
          fontFamily: 'var(--sans, system-ui, sans-serif)',
          color: 'var(--ink, #121212)'
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            background: 'var(--surface, #ffffff)',
            border: '2px solid var(--ink, #121212)',
            borderRadius: '6px',
            boxShadow: '4px 4px 0 var(--ink, #121212)',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--butter, #fde047)',
              color: 'var(--ink-on-pastel, #121212)',
              border: '1.5px solid var(--ink, #121212)',
              borderRadius: '4px',
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 700,
              fontFamily: 'var(--heading, sans-serif)',
              width: 'fit-content'
            }}>
              ⚠️ Application Recovery
            </div>

            <h2 style={{
              margin: 0,
              fontFamily: 'var(--heading, sans-serif)',
              fontSize: '20px',
              fontWeight: 700
            }}>
              Something interrupted the workspace
            </h2>

            <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5, color: 'var(--muted, #555555)' }}>
              An unexpected render exception was caught. Your documents and data in browser storage are safe.
            </p>

            {this.state.error && (
              <pre style={{
                margin: 0,
                padding: '12px',
                background: 'var(--paper, #f8f6f0)',
                border: '1.5px solid var(--ink, #121212)',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace',
                overflowX: 'auto',
                color: '#dc2626',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {this.state.error.message || String(this.state.error)}
              </pre>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button
                onClick={this.handleReload}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: 'var(--mint, #86efac)',
                  color: 'var(--ink-on-pastel, #121212)',
                  border: '2px solid var(--ink, #121212)',
                  borderRadius: '4px',
                  boxShadow: '2px 2px 0 var(--ink, #121212)',
                  fontFamily: 'var(--heading, sans-serif)',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Reload Workspace
              </button>
              <button
                onClick={this.handleResetAndGoHome}
                style={{
                  padding: '10px 16px',
                  background: 'var(--surface, #ffffff)',
                  color: 'var(--ink, #121212)',
                  border: '2px solid var(--ink, #121212)',
                  borderRadius: '4px',
                  boxShadow: '2px 2px 0 var(--ink, #121212)',
                  fontFamily: 'var(--heading, sans-serif)',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Go to Home
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
