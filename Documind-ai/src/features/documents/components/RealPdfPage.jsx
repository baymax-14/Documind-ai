import { useEffect, useRef, useState } from 'react'
import { bboxToStyle } from '../services/visualGrounding.js'

/** Cancel a pdf.js render; its promise then rejects, which is expected and ignored. */
function cancelRender(task) {
  task?.promise?.catch(() => {})
  task?.cancel?.()
}

/**
 * One real PDF page drawn on a canvas, with the marked passage framed at the
 * position its text occupies on the page.
 *
 * @param {Object} props
 * @param {import('pdfjs-dist').PDFDocumentProxy} props.pdf
 * @param {(pdf: any, page: number, canvas: HTMLCanvasElement, width: number) => Promise<any>} props.render
 * @param {number} props.pageNumber
 * @param {number} props.width - CSS width in pixels.
 * @param {Array<{ index: number, bbox?: object, locator?: string }>} props.chunks - Passages on this page.
 * @param {number} [props.markedChunkIndex]
 * @param {string} [props.markedLabel]
 * @param {string} props.docName
 */
export default function RealPdfPage({ pdf, render, pageNumber, width, chunks, markedChunkIndex, markedLabel, docName }) {
  const canvasRef = useRef(null)
  const [state, setState] = useState('loading')

  useEffect(() => {
    let task = null
    let cancelled = false
    setState('loading')
    ;(async () => {
      try {
        task = await render(pdf, pageNumber, canvasRef.current, width)
        if (cancelled) {
          cancelRender(task)
          return
        }
        await task.promise
        if (!cancelled) setState('ready')
      } catch (err) {
        if (!cancelled && err?.name !== 'RenderingCancelledException') setState('failed')
      }
    })()
    return () => {
      cancelled = true
      cancelRender(task)
    }
  }, [pdf, render, pageNumber, width])

  const marked = chunks.find((c) => c.index === markedChunkIndex && c.bbox)

  return (
    <div className={`real-page is-${state}`}>
      <canvas
        ref={canvasRef}
        className="real-page-canvas"
        role="img"
        aria-label={`${docName}, page ${pageNumber}`}
      />
      {state === 'loading' && <span className="real-page-status" role="status">Drawing page {pageNumber}…</span>}
      {state === 'failed' && <span className="real-page-status">This page could not be drawn. Its text is below.</span>}
      {state === 'ready' && marked && (
        <div className="real-page-mark" style={bboxToStyle(marked.bbox)}>
          <span className="real-page-mark-label">{markedLabel}</span>
        </div>
      )}
    </div>
  )
}

/**
 * A small page thumbnail, drawn only once it scrolls into view.
 */
export function RealPdfThumb({ pdf, render, pageNumber }) {
  const canvasRef = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = canvasRef.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return undefined
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setVisible(true)
        io.disconnect()
      }
    }, { rootMargin: '200px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return undefined
    let task = null
    let cancelled = false
    ;(async () => {
      try {
        task = await render(pdf, pageNumber, canvasRef.current, 72)
        if (cancelled) cancelRender(task)
        else await task.promise
      } catch {
        // A thumbnail that fails to draw stays blank; the page itself still opens
      }
    })()
    return () => {
      cancelled = true
      cancelRender(task)
    }
  }, [visible, pdf, render, pageNumber])

  return <canvas ref={canvasRef} className="real-thumb-canvas" aria-hidden="true" />
}
