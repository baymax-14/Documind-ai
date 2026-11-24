import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Open overlays, newest last. Only the newest one reacts to Esc and Tab. */
const stack = []

/**
 * Where the most recently closed overlay sent focus back to. When one dialog
 * opens another and closes itself in the same step (Storage → Token details),
 * the button that opened the second dialog is gone, so the second dialog
 * inherits the first one's return target instead of losing focus to the page.
 */
let lastClosed = null

function isFocusable(el) {
  return Boolean(el && el !== document.body && el.isConnected && typeof el.focus === 'function')
}

/**
 * Shared behaviour for every dialog in the workspace:
 * - moves focus into the dialog when it opens (its container by default, so a
 *   screen reader announces the dialog's name first);
 * - keeps Tab and Shift+Tab inside it;
 * - Esc closes only the topmost dialog, not every open one;
 * - returns focus to whatever opened it when it closes.
 *
 * @param {Object} opts
 * @param {boolean} opts.active - Whether the dialog is open.
 * @param {import('react').RefObject<HTMLElement>} opts.containerRef - The dialog element.
 * @param {() => void} opts.onClose - Called on Esc.
 * @param {import('react').RefObject<HTMLElement>} [opts.initialFocusRef] - Element to focus first.
 */
export function useOverlay({ active, containerRef, onClose, initialFocusRef }) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!active) return undefined

    const token = {}
    stack.push(token)
    let returnTo = document.activeElement
    if (!isFocusable(returnTo) && lastClosed && Date.now() - lastClosed.at < 1000) {
      returnTo = lastClosed.returnTo
    }

    // Focus after paint so the dialog's content exists
    const focusTimer = setTimeout(() => {
      const target = initialFocusRef?.current || containerRef.current
      if (target && !target.contains(document.activeElement)) {
        if (target === containerRef.current && !target.hasAttribute('tabindex')) {
          target.setAttribute('tabindex', '-1')
        }
        target.focus({ preventScroll: true })
      }
    }, 0)

    function handleKeyDown(e) {
      if (stack[stack.length - 1] !== token) return
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onCloseRef.current?.()
        return
      }
      if (e.key !== 'Tab') return
      const root = containerRef.current
      if (!root) return
      const focusable = [...root.querySelectorAll(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      )
      if (focusable.length === 0) {
        e.preventDefault()
        root.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const inside = root.contains(document.activeElement)
      if (e.shiftKey && (document.activeElement === first || document.activeElement === root || !inside)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault()
        first.focus()
      }
    }

    // Capture phase on the document runs before the page's own window listeners
    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKeyDown, true)
      const i = stack.indexOf(token)
      if (i !== -1) stack.splice(i, 1)
      lastClosed = { returnTo, at: Date.now() }
      // Return focus once the dialog has left the page
      setTimeout(() => {
        if (isFocusable(returnTo)) returnTo.focus({ preventScroll: true })
      }, 0)
    }
    // containerRef and initialFocusRef are stable refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])
}
