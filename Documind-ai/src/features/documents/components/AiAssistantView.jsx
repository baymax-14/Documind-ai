import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock,
  Cloud,
  Copy,
  Cpu,
  FileSearch,
  FileText,
  Loader,
  PlusCircle,
  Search,
  Sparkles,
  StopCircle,
  Trash2,
} from 'lucide-react'

import { EMBEDDING_SIZE_DISPLAY } from '../services/embeddings.js'
import ReadableText from './ReadableText.jsx'
import { gsap, useGSAP, prefersReducedMotion } from '../../../gsap.js'
import { SAMPLE_PROMPTS } from '../data/samplePrompts.js'

const SUGGESTED_PROMPTS = SAMPLE_PROMPTS

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

/** A passages-only answer: the excerpt cards are the answer, so the text is just a count. */
function isPassageListAnswer(msg) {
  return msg.sender === 'assistant' && !msg.isRealModel && !msg.isBackendGrounded &&
    msg.hasEvidence !== false && (msg.citations?.length || 0) > 0
}

/**
 * One compact strip that says how answers are produced and how passages are
 * found, with the single action each row needs. The model picker opens from
 * here on request instead of sitting above the conversation.
 */
function AnswerSetupStrip({
  isBackendConnected,
  modelStatus,
  modelProgress,
  modelError,
  activeModelName,
  models,
  selectedModel,
  onSelectModel,
  onStartModelDownload,
  onCancelModelDownload,
  onUnloadModel,
  semantic,
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  // Setting up a model also switches on meaning search when it is off (Workspace)
  const alsoMeaningSearch = semantic?.status === 'off'
  const pct = Math.round((modelProgress?.progress || 0) * 100)

  function startSetup() {
    setPickerOpen(false)
    onStartModelDownload?.(selectedModel?.id)
  }

  let answerValue
  let answerAction = null
  if (isBackendConnected) {
    answerValue = 'Written by the connected server from its indexed passages'
  } else if (modelStatus === 'ready') {
    answerValue = `Written by ${activeModelName} on your GPU, with every sentence cited`
    answerAction = (
      <button type="button" className="ai-strip-btn" onClick={onUnloadModel}>
        Unload model
      </button>
    )
  } else if (modelStatus === 'downloading') {
    answerValue = `Setting up ${selectedModel?.name || 'the model'}: ${pct}%`
    answerAction = (
      <button type="button" className="ai-strip-btn" onClick={onCancelModelDownload}>
        Cancel
      </button>
    )
  } else if (modelStatus === 'error') {
    answerValue = `Model setup failed: ${modelError || 'the download did not finish'}. Showing matching passages instead.`
    answerAction = (
      <>
        <button type="button" className="ai-strip-btn" onClick={() => onStartModelDownload?.(selectedModel?.id)}>
          Retry
        </button>
        <button
          type="button"
          className="ai-strip-btn"
          aria-expanded={pickerOpen}
          aria-controls="ai-model-picker"
          onClick={() => setPickerOpen((o) => !o)}
        >
          {pickerOpen ? 'Close' : 'Choose another'}
        </button>
      </>
    )
  } else if (modelStatus === 'unsupported') {
    answerValue = 'Matching passages, quoted with their sources. Written answers need WebGPU, which this browser does not have.'
  } else {
    answerValue = 'Matching passages, quoted with their sources'
    answerAction = (
      <button
        type="button"
        className="ai-strip-btn"
        aria-expanded={pickerOpen}
        aria-controls="ai-model-picker"
        onClick={() => setPickerOpen((o) => !o)}
      >
        {pickerOpen ? 'Close' : 'Get written answers'}
      </button>
    )
  }

  let searchValue = null
  let searchAction = null
  if (semantic) {
    const { status, progress, indexing, error, enable, disable } = semantic
    if (status === 'off') {
      searchValue = 'Keywords only: a passage must share words with the question'
      searchAction = (
        <button type="button" className="ai-strip-btn" onClick={enable}>
          Add meaning search ({EMBEDDING_SIZE_DISPLAY})
        </button>
      )
    } else if (status === 'loading') {
      searchValue = progress?.text || 'Loading the search model…'
    } else if (status === 'ready') {
      searchValue = indexing
        ? `Keywords and meaning. Indexing passages ${indexing.done} of ${indexing.total}…`
        : 'Keywords and meaning: also finds passages worded differently'
      searchAction = (
        <button type="button" className="ai-strip-btn" onClick={disable}>
          Turn off
        </button>
      )
    } else if (status === 'error') {
      searchValue = `Meaning search did not load: ${error || 'unknown error'}. Using keywords only.`
      searchAction = (
        <button type="button" className="ai-strip-btn" onClick={enable}>
          Retry
        </button>
      )
    }
  }

  return (
    <div className="ai-setup-strip" role="region" aria-label="How answers are produced">
      <div className="ai-strip-row" aria-live="polite">
        <span className="ai-strip-label">Answers</span>
        <span className={`ai-strip-value ${modelStatus === 'error' ? 'is-error' : ''}`}>
          {modelStatus === 'ready' && !isBackendConnected && <span className="ai-active-dot" aria-hidden="true" />}
          {answerValue}
        </span>
        {answerAction && <span className="ai-strip-actions">{answerAction}</span>}
      </div>

      {modelStatus === 'downloading' && (
        <div className="ai-strip-progress">
          <div
            className="ai-progress-track"
            role="progressbar"
            aria-label="Model download"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
          >
            <div
              className="ai-progress-fill"
              style={{ transform: `scaleX(${Math.min(1, Math.max(0, modelProgress?.progress || 0))})` }}
            />
          </div>
          <span className="ai-download-step">{modelProgress?.text || 'Downloading weights…'}</span>
        </div>
      )}

      {pickerOpen && models.length > 0 && (
        <div className="ai-model-picker-panel" id="ai-model-picker">
          <p className="ai-picker-intro">
            A model reads the matching passages and writes a short answer that cites them. It downloads once and then runs offline; your documents and questions stay in this browser.
            {alsoMeaningSearch && ` Setting it up also turns on meaning search, a further ${EMBEDDING_SIZE_DISPLAY} download, so the model gets passages worded differently from your question.`}
          </p>
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
                  <span className="ai-model-option-specs">{m.sizeDisplay} download · needs {m.memoryDisplay} of graphics memory</span>
                  <span className="ai-model-option-note">{m.strengths}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <div className="ai-picker-actions">
            <button type="button" className="primary-button ai-setup-btn" onClick={startSetup}>
              Download {selectedModel?.name || 'model'} ({selectedModel?.sizeDisplay || ''}{alsoMeaningSearch ? ` + ${EMBEDDING_SIZE_DISPLAY}` : ''})
            </button>
            <button type="button" className="ai-strip-btn" onClick={() => setPickerOpen(false)}>
              Not now
            </button>
          </div>
        </div>
      )}

      {searchValue && (
        <div className="ai-strip-row" aria-live="polite">
          <span className="ai-strip-label">Search</span>
          <span className={`ai-strip-value ${semantic?.status === 'error' ? 'is-error' : ''}`}>{searchValue}</span>
          {searchAction && <span className="ai-strip-actions">{searchAction}</span>}
        </div>
      )}
    </div>
  )
}

/**
 * Asked inline before a question goes to the connected server, the one case
 * where something leaves this browser.
 */
function ServerQuestionPrompt({ pending, onSend, onLocal, onCancel }) {
  const count = pending.chunks?.length || 0
  return (
    <div className="ai-server-prompt" role="group" aria-labelledby="ai-server-prompt-title">
      <p id="ai-server-prompt-title" className="ai-server-prompt-title">Send this question to the connected server?</p>
      <p className="ai-server-prompt-question">{pending.question}</p>
      <p className="ai-server-prompt-note">
        The server searches the documents uploaded to it and writes the answer, so the question leaves this browser.
        {count > 0
          ? ` ${count === 1 ? '1 passage' : `${count} passages`} in this browser also match, if you would rather keep it here.`
          : ' Nothing in this browser matches it.'}
      </p>
      <div className="ai-server-prompt-actions">
        <button type="button" className="primary-button" onClick={onSend}>
          Send to server
        </button>
        <button type="button" className="ai-strip-btn" onClick={onLocal}>
          Answer in this browser
        </button>
        <button type="button" className="ai-strip-btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}

/**
 * Shown in place of an answer when nothing in the library matched.
 */
function NoPassagesFound({ semantic }) {
  const canAddMeaning = semantic && (semantic.status === 'off' || semantic.status === 'error')
  return (
    <div className="ai-no-passages">
      <p className="ai-no-passages-title">No passage in your library matches this question.</p>
      {canAddMeaning ? (
        <>
          <p>Search is matching keywords only. Meaning search also finds passages that say the same thing in other words.</p>
          <button type="button" className="secondary-button ai-no-passages-btn" onClick={semantic.enable}>
            <Search size={14} aria-hidden="true" /> Add meaning search ({EMBEDDING_SIZE_DISPLAY})
          </button>
        </>
      ) : (
        <p>Try the words the document itself would use, or check that the document is in your library.</p>
      )}
    </div>
  )
}

/**
 * Document Evidence & AI Assistant view.
 * Supports both on-device WebGPU model inference and the passages-only preview.
 * Documents, passages and questions stay in the browser.
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
 * @param {(modelId?: string) => void} [props.onStartModelDownload]
 * @param {() => void} [props.onCancelModelDownload]
 * @param {() => void} [props.onUnloadModel]
 * @param {Array<any>} [props.models] - On-device model choices.
 * @param {string} [props.selectedModelId]
 * @param {(id: string) => void} [props.onSelectModel]
 * @param {string} [props.activeModelName]
 * @param {Object} [props.semantic] - Meaning-search index state from useSemanticIndex.
 * @param {{ question: string, chunks: Array<any> } | null} [props.pendingServerQuestion]
 * @param {() => void} [props.onSendToServer]
 * @param {() => void} [props.onAnswerLocally]
 * @param {() => void} [props.onCancelServerQuestion]
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
  models = [],
  selectedModelId,
  onSelectModel,
  activeModelName = 'On-device model',
  semantic = null,
  pendingServerQuestion = null,
  onSendToServer,
  onAnswerLocally,
  onCancelServerQuestion,
}) {
  const selectedModel = models.find((m) => m.id === selectedModelId) || models[0]
  const streamingActive = messages.some((m) => m.streaming)
  const writesAnswers = modelStatus === 'ready' || isBackendConnected
  const [input, setInput] = useState('')
  const [copiedIndex, setCopiedIndex] = useState(null)
  const chatEndRef = useRef(null)
  const feedRef = useRef(null)
  // Answers already on screen when the panel opened (from history) never animate
  const seenAnswers = useRef(new Set(messages.map((m) => m.id)))
  const latestAnswer = [...messages].reverse().find((m) => m.sender === 'assistant' && !m.streaming)

  // A new answer arrives: its passages come in as a short list, in rank order,
  // so the eye reads them top to bottom. Kept under 300ms in total.
  useGSAP(() => {
    const id = latestAnswer?.id
    if (!id || seenAnswers.current.has(id)) return
    seenAnswers.current.add(id)
    const row = feedRef.current?.querySelector(`[data-msg-id="${CSS.escape(String(id))}"]`)
    if (!row) return
    const parts = row.querySelectorAll('.ai-passage-count, .ai-no-passages, .ai-excerpt-card')
    if (!parts.length) return
    const still = prefersReducedMotion()
    gsap.from(parts, {
      opacity: 0,
      y: still ? 0 : 6,
      duration: 0.2,
      stagger: Math.min(0.04, 0.12 / parts.length),
      ease: 'power2.out',
      clearProps: 'opacity,transform',
    })
  }, { dependencies: [latestAnswer?.id], scope: feedRef })
  const inputRef = useRef(null)

  // Keep the newest message in view inside the feed
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
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

  /**
   * What the copy button puts on the clipboard: the answer, plus every passage it
   * was given with its source, so the [n] markers still point somewhere once pasted.
   * A passages-only answer's text already quotes its passages.
   */
  function textToCopy(msg) {
    const sources = msg.citations || []
    if (!sources.length || isPassageListAnswer(msg) || msg.hasEvidence === false) return msg.text
    const list = sources
      .map((c) => `[${c.id}] ${c.docName || c.document_name || 'Document'}, ${c.locator || 'source'}:\n"${(c.text || c.excerpt || '').trim()}"`)
      .join('\n\n')
    return `${msg.text}\n\nSources\n${list}`
  }

  function handleCopy(text, index) {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  return (
    <section className="ai-chat-section" aria-label="Evidence Assistant">
      <header className="ai-chat-header">
        <div className="ai-chat-title">
          <h3>Ask your documents</h3>
        </div>

        {(onOpenHistory || messages.length > 0) && (
          <div className="ai-header-controls">
            {onOpenHistory && (
              <button className="ai-clear-btn" onClick={onOpenHistory}>
                <Clock size={13} aria-hidden="true" />
                <span>History</span>
              </button>
            )}
            {messages.length > 0 && onNewChat && (
              <button className="ai-clear-btn" onClick={onNewChat}>
                <PlusCircle size={13} aria-hidden="true" />
                <span>New</span>
              </button>
            )}
            {messages.length > 0 && (
              <button className="ai-clear-btn" onClick={onClearChat}>
                <Trash2 size={13} aria-hidden="true" />
                <span>Clear</span>
              </button>
            )}
          </div>
        )}
      </header>

      <AnswerSetupStrip
        isBackendConnected={isBackendConnected}
        modelStatus={modelStatus}
        modelProgress={modelProgress}
        modelError={modelError}
        activeModelName={activeModelName}
        models={models}
        selectedModel={selectedModel}
        onSelectModel={onSelectModel}
        onStartModelDownload={onStartModelDownload}
        onCancelModelDownload={onCancelModelDownload}
        onUnloadModel={onUnloadModel}
        semantic={semantic}
      />

      {/* The question comes first */}
      <form className="ai-chat-input-bar ai-ask-bar" onSubmit={handleSubmit}>
        <div className="ai-input-wrapper">
          <textarea
            ref={inputRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your documents"
            aria-label="Ask a question about your documents"
          />
        </div>
        <button
          type="submit"
          className="primary-button ai-send-btn"
          disabled={!input.trim() || isGenerating}
        >
          {writesAnswers ? (
            <>
              <Sparkles size={16} aria-hidden="true" />
              <span>Ask</span>
            </>
          ) : (
            <>
              <Search size={16} aria-hidden="true" />
              <span>Find passages</span>
            </>
          )}
        </button>
      </form>

      {pendingServerQuestion && (
        <ServerQuestionPrompt
          pending={pendingServerQuestion}
          onSend={onSendToServer}
          onLocal={onAnswerLocally}
          onCancel={onCancelServerQuestion}
        />
      )}

      {messages.length === 0 && !isGenerating ? (
        <div className="ai-suggested-prompts">
          <span className="ai-suggested-label">Try one of these</span>
          <div className="ai-prompts-grid">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="ai-prompt-chip"
                onClick={() => {
                  setInput(prompt)
                  inputRef.current?.focus()
                }}
              >
                <span>{prompt}</span>
                <ArrowRight size={13} aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="ai-feed-container"
          ref={feedRef}
          tabIndex={0}
          aria-live="polite"
          aria-busy={isGenerating}
          aria-label="Conversation"
        >
          <div className="ai-messages-list">
            {messages.map((msg, idx) => (
              <article
                key={msg.id || idx}
                data-msg-id={msg.id}
                className={`ai-message-row ${msg.sender === 'user' ? 'msg-user' : 'msg-assistant'}`}
              >
                <div className="ai-message-bubble">
                  <div className="ai-msg-meta">
                    <span className="ai-sender-name">
                      {msg.sender === 'user' ? 'You' : 'DocuMind'}
                    </span>
                    {msg.sender === 'assistant' && (
                      <button
                        className="ai-copy-btn"
                        onClick={() => handleCopy(textToCopy(msg), idx)}
                        aria-label={copiedIndex === idx ? 'Copied' : 'Copy answer with its passages'}
                        title="Copy answer with its passages"
                      >
                        {copiedIndex === idx ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    )}
                  </div>

                  {/* How this answer was produced */}
                  {msg.sender === 'assistant' && msg.hasEvidence !== false && (
                    <div className="ai-engine-tag-row">
                      {msg.isBackendGrounded ? (
                        <span className="ai-engine-tag ai-engine-tag-backend">
                          <Cloud size={10} aria-hidden="true" /> Server answer
                        </span>
                      ) : msg.isRealModel ? (
                        <span className="ai-engine-tag ai-engine-tag-model">
                          <Cpu size={10} aria-hidden="true" /> {msg.modelName || 'On-device model'}
                        </span>
                      ) : (
                        <span className="ai-engine-tag ai-engine-tag-preview">
                          <FileSearch size={10} aria-hidden="true" /> Passages only
                        </span>
                      )}
                      {!msg.isBackendGrounded && (
                        <span className="ai-engine-tag ai-engine-tag-rerank">
                          <Search size={10} aria-hidden="true" />
                          {msg.retrieval === 'hybrid' ? 'Keyword + meaning search' : 'Keyword search'}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Response text */}
                  {msg.sender === 'assistant' && msg.hasEvidence === false && !msg.isRealModel && !msg.isBackendGrounded ? (
                    <NoPassagesFound semantic={semantic} />
                  ) : isPassageListAnswer(msg) ? (
                    <p className="ai-passage-count">
                      {msg.citations.length === 1
                        ? '1 matching passage, quoted below with its source.'
                        : `${msg.citations.length} matching passages, quoted below with their sources.`}
                    </p>
                  ) : (
                    <div className="ai-msg-text">
                      <p>
                        {msg.text}
                        {msg.streaming && <span className="ai-stream-caret" aria-hidden="true" />}
                      </p>
                    </div>
                  )}

                  {msg.streaming && (
                    <button className="ai-cancel-generation-btn ai-stream-stop" onClick={onCancelGeneration}>
                      <StopCircle size={14} aria-hidden="true" /> Stop
                    </button>
                  )}

                  {msg.uncited && !msg.streaming && (
                    <div className="ai-uncited-warning" role="note">
                      <AlertCircle size={13} aria-hidden="true" />
                      <span>This answer has no valid citations, so it cannot be traced to a passage. Check it against the passages below.</span>
                    </div>
                  )}

                  {/* One card per passage, each opening the source */}
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
                              aria-label={`Passage ${c.id}: open ${c.docName || c.document_name || 'document'} at ${c.locator || 'this passage'}`}
                            >
                              <span className="citation-num">[{c.id}]</span>
                              <span className="citation-doc">{c.docName || c.document_name || 'Document'}</span>
                              <span className="citation-loc">
                                <FileText size={10} aria-hidden="true" />
                                {c.locator}
                              </span>
                              {isUncitedPassage(msg, c) && (
                                <span className="citation-rerank-tag">
                                  not cited
                                </span>
                              )}
                              <ArrowUpRight size={12} aria-hidden="true" />
                            </button>
                          </div>
                          <blockquote className="ai-excerpt-quote">
                            <ReadableText text={(c.text || c.excerpt || '').trim()} />
                          </blockquote>
                        </article>
                      ))}
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
                      {writesAnswers ? 'Finding passages and writing the answer…' : 'Finding matching passages…'}
                    </span>
                  </div>
                  <button className="ai-cancel-generation-btn" onClick={onCancelGeneration}>
                    <StopCircle size={14} aria-hidden="true" /> Stop
                  </button>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>
      )}
    </section>
  )
}

export default AiAssistantView
