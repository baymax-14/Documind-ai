import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { chunkRanges, looksLikeHeading, headingBefore } from '../src/features/documents/services/chunker.js'
import { layoutPageText, boxForRange } from '../src/features/documents/services/pdfLayout.js'
import {
  validateCitations,
  fitPassagesToBudget,
  resolveModelBuild,
  generateAnswerWithFallback,
  EVALUATED_MODELS,
} from '../src/features/documents/services/onDeviceModel.js'
import {
  denseSearch,
  reciprocalRankFusion,
  EMBEDDING_MODEL,
} from '../src/features/documents/services/embeddings.js'
import { retrieveEvidenceChunks } from '../src/features/documents/services/aiChat.js'

const sentence = (i) => `Sentence ${i} explains how enterprise revenue and customer retention changed over the year.`
const para = (n, from = 0) => Array.from({ length: n }, (_, i) => sentence(from + i)).join(' ')

describe('Passage chunker', () => {
  it('packs paragraphs into passages that are exact slices of the source', () => {
    const text = `Introduction\n\n${para(6)}\n\n${para(5, 10)}\n\nMethods And Data\n\n${para(12, 20)}\n\nA short closing line.`
    const ranges = chunkRanges(text)
    assert.ok(ranges.length >= 2)
    for (const r of ranges) {
      const slice = text.slice(r.start, r.end)
      assert.equal(slice, slice.trim(), 'passages start and end on content')
      assert.ok(slice.length <= 1400 * 1.15 + 300, `passage too long: ${slice.length}`)
    }
    // A heading starts a new passage
    assert.ok(ranges.some((r) => text.slice(r.start).startsWith('Methods And Data')))
    // The tiny tail is folded into the passage before it
    assert.ok(text.slice(ranges.at(-1).start, ranges.at(-1).end).endsWith('A short closing line.'))
  })

  it('splits a single over-long paragraph at sentence ends', () => {
    const text = para(60)
    const ranges = chunkRanges(text)
    assert.ok(ranges.length >= 3)
    for (const r of ranges) {
      assert.ok(r.end - r.start <= 1400 + 300)
      assert.match(text.slice(r.start, r.end), /\.$/)
    }
  })

  it('recognises headings and finds the nearest one before an offset', () => {
    assert.equal(looksLikeHeading('3.2 Results'), true)
    assert.equal(looksLikeHeading('Market Overview And Outlook'), true)
    assert.equal(looksLikeHeading('This is an ordinary sentence that ends with a stop.'), false)
    const text = 'Overview\nSome text here.\nKey Findings\nRevenue rose.'
    assert.equal(headingBefore(text, text.indexOf('Revenue')), 'Key Findings')
  })
})

describe('PDF page layout', () => {
  const item = (str, x, y, w, h = 10, hasEOL = false) => ({ str, transform: [h, 0, 0, h, x, y], width: w, height: h, hasEOL })

  it('rebuilds lines, rejoins hyphenation and keeps paragraph breaks', () => {
    const items = [
      item('Revenue grew', 50, 700, 60),
      item('strongly in the enter-', 50, 688, 100),
      item('prise segment.', 50, 676, 70),
      item('A new paragraph starts here.', 50, 640, 130),
    ]
    const { text, spans } = layoutPageText(items)
    assert.equal(text, 'Revenue grew strongly in the enterprise segment.\n\nA new paragraph starts here.')
    assert.equal(spans.length, 4)
  })

  it('maps a passage back to a bounding box in page percentages', () => {
    const items = [item('First line', 100, 700, 200), item('Second line', 100, 688, 150)]
    const { text, spans } = layoutPageText(items)
    const box = boxForRange(spans, 0, text.length, 600, 800)
    assert.ok(box)
    assert.equal(box.left, Math.round((100 / 600) * 10000) / 100)
    assert.ok(box.top > 10 && box.top < 15)
    assert.ok(box.width > 30 && box.width < 35)
  })
})

describe('Answer citation checks', () => {
  it('keeps valid citations and removes ones that point at missing passages', () => {
    const res = validateCitations('Revenue rose 42% [1]. Retention held [3]. Both sides agree [1, 2].', 2)
    assert.deepEqual(res.citedIds, [1, 2])
    assert.deepEqual(res.invalidIds, [3])
    assert.equal(res.text, 'Revenue rose 42% [1]. Retention held. Both sides agree [1][2].')
  })

  it('flags a model answer that cites nothing', async () => {
    const engine = { chatCompletion: async () => ({ choices: [{ message: { content: 'Revenue doubled.' } }] }) }
    const res = await generateAnswerWithFallback({
      question: 'revenue?',
      retrievedChunks: [{ docId: 'd', docName: 'A.pdf', chunkIndex: 0, locator: 'Page 1', text: 'Revenue rose 42%.' }],
      engine,
    })
    assert.equal(res.isRealModel, true)
    assert.equal(res.uncited, true)
  })

  it('streams tokens through onToken and returns the full answer', async () => {
    const seen = []
    const engine = {
      chatCompletion: async ({ onToken }) => {
        let soFar = ''
        for (const t of ['Revenue ', 'rose ', '42% [1].']) { soFar += t; onToken?.(t, soFar) }
        return { choices: [{ message: { content: soFar } }] }
      },
    }
    const res = await generateAnswerWithFallback({
      question: 'revenue?',
      retrievedChunks: [{ docId: 'd', docName: 'A.pdf', chunkIndex: 0, locator: 'Page 1', text: 'Revenue rose 42%.' }],
      engine,
      onToken: (_d, s) => seen.push(s),
    })
    assert.equal(seen.length, 3)
    assert.equal(res.answer, 'Revenue rose 42% [1].')
    assert.deepEqual(res.citedIds, [1])
    assert.equal(res.uncited, false)
  })

  it('fits passages into the context budget, trimming the last one', () => {
    const chunks = [{ text: 'a'.repeat(800) }, { text: `${'b. '.repeat(400)}` }, { text: 'c'.repeat(800) }]
    const out = fitPassagesToBudget(chunks, 1200)
    assert.equal(out.length, 2)
    assert.ok(out[1].text.length <= 400 + 1)
  })
})

describe('Model choices', () => {
  it('uses the 16-bit build only when the GPU supports shader-f16', () => {
    const m = EVALUATED_MODELS[0]
    assert.equal(resolveModelBuild(m.id, true), m.f16Id)
    assert.equal(resolveModelBuild(m.id, false), m.id)
    assert.equal(resolveModelBuild(m.f16Id, false), m.id)
  })
})

describe('Hybrid keyword + meaning retrieval', () => {
  // Unit vectors in 3-D stand in for real 384-D embeddings.
  const docs = [
    {
      id: 'fin', name: 'Finance.pdf', type: 'PDF', status: 'ready',
      chunks: [
        { index: 0, locator: 'Page 1', page: 1, text: 'Enterprise revenue expanded 42% year over year.' },
        { index: 1, locator: 'Page 2', page: 2, text: 'The cafeteria menu changes every Tuesday.' },
      ],
    },
  ]
  const vectors = {
    fin: { model: EMBEDDING_MODEL, dim: 3, count: 2, data: Float32Array.from([1, 0, 0, 0, 1, 0]) },
  }
  const vectorsFor = (id) => vectors[id]

  it('finds a passage by meaning when the question shares no keywords', () => {
    const question = 'how much did sales grow?'
    const keywordOnly = retrieveEvidenceChunks(docs, question, 5)
    assert.equal(keywordOnly.hasEvidence, false)

    const hybrid = retrieveEvidenceChunks(docs, question, 5, {
      queryVector: Float32Array.from([0.8, 0.1, Math.sqrt(1 - 0.65)]),
      vectorsFor,
    })
    assert.equal(hybrid.method, 'hybrid')
    assert.equal(hybrid.hasEvidence, true)
    assert.equal(hybrid.chunks[0].chunkIndex, 0)
    assert.equal(hybrid.chunks[0].rerankMethod, 'semantic')
  })

  it('still abstains when nothing is close in meaning or wording', () => {
    const res = retrieveEvidenceChunks(docs, 'capital of France', 5, {
      queryVector: Float32Array.from([0, 0, 1]),
      vectorsFor,
    })
    assert.equal(res.hasEvidence, false)
  })

  it('ignores vectors from a different model or a stale chunk count', () => {
    const stale = { fin: { ...vectors.fin, count: 5 } }
    assert.deepEqual(denseSearch(docs, Float32Array.from([1, 0, 0]), (id) => stale[id]), [])
  })

  it('fuses rankings so items found by both lists rank first', () => {
    const fused = reciprocalRankFusion([[{ key: 'a' }, { key: 'b' }], [{ key: 'b' }, { key: 'c' }]])
    const order = [...fused.entries()].sort((x, y) => y[1] - x[1]).map(([k]) => k)
    assert.equal(order[0], 'b')
  })
})

describe('Reading text and snippets', async () => {
  const { parseReadableBlocks } = await import('../src/features/documents/services/readableBlocks.js')
  const { extractSnippet } = await import('../src/features/documents/services/search.js')

  it('turns markdown headings and pipe tables into blocks without losing text', () => {
    const text = '### Segment Performance\n| Segment | Revenue |\n| :--- | :--- |\n| Enterprise | $12.4M |\n\nGrowth was **strong** this year.'
    const blocks = parseReadableBlocks(text)
    assert.deepEqual(blocks.map((b) => b.type), ['heading', 'table', 'paragraph'])
    assert.equal(blocks[0].text, 'Segment Performance')
    assert.equal(blocks[1].hasHeader, true)
    assert.deepEqual(blocks[1].rows, [['Segment', 'Revenue'], ['Enterprise', '$12.4M']])
    assert.equal(blocks[2].text, 'Growth was **strong** this year.')
  })

  it('cuts snippets on word boundaries and hides table rules', () => {
    const text = 'The enterprise document management landscape experienced a 24% year-over-year expansion during Q3 and more'
    const s = extractSnippet(text, text.indexOf('24%'), 3, 30)
    // The snippet starts at the beginning of a whole word of the source
    const firstWord = s.prefix.replace('…', '').split(' ')[0]
    assert.ok(text.split(' ').includes(firstWord), `"${firstWord}" is not a whole word`)
    assert.match(s.suffix, /\S…$/)
    const table = '| A | B |\n| :--- | :--- |\n| x | needle |'
    const t = extractSnippet(table, table.indexOf('needle'), 6)
    assert.ok(!t.full.includes(':---'))
  })
})
