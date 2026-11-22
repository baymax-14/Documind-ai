import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  exportComparisonToMarkdown,
  exportAiChatToMarkdown,
} from '../src/features/documents/services/export.js'

describe('Citation-Preserving Exporter Service', () => {
  it('formats comparison results into structured Markdown with academic footnotes', () => {
    const mockComparison = {
      documents: [
        { id: 'doc-1', name: 'Paper A.pdf', type: 'PDF' },
        { id: 'doc-2', name: 'Doc B.docx', type: 'DOCX' },
      ],
      dimensions: [
        {
          id: 'privacy',
          label: 'Privacy & Boundaries',
          synthesis: {
            status: 'consensus',
            summary: 'Both documents enforce local-only zero-cloud processing.',
          },
          entries: [
            {
              docId: 'doc-1',
              docName: 'Paper A.pdf',
              hasEvidence: true,
              locator: 'Page 3',
              text: 'Data never leaves local device memory.',
            },
            {
              docId: 'doc-2',
              docName: 'Doc B.docx',
              hasEvidence: false,
              locator: 'N/A',
              text: '',
            },
          ],
        },
      ],
    }

    const md = exportComparisonToMarkdown(mockComparison)
    assert.match(md, /# DocuMind AI — Cross-Document Comparison Report/i)
    assert.match(md, /Paper A\.pdf/i)
    assert.match(md, /Doc B\.docx/i)
    assert.match(md, /\[\^1\]/i)
    assert.match(md, /\[\^1\]: \*\*Paper A\.pdf\*\* \(Page 3\): "Data never leaves local device memory\."/i)
    assert.match(md, /No matching evidence found in this document/i)
  })

  it('formats AI chat transcript into clean Markdown with citation footnotes', () => {
    const mockMessages = [
      {
        id: '1',
        sender: 'user',
        text: 'What are the main findings?',
        timestamp: Date.now(),
      },
      {
        id: '2',
        sender: 'assistant',
        text: 'The main finding is high growth in on-device document management.',
        citations: [
          {
            docName: 'Report.pdf',
            locator: 'Page 1 (Paragraph 2)',
            text: '24% year-over-year expansion during Q3.',
          },
        ],
        timestamp: Date.now(),
      },
    ]

    const md = exportAiChatToMarkdown(mockMessages)
    assert.match(md, /# DocuMind AI — Grounded Intelligence Transcript/i)
    assert.match(md, /What are the main findings\?/i)
    assert.match(md, /The main finding is high growth/i)
    assert.match(md, /\[\^1\]/i)
    assert.match(md, /\[\^1\]: \*\*Report\.pdf\*\* \(Page 1 \(Paragraph 2\)\): "24% year-over-year expansion during Q3\."/i)
  })
})
