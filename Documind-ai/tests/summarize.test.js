import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  inferSectionTitle,
  extractTakeawaysFromText,
  generateSectionSummary,
  exportSummaryToMarkdown,
} from '../src/features/documents/services/summarize.js'
import { SEED_DOCS } from '../src/features/documents/data/seedDocs.js'

describe('Section-Aware Summarization Service', () => {
  it('infers clean section titles from headings or chunk keyword density', () => {
    const text1 = 'Executive Summary: Q3 Market Analysis. The market expanded 24% year-over-year.'
    const title1 = inferSectionTitle(text1, 0)
    assert.match(title1, /Executive Summary|Overview/i)

    const text2 = 'Architecture Milestones: Milestone 1 delivered client-side extraction using Web Workers.'
    const title2 = inferSectionTitle(text2, 1)
    assert.match(title2, /Architecture|Methodology|Milestones/i)
  })

  it('extracts concise, informative sentence takeaways without hallucinations', () => {
    const text =
      'Competitors in the document analysis space have shifted aggressively toward cloud-hosted LLM endpoints. However, customer surveys indicate that 68% of enterprise research teams are constrained by data-retention policies that forbid transmitting proprietary research to third-party APIs.'

    const takeaways = extractTakeawaysFromText(text)
    assert.ok(Array.isArray(takeaways))
    assert.ok(takeaways.length >= 1)
    assert.match(takeaways[0], /data-retention policies|cloud-hosted/i)
  })

  it('generates a section-aware summary for a document with verifiable locators', () => {
    const doc = SEED_DOCS.find((d) => d.id === 'demo-1')
    assert.ok(doc)

    const summary = generateSectionSummary(doc)
    assert.equal(summary.documentId, 'demo-1')
    assert.equal(summary.documentName, 'Q3 Market Research.pdf')
    assert.equal(summary.sections.length, doc.chunks.length)

    for (const sec of summary.sections) {
      assert.ok(sec.title)
      assert.ok(sec.locator)
      assert.ok(sec.takeaways.length > 0)
      assert.ok(sec.fullExcerpt.length > 0)
      assert.equal(typeof sec.chunkIndex, 'number')
    }
  })

  it('exports section summary into structured Markdown with verifiable footnote citations', () => {
    const doc = SEED_DOCS.find((d) => d.id === 'demo-1')
    const summary = generateSectionSummary(doc)
    const md = exportSummaryToMarkdown(summary)

    assert.match(md, /# DocuMind AI — Grounded Section Summary/i)
    assert.match(md, /Q3 Market Research\.pdf/i)
    assert.match(md, /\[\^1\]/i)
    assert.match(md, /## Verifiable Citations & Footnotes/i)
    assert.match(md, /\[\^1\]: \*\*Q3 Market Research\.pdf\*\*/i)
  })

  it('handles empty documents or documents without chunks gracefully', () => {
    const emptyDoc = { id: 'empty', name: 'Empty.txt', type: 'TXT', chunks: [] }
    const summary = generateSectionSummary(emptyDoc)
    assert.equal(summary.sections.length, 0)

    const md = exportSummaryToMarkdown(summary)
    assert.match(md, /No sections available/i)
  })
})
