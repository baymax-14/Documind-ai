import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { validateFile, partitionFiles } from '../src/features/documents/services/validate.js'
import { MAX_FILE_SIZE } from '../src/features/documents/types/document.js'

describe('File Validation Service', () => {
  it('accepts valid PDF, DOCX, and TXT files under size limit', () => {
    const validTxt = new File(['Hello world'], 'notes.txt', { type: 'text/plain' })
    const validPdf = new File(['%PDF-dummy'], 'report.pdf', { type: 'application/pdf' })
    const validDocx = new File(['PK-dummy'], 'spec.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })

    assert.deepEqual(validateFile(validTxt), { valid: true })
    assert.deepEqual(validateFile(validPdf), { valid: true })
    assert.deepEqual(validateFile(validDocx), { valid: true })
  })

  it('rejects unsupported legacy .doc files with clear reason', () => {
    const legacyDoc = new File(['legacy binary content'], 'old_document.doc', {
      type: 'application/msword',
    })
    const result = validateFile(legacyDoc)
    assert.equal(result.valid, false)
    assert.match(result.reason, /Unsupported file type "\.doc"/)
    assert.match(result.reason, /\.PDF, \.DOCX, \.TXT/)
  })

  it('rejects unsupported file formats (.exe, .png, unknown)', () => {
    const exeFile = new File(['MZ'], 'malware.exe')
    const imgFile = new File(['\x89PNG'], 'photo.png')
    const noExtFile = new File(['data'], 'README')

    assert.equal(validateFile(exeFile).valid, false)
    assert.equal(validateFile(imgFile).valid, false)
    assert.equal(validateFile(noExtFile).valid, false)
  })

  it('rejects empty (0 byte) files', () => {
    const emptyFile = new File([], 'empty.txt', { type: 'text/plain' })
    const result = validateFile(emptyFile)
    assert.equal(result.valid, false)
    assert.match(result.reason, /empty \(0 bytes\)/)
  })

  it('rejects oversized files exceeding the 25 MB limit', () => {
    // Construct a simulated File with oversized size property
    const oversizedFile = new File(['large content'], 'huge_report.pdf', {
      type: 'application/pdf',
    })
    Object.defineProperty(oversizedFile, 'size', { value: MAX_FILE_SIZE + 1024 })

    const result = validateFile(oversizedFile)
    assert.equal(result.valid, false)
    assert.match(result.reason, /exceeds the 25 MB limit/)
  })

  it('handles null or missing file objects safely', () => {
    assert.equal(validateFile(null).valid, false)
    assert.equal(validateFile(undefined).valid, false)
    assert.equal(validateFile({}).valid, false)
  })

  it('partitions mixed valid, invalid, empty, and oversized selections accurately', () => {
    const valid1 = new File(['valid content 1'], 'doc1.pdf')
    const valid2 = new File(['valid content 2'], 'doc2.txt')
    const invalidDoc = new File(['binary doc'], 'archive.doc')
    const empty = new File([], 'zero.txt')
    const oversized = new File(['data'], 'large.docx')
    Object.defineProperty(oversized, 'size', { value: 30 * 1024 * 1024 })

    const files = [valid1, invalidDoc, valid2, empty, oversized]
    const { valid, rejected } = partitionFiles(files)

    assert.equal(valid.length, 2)
    assert.equal(valid[0].name, 'doc1.pdf')
    assert.equal(valid[1].name, 'doc2.txt')

    assert.equal(rejected.length, 3)
    assert.equal(rejected[0].file.name, 'archive.doc')
    assert.match(rejected[0].reason, /Unsupported file type "\.doc"/)
    assert.equal(rejected[1].file.name, 'zero.txt')
    assert.match(rejected[1].reason, /empty/)
    assert.equal(rejected[2].file.name, 'large.docx')
    assert.match(rejected[2].reason, /exceeds/)
  })
})

