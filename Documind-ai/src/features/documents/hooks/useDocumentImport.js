import { useCallback, useEffect, useRef, useState } from 'react'
import { createDocRecord } from '../types/document.js'
import { partitionFiles } from '../services/validate.js'
import { extractDocument } from '../services/extract.js'
import {
  getAllDocuments,
  saveDocument,
  deleteDocument,
  clearAllDocuments,
  getStorageEstimate,
  saveDocumentFile,
} from '../services/storage.js'

const PRIVACY_KEY = 'documind_privacy_accepted'

/**
 * Hook that manages the complete document lifecycle for DocuMind AI:
 * - Temporary import queue (staging): selection → validation → on-device extraction
 * - Persistent local library: saved to browser IndexedDB, loaded on restart
 * - Library management: explicit save, delete-one, clear-all, and storage estimation
 *
 * @param {Object} options
 * @param {import('../types/document.js').DocRecord[]} options.seedDocs - Built-in sample documents.
 * @param {(message: string) => void} options.onNotice - Callback to surface notifications.
 * @returns {Object}
 */
export function useDocumentImport({ seedDocs = [], onNotice }) {
  // Staged files currently being processed in this session
  const [stagedDocs, setStagedDocs] = useState([])

  // Persistent library documents (loaded from IndexedDB + seed docs)
  const [libraryDocs, setLibraryDocs] = useState(seedDocs)

  // Loading state while reading IndexedDB on startup
  const [loadingStorage, setLoadingStorage] = useState(true)

  // Storage usage estimate
  const [storageEstimate, setStorageEstimate] = useState(null)

  // Privacy gate
  const [privacyAccepted, setPrivacyAccepted] = useState(() => {
    try {
      return localStorage.getItem(PRIVACY_KEY) === 'true'
    } catch {
      return false
    }
  })

  // In-memory mapping of docId -> File object (kept while in staging)
  const fileMapRef = useRef(new Map())

  /**
   * Save one ready document, keeping its original PDF so the reader can show
   * the real pages. If the file cannot be kept, the text is still saved.
   */
  const persistDoc = useCallback(async (doc) => {
    const file = fileMapRef.current.get(doc.id)
    const isPdf = /\.pdf$/i.test(doc.name)
    const hasOriginal = Boolean(isPdf && file && (await saveDocumentFile(doc.id, file)))
    const record = { ...doc, hasOriginal }
    const res = await saveDocument(record)
    return { res, record }
  }, [])

  // Refresh storage estimate
  const refreshStorageEstimate = useCallback(async () => {
    const est = await getStorageEstimate()
    if (est) setStorageEstimate(est)
  }, [])

  // Load persistent documents from IndexedDB on startup
  useEffect(() => {
    let cancelled = false

    async function loadStored() {
      try {
        const stored = await getAllDocuments()
        if (!cancelled) {
          // Merge stored documents with sample documents (stored first, then samples)
          setLibraryDocs([...stored, ...seedDocs])
          refreshStorageEstimate()
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[useDocumentImport] Failed to load stored docs:', err)
          onNotice?.('Could not load existing documents from browser storage.')
        }
      } finally {
        if (!cancelled) {
          setLoadingStorage(false)
        }
      }
    }

    loadStored()

    return () => {
      cancelled = true
    }
  }, [seedDocs, onNotice, refreshStorageEstimate])

  /**
   * Accept the privacy notice and remember the acceptance.
   */
  const acceptPrivacy = useCallback(() => {
    setPrivacyAccepted(true)
    try {
      localStorage.setItem(PRIVACY_KEY, 'true')
    } catch {
      // Ignore localStorage restrictions
    }
  }, [])

  /**
   * Process a single document: extract text on-device and update staging state.
   */
  const processOne = useCallback(async (docId, file) => {
    setStagedDocs((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, status: 'extracting' } : d))
    )

    try {
      const { text, chunks, scannedPages = [], pageCount } = await extractDocument(file)
      // A PDF with no text at all waits for OCR; one with some scanned pages
      // can be saved as is, or have those pages read first.
      const status = text.trim() ? 'ready' : 'needs-ocr'

      setStagedDocs((prev) =>
        prev.map((d) =>
          d.id === docId
            ? { ...d, status, text, chunks, scannedPages, pageCount, extractedAt: Date.now() }
            : d
        )
      )
    } catch (err) {
      setStagedDocs((prev) =>
        prev.map((d) =>
          d.id === docId
            ? { ...d, status: 'failed', error: err.message || 'Extraction failed.' }
            : d
        )
      )
    }
  }, [])

  /**
   * Read the scanned pages of a staged PDF with on-device text recognition.
   * The OCR files (~7 MB) download from this site on first use.
   */
  const recognizeScanned = useCallback(async (docId) => {
    const file = fileMapRef.current.get(docId)
    if (!file) {
      onNotice?.('The original file reference is no longer available. Please select it again.')
      return
    }
    const update = (patch) =>
      setStagedDocs((prev) => prev.map((d) => (d.id === docId ? { ...d, ...patch } : d)))

    update({ status: 'recognizing', ocrProgress: { phase: 'setup', fraction: 0 } })
    let reader = null
    try {
      const { createOcrReader } = await import('../services/ocr.js')
      reader = await createOcrReader((fraction) => update({ ocrProgress: { phase: 'setup', fraction } }))
      const { text, chunks, scannedPages = [], ocrPages = [], pageCount } = await extractDocument(file, {
        ocr: reader,
        onPage: ({ page, total, ocr }) => {
          if (ocr) update({ ocrProgress: { phase: 'pages', page, total } })
        },
      })
      update({
        status: 'ready',
        text,
        chunks,
        scannedPages,
        ocrPages,
        pageCount,
        ocrProgress: null,
        extractedAt: Date.now(),
      })
      onNotice?.(
        `Read ${ocrPages.length} scanned page${ocrPages.length === 1 ? '' : 's'} of "${file.name}". ` +
        'Recognised text can contain mistakes; check quotes against the page.'
      )
    } catch (err) {
      update({
        status: 'failed',
        ocrProgress: null,
        error: err.message || 'Text recognition failed.',
      })
    } finally {
      reader?.terminate()
    }
  }, [onNotice])

  /**
   * Process a queue of files sequentially to prevent browser memory spikes.
   */
  const processQueue = useCallback(async (queue) => {
    for (const { id, file } of queue) {
      await processOne(id, file)
    }
  }, [processOne])

  /**
   * Add files from input or drag-and-drop into the staging queue.
   */
  const addFiles = useCallback((fileList) => {
    const incoming = Array.from(fileList)
    if (incoming.length === 0) return

    const { valid, rejected } = partitionFiles(incoming)

    if (rejected.length > 0 && valid.length === 0) {
      onNotice?.(rejected[0].reason)
      return
    }

    if (rejected.length > 0 && valid.length > 0) {
      onNotice?.(
        `${valid.length} file${valid.length === 1 ? '' : 's'} accepted. ` +
        `${rejected.length} file${rejected.length === 1 ? ' was' : 's were'} skipped: ${rejected[0].reason}`
      )
    }

    if (valid.length > 0 && rejected.length === 0) {
      onNotice?.(
        `${valid.length} file${valid.length === 1 ? '' : 's'} added to queue. ` +
        `Extracting text in this browser.`
      )
    }

    const queue = []
    const newDocs = valid.map((file) => {
      const record = createDocRecord(file)
      fileMapRef.current.set(record.id, file)
      queue.push({ id: record.id, file })
      return record
    })

    setStagedDocs((prev) => [...newDocs, ...prev])
    processQueue(queue)
  }, [onNotice, processQueue])

  /**
   * Retry extraction for a failed staged document.
   */
  const retryExtraction = useCallback((docId) => {
    const file = fileMapRef.current.get(docId)
    if (!file) {
      onNotice?.('The original file reference is no longer available. Please select it again.')
      return
    }
    processOne(docId, file)
  }, [onNotice, processOne])

  /**
   * Dismiss a document from the staging queue.
   */
  const dismissStaged = useCallback((docId) => {
    fileMapRef.current.delete(docId)
    setStagedDocs((prev) => prev.filter((d) => d.id !== docId))
  }, [])

  /**
   * Dismiss all documents from the staging queue.
   */
  const dismissAllStaged = useCallback(() => {
    fileMapRef.current.clear()
    setStagedDocs([])
  }, [])

  /**
   * Explicitly save a ready staged document into the persistent local library (IndexedDB).
   */
  const saveStagedToLibrary = useCallback(async (docId) => {
    const doc = stagedDocs.find((d) => d.id === docId)
    if (!doc) return

    if (doc.status !== 'ready') {
      onNotice?.('Please wait until text extraction completes before saving.')
      return
    }

    const { res, record } = await persistDoc(doc)
    if (!res.success) {
      onNotice?.(res.error || 'Failed to save document.')
      return
    }

    // Successfully saved: remove from staging and add to library
    fileMapRef.current.delete(docId)
    setStagedDocs((prev) => prev.filter((d) => d.id !== docId))

    const persistedRecord = {
      ...record,
      storedInBrowser: true,
      persistedAt: Date.now(),
    }
    setLibraryDocs((prev) => [persistedRecord, ...prev])
    refreshStorageEstimate()
    onNotice?.(`"${doc.name}" saved to your local browser library.`)
  }, [stagedDocs, onNotice, refreshStorageEstimate, persistDoc])

  /**
   * Save all ready staged documents to the persistent local library.
   */
  const saveAllReadyStaged = useCallback(async () => {
    const readyDocs = stagedDocs.filter((d) => d.status === 'ready')
    if (readyDocs.length === 0) {
      onNotice?.('No documents are ready to be saved yet.')
      return
    }

    let savedCount = 0
    const newlySaved = []

    for (const doc of readyDocs) {
      const { res, record } = await persistDoc(doc)
      if (res.success) {
        fileMapRef.current.delete(doc.id)
        newlySaved.push({
          ...record,
          storedInBrowser: true,
          persistedAt: Date.now(),
        })
        savedCount++
      } else {
        onNotice?.(res.error || `Failed to save "${doc.name}".`)
        break
      }
    }

    if (savedCount > 0) {
      const savedIds = new Set(newlySaved.map((d) => d.id))
      setStagedDocs((prev) => prev.filter((d) => !savedIds.has(d.id)))
      setLibraryDocs((prev) => [...newlySaved, ...prev])
      refreshStorageEstimate()
      onNotice?.(`${savedCount} document${savedCount === 1 ? '' : 's'} saved to local browser library.`)
    }
  }, [stagedDocs, onNotice, refreshStorageEstimate, persistDoc])

  /**
   * Delete a single document from the persistent library.
   */
  const deleteLibraryDoc = useCallback(async (docId) => {
    const target = libraryDocs.find((d) => d.id === docId)
    if (!target) return

    if (target.sample) {
      // Demo docs only exist in memory
      setLibraryDocs((prev) => prev.filter((d) => d.id !== docId))
      onNotice?.(`Sample document "${target.name}" removed from view.`)
      return
    }

    try {
      await deleteDocument(docId)
      setLibraryDocs((prev) => prev.filter((d) => d.id !== docId))
      refreshStorageEstimate()
      onNotice?.(`"${target.name}" deleted from browser storage.`)
    } catch {
      onNotice?.(`Could not delete "${target.name}".`)
    }
  }, [libraryDocs, onNotice, refreshStorageEstimate])

  /**
   * Clear all persistent user documents from the library.
   */
  const clearLibrary = useCallback(async () => {
    try {
      await clearAllDocuments()
      // Keep only sample documents
      setLibraryDocs((prev) => prev.filter((d) => d.sample))
      refreshStorageEstimate()
      onNotice?.('Local browser library cleared.')
    } catch {
      onNotice?.('Could not clear browser storage.')
    }
  }, [onNotice, refreshStorageEstimate])

  return {
    stagedDocs,
    libraryDocs,
    loadingStorage,
    storageEstimate,
    privacyAccepted,
    acceptPrivacy,
    addFiles,
    retryExtraction,
    recognizeScanned,
    dismissStaged,
    dismissAllStaged,
    saveStagedToLibrary,
    saveAllReadyStaged,
    deleteLibraryDoc,
    clearLibrary,
  }
}
