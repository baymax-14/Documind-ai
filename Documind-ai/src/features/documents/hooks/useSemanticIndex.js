import { useCallback, useEffect, useRef, useState } from 'react'
import { EMBEDDING_MODEL, QUERY_PREFIX, passageEmbeddingText } from '../services/embeddings.js'
import { saveDocumentVectors } from '../services/storage.js'

const PREF_KEY = 'documind_semantic_search'
const BATCH_SIZE = 16

function readPref() {
  try {
    return localStorage.getItem(PREF_KEY) === 'on'
  } catch {
    return false
  }
}

function writePref(on) {
  try {
    if (on) localStorage.setItem(PREF_KEY, 'on')
    else localStorage.removeItem(PREF_KEY)
  } catch {
    // Storage blocked: the setting just won't be remembered.
  }
}

/**
 * Meaning-based search index for the library.
 *
 * Runs the embedding model in a Web Worker, embeds every passage of every ready
 * document once, keeps the vectors in memory and stores them with saved
 * documents in IndexedDB so they are not recomputed on the next visit.
 *
 * @param {Array<any>} documents - Library documents.
 * @returns {{
 *   status: 'off' | 'loading' | 'ready' | 'error',
 *   progress: { progress: number, text: string } | null,
 *   indexing: { done: number, total: number } | null,
 *   error: string,
 *   enable: () => void,
 *   disable: () => void,
 *   embedQuery: (q: string) => Promise<Float32Array | null>,
 *   vectorsFor: (docId: string) => any,
 *   version: number,
 * }}
 */
export function useSemanticIndex(documents) {
  const [status, setStatus] = useState('off')
  const [progress, setProgress] = useState(null)
  const [indexing, setIndexing] = useState(null)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)

  const workerRef = useRef(null)
  const pendingRef = useRef(new Map())
  const vectorsRef = useRef(new Map())
  const seqRef = useRef(0)
  const runningRef = useRef(false)
  const failedRef = useRef(new Set())

  // Vectors saved with documents in IndexedDB are reused as-is.
  useEffect(() => {
    let added = false
    for (const doc of documents) {
      const v = doc?.vectors
      if (v && v.model === EMBEDDING_MODEL && !vectorsRef.current.has(doc.id) && v.count === doc.chunks?.length) {
        vectorsRef.current.set(doc.id, v)
        added = true
      }
    }
    if (added) setVersion((n) => n + 1)
  }, [documents])

  const ensureWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current
    const worker = new Worker(new URL('../services/embedWorker.js', import.meta.url), { type: 'module' })
    worker.onmessage = (event) => {
      const msg = event.data || {}
      if (msg.type === 'progress') {
        setProgress({ progress: msg.progress, text: msg.text })
        return
      }
      const pending = pendingRef.current.get(msg.id)
      if (!pending) return
      pendingRef.current.delete(msg.id)
      if (msg.type === 'error') pending.reject(new Error(msg.message))
      else pending.resolve(msg)
    }
    worker.onerror = (event) => {
      const err = new Error(event.message || 'The search model worker stopped.')
      for (const p of pendingRef.current.values()) p.reject(err)
      pendingRef.current.clear()
      setStatus('error')
      setError(err.message)
    }
    workerRef.current = worker
    return worker
  }, [])

  const request = useCallback((payload) => {
    const worker = ensureWorker()
    const id = ++seqRef.current
    return new Promise((resolve, reject) => {
      pendingRef.current.set(id, { resolve, reject })
      worker.postMessage({ ...payload, id })
    })
  }, [ensureWorker])

  const embed = useCallback(async (texts) => {
    const res = await request({ type: 'embed', texts })
    return { data: res.data, dim: res.dim }
  }, [request])

  const enable = useCallback(async () => {
    writePref(true)
    setError('')
    setStatus('loading')
    setProgress({ progress: 0, text: 'Loading search model…' })
    try {
      await request({ type: 'load' })
      setProgress(null)
      setStatus('ready')
    } catch (err) {
      setStatus('error')
      setError(err.message || 'Could not load the search model.')
    }
  }, [request])

  const disable = useCallback(() => {
    writePref(false)
    workerRef.current?.terminate()
    workerRef.current = null
    for (const p of pendingRef.current.values()) p.reject(new DOMException('Search model turned off.', 'AbortError'))
    pendingRef.current.clear()
    setStatus('off')
    setProgress(null)
    setIndexing(null)
  }, [])

  // Turn back on automatically if the user enabled it before (weights are cached).
  useEffect(() => {
    if (readPref()) enable()
    return () => {
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [enable])

  // Embed any ready document that has no vectors yet.
  useEffect(() => {
    if (status !== 'ready' || runningRef.current) return
    const todo = documents.filter(
      (d) => d?.status === 'ready' && d.chunks?.length && !vectorsRef.current.has(d.id) && !failedRef.current.has(d.id),
    )
    if (todo.length === 0) return

    runningRef.current = true
    const total = todo.reduce((n, d) => n + d.chunks.length, 0)
    let done = 0
    setIndexing({ done, total })

    ;(async () => {
      let current = null
      try {
        for (const doc of todo) {
          current = doc
          const texts = doc.chunks.map(passageEmbeddingText)
          let dim = 0
          const parts = []
          for (let i = 0; i < texts.length; i += BATCH_SIZE) {
            const { data, dim: d } = await embed(texts.slice(i, i + BATCH_SIZE))
            dim = d
            parts.push(data)
            done += Math.min(BATCH_SIZE, texts.length - i)
            setIndexing({ done, total })
          }
          const data = new Float32Array(parts.reduce((n, p) => n + p.length, 0))
          let at = 0
          for (const p of parts) { data.set(p, at); at += p.length }
          const vectors = { model: EMBEDDING_MODEL, dim, count: texts.length, data }
          vectorsRef.current.set(doc.id, vectors)
          if (doc.storedInBrowser) saveDocumentVectors(doc.id, vectors)
          setVersion((n) => n + 1)
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          if (current) failedRef.current.add(current.id)
          console.warn('[DocuMind AI] Passage indexing failed:', err)
          setError(err.message || 'Indexing failed.')
        }
      } finally {
        runningRef.current = false
        setIndexing(null)
        // Pick up documents added while this run was in progress.
        setVersion((n) => n + 1)
      }
    })()
  }, [status, documents, embed, version])

  const embedQuery = useCallback(async (q) => {
    if (status !== 'ready' || !q?.trim()) return null
    try {
      const { data } = await embed([QUERY_PREFIX + q.trim()])
      return data
    } catch {
      return null
    }
  }, [status, embed])

  const vectorsFor = useCallback((docId) => vectorsRef.current.get(docId), [])

  return { status, progress, indexing, error, enable, disable, embedQuery, vectorsFor, version }
}
