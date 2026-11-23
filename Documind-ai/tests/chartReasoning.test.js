import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  isChartOrVisualQuery,
  detectPageVisualElements,
  reasonOverChartWithVLM,
  VLM_PROMPT_TEMPLATES,
} from '../src/features/documents/services/chartReasoning.js'
import { groupDocumentByPages } from '../src/features/documents/services/visualGrounding.js'
import { SEED_DOCS } from '../src/features/documents/data/seedDocs.js'

describe('Multimodal VLM Chart & Image Reasoning Service', () => {
  it('correctly detects whether a query targets charts, figures, or visual metrics', () => {
    assert.equal(isChartOrVisualQuery('What does the revenue trend chart show?'), true)
    assert.equal(isChartOrVisualQuery('Analyze the customer retention diagram on page 4'), true)
    assert.equal(isChartOrVisualQuery('Show me the breakdown graph'), true)
    assert.equal(isChartOrVisualQuery('Who founded the company?'), false)
    assert.equal(isChartOrVisualQuery(''), false)
  })

  it('detects visual charts and figures on document pages with bounding boxes', () => {
    const marketDoc = SEED_DOCS.find((d) => d.id === 'demo-1')
    assert.ok(marketDoc)

    const pages = groupDocumentByPages(marketDoc)
    // Page 4 contains the Segment Performance & Customer Retention table/chart
    const page4 = pages.find((p) => p.pageNumber === 4)
    assert.ok(page4)

    const figures = detectPageVisualElements(page4)
    assert.ok(figures.length > 0)

    const chart = figures[0]
    assert.ok(chart.title.includes('Segment Performance') || chart.title.includes('Retention'))
    assert.ok(chart.dataPoints.length > 0)
    assert.ok(chart.bbox.top >= 0 && chart.bbox.top <= 100)
    assert.ok(chart.bbox.height > 0)
    assert.equal(chart.sourceLocator, 'Page 4')
  })

  it('executes VLM reasoning for summarize and extract_metrics prompt types', async () => {
    const mockChart = {
      id: 'fig-4-0',
      title: 'Segment Performance & Customer Retention Chart',
      chartType: 'bar_chart',
      bbox: { top: 30, left: 10, width: 80, height: 35 },
      dataPoints: [
        { label: 'Enterprise Research', value: '$12.4M', trend: '+28%', detail: 'Retention: 98.2%' },
        { label: 'Legal & Compliance', value: '$4.8M', trend: '+19%', detail: 'Retention: 96.5%' },
        { label: 'Academic Institutions', value: '$3.2M', trend: '+14%', detail: 'Retention: 94.1%' },
        { label: 'Biotechnology Labs', value: '$5.6M', trend: '+34%', detail: 'Retention: 97.8%' },
      ],
      sourceLocator: 'Page 4',
    }

    // 1. Summarize
    const summaryResult = await reasonOverChartWithVLM({
      chart: mockChart,
      promptType: 'summarize',
    })
    assert.ok(summaryResult.groundedAnswer.includes('Segment Performance'))
    assert.equal(summaryResult.method, 'Text extraction')
    assert.equal(summaryResult.answered, true)

    // 2. Extract metrics
    const metricsResult = await reasonOverChartWithVLM({
      chart: mockChart,
      promptType: 'extract_metrics',
    })
    assert.ok(metricsResult.groundedAnswer.includes('Enterprise Research'))
    assert.ok(metricsResult.groundedAnswer.includes('$12.4M'))
    assert.equal(metricsResult.extractedMetrics.length, 4)

    // 3. High performers
    const performersResult = await reasonOverChartWithVLM({
      chart: mockChart,
      promptType: 'high_performers',
    })
    // Largest stated change is Biotechnology Labs (+34%)
    assert.ok(performersResult.groundedAnswer.includes('Biotechnology Labs'))
    assert.ok(performersResult.groundedAnswer.includes('+34%'))

    // 4. Custom query
    const customResult = await reasonOverChartWithVLM({
      chart: mockChart,
      question: 'What is the revenue of Biotechnology Labs?',
      promptType: 'custom',
    })
    assert.ok(customResult.groundedAnswer.includes('$5.6M'))

    // 5. A question about something the figure does not contain is not answered,
    //    and no figure outside the extracted values is stated.
    const unknown = await reasonOverChartWithVLM({
      chart: mockChart,
      question: 'What was churn in Asia?',
      promptType: 'custom',
    })
    assert.equal(unknown.answered, false)
    assert.ok(!/positive growth|strong retention/i.test(unknown.groundedAnswer))
  })

  it('provides well-formed VLM prompt templates', () => {
    assert.ok(VLM_PROMPT_TEMPLATES.length >= 3)
    const templateIds = VLM_PROMPT_TEMPLATES.map((t) => t.id)
    assert.ok(templateIds.includes('summarize'))
    assert.ok(templateIds.includes('extract_metrics'))
  })
})
