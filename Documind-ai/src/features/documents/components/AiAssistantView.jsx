import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  BarChart2,
  BookOpen,
  Check,
  Clock,
  Cloud,
  Copy,
  Cpu,
  FileSearch,
  FileText,
  Info,
  Loader,
  PlusCircle,
  Search,
  Shield,
  Sparkles,
  StopCircle,
  Trash2,
  Zap,
} from 'lucide-react'

import { EMBEDDING_SIZE_DISPLAY } from '../services/embeddings.js'

const SUGGESTED_PROMPTS = [
  'What were the key drivers behind Q3 market growth?',
  'What are the brand typography and color rules?',
  'What feedback did customer interviews reveal?',
  'What is DocuMind\'s core product thesis and vision?',
]

/** Passages the answer cites come first; the rest follow in rank order. */
function orderCitations(msg) {
  const list = msg.citations || []
  if (!Array.isArray(msg.citedIds) || msg.citedIds.length === 0) return list
  const cited = new Set(msg.citedIds)
  return [...list.filter((c) => cited.has(c.id)), ...list.filter((c) => !cited.has(c.id))]
}

function isUncitedPassage(msg, c) {
  return msg.isRealModel && Array.isArray(msg.citedIds) && msg.citedIds.length > 0 && !msg.citedIds.includes(c.id)
}

/**
 * Status and switch for meaning-based search (in-browser sentence embeddings).
 */
function SemanticSearchBar({ semantic }) {
  const { status, progress, indexing, error, enable, disable } = semantic
  return (
    <div className={`ai-semantic-bar is-${status}`} role="status" aria-live="polite">
      <div className="ai-semantic-text">
        <Search size={13} aria-hidden="true" />
        {status === 'off' && (
          <span>
            <strong>Meaning search is off.</strong> Questions only match passages that share their words.
          </span>
        )}
        {status === 'loading' && (
          <span>
            <strong>Loading search model…</strong> {progress?.text || ''}
          </span>
        )}
        {status === 'ready' && (
          <span>
            <strong>Meaning search is on.</strong>{' '}
            {indexing
              ? `Indexing passages ${indexing.done} of ${indexing.total}…`
              : 'Questions also find passages that say the same thing in other words.'}
          </span>
        )}
        {status === 'error' && (
          <span>
            <strong>Meaning search failed to load.</strong> {error}
          </span>
        )}
      </div>
      {status === 'off' || status === 'error' ? (
        <button className="ai-unload-btn" onClick={enable} title={`Download the ${EMBEDDING_SIZE_DISPLAY} search model once; it runs in your browser`}>
          Turn on ({EMBEDDING_SIZE_DISPLAY})
        </button>
      ) : (
        <button className="ai-unload-btn" onClick={disable}>
          Turn off
        </button>
      )}
    </div>
  )
}

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
 * @param {() => void} [props.onOpenHistory]
 * @param {() => void} [props.onNewChat]
 * @param {boolean} [props.isBackendConnected]
 * @param {'not_configured' | 'unsupported' | 'downloading' | 'ready' | 'error'} [props.modelStatus]
 * @param {{ progress: number, text: string }} [props.modelProgress]
 * @param {string} [props.modelError]
 * @param {() => void} [props.onStartModelDownload]
 * @param {() => void} [props.onCancelModelDownload]
 * @param {() => void} [props.onUnloadModel]
 * @param {() => void} [props.onUseEvidencePreview]
 * @param {Array<any>} [props.models] - On-device model choices.
 * @param {string} [props.selectedModelId]
 * @param {(id: string) => void} [props.onSelectModel]
 * @param {string} [props.activeModelName]
 * @param {Object} [props.semantic] - Meaning-search index state from useSemanticIndex.
 */
function AiAssistantView({
  messages,
  isGenerating,
  onAskQuestion,
  onCancelGeneration,
  onClearChat,
  onInspectCitation,
  onOpenHistory,
  onNewChat,
  isBackendConnected = false,
  modelStatus = 'not_configured',
  modelProgress = { progress: 0, text: '' },
  modelError = '',
  onStartModelDownload,
  onCancelModelDownload,
  onUnloadModel,
  onUseEvidencePreview,
  models = [],
  selectedModelId,
  onSelectModel,
  activeModelName = 'On-device model',
  semantic = null,
}) {
  const selectedModel = models.find((m) => m.id === selectedModelId) || models[0]
  const streamingActive = messages.some((m) => m.streaming)
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
                ? 'Answers written on your GPU from the retrieved passages, with every sentence cited.'
                : 'Retrieval runs in your browser and shows the exact passages with their sources.'}
            </p>
          </div>
        </div>

        <div className="ai-header-controls">
          {onOpenHistory && (
            <button
              className="ai-clear-btn"
              onClick={onOpenHistory}
              title="Open saved conversation history"
              aria-label="Open saved conversation history"
            >
              <Clock size={13} aria-hidden="true" />
              <span>History</span>
            </button>
          )}
          {messages.length > 0 && onNewChat && (
            <button
              className="ai-clear-btn"
              onClick={onNewChat}
              title="Start a new conversation"
              aria-label="Start a new conversation"
            >
              <PlusCircle size={13} aria-hidden="true" />
              <span>New</span>
            </button>
          )}
          <span
            className="ai-model-tag"
            title={
              isBackendConnected
                ? 'Server connected: hybrid vector and BM25 retrieval active.'
                : 'Runs purely in-browser. Zero file bytes, text excerpts, or questions leave your machine.'
            }
          >
            {isBackendConnected ? (
              <>
                <Sparkles size={12} aria-hidden="true" /> Backend Intelligence Connected
              </>
            ) : modelStatus === 'ready' ? (
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
              <h4>Set up an on-device model</h4>
              <p>
                The model writes a short cited answer from the retrieved passages. Weights download once and are cached for offline use; your documents and questions never leave the browser.
              </p>
            </div>
          </div>
          {models.length > 0 && (
            <fieldset className="ai-model-picker">
              <legend className="sr-only">Choose a model</legend>
              {models.map((m) => (
                <label key={m.id} className={`ai-model-option ${m.id === selectedModel?.id ? 'is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="ai-model"
                    value={m.id}
                    checked={m.id === selectedModel?.id}
                    onChange={() => onSelectModel?.(m.id)}
                  />
                  <span className="ai-model-option-body">
                    <span className="ai-model-option-head">
                      <strong>{m.name}</strong>
                      {m.tier === 'recommended' && <span className="ai-model-option-tag">Recommended</span>}
                      {m.tier === 'best' && <span className="ai-model-option-tag">Best quality</span>}
                    </span>
                    <span className="ai-model-option-specs">{m.sizeDisplay} download · {m.vramRequirement}</span>
                    <span className="ai-model-option-note">{m.strengths}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          <div className="ai-model-setup-actions">
            <button
              className="primary-button ai-setup-btn"
              onClick={() => onStartModelDownload?.(selectedModel?.id)}
            >
              <Sparkles size={14} aria-hidden="true" /> Set up {selectedModel?.name || 'model'} ({selectedModel?.sizeDisplay || ''})
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
              style={{ transform: `scaleX(${Math.min(1, Math.max(0, modelProgress?.progress || 0))})` }}
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
              <strong>On-device model:</strong> {activeModelName} (WebGPU)
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
            <button className="secondary-button" onClick={() => onStartModelDownload?.(selectedModel?.id)}>
              Retry
            </button>
            <button className="secondary-button" onClick={onUseEvidencePreview}>
              Use Evidence Preview
            </button>
          </div>
        </div>
      )}

      {semantic && <SemanticSearchBar semantic={semantic} />}

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
                      {msg.isBackendGrounded ? (
                        <span className="ai-engine-tag ai-engine-tag-backend" title="Grounded hybrid retrieval and answer synthesis via FastAPI + Qdrant">
                          <Cloud size={10} aria-hidden="true" /> Backend Grounded QA
                        </span>
                      ) : msg.isRealModel ? (
                        <span className="ai-engine-tag ai-engine-tag-model" title="Generated by on-device WebGPU model from retrieved evidence">
                          <Sparkles size={10} aria-hidden="true" /> On-Device Model Answer
                        </span>
                      ) : (
                        <span className="ai-engine-tag ai-engine-tag-preview" title="Deterministic excerpt preview from local keyword search">
                          <FileSearch size={10} aria-hidden="true" /> Local Evidence Preview
                        </span>
                      )}
                      {!msg.isBackendGrounded && (
                        <span
                          className="ai-engine-tag ai-engine-tag-rerank"
                          title={msg.retrieval === 'hybrid'
                            ? 'Passages ranked by keyword match and by meaning, merged with reciprocal rank fusion'
                            : 'Passages ranked by keyword match'}
                        >
                          <Search size={10} aria-hidden="true" />
                          {msg.retrieval === 'hybrid' ? 'Keyword + meaning search' : 'Keyword search'}
                        </span>
                      )}
                      {msg.isRealModel && msg.modelName && (
                        <span className="ai-engine-tag" title="Model that wrote this answer">
                          <Cpu size={10} aria-hidden="true" /> {msg.modelName}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Response Text */}
                  <div className="ai-msg-text">
                    <p>
                      {msg.text}
                      {msg.streaming && <span className="ai-stream-caret" aria-hidden="true" />}
                    </p>
                  </div>

                  {msg.uncited && !msg.streaming && (
                    <div className="ai-uncited-warning" role="note">
                      <AlertCircle size={13} aria-hidden="true" />
                      <span>This answer has no valid citations, so it cannot be traced to a passage. Check it against the passages below.</span>
                    </div>
                  )}

                  {/* Explicit per-excerpt card with exact citation button */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="ai-excerpts-container">
                      {orderCitations(msg).map((c) => (
                        <article
                          key={c.id}
                          className={`ai-excerpt-card ${isUncitedPassage(msg, c) ? 'is-uncited' : ''}`}
                        >
                          <div className="ai-excerpt-header">
                            <button
                              className="ai-citation-chip"
                              onClick={() => onInspectCitation(c.docId || c.document_id, c.chunkIndex ?? 0)}
                              title={`Open ${c.docName || c.document_name || 'document'} at ${c.locator || 'source'} in reader`}
                            >
                              <span className="citation-num">[{c.id}]</span>
                              <span className="citation-doc">{c.docName || c.document_name || 'Document'}</span>
                              <span className="citation-loc">
                                <FileText size={10} style={{ display: 'inline', marginRight: 3 }} />
                                {c.locator}
                              </span>
                              {isUncitedPassage(msg, c) && (
                                <span className="citation-rerank-tag" title="Sent to the model but not cited in the answer">
                                  not cited
                                </span>
                              )}
                              <ArrowUpRight size={12} aria-hidden="true" />
                            </button>
                          </div>
                          <blockquote className="ai-excerpt-quote">
                            "{(c.text || c.excerpt || '').trim()}"
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

            {isGenerating && !streamingActive && (
              <div className="ai-message-row msg-assistant">
                <div className="ai-message-bubble ai-generating-bubble">
                  <div className="ai-generating-content">
                    <Loader size={16} className="spin-icon" aria-hidden="true" />
                    <span>
                      {modelStatus === 'ready'
                        ? 'Finding passages and starting the on-device answer…'
                        : 'Finding matching passages…'}
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
