import { useEffect, useRef, useState } from 'react'
import {
  Clock,
  MessageSquare,
  PlusCircle,
  Trash2,
  X,
} from 'lucide-react'
import {
  listConversations,
  deleteConversation,
  clearAllConversations,
} from '../services/conversationStore.js'

function formatRelativeTime(timestamp) {
  if (!timestamp) return 'Just now'
  const diffSec = Math.floor((Date.now() - timestamp) / 1000)
  if (diffSec < 60) return 'Just now'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  const days = Math.floor(diffSec / 86400)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

/**
 * Conversation History Modal.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {string|null} props.activeConversationId
 * @param {(conversation: import('../services/conversationStore.js').ConversationRecord) => void} props.onSelectConversation
 * @param {() => void} props.onNewConversation
 */
export default function ConversationHistoryModal({
  isOpen,
  onClose,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
}) {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(false)
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)

  const modalRef = useRef(null)
  const closeButtonRef = useRef(null)
  const returnFocusRef = useRef(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    listConversations()
      .then((records) => setConversations(records))
      .catch(() => setConversations([]))
      .finally(() => setLoading(false))
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return undefined

    returnFocusRef.current = document.activeElement
    closeButtonRef.current?.focus()

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        if (confirmClearOpen) {
          setConfirmClearOpen(false)
          return
        }
        onCloseRef.current()
        return
      }

      if (e.key !== 'Tab') return
      const focusable = modalRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable?.length) {
        e.preventDefault()
        modalRef.current?.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      returnFocusRef.current?.focus?.()
    }
  }, [isOpen, confirmClearOpen])

  async function handleDelete(id, e) {
    e.stopPropagation()
    await deleteConversation(id)
    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (id === activeConversationId) {
      onNewConversation()
    }
  }

  async function handleClearAll() {
    await clearAllConversations()
    setConversations([])
    setConfirmClearOpen(false)
    onNewConversation()
  }

  if (!isOpen) return null

  return (
    <div
      className="confirm-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-modal-title"
      onClick={() => onClose()}
    >
      <div
        ref={modalRef}
        className="conversation-history-modal"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hardware-modal-header">
          <div className="hardware-modal-title-wrap">
            <span className="prototype-icon" aria-hidden="true">
              <MessageSquare size={18} />
            </span>
            <div>
              <h3 id="history-modal-title">Conversation History</h3>
              <p>Saved in this browser</p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="doc-action-button"
            onClick={onClose}
            aria-label="Close conversation history"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="hardware-modal-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                onNewConversation()
                onClose()
              }}
              style={{ fontSize: '0.8125rem', padding: '6px 12px' }}
            >
              <PlusCircle size={14} aria-hidden="true" /> New Chat
            </button>
            {conversations.length > 0 && !confirmClearOpen && (
              <button
                type="button"
                className="clear-library-btn"
                onClick={() => setConfirmClearOpen(true)}
              >
                <Trash2 size={13} aria-hidden="true" /> Clear all
              </button>
            )}
          </div>

          {confirmClearOpen && (
            <div className="conv-confirm-box">
              <p style={{ margin: '0 0 8px 0', fontSize: '0.875rem', fontWeight: 600 }}>
                Delete all saved conversations?
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="primary-button confirm-danger-btn"
                  onClick={handleClearAll}
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                >
                  Yes, clear all
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setConfirmClearOpen(false)}
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <p style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)' }}>Loading history…</p>
          ) : conversations.length === 0 ? (
            <div className="conv-empty-state">
              <Clock size={32} />
              <p>No saved conversations yet</p>
              <span>Ask questions in Evidence Assistant to automatically persist sessions.</span>
              <div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button
                  type="button"
                  className="primary-button"
                  style={{ fontSize: 13, padding: '6px 14px' }}
                  onClick={() => {
                    onNewConversation()
                    onClose()
                  }}
                >
                  <PlusCircle size={14} aria-hidden="true" /> Start New Chat
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {conversations.map((conv) => {
                const isActive = conv.id === activeConversationId
                return (
                  <div
                    key={conv.id}
                    className={`conv-history-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      onSelectConversation(conv)
                      onClose()
                    }}
                  >
                    <div className="conv-history-item-info">
                      <h4 title={conv.title}>
                        {conv.title}
                      </h4>
                      <p>
                        {conv.messageCount || conv.messages?.length || 0} messages · {formatRelativeTime(conv.updatedAt)}
                        {isActive && <span className="conv-active-badge">Current</span>}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="doc-action-button"
                      onClick={(e) => handleDelete(conv.id, e)}
                      aria-label={`Delete conversation ${conv.title}`}
                      title="Delete conversation"
                      style={{ flexShrink: 0 }}
                    >
                      <Trash2 size={13} aria-hidden="true" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="hardware-modal-footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
