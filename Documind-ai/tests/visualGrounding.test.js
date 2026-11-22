import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeBoundingBox,
  estimateBoundingBox,
  groupDocumentByPages,
  calculateZoomMetrics,
  bboxToStyle,
} from '../src/features/documents/services/visualGrounding.js'

describe('Visual Document Grounding Service (Phase 12)', () => {
  it('normalizes out-of-range bounding boxes and clamps percentages safely', () => {
    const raw = { top: -10, left: 120, width: 200, height: -5 }
    const normalized = normalizeBoundingBox(raw)

    assert.equal(normalized.top, 0)
    assert.equal(normalized.left, 95)
    assert.ok(normalized.width <= 5)
    assert.ok(normalized.height >= 2)
  })

  it('respects pre-existing explicit chunk bounding boxes', () => {
    const chunk = {
      index: 0,
      text: 'Title of document',
      bbox: { top: 15, left: 10, width: 80, height: 25 },
    }
    const result = estimateBoundingBox(chunk)
    assert.equal(result.top, 15)
    assert.equal(result.left, 10)
    assert.equal(result.width, 80)
    assert.equal(result.height, 25)
  })

  it('calculates proportional vertical position when chunk text is inside page text', () => {
    const pageText =
      'Header section with introductory remarks.\n\n' +
      'Middle section containing the critical revenue calculation and core claims.\n\n' +
      'Footer notes with citations and disclaimers.'

    const chunk = {
      index: 1,
      text: 'Middle section containing the critical revenue calculation and core claims.',
    }

    const bbox = estimateBoundingBox(chunk, pageText)
    assert.ok(bbox.top > 10, 'Expected top offset to be past the header')
    assert.ok(bbox.height > 5, 'Expected positive height')
    assert.equal(bbox.left, 8)
    assert.equal(bbox.width, 84)
  })

  it('groups document chunks into sequential visual pages with title and locators', () => {
    const doc = {
      id: 'doc-pdf-1',
      name: 'Sample.pdf',
      type: 'PDF',
      chunks: [
        { index: 0, page: 1, locator: 'Page 1', text: 'Page 1 passage A' },
        { index: 1, page: 1, locator: 'Page 1', text: 'Page 1 passage B' },
        { index: 2, page: 2, locator: 'Page 2', text: 'Page 2 passage C' },
      ],
    }

    const pages = groupDocumentByPages(doc)
    assert.equal(pages.length, 2)
    assert.equal(pages[0].pageNumber, 1)
    assert.equal(pages[0].chunks.length, 2)
    assert.equal(pages[1].pageNumber, 2)
    assert.equal(pages[1].chunks.length, 1)
  })

  it('handles zoom scaling metrics within 50% to 200% bounds', () => {
    const normal = calculateZoomMetrics(600, 100)
    assert.equal(normal.width, 600)
    assert.equal(normal.scale, 1)

    const zoomedIn = calculateZoomMetrics(600, 150)
    assert.equal(zoomedIn.width, 900)
    assert.equal(zoomedIn.scale, 1.5)

    const clampedMin = calculateZoomMetrics(600, 20)
    assert.equal(clampedMin.scale, 0.5)

    const clampedMax = calculateZoomMetrics(600, 300)
    assert.equal(clampedMax.scale, 2.0)
  })

  it('converts bounding box object to valid CSS percentage styles', () => {
    const style = bboxToStyle({ top: 12.5, left: 8, width: 84, height: 20 })
    assert.deepEqual(style, {
      top: '12.5%',
      left: '8%',
      width: '84%',
      height: '20%',
    })
  })
})
