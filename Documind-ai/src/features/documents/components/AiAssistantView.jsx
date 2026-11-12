import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Copy,
  FileText,
  Loader,
  Search,
  Shield,
  Sparkles,
  StopCircle,
  Trash2,
} from 'lucide-react'

const SUGGESTED_PROMPTS = [
  'What were the key drivers behind Q3 market growth?',
  'What are the brand typography and color rules?',
  'What feedback did customer interviews reveal?',
  'What is DocuMind\'s core product thesis and vision?',
]

/**
 * Document Evidence Assistant view.
 * Local keyword retrieval presenting exact excerpts, locators, and verifiable citations.
 * Operates purely locally on-device without an external AI model.
 *
 * @param {Object} props
 * @param {Array<{ id: string, sender: 'user' | 'assistant', text: string, citations?: Array<any>, hasEvidence?: boolean, timestamp: number }>} props.messages
 * @param {boolean} props.isGenerating
 * @param {(question: string) => void} props.onAskQuestion
 * @param {() => void} props.onCancelGeneration
 * @param {() => void} props.onClearChat
 * @param {(docId: string, chunkIndex: number) => void} props.onInspectCitation
 */
function AiAssistantView({
  messages,
  isGenerating,
  onAskQuestion,
  onCancelGeneration,
  onClearChat,
  onInspectCitation,
}) {
  const [input, setInput] = useState('')
  const [copiedIndex, setCopiedIndex] = useState(null)
  const chatEndRef = useRef(null)
  const inputRef = useRef(null)

  // Auto-scroll chat to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isGenerating])

  function handleSubmit(e) {
    e?.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isGenerating) return
    onAskQuestion(trimmed)
    setInput('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  function handleCopy(text, index) {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  return (
    <section className="ai-chat-section" aria-label="Document Evidence Assistant">
      {/* Top Banner */}
      <header className="ai-chat-header">
        <div className="ai-chat-title">
          <span className="ai-badge-icon">
            <Sparkles size={17} aria-hidden="true" />
          </span>
          <div>
            <h3>Document Evidence Assistant</h3>
            <p>Local keyword retrieval showing exact excerpts and citations. No external AI model is connected.</p>
          </div>
        </div>

        <div className="ai-header-controls">
          <span className="ai-model-tag" title="Runs purely in-browser using local keyword matching. No data leaves your machine.">
            <Shield size={12} aria-hidden="true" /> Local Retrieval · No External Model
          </span>
          {messages.length > 0 && (
            <button
              className="ai-clear-btn"
              onClick={onClearChat}
              title="Clear conversation history"
              aria-label="Clear conversation history"
            >
              <Trash2 size={13} aria-hidden="true" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </header>

      {/* Message Feed */}
      <div className="ai-feed-container" tabIndex={0} aria-live="polite">
        {messages.length === 0 ? (
          <div className="ai-empty-welcome">
            <div className="ai-welcome-badge">
              <BookOpen size={28} aria-hidden="true" />
            </div>
            <h4>Search and preview document excerpts</h4>
            <p>
              Ask questions to retrieve matching passages from your library. This prototype uses local keyword search to find relevant text chunks and citation locators—no remote AI model or external API is used.
            </p>

            <div className="ai-suggested-prompts">
              <span className="ai-suggested-label">Try asking:</span>
              <div className="ai-prompts-grid">
                {SUGGESTED_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    className="ai-prompt-chip"
                    onClick={() => {
                      setInput(prompt)
                      inputRef.current?.focus()
                    }}
                  >
                    <span>"{prompt}"</span>
                    <ArrowRight size={13} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="ai-messages-list">
            {messages.map((msg, idx) => (
              <article
                key={msg.id || idx}
                className={`ai-message-row ${msg.sender === 'user' ? 'msg-user' : 'msg-assistant'}`}
              >
                <div className="ai-message-bubble">
                  <div className="ai-msg-meta">
                    <span className="ai-sender-name">
                      {msg.sender === 'user' ? 'You' : 'Evidence Assistant (Local Preview)'}
                    </span>
                    {msg.sender === 'assistant' && (
                      <button
                        className="ai-copy-btn"
                        onClick={() => handleCopy(msg.text, idx)}
                        title="Copy text"
                        aria-label="Copy text to clipboard"
                      >
                        {copiedIndex === idx ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    )}
                  </div>

                  {/* Main Response or Excerpt Cards */}
                  {msg.sender === 'user' ? (
                    <div className="ai-msg-text">
                      <p>{msg.text}</p>
                    </div>
                  ) : msg.citations && msg.citations.length > 0 ? (
                    <div>
                      <div className="ai-msg-text">
                        <p>
                          Found {msg.citations.length} relevant passage{msg.citations.length === 1 ? '' : 's'} matching your query from local documents:
                        </p>
                      </div>

                      {/* Explicit per-excerpt card with exact citation button */}
                      <div className="ai-excerpts-container">
                        {msg.citations.map((c) => (
                          <article key={c.id} className="ai-excerpt-card">
                            <div className="ai-excerpt-header">
                              <button
                                className="ai-citation-chip"
                                onClick={() => onInspectCitation(c.docId, c.chunkIndex)}
                                title={`Open ${c.docName} at ${c.locator} in reader`}
                              >
                                <span className="citation-num">[{c.id}]</span>
                                <span className="citation-doc">{c.docName}</span>
                                <span className="citation-loc">
                                  <FileText size={10} style={{ display: 'inline', marginRight: 3 }} />
                                  {c.locator}
                                </span>
                                <ArrowUpRight size={12} aria-hidden="true" />
                              </button>
                            </div>
                            <blockquote className="ai-excerpt-quote">
                              "{c.text.trim()}"
                            </blockquote>
                          </article>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="ai-msg-text">
                      <p>{msg.text}</p>
                    </div>
                  )}

                  {msg.hasEvidence === false && (
                    <div className="ai-no-evidence-badge">
                      <span>No matching evidence found in library to substantiate claims.</span>
                    </div>
                  )}
                </div>
              </article>
            ))}

            {isGenerating && (
              <div className="ai-message-row msg-assistant">
                <div className="ai-message-bubble ai-generating-bubble">
                  <div className="ai-generating-content">
                    <Loader size={16} className="spin-icon" aria-hidden="true" />
                    <span>Retrieving local passages and locating source excerpts…</span>
                  </div>
                  <button
                    className="ai-cancel-generation-btn"
                    onClick={onCancelGeneration}
                    title="Stop excerpt retrieval"
                  >
                    <StopCircle size={14} aria-hidden="true" /> Stop
                  </button>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Bottom Input Area */}
      <form className="ai-chat-input-bar" onSubmit={handleSubmit}>
        <div className="ai-input-wrapper">
          <textarea
            ref={inputRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question to find relevant excerpts… (Press Enter)"
            aria-label="Ask a question about your documents"
            disabled={isGenerating}
          />
        </div>
        <button
          type="submit"
          className="primary-button ai-send-btn"
          disabled={!input.trim() || isGenerating}
          aria-label="Retrieve document excerpts"
        >
          <Search size={16} aria-hidden="true" />
          <span>Preview Excerpts</span>
        </button>
      </form>
    </section>
  )
}

export default AiAssistantView
