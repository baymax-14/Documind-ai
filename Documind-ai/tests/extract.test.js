import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { extractDocument } from '../src/features/documents/services/extract.js'
import { extractTxt } from '../src/features/documents/services/extractTxt.js'

describe('Document Extraction & Chunking', () => {
  it('routes correctly to TXT parser and produces stable chunks with locators and offsets', async () => {
    const rawContent = `First paragraph introduction.
This contains initial thoughts.

Second paragraph with specific findings.
More details on research.

Third paragraph conclusion and next steps.`

    const file = new File([rawContent], 'test_document.txt', { type: 'text/plain' })
    const result = await extractDocument(file)

    assert.equal(result.text, rawContent)
    assert.equal(result.chunks.length, 3)

    // Verify chunk 0
    assert.equal(result.chunks[0].index, 0)
    assert.equal(result.chunks[0].locator, 'Section 1')
    assert.equal(result.chunks[0].offset, 0)
    assert.match(result.chunks[0].text, /First paragraph introduction/)

    // Verify chunk 1
    assert.equal(result.chunks[1].index, 1)
    assert.equal(result.chunks[1].locator, 'Section 2')
    assert.ok(result.chunks[1].offset > 0)
    assert.match(result.chunks[1].text, /Second paragraph with specific findings/)

    // Verify chunk 2
    assert.equal(result.chunks[2].index, 2)
    assert.equal(result.chunks[2].locator, 'Section 3')
    assert.ok(result.chunks[2].offset > result.chunks[1].offset)
    assert.match(result.chunks[2].text, /Third paragraph conclusion/)

    // Verify offsets match exact raw string location
    for (const chunk of result.chunks) {
      const slice = rawContent.slice(chunk.offset, chunk.offset + chunk.text.length)
      assert.equal(slice, chunk.text)
    }
  })

  it('handles single paragraph text without blank lines as a single chunk', async () => {
    const raw = 'Single contiguous block of text without any double newlines.'
    const file = new File([raw], 'single.txt', { type: 'text/plain' })
    const result = await extractTxt(file)

    assert.equal(result.chunks.length, 1)
    assert.equal(result.chunks[0].index, 0)
    assert.equal(result.chunks[0].locator, 'Section 1')
    assert.equal(result.chunks[0].offset, 0)
    assert.equal(result.chunks[0].text, raw)
  })

  it('throws an error when extracting empty or whitespace-only text files', async () => {
    const emptyFile = new File(['   \n\n\t  '], 'blank.txt', { type: 'text/plain' })
    await assert.rejects(
      () => extractTxt(emptyFile),
      /contains no readable text/
    )
  })

  it('detects binary/control content and rejects corrupted text files', async () => {
    // Generate binary buffer with null bytes and control chars
    const binaryData = new Uint8Array(200)
    for (let i = 0; i < 200; i++) binaryData[i] = i % 25 === 0 ? 0 : 1 // High ratio of control chars
    const binFile = new File([binaryData], 'corrupt.txt', { type: 'text/plain' })

    await assert.rejects(
      () => extractTxt(binFile),
      /does not appear to be a valid text file/
    )
  })

  it('throws an error when routing unsupported file extension', async () => {
    const csvFile = new File(['col1,col2\n1,2'], 'data.csv', { type: 'text/csv' })
    await assert.rejects(
      () => extractDocument(csvFile),
      /No parser available for \.csv files/
    )
  })

  it('gracefully handles corrupted DOCX without crashing', async () => {
    const corruptDocx = new File(['not a real zip/docx content'], 'corrupt.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
    await assert.rejects(
      () => extractDocument(corruptDocx),
      /Could not extract text from corrupt\.docx/
    )
  })
})

