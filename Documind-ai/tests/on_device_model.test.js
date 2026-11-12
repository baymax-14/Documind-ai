import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  checkWebGPUSupport,
  buildGroundedMessages,
  generateAnswerWithFallback,
  EVALUATED_MODELS,
  DEFAULT_MODEL_ID,
} from '../src/features/documents/services/onDeviceModel.js'

describe('On-Device Model Architecture & Fallback (Phase 5 Proof of Concept)', () => {
  const sampleChunks = [
    {
      docId: 'doc-1',
      docName: 'Architecture_Vision.pdf',
      docType: 'PDF',
      chunkIndex: 0,
      locator: 'Page 1',
      text: 'DocuMind AI runs all parsing, indexing, and synthesis locally on-device without cloud sync.',
    },
    {
      docId: 'doc-2',
      docName: 'Privacy_Spec.docx',
      docType: 'DOCX',
      chunkIndex: 1,
      locator: 'Section 2',
      text: 'Regulatory mandates forbid transmitting proprietary financial audits to external LLM servers.',
    },
  ]

  it('evaluates model candidates with verified Apache 2.0 license and download specs', () => {
    assert.equal(DEFAULT_MODEL_ID, 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC')
    assert.ok(EVALUATED_MODELS.length >= 2)

    for (const model of EVALUATED_MODELS) {
      assert.ok(model.id)
      assert.ok(model.sizeBytes > 0)
      assert.ok(model.sizeDisplay)
      assert.equal(model.license, 'Apache 2.0')
      assert.ok(model.vramRequirement)
    }
  })

  it('detects missing WebGPU gracefully and returns actionable guidance', async () => {
    // In Node.js environment, navigator.gpu is undefined
    const result = await checkWebGPUSupport()
    assert.equal(result.supported, false)
    assert.match(result.reason, /WebGPU is not supported in this browser/)
  })

  it('detects WebGPU when navigator.gpu adapter is available', async () => {
    // Mock navigator.gpu
    const originalGpu = globalThis.navigator.gpu
    Object.defineProperty(globalThis.navigator, 'gpu', {
      value: {
        requestAdapter: async () => ({
          info: { vendor: 'NVIDIA', architecture: 'Ada Lovelace', device: 'GeForce RTX 4090' },
        }),
      },
      configurable: true,
    })

    const result = await checkWebGPUSupport()
    assert.equal(result.supported, true)
    assert.equal(result.info.vendor, 'NVIDIA')

    // Restore
    if (originalGpu !== undefined) {
      Object.defineProperty(globalThis.navigator, 'gpu', { value: originalGpu, configurable: true })
    } else {
      delete globalThis.navigator.gpu
    }
  })

  it('constructs strictly grounded prompt enclosing retrieved passages with citations', () => {
    const messages = buildGroundedMessages('What are the privacy rules?', sampleChunks)

    assert.equal(messages.length, 2)
    assert.equal(messages[0].role, 'system')
    assert.match(messages[0].content, /grounded strictly and exclusively/)
    assert.match(messages[0].content, /Cite the relevant passage number using brackets/)

    assert.equal(messages[1].role, 'user')
    assert.match(messages[1].content, /\[Passage 1\] Source: Architecture_Vision\.pdf \(Page 1\)/)
    assert.match(messages[1].content, /What are the privacy rules\?/)
  })

  it('falls back to deterministic Evidence Preview when engine is null', async () => {
    const result = await generateAnswerWithFallback({
      question: 'on-device privacy',
      retrievedChunks: sampleChunks,
      engine: null,
    })

    assert.equal(result.isRealModel, false)
    assert.equal(result.hasEvidence, true)
    assert.equal(result.citations.length, 2)
    assert.ok(result.answer.includes(sampleChunks[0].text))
  })

  it('uses on-device model when active engine is supplied', async () => {
    const mockEngine = {
      chatCompletion: async ({ messages }) => {
        assert.ok(messages.length > 0)
        return {
          choices: [
            {
              message: {
                content:
                  'DocuMind AI runs all synthesis locally on-device [1], satisfying strict financial mandates against external server transmission [2].',
              },
            },
          ],
        }
      },
    }

    const result = await generateAnswerWithFallback({
      question: 'how does privacy work?',
      retrievedChunks: sampleChunks,
      engine: mockEngine,
    })

    assert.equal(result.isRealModel, true)
    assert.equal(result.hasEvidence, true)
    assert.match(result.answer, /DocuMind AI runs all synthesis locally on-device \[1\]/)
    assert.equal(result.citations.length, 2)
  })

  it('falls back to Evidence Preview if engine encounters an execution error', async () => {
    const failingEngine = {
      chatCompletion: async () => {
        throw new Error('Out of WebGPU memory')
      },
    }

    const result = await generateAnswerWithFallback({
      question: 'test fail',
      retrievedChunks: sampleChunks,
      engine: failingEngine,
    })

    assert.equal(result.isRealModel, false)
    assert.equal(result.hasEvidence, true)
    assert.ok(result.answer.includes(sampleChunks[0].text))
  })

  it('respects cancellation with AbortController in fallback and model modes', async () => {
    const controller = new AbortController()
    controller.abort()

    await assert.rejects(
      async () => {
        await generateAnswerWithFallback({
          question: 'cancel test',
          retrievedChunks: sampleChunks,
          signal: controller.signal,
        })
      },
      (err) => {
        assert.equal(err.name, 'AbortError')
        return true
      }
    )
  })

  it('refuses to call engine when zero evidence passages are retrieved', async () => {
    let engineCalled = false
    const mockEngine = {
      chatCompletion: async () => {
        engineCalled = true
        return { choices: [{ message: { content: 'hallucinated content' } }] }
      },
    }

    const result = await generateAnswerWithFallback({
      question: 'unrelated topic',
      retrievedChunks: [],
      engine: mockEngine,
    })

    assert.equal(engineCalled, false)
    assert.equal(result.hasEvidence, false)
    assert.equal(result.citations.length, 0)
    assert.match(result.answer, /No matching passages found/)
  })
})

