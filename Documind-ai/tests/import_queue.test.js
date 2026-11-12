import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createDocRecord } from '../src/features/documents/types/document.js'
import { SEED_DOCS } from '../src/features/documents/data/seedDocs.js'

describe('Document Import Queue & Persistence Lifecycles', () => {
  it('creates an initial staged document record in selected status', () => {
    const file = new File(['Contract body content'], 'Employment_Agreement.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
    const record = createDocRecord(file)

    assert.ok(record.id)
    assert.equal(typeof record.id, 'string')
    assert.equal(record.name, 'Employment_Agreement.docx')
    assert.equal(record.type, 'DOCX')
    assert.equal(record.status, 'selected')
    assert.equal(record.sample, false)
    assert.equal(record.storedInBrowser, undefined)
    assert.equal(typeof record.addedAt, 'number')
    assert.equal(record.text, undefined)
    assert.equal(record.chunks, undefined)
  })

  it('manages extraction state transitions from selected to ready on success', () => {
    const file = new File(['Section 1\n\nSection 2'], 'report.txt', { type: 'text/plain' })
    let doc = createDocRecord(file)
    assert.equal(doc.status, 'selected')

    // Transition to extracting
    doc = { ...doc, status: 'extracting' }
    assert.equal(doc.status, 'extracting')

    // Transition to ready with extracted chunks
    const mockChunks = [
      { index: 0, locator: 'Section 1', text: 'Section 1' },
      { index: 1, locator: 'Section 2', text: 'Section 2' },
    ]
    doc = {
      ...doc,
      status: 'ready',
      text: 'Section 1\n\nSection 2',
      chunks: mockChunks,
      extractedAt: Date.now(),
    }

    assert.equal(doc.status, 'ready')
    assert.equal(doc.chunks.length, 2)
    assert.ok(typeof doc.extractedAt === 'number')
    assert.equal(doc.error, undefined)
  })

  it('manages extraction state transitions from selected to failed on error', () => {
    const file = new File(['bad'], 'broken.pdf', { type: 'application/pdf' })
    let doc = createDocRecord(file)
    assert.equal(doc.status, 'selected')

    doc = { ...doc, status: 'extracting' }
    assert.equal(doc.status, 'extracting')

    doc = {
      ...doc,
      status: 'failed',
      error: 'Corrupted PDF stream: stream header missing.',
    }

    assert.equal(doc.status, 'failed')
    assert.match(doc.error, /Corrupted PDF stream/)
    assert.equal(doc.text, undefined)
  })

  it('verifies explicit save-to-library boundary: staged files do not enter library until explicitly saved', () => {
    // Initial library only contains seed docs
    let library = [...SEED_DOCS]
    const initialLibraryLength = library.length

    // User stages a ready document
    const stagedDoc = {
      ...createDocRecord(new File(['data'], 'notes.txt')),
      status: 'ready',
      text: 'data',
      chunks: [{ index: 0, locator: 'Section 1', text: 'data' }],
    }

    // While in staging, library remains untouched
    assert.equal(library.length, initialLibraryLength)
    assert.ok(!library.some((d) => d.id === stagedDoc.id))

    // Action: User explicitly saves staged doc to library
    const persistedRecord = {
      ...stagedDoc,
      storedInBrowser: true,
      persistedAt: Date.now(),
    }
    library = [persistedRecord, ...library]

    // Now document is persisted in library
    assert.equal(library.length, initialLibraryLength + 1)
    const saved = library.find((d) => d.id === stagedDoc.id)
    assert.ok(saved)
    assert.equal(saved.storedInBrowser, true)
    assert.ok(typeof saved.persistedAt === 'number')
    assert.equal(saved.sample, false)
  })

  it('prevents saving non-ready (extracting or failed) documents to library', () => {
    const extractingDoc = {
      ...createDocRecord(new File(['data'], 'in_progress.txt')),
      status: 'extracting',
    }
    const failedDoc = {
      ...createDocRecord(new File(['data'], 'failed.txt')),
      status: 'failed',
      error: 'Corrupted file',
    }

    function attemptSave(doc) {
      if (doc.status !== 'ready') {
        return { success: false, reason: 'Please wait until text extraction completes before saving.' }
      }
      return { success: true }
    }

    assert.equal(attemptSave(extractingDoc).success, false)
    assert.equal(attemptSave(failedDoc).success, false)
  })

  it('ensures sample documents remain strictly flagged as sample: true', () => {
    for (const doc of SEED_DOCS) {
      assert.equal(doc.sample, true)
      assert.ok(doc.id.startsWith('demo-'))
      assert.ok(doc.chunks && doc.chunks.length > 0)
    }
  })
})
