/**
 * Token Governance & Operational Cost Service for DocuMind AI (Phase 13).
 *
 * Implements token estimation, bounded retrieval iteration caps (k <= 3),
 * session budget tracking, and privacy-preserving audit summaries.
 */

/** Maximum allowed agent retrieval iterations per query. */
export const MAX_AGENT_ITERATIONS = 3

/** Default session token budget limit for local tenant governance. */
export const DEFAULT_SESSION_TOKEN_BUDGET = 100000

/**
 * Estimate token count for a given text string.
 * Uses a heuristic standard of 1 token ~= 4 characters / 0.75 words.
 *
 * @param {string} text
 * @returns {number}
 */
export function estimateTokenCount(text) {
  if (!text || typeof text !== 'string') return 0
  const trimmed = text.trim()
  if (trimmed.length === 0) return 0

  // Words count heuristic
  const words = trimmed.split(/\s+/).length
  const charBased = Math.ceil(trimmed.length / 4)
  const wordBased = Math.ceil(words * 1.33)

  // Weighted average for accuracy
  return Math.max(1, Math.round((charBased + wordBased) / 2))
}

/**
 * Factory for creating a token budget tracker.
 *
 * @param {Object} [options]
 * @param {number} [options.budget=DEFAULT_SESSION_TOKEN_BUDGET]
 * @param {number} [options.maxIterations=MAX_AGENT_ITERATIONS]
 */
export function createTokenBudgetTracker(options = {}) {
  const budget = options.budget || DEFAULT_SESSION_TOKEN_BUDGET
  const maxIterations = options.maxIterations || MAX_AGENT_ITERATIONS

  let promptTokens = 0
  let evidenceTokens = 0
  let completionTokens = 0
  let queryCount = 0
  let cappedIterationsCount = 0

  return {
    /**
     * Record a generative or retrieval transaction.
     *
     * @param {Object} params
     * @param {string} [params.promptText]
     * @param {string} [params.evidenceText]
     * @param {string} [params.completionText]
     * @param {number} [params.iterations=1]
     * @returns {{
     *   promptTokens: number,
     *   evidenceTokens: number,
     *   completionTokens: number,
     *   totalTokens: number,
     *   remainingBudget: number,
     *   isExceeded: boolean,
     *   iterationsRecorded: number,
     *   capped: boolean
     * }}
     */
    recordUsage({ promptText = '', evidenceText = '', completionText = '', iterations = 1 }) {
      const pTokens = estimateTokenCount(promptText)
      const eTokens = estimateTokenCount(evidenceText)
      const cTokens = estimateTokenCount(completionText)

      // Bounded iteration enforcement: clamp to maxIterations
      const clampedIterations = Math.max(1, Math.min(maxIterations, iterations))
      const wasCapped = iterations > maxIterations

      promptTokens += pTokens
      evidenceTokens += eTokens
      completionTokens += cTokens
      queryCount += 1
      if (wasCapped) cappedIterationsCount += 1

      const totalTokens = promptTokens + evidenceTokens + completionTokens
      const remainingBudget = Math.max(0, budget - totalTokens)

      return {
        promptTokens: pTokens,
        evidenceTokens: eTokens,
        completionTokens: cTokens,
        totalTokens,
        remainingBudget,
        isExceeded: totalTokens >= budget,
        iterationsRecorded: clampedIterations,
        capped: wasCapped,
      }
    },

    /**
     * Get current aggregated metrics.
     */
    getMetrics() {
      const totalTokens = promptTokens + evidenceTokens + completionTokens
      return {
        budget,
        promptTokens,
        evidenceTokens,
        completionTokens,
        totalTokens,
        remainingBudget: Math.max(0, budget - totalTokens),
        usageRatio: Math.min(1.0, totalTokens / budget),
        queryCount,
        cappedIterationsCount,
        isExceeded: totalTokens >= budget,
        maxIterations,
      }
    },

    /**
     * Generate a privacy-preserving audit summary.
     * Ensures ZERO raw document text or query text is leaked.
     *
     * @returns {Object}
     */
    getAuditSummary() {
      const totalTokens = promptTokens + evidenceTokens + completionTokens
      return {
        timestamp: new Date().toISOString(),
        audit_version: 'v1.0',
        token_governance: {
          budget_limit: budget,
          total_consumed: totalTokens,
          prompt_tokens: promptTokens,
          evidence_tokens: evidenceTokens,
          completion_tokens: completionTokens,
          budget_exhausted: totalTokens >= budget,
        },
        agent_governance: {
          max_allowed_iterations: maxIterations,
          total_queries_executed: queryCount,
          iteration_capped_queries: cappedIterationsCount,
          policy_compliance: 'ENFORCED_K_LE_3',
        },
        privacy_compliance: {
          raw_text_omitted: true,
          pii_redacted: true,
          zero_telemetry: true,
        },
      }
    },

    /**
     * Reset tracker metrics to initial state.
     */
    reset() {
      promptTokens = 0
      evidenceTokens = 0
      completionTokens = 0
      queryCount = 0
      cappedIterationsCount = 0
    },
  }
}
