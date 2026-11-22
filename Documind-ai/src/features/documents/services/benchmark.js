import { BENCHMARK_DATASET } from '../data/benchmarkDataset.js'
import { retrieveEvidenceChunks } from './aiChat.js'
import { sanitizeQueryText, validateCitationIntegrity } from './security.js'

/**
 * Runs the automated 50-item evaluation benchmark against the active document corpus.
 *
 * @param {import('../types/document.js').DocRecord[]} documents - Active library documents.
 * @param {typeof BENCHMARK_DATASET} [dataset=BENCHMARK_DATASET] - Benchmark test cases.
 * @returns {{
 *   totalQueries: number,
 *   passed: number,
 *   failed: number,
 *   metrics: {
 *     retrievalRecall: number,
 *     abstentionAccuracy: number,
 *     safetyDefenseScore: number,
 *     citationPrecision: number,
 *     overallPassRate: number,
 *   },
 *   details: Array<{
 *     id: string,
 *     category: string,
 *     question: string,
 *     passed: boolean,
 *     hasEvidence: boolean,
 *     expectedEvidence: boolean,
 *     notes: string,
 *   }>
 * }}
 */
export function runBenchmarkEvaluation(documents, dataset = BENCHMARK_DATASET) {
  let passedCount = 0
  let answerableTotal = 0
  let answerableRetrieved = 0
  let unanswerableTotal = 0
  let unanswerableAbstained = 0
  let injectionTotal = 0
  let injectionDefended = 0
  let totalCitations = 0
  let validCitations = 0

  const details = []

  for (const item of dataset) {
    const isInjectionCheck = Boolean(item.sanitizeCheck)
    if (isInjectionCheck) injectionTotal += 1

    // Sanitize query
    const cleanQuery = sanitizeQueryText(item.question)

    // Verify delimiters were sanitized
    if (isInjectionCheck) {
      const hasDelimiters = /<\|im_start\|>|<\|im_end\|>|\[SYSTEM\]|<<SYS>>|```system/i.test(cleanQuery)
      if (!hasDelimiters) injectionDefended += 1
    }

    // Run retrieval
    const retrieval = retrieveEvidenceChunks(documents, cleanQuery, 3)

    let itemPassed = false
    let note = ''

    if (item.mustHaveEvidence) {
      answerableTotal += 1
      if (retrieval.hasEvidence && retrieval.chunks.length > 0) {
        answerableRetrieved += 1

        // Verify keyword presence in retrieved candidate chunks (Recall@k)
        const combinedChunkText = retrieval.chunks.map((c) => (c.text || '').toLowerCase()).join(' ')
        const matchedKeywords = (item.expectedKeywords || []).filter((kw) =>
          combinedChunkText.includes(kw.toLowerCase())
        )

        // Check citation validity
        for (const chunk of retrieval.chunks) {
          totalCitations += 1
          const parentDoc = documents.find((d) => d.id === chunk.docId)
          if (parentDoc) {
            const integrity = validateCitationIntegrity(chunk, parentDoc)
            if (integrity.valid) validCitations += 1
          }
        }

        if (matchedKeywords.length > 0 || !item.expectedKeywords) {
          itemPassed = true
          note = `Retrieved ${retrieval.chunks.length} chunks. Matched: [${matchedKeywords.join(', ')}]`
        } else {
          itemPassed = false
          note = `Retrieved chunks did not contain expected keywords.`
        }
      } else {
        itemPassed = false
        note = `Expected evidence, but retrieval returned 0 chunks.`
      }
    } else {
      // Must abstain
      unanswerableTotal += 1
      if (!retrieval.hasEvidence || retrieval.chunks.length === 0) {
        unanswerableAbstained += 1
        itemPassed = true
        note = `Correctly abstained with 0 retrieved evidence chunks.`
      } else {
        itemPassed = false
        note = `Hallucination hazard: Returned ${retrieval.chunks.length} chunks for unanswerable question.`
      }
    }

    if (itemPassed) passedCount += 1

    details.push({
      id: item.id,
      category: item.category,
      question: item.question,
      passed: itemPassed,
      hasEvidence: retrieval.hasEvidence,
      expectedEvidence: item.mustHaveEvidence,
      notes: note,
    })
  }

  const retrievalRecall = answerableTotal > 0 ? (answerableRetrieved / answerableTotal) * 100 : 100
  const abstentionAccuracy = unanswerableTotal > 0 ? (unanswerableAbstained / unanswerableTotal) * 100 : 100
  const safetyDefenseScore = injectionTotal > 0 ? (injectionDefended / injectionTotal) * 100 : 100
  const citationPrecision = totalCitations > 0 ? (validCitations / totalCitations) * 100 : 100
  const overallPassRate = (passedCount / dataset.length) * 100

  return {
    totalQueries: dataset.length,
    passed: passedCount,
    failed: dataset.length - passedCount,
    metrics: {
      retrievalRecall: Number(retrievalRecall.toFixed(1)),
      abstentionAccuracy: Number(abstentionAccuracy.toFixed(1)),
      safetyDefenseScore: Number(safetyDefenseScore.toFixed(1)),
      citationPrecision: Number(citationPrecision.toFixed(1)),
      overallPassRate: Number(overallPassRate.toFixed(1)),
    },
    details,
  }
}
