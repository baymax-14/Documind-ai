/**
 * Figure & Chart Data Service for DocuMind AI.
 *
 * Finds passages that carry figure or table data (labels with values) and
 * answers questions about them using only the numbers written in the text.
 * Nothing here looks at images: there is no vision model in this path, and
 * every sentence it returns is built from extracted values, so it never states
 * a trend, ranking or figure that the document does not contain.
 */

import { normalizeBoundingBox } from './visualGrounding.js'

/** Method label shown in the UI for results from this service. */
export const FIGURE_ANALYSIS_METHOD = 'Text extraction'

/**
 * Supported VLM prompt categories for quick visual analysis.
 */
export const VLM_PROMPT_TEMPLATES = [
  {
    id: 'summarize',
    label: 'Summarize values',
    icon: 'trending-up',
    description: 'Lists the labelled values found for this figure.',
  },
  {
    id: 'extract_metrics',
    label: 'Extract all values',
    icon: 'table',
    description: 'Pulls every labelled value with its unit and change.',
  },
  {
    id: 'high_performers',
    label: 'Largest change',
    icon: 'award',
    description: 'Finds the row with the largest stated percentage change.',
  },
]

/**
 * Check if a user query is asking about visual, graphical, or chart information.
 *
 * @param {string} query
 * @returns {boolean}
 */
export function isChartOrVisualQuery(query) {
  if (!query || typeof query !== 'string') return false
  const chartKeywords = /\b(chart|graph|figure|diagram|trend|trends|plot|visual|metric|kpi|breakdown|distribution|retention|revenue)\b/i
  return chartKeywords.test(query)
}

/**
 * Extract structured numerical metrics from markdown or text lines.
 *
 * @param {string} text
 * @returns {Array<{ label: string, value: string, trend?: string, detail?: string }>}
 */
function extractDataPointsFromText(text) {
  const points = []
  const lines = text.split(/\r?\n/)

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('| :---') || line.startsWith('|---')) continue

    // Markdown table row format: | Segment | Revenue | YoY | Retention |
    if (line.includes('|')) {
      const parts = line
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((p) => p.trim())
        .filter(Boolean)

      if (parts.length >= 2 && !parts[0].toLowerCase().includes('customer') && !parts[0].toLowerCase().includes('milestone')) {
        const label = parts[0]
        const value = parts[1]
        const trend = parts.find((p) => p.includes('+') || p.includes('%') || p.includes('-')) || ''
        const detail = parts.slice(2).join(' · ')
        points.push({ label, value, trend, detail })
      }
    } else {
      // Regex pattern: "Enterprise Research: $12.4M (+28%)" or "Demand grew by 24%"
      const metricMatch = line.match(/([A-Z][A-Za-z0-9\s&]+)[:—]\s*(\$[\d.]+[MBK]?|\d+[.\d]*%?)/i)
      if (metricMatch) {
        points.push({
          label: metricMatch[1].trim(),
          value: metricMatch[2].trim(),
          detail: line,
        })
      }
    }
  }

  return points
}

/**
 * Detects visual figures, charts, KPI matrices, and plots present on a document page.
 *
 * @param {import('./visualGrounding.js').VisualPageInfo} pageInfo
 * @returns {Array<{ id: string, title: string, chartType: string, bbox: import('./visualGrounding.js').BoundingBox, dataPoints: Array<any>, summary: string, sourceLocator: string }>}
 */
export function detectPageVisualElements(pageInfo) {
  if (!pageInfo || !pageInfo.chunks) return []

  const elements = []
  const pageNum = pageInfo.pageNumber || 1

  pageInfo.chunks.forEach((chunk, chunkIdx) => {
    const text = chunk.text || ''
    const hasTable = text.includes('|') && text.includes('---')
    const hasMetrics = /\$[\d.]+[MBK]?|\d+%/i.test(text)
    const hasFigureTag = /\b(chart|figure|table|trend|matrix|performance|breakdown|milestone)\b/i.test(text)

    if ((hasTable && hasMetrics) || (hasFigureTag && hasMetrics)) {
      // Determine title
      let title = `Page ${pageNum} figure data`
      const headingMatch = text.match(/(?:###?|Figure \d+|Chart \d+|Table \d+)[:\s]+([^\n\r]+)/i)
      if (headingMatch && headingMatch[1]) {
        title = headingMatch[1].trim()
      }

      // Infer chart type
      let chartType = 'bar_chart'
      if (text.toLowerCase().includes('retention') || text.toLowerCase().includes('growth')) {
        chartType = 'bar_chart'
      } else if (text.toLowerCase().includes('timeline') || text.toLowerCase().includes('milestone')) {
        chartType = 'timeline_matrix'
      } else if (text.toLowerCase().includes('distribution') || text.toLowerCase().includes('share')) {
        chartType = 'distribution'
      }

      // Compute bounding box
      const topOffset = 25 + (chunkIdx % 3) * 22
      const bbox = normalizeBoundingBox(
        chunk.bbox || {
          top: Math.min(65, topOffset),
          left: 10,
          width: 80,
          height: 28,
        }
      )

      const dataPoints = extractDataPointsFromText(text)
      const dataSummary =
        dataPoints.length > 0
          ? `${dataPoints.length} quantitative data series: ${dataPoints.map((d) => `${d.label} (${d.value})`).slice(0, 3).join(', ')}.`
          : 'No labelled values could be read from this passage.'

      elements.push({
        id: `fig-${pageNum}-${chunkIdx}`,
        title,
        chartType,
        bbox,
        dataPoints,
        summary: dataSummary,
        sourceLocator: chunk.locator || `Page ${pageNum}`,
      })
    }
  })

  return elements
}

/**
 * Parse a signed percentage such as "+34%" or "-2.5%".
 *
 * @param {string} [text]
 * @returns {number | null}
 */
function parsePercent(text) {
  const m = /([+\-−]?\s*\d+(?:\.\d+)?)\s*%/.exec(text || '')
  return m ? Number(m[1].replace(/\s|−/g, (c) => (c === '−' ? '-' : ''))) : null
}

function formatPoint(m) {
  return `${m.label}: ${m.value}${m.trend ? ` (${m.trend})` : ''}`
}

/**
 * Answer a question about a figure from the values extracted from its text.
 *
 * Kept under its original name for compatibility; it does not run a vision
 * model. Results only restate values present in `chart.dataPoints`.
 *
 * @param {Object} params
 * @param {Object} params.chart - Figure element from detectPageVisualElements.
 * @param {string} [params.question] - Custom user question.
 * @param {string} [params.promptType='summarize'] - One of VLM_PROMPT_TEMPLATES ids, or 'custom'.
 * @returns {Promise<{ chartId: string, chartTitle: string, chartType: string, extractedMetrics: Array<any>, trendAnalysis: string, groundedAnswer: string, method: string, visualLocator: string, bbox: Object, answered: boolean }>}
 */
export async function reasonOverChartWithVLM({
  chart,
  question = '',
  promptType = 'summarize',
}) {
  if (!chart) {
    throw new Error('A valid chart or figure element must be provided.')
  }

  const metrics = chart.dataPoints || []
  const chartTitle = chart.title || 'Figure'
  const locator = chart.sourceLocator || 'Page 1'

  let groundedAnswer = ''
  let trendAnalysis = ''
  let answered = metrics.length > 0

  if (metrics.length === 0) {
    groundedAnswer = `No labelled values could be read from the text of ${chartTitle} (${locator}). Open the page to read the figure directly.`
    answered = false
  } else if (promptType === 'extract_metrics') {
    groundedAnswer =
      `${metrics.length} values found in ${chartTitle} (${locator}):\n` +
      metrics.map((m) => `• ${formatPoint(m)}${m.detail ? ` — ${m.detail}` : ''}`).join('\n')
  } else if (promptType === 'high_performers') {
    const withChange = metrics
      .map((m) => ({ m, pct: parsePercent(m.trend) }))
      .filter((x) => x.pct !== null)
      .sort((a, b) => b.pct - a.pct)
    if (withChange.length === 0) {
      groundedAnswer = `${chartTitle} (${locator}) lists values but no percentage changes, so there is no stated change to rank.`
      answered = false
    } else {
      const top = withChange[0].m
      groundedAnswer = `The largest stated change in ${chartTitle} (${locator}) is ${top.label} at ${top.trend} (value ${top.value}).`
      trendAnalysis = `Ranked by stated change: ${withChange.map((x) => `${x.m.label} ${x.m.trend}`).join(', ')}.`
    }
  } else if (question && question.trim().length > 0) {
    const qLower = question.toLowerCase()
    const matched = metrics.filter(
      (m) => qLower.includes(m.label.toLowerCase()) || (m.value && qLower.includes(m.value.toLowerCase())),
    )
    if (matched.length > 0) {
      groundedAnswer = `From ${chartTitle} (${locator}): ` +
        matched.map((m) => `${formatPoint(m)}${m.detail ? `; ${m.detail}` : ''}`).join('. ') + '.'
    } else {
      groundedAnswer = `None of the values in ${chartTitle} (${locator}) is labelled with what the question asks about. The values found are: ${metrics.map(formatPoint).join('; ')}.`
      answered = false
    }
  } else {
    groundedAnswer = `${chartTitle} (${locator}) lists ${metrics.length} values: ${metrics.map(formatPoint).join('; ')}.`
    const changes = metrics.map((m) => parsePercent(m.trend)).filter((n) => n !== null)
    if (changes.length > 0) {
      const up = changes.filter((n) => n > 0).length
      const down = changes.filter((n) => n < 0).length
      trendAnalysis = `${changes.length} rows state a change: ${up} up, ${down} down.`
    }
  }

  return {
    chartId: chart.id,
    chartTitle,
    chartType: chart.chartType || 'bar_chart',
    extractedMetrics: metrics,
    trendAnalysis,
    groundedAnswer,
    method: FIGURE_ANALYSIS_METHOD,
    answered,
    visualLocator: locator,
    bbox: chart.bbox,
  }
}
