import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  estimateTokenCount,
  createTokenBudgetTracker,
  MAX_AGENT_ITERATIONS,
  DEFAULT_SESSION_TOKEN_BUDGET,
} from '../src/features/documents/services/tokenGovernance.js'

describe('Token Governance & Operational Cost Service (Phase 13)', () => {
  it('estimates token counts with proportional word-character weighting', () => {
    assert.equal(estimateTokenCount(''), 0)
    assert.equal(estimateTokenCount(null), 0)

    const shortText = 'What is the revenue growth?'
    const shortTokens = estimateTokenCount(shortText)
    assert.ok(shortTokens >= 5 && shortTokens <= 9)

    const longText = 'The enterprise document management landscape experienced a 24% expansion. '.repeat(10)
    const longTokens = estimateTokenCount(longText)
    assert.ok(longTokens > 100 && longTokens < 300)
  })

  it('tracks token usage across prompt, evidence, and completion channels', () => {
    const tracker = createTokenBudgetTracker({ budget: 1000 })

    const res = tracker.recordUsage({
      promptText: 'Analyze the Q3 financials.',
      evidenceText: 'Enterprise research segment reported $12.4M in Q3 revenue.',
      completionText: 'According to Page 1, Q3 revenue was $12.4M.',
      iterations: 1,
    })

    assert.ok(res.promptTokens > 0)
    assert.ok(res.evidenceTokens > 0)
    assert.ok(res.completionTokens > 0)
    assert.equal(res.totalTokens, res.promptTokens + res.evidenceTokens + res.completionTokens)
    assert.equal(res.isExceeded, false)
    assert.equal(res.remainingBudget, 1000 - res.totalTokens)
  })

  it('enforces bounded agent retrieval iterations cap (k <= 3)', () => {
    const tracker = createTokenBudgetTracker({ maxIterations: MAX_AGENT_ITERATIONS })

    const normal = tracker.recordUsage({
      promptText: 'Find metrics',
      iterations: 2,
    })
    assert.equal(normal.iterationsRecorded, 2)
    assert.equal(normal.capped, false)

    const exceeded = tracker.recordUsage({
      promptText: 'Deep recursive search across 10 documents',
      iterations: 8,
    })
    assert.equal(exceeded.iterationsRecorded, 3)
    assert.equal(exceeded.capped, true)

    const metrics = tracker.getMetrics()
    assert.equal(metrics.cappedIterationsCount, 1)
    assert.equal(metrics.queryCount, 2)
  })

  it('detects when session budget is exhausted and flags isExceeded', () => {
    const tracker = createTokenBudgetTracker({ budget: 25 })

    tracker.recordUsage({
      promptText: 'A moderately long prompt that consumes tokens quickly in a low-budget environment.',
      completionText: 'And a response that finishes pushing the tracker over the limit.',
    })

    const metrics = tracker.getMetrics()
    assert.equal(metrics.isExceeded, true)
    assert.equal(metrics.remainingBudget, 0)
    assert.equal(metrics.usageRatio, 1.0)
  })

  it('generates a privacy-preserving audit summary without raw document text', () => {
    const tracker = createTokenBudgetTracker({ budget: DEFAULT_SESSION_TOKEN_BUDGET })
    const secretDocText = 'Confidential merger valuation is $4.2B with sensitive party identities.'

    tracker.recordUsage({
      promptText: 'What is the valuation?',
      evidenceText: secretDocText,
      completionText: 'Valuation is reported as $4.2B.',
    })

    const audit = tracker.getAuditSummary()
    assert.ok(audit.timestamp)
    assert.equal(audit.token_governance.budget_limit, DEFAULT_SESSION_TOKEN_BUDGET)
    assert.ok(audit.token_governance.total_consumed > 0)
    assert.equal(audit.agent_governance.policy_compliance, 'ENFORCED_K_LE_3')
    assert.equal(audit.privacy_compliance.raw_text_omitted, true)

    // Verify raw secret text is not leaked anywhere in audit summary JSON
    const auditJson = JSON.stringify(audit)
    assert.ok(!auditJson.includes(secretDocText), 'Raw document text leaked in audit summary!')
    assert.ok(!auditJson.includes('Confidential merger'), 'Unredacted document keywords leaked!')
  })

  it('resets counters cleanly for a new session', () => {
    const tracker = createTokenBudgetTracker()
    tracker.recordUsage({ promptText: 'Initial query', completionText: 'Initial answer' })
    assert.ok(tracker.getMetrics().totalTokens > 0)

    tracker.reset()
    const resetMetrics = tracker.getMetrics()
    assert.equal(resetMetrics.totalTokens, 0)
    assert.equal(resetMetrics.promptTokens, 0)
    assert.equal(resetMetrics.evidenceTokens, 0)
    assert.equal(resetMetrics.completionTokens, 0)
    assert.equal(resetMetrics.queryCount, 0)
  })
})
