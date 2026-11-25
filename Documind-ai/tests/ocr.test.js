import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ocrLinesToItems, linesOf } from '../src/features/documents/services/ocr.js'
import { layoutPageText, boxForRange } from '../src/features/documents/services/pdfLayout.js'

// A Letter page (612 x 792 PDF units) drawn at 2.5x, as extractPdf does for OCR.
const SCALE = 2.5
const PAGE_W = 612
const PAGE_H = 792

function word(text, x0, x1, y0, y1) {
  return { text, bbox: { x0, y0, x1, y1 } }
}

function line(words) {
  return {
    words,
    bbox: {
      x0: Math.min(...words.map((w) => w.bbox.x0)),
      y0: Math.min(...words.map((w) => w.bbox.y0)),
      x1: Math.max(...words.map((w) => w.bbox.x1)),
      y1: Math.max(...words.map((w) => w.bbox.y1)),
    },
  }
}

const LINES = [
  line([word('Revenue', 250, 450, 250, 290), word('grew', 470, 580, 252, 290), word('24%', 600, 690, 250, 290)]),
  line([word('in', 250, 290, 310, 350), word('Q3.', 310, 390, 312, 350)]),
]

describe('OCR: recognised words to page layout', () => {
  it('turns Tesseract lines into pdf.js-style items in PDF units', () => {
    const items = ocrLinesToItems(LINES, SCALE, PAGE_H)
    assert.equal(items.length, 5)
    assert.equal(items[0].str, 'Revenue')
    assert.equal(items[0].transform[4], 100) // 250 px / 2.5
    assert.equal(items[0].width, 80)
    assert.equal(items[0].height, 16) // line height 40 px / 2.5
    assert.equal(items[0].transform[5], PAGE_H - 116) // baseline from the line bottom
    // All words on a line share its baseline; the last word ends the line
    assert.equal(items[1].transform[5], items[0].transform[5])
    assert.deepEqual(items.map((i) => i.hasEOL), [false, false, true, false, true])
  })

  it('reads as normal text through the same layout code as real PDF text', () => {
    const { text, spans } = layoutPageText(ocrLinesToItems(LINES, SCALE, PAGE_H))
    assert.equal(text, 'Revenue grew 24% in Q3.')
    const box = boxForRange(spans, 0, text.length, PAGE_W, PAGE_H)
    // Box covers both lines: x 100..276 units, top 100..140 units
    assert.ok(Math.abs(box.left - (100 / PAGE_W) * 100) < 0.05)
    assert.ok(Math.abs(box.top - (100 / PAGE_H) * 100) < 0.05)
    assert.ok(Math.abs(box.height - (40 / PAGE_H) * 100) < 0.1)
  })

  it('skips empty words and empty lines', () => {
    const items = ocrLinesToItems([line([word(' ', 0, 10, 0, 10)]), { words: [] }, line([word('ok', 0, 10, 0, 10)])], SCALE, PAGE_H)
    assert.deepEqual(items.map((i) => i.str), ['ok'])
  })

  it('collects lines from blocks and paragraphs in reading order', () => {
    const result = { data: { blocks: [{ paragraphs: [{ lines: [LINES[0]] }, { lines: [LINES[1]] }] }] } }
    assert.deepEqual(linesOf(result), LINES)
    assert.deepEqual(linesOf({ data: { blocks: null } }), [])
  })
})
