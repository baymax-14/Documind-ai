/**
 * On-Device AI Model Service (Phase 6 Implementation).
 *
 * Provides WebGPU detection, on-device model lifecycle management,
 * and local inference with strict grounding and deterministic fallback.
 *
 * Privacy Guarantees:
 * 1. Model weights are downloaded once from HuggingFace/CDN and cached in browser Cache API.
 * 2. User documents, extracted text, and query prompts NEVER leave the local device.
 * 3. If WebGPU is unavailable or model download is deferred, falls back to local Evidence Preview.
 */

import { generateGroundedAnswer } from './aiChat.js'

export const DEFAULT_MODEL_ID = 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC'

/**
 * Evaluated on-device model configurations.
 */
export const EVALUATED_MODELS = [
  {
    id: 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC',
    name: 'Qwen 2.5 0.5B Instruct',
    sizeBytes: 350 * 1024 * 1024,
    sizeDisplay: '~350 MB',
    vramRequirement: '~800 MB VRAM',
    license: 'Apache 2.0',
    type: 'text',
    strengths: 'Accurate instruction following and excerpt extraction. Permissive Apache 2.0 license.',
  },
  {
    id: 'SmolLM2-360M-Instruct-q4f32_1-MLC',
    name: 'SmolLM2 360M Instruct',
    sizeBytes: 230 * 1024 * 1024,
    sizeDisplay: '~230 MB',
    vramRequirement: '~600 MB VRAM',
    license: 'Apache 2.0',
    type: 'text',
    strengths: 'Lightest download footprint, low memory overhead for mobile or low-end devices.',
  },
  {
    id: 'Qwen2-VL-2B-Instruct-q4f32_1-MLC',
    name: 'Qwen 2-VL 2B (Multimodal VLM)',
    sizeBytes: 1200 * 1024 * 1024,
    sizeDisplay: '~1.2 GB',
    vramRequirement: '~2.2 GB VRAM',
    license: 'Apache 2.0',
    type: 'multimodal',
    strengths: 'Multimodal Vision-Language Model. Reads document charts, plots, diagrams, and visual tables directly.',
  },
  {
    id: 'SmolVLM-500M-Instruct-q4f32_1-MLC',
    name: 'SmolVLM 500M (Lightweight VLM)',
    sizeBytes: 550 * 1024 * 1024,
    sizeDisplay: '~550 MB',
    vramRequirement: '~1.2 GB VRAM',
    license: 'Apache 2.0',
    type: 'multimodal',
    strengths: 'Compact multimodal model for fast on-device figure parsing and chart QA with low VRAM footprint.',
  },
]

/**
 * Check whether WebGPU is available and supported in the current environment.
 *
 * @returns {Promise<{ supported: boolean, reason?: string, info?: Object }>}
 */
export async function checkWebGPUSupport() {
  if (typeof navigator === 'undefined' || !navigator.gpu) {
    return {
      supported: false,
      reason:
        'WebGPU is not supported in this browser. Please use Chrome 113+, Edge 113+, or Safari 18+ with hardware acceleration enabled.',
    }
  }

  try {
    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) {
      return {
        supported: false,
        reason:
          'No compatible WebGPU adapter found. Hardware acceleration may be disabled in your browser settings.',
      }
    }

    return {
      supported: true,
      info: {
        vendor: adapter.info?.vendor || 'Unknown GPU Vendor',
        architecture: adapter.info?.architecture || 'Unknown',
        device: adapter.info?.device || 'GPU Device',
      },
    }
  } catch (err) {
    return {
      supported: false,
      reason: `WebGPU initialization failed: ${err.message || 'Unknown error'}`,
    }
  }
}

/**
 * Construct a strictly grounded prompt instructing the model to use only
 * the provided evidence passages with citations [1], [2], etc.
 *
 * @param {string} question - The user query.
 * @param {Array<{ id: number, docName: string, locator: string, text: string }>} chunks
 * @returns {Array<{ role: string, content: string }>}
 */
export function buildGroundedMessages(question, chunks) {
  const contextBlocks = chunks
    .map((c, i) => `[Passage ${i + 1}] Source: ${c.docName} (${c.locator})\n${c.text}`)
    .join('\n\n')

  const systemPrompt = `You are DocuMind AI, an on-device document assistant.
Your answers must be grounded strictly and exclusively in the provided document passages.
Rules:
1. Cite the relevant passage number using brackets (e.g. [1], [2]) for every claim you make.
2. If the passages do not contain enough information to answer the question, state honestly that the documents do not contain the answer.
3. Do NOT make up facts, statistics, or recommendations beyond what is explicitly written in the passages.
4. Keep answers concise, clear, and focused on the evidence.`

  const userPrompt = `Context passages:\n${contextBlocks}\n\nQuestion: ${question}\n\nPlease answer based only on the passages above with citations:`

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]
}

/**
 * Create or initialize an on-device engine with progress updates and cancellation.
 *
 * @param {Object} options
 * @param {string} options.modelId
 * @param {(progress: { progress: number, text: string }) => void} [options.onProgress]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<Object>} Active engine instance
 */
export async function initializeOnDeviceEngine({
  modelId = DEFAULT_MODEL_ID,
  onProgress,
  signal,
}) {
  if (signal?.aborted) {
    throw new DOMException('Model initialization cancelled by user.', 'AbortError')
  }

  // 1. Verify WebGPU hardware capability
  const gpuCheck = await checkWebGPUSupport()
  if (!gpuCheck.supported) {
    throw new Error(gpuCheck.reason || 'WebGPU is not supported in this browser.')
  }

  // 2. Load WebLLM (bundled as its own lazy chunk) and confirm it ships this model
  const webllm = await import('@mlc-ai/web-llm')
  const known = webllm.prebuiltAppConfig?.model_list?.some((m) => m.model_id === modelId)
  if (!known) {
    throw new Error(`The model ${modelId} is not available in this version of WebLLM.`)
  }
  if (signal?.aborted) {
    throw new DOMException('Model initialization cancelled by user.', 'AbortError')
  }

  // 3. Download (or read from the browser cache) and compile the model on the GPU.
  // WebLLM cannot cancel a load in flight, so a cancel rejects at once and the
  // engine is unloaded as soon as the load settles.
  let cancelled = false
  const enginePromise = webllm.CreateMLCEngine(modelId, {
    initProgressCallback: (report) => {
      if (cancelled) return
      onProgress?.({
        progress: typeof report.progress === 'number' ? report.progress : 0,
        text: report.text || 'Downloading model weights…',
      })
    },
  })

  const engine = await new Promise((resolve, reject) => {
    const onAbort = () => {
      cancelled = true
      enginePromise.then((e) => e.unload()).catch(() => {})
      reject(new DOMException('Model download cancelled by user.', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
    enginePromise.then(
      (e) => { signal?.removeEventListener('abort', onAbort); resolve(e) },
      (err) => { signal?.removeEventListener('abort', onAbort); reject(err) },
    )
  })

  // 4. Expose the engine through the small interface the rest of the app calls
  return {
    modelId,
    type: 'webllm',
    chatCompletion: async ({ messages, temperature, max_tokens: maxTokens, signal: completionSignal }) => {
      if (completionSignal?.aborted) {
        throw new DOMException('Generation cancelled by user.', 'AbortError')
      }
      const onAbort = () => engine.interruptGenerate()
      completionSignal?.addEventListener('abort', onAbort, { once: true })
      try {
        const response = await engine.chat.completions.create({
          messages,
          temperature,
          max_tokens: maxTokens,
        })
        if (completionSignal?.aborted) {
          throw new DOMException('Generation cancelled by user.', 'AbortError')
        }
        return response
      } finally {
        completionSignal?.removeEventListener('abort', onAbort)
      }
    },
    unload: async () => {
      await engine.unload()
      return true
    },
  }
}

/**
 * High-level generation service: attempts on-device model inference if loaded,
 * or gracefully falls back to deterministic local Evidence Preview.
 *
 * @param {Object} options
 * @param {string} options.question
 * @param {Array<any>} options.retrievedChunks
 * @param {Object} [options.engine] - Active engine instance (if loaded)
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{ answer: string, citations: Array<any>, excerpts: Array<any>, hasEvidence: boolean, isRealModel: boolean }>}
 */
export async function generateAnswerWithFallback({
  question,
  retrievedChunks,
  engine = null,
  signal = null,
}) {
  if (signal?.aborted) {
    throw new DOMException('Operation cancelled by user.', 'AbortError')
  }

  // 1. If retrieval yielded zero candidate passages, refuse early without model call
  if (!retrievedChunks || retrievedChunks.length === 0) {
    const fallback = await generateGroundedAnswer(question, [], signal)
    return {
      ...fallback,
      isRealModel: false,
    }
  }

  // 2. Format citations from retrieved chunks
  const citations = retrievedChunks.map((chunk, index) => ({
    id: index + 1,
    docId: chunk.docId,
    docName: chunk.docName,
    docType: chunk.docType,
    chunkIndex: chunk.chunkIndex,
    locator: chunk.locator,
    page: chunk.page,
    text: chunk.text,
  }))

  // 3. If an on-device engine is initialized and ready, run local inference
  if (engine && typeof engine.chatCompletion === 'function') {
    try {
      const messages = buildGroundedMessages(question, citations)
      const response = await engine.chatCompletion({
        messages,
        temperature: 0.2, // Low temperature for factual, deterministic grounding
        max_tokens: 380,
        signal,
      })

      const generatedText = response.choices?.[0]?.message?.content?.trim()
      if (generatedText) {
        return {
          answer: generatedText,
          citations,
          excerpts: citations,
          hasEvidence: true,
          isRealModel: true,
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') throw err
      console.warn('[DocuMind AI] On-device model error, falling back to evidence preview:', err)
    }
  }

  // 4. Default / Fallback: Deterministic Evidence Preview
  const fallback = await generateGroundedAnswer(question, retrievedChunks, signal)
  return {
    ...fallback,
    isRealModel: false,
  }
}
