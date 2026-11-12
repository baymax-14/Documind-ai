import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Copy,
  Cpu,
  FileSearch,
  FileText,
  Info,
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
 * Document Evidence & AI Assistant view.
 * Supports both on-device WebGPU model inference and deterministic local Evidence Preview.
 * Complete privacy: zero data, document text, or queries leave the device.
 *
 * @param {Object} props
 * @param {Array<{ id: string, sender: 'user' | 'assistant', text: string, citations?: Array<any>, hasEvidence?: boolean, isRealModel?: boolean, timestamp: number }>} props.messages
 * @param {boolean} props.isGenerating
 * @param {(question: string) => void} props.onAskQuestion
 * @param {() => void} props.onCancelGeneration
 * @param {() => void} props.onClearChat
 * @param {(docId: string, chunkIndex: number) => void} props.onInspectCitation
 * @param {'not_configured' | 'unsupported' | 'downloading' | 'ready' | 'error'} [props.modelStatus]
 * @param {{ progress: number, text: string }} [props.modelProgress]
 * @param {string} [props.modelError]
 * @param {() => void} [props.onStartModelDownload]
 * @param {() => void} [props.onCancelModelDownload]
 * @param {() => void} [props.onUnloadModel]
 * @param {() => void} [props.onUseEvidencePreview]
 */
function AiAssistantView({
  messages,
  isGenerating,
  onAskQuestion,
  onCancelGeneration,
  onClearChat,
  onInspectCitation,
  modelStatus = 'not_configured',
  modelProgress = { progress: 0, text: '' },
  modelError = '',
  onStartModelDownload,
  onCancelModelDownload,
  onUnloadModel,
  onUseEvidencePreview,
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
    <section className="ai-chat-section" aria-label="Document Evidence & AI Assistant">
      {/* Top Banner */}
      <header className="ai-chat-header">
        <div className="ai-chat-title">
          <span className="ai-badge-icon">
            <Sparkles size={17} aria-hidden="true" />
          </span>
          <div>
            <h3>Document Evidence & AI Assistant</h3>
            <p>
              {modelStatus === 'ready'
                ? 'Synthesizing answers using on-device WebGPU model grounded strictly in document passages.'
                : 'Local keyword retrieval showing exact excerpts and citations from your documents.'}
            </p>
          </div>
        </div>

        <div className="ai-header-controls">
          <span
            className="ai-model-tag"
            title="Runs purely in-browser. Zero file bytes, text excerpts, or questions leave your machine."
          >
            {modelStatus === 'ready' ? (
              <>
                <Cpu size={12} aria-hidden="true" /> On-Device WebGPU Model Active
              </>
            ) : (
              <>
                <Shield size={12} aria-hidden="true" /> Local Processing · No Cloud Uploads
              </>
            )}
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

      {/* Model Setup & Lifecycle Management Banners */}
      {modelStatus === 'not_configured' && (
        <div className="ai-model-setup-banner" role="region" aria-label="On-device AI model setup">
          <div className="ai-model-setup-info">
            <div className="ai-model-setup-badge">
              <Sparkles size={18} aria-hidden="true" />
            </div>
            <div>
              <h4>On-Device AI Model Available</h4>
              <p>
                Download Qwen 2.5 0.5B (~350 MB, Apache 2.0) to synthesize answers directly on your GPU. Weights are cached locally for offline use. Your documents and queries never leave your browser.
              </p>
            </div>
          </div>
          <div className="ai-model-setup-actions">
            <button
              className="primary-button ai-setup-btn"
              onClick={onStartModelDownload}
            >
              <Sparkles size={14} aria-hidden="true" /> Set Up On-Device Model (~350 MB)
            </button>
            <button
              className="secondary-button ai-preview-only-btn"
              onClick={onUseEvidencePreview}
            >
              Keep Evidence Preview
            </button>
          </div>
        </div>
      )}

      {modelStatus === 'downloading' && (
        <div className="ai-model-download-banner" role="status" aria-live="polite">
          <div className="ai-model-download-header">
            <div className="ai-model-download-title">
              <Loader size={16} className="spin-icon" aria-hidden="true" />
              <span>Downloading & Compiling On-Device Model…</span>
            </div>
            <span className="ai-download-percent">
              {Math.round((modelProgress?.progress || 0) * 100)}%
            </span>
          </div>
          <div className="ai-progress-track">
            <div
              className="ai-progress-fill"
              style={{ width: `${Math.round((modelProgress?.progress || 0) * 100)}%` }}
            />
          </div>
          <div className="ai-model-download-footer">
            <span className="ai-download-step">{modelProgress?.text || 'Downloading weights…'}</span>
            <button
              className="secondary-button ai-cancel-dl-btn"
              onClick={onCancelModelDownload}
            >
              Cancel Download
            </button>
          </div>
        </div>
      )}

      {modelStatus === 'ready' && (
        <div className="ai-model-active-bar" role="status">
          <div className="ai-active-status">
            <span className="ai-active-dot" />
            <span>
              <strong>On-Device Model Active:</strong> Qwen 2.5 0.5B (Local WebGPU)
            </span>
          </div>
          <button
            className="ai-unload-btn"
            onClick={onUnloadModel}
            title="Unload model from GPU memory and switch to Evidence Preview"
          >
            Unload / Switch to Preview
          </button>
        </div>
      )}

      {modelStatus === 'unsupported' && (
        <div className="ai-model-unsupported-bar" role="status">
          <Info size={14} aria-hidden="true" />
          <span>
            WebGPU is not supported or hardware acceleration is disabled in this browser. Running in deterministic local Evidence Preview mode.
          </span>
        </div>
      )}

      {modelStatus === 'error' && (
        <div className="ai-model-error-bar" role="alert">
          <div className="ai-model-error-content">
            <AlertCircle size={15} aria-hidden="true" />
            <span>Model setup failed: {modelError || 'Could not complete download.'}</span>
          </div>
          <div className="ai-model-error-actions">
            <button className="secondary-button" onClick={onStartModelDownload}>
              Retry
            </button>
            <button className="secondary-button" onClick={onUseEvidencePreview}>
              Use Evidence Preview
            </button>
          </div>
        </div>
      )}

      {/* Message Feed */}
      <div className="ai-feed-container" tabIndex={0} aria-live="polite">
        {messages.length === 0 ? (
          <div className="ai-empty-welcome">
            <div className="ai-welcome-badge">
              <BookOpen size={28} aria-hidden="true" />
            </div>
            <h4>Ask questions about your documents</h4>
            <p>
              {modelStatus === 'ready'
                ? 'Ask questions to receive answers synthesized on-device from relevant passages in your library. Every statement links back to exact page and paragraph citations.'
                : 'Ask questions to retrieve matching passages from your library. Results display exact source text and citation locators—no data leaves your machine.'}
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
                      {msg.sender === 'user' ? 'You' : 'DocuMind Assistant'}
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

                  {/* Engine Tag */}
                  {msg.sender === 'assistant' && (
                    <div className="ai-engine-tag-row">
                      {msg.isRealModel ? (
                        <span className="ai-engine-tag ai-engine-tag-model" title="Generated by on-device WebGPU model from retrieved evidence">
                          <Sparkles size={10} aria-hidden="true" /> On-Device Model Answer
                        </span>
                      ) : (
                        <span className="ai-engine-tag ai-engine-tag-preview" title="Deterministic excerpt preview from local keyword search">
                          <FileSearch size={10} aria-hidden="true" /> Local Evidence Preview
                        </span>
                      )}
                    </div>
                  )}

                  {/* Response Text */}
                  <div className="ai-msg-text">
                    <p>{msg.text}</p>
                  </div>

                  {/* Explicit per-excerpt card with exact citation button */}
                  {msg.citations && msg.citations.length > 0 && (
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
                    <span>
                      {modelStatus === 'ready'
                        ? 'Retrieving evidence passages & synthesizing on-device answer…'
                        : 'Retrieving local passages and locating source excerpts…'}
                    </span>
                  </div>
                  <button
                    className="ai-cancel-generation-btn"
                    onClick={onCancelGeneration}
                    title="Stop answer generation"
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
            placeholder={
              modelStatus === 'ready'
                ? 'Ask a question for grounded on-device answer… (Press Enter)'
                : 'Ask a question to find relevant excerpts… (Press Enter)'
            }
            aria-label="Ask a question about your documents"
            disabled={isGenerating}
          />
        </div>
        <button
          type="submit"
          className="primary-button ai-send-btn"
          disabled={!input.trim() || isGenerating}
          aria-label={modelStatus === 'ready' ? 'Generate grounded on-device answer' : 'Retrieve document excerpts'}
        >
          {modelStatus === 'ready' ? (
            <>
              <Sparkles size={16} aria-hidden="true" />
              <span>Ask AI</span>
            </>
          ) : (
            <>
              <Search size={16} aria-hidden="true" />
              <span>Preview Excerpts</span>
            </>
          )}
        </button>
      </form>
    </section>
  )
}

export default AiAssistantView
