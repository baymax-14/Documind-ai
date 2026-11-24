/**
 * On-Device AI Model Service.
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

/**
 * On-device text models, all shipped in WebLLM's prebuilt list. Each model has a
 * 32-bit-float build that runs on any WebGPU adapter and a 16-bit build that is
 * smaller and faster on adapters with the `shader-f16` feature; the engine picks
 * the 16-bit build when it can.
 *
 * Download sizes are approximate weight shard totals. VRAM figures come from
 * WebLLM's own model records.
 */
export const EVALUATED_MODELS = [
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC',
    f16Id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 1.5B Instruct',
    tier: 'recommended',
    sizeBytes: 1000 * 1024 * 1024,
    sizeDisplay: '~1 GB',
    vramMB: 1890,
    vramRequirement: '~1.9 GB VRAM',
    memoryDisplay: '~1.9 GB',
    license: 'Apache 2.0',
    type: 'text',
    strengths: 'Reliable cited answers that combine several passages. The best balance of quality and size.',
  },
  {
    id: 'Qwen2.5-3B-Instruct-q4f32_1-MLC',
    f16Id: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 3B Instruct',
    tier: 'best',
    sizeBytes: 1800 * 1024 * 1024,
    sizeDisplay: '~1.8 GB',
    vramMB: 2900,
    vramRequirement: '~2.9 GB VRAM',
    memoryDisplay: '~2.9 GB',
    license: 'Apache 2.0',
    type: 'text',
    strengths: 'Highest answer quality. Needs a dedicated or recent integrated GPU.',
  },
  {
    id: 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC',
    f16Id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 0.5B Instruct',
    tier: 'light',
    sizeBytes: 350 * 1024 * 1024,
    sizeDisplay: '~350 MB',
    vramMB: 1060,
    vramRequirement: '~1 GB VRAM',
    memoryDisplay: '~1 GB',
    license: 'Apache 2.0',
    type: 'text',
    strengths: 'Small and quick. Good for short factual questions; weaker at combining passages.',
  },
  {
    id: 'SmolLM2-360M-Instruct-q4f32_1-MLC',
    f16Id: 'SmolLM2-360M-Instruct-q4f16_1-MLC',
    name: 'SmolLM2 360M Instruct',
    tier: 'lightest',
    sizeBytes: 230 * 1024 * 1024,
    sizeDisplay: '~230 MB',
    vramMB: 580,
    vramRequirement: '~600 MB VRAM',
    memoryDisplay: '~600 MB',
    license: 'Apache 2.0',
    type: 'text',
    strengths: 'Lightest download for low-memory devices. Answers are mostly close paraphrases.',
  },
]

export const DEFAULT_MODEL_ID = EVALUATED_MODELS[0].id

/** All models share WebLLM's 4,096-token context window. */
const CONTEXT_WINDOW_TOKENS = 4096
/** Tokens reserved for the answer. */
export const MAX_ANSWER_TOKENS = 512
/** Rough characters-per-token ratio for English prose (used only for budgeting). */
const CHARS_PER_TOKEN = 3.6
/** Character budget for passages after the instructions and answer are reserved. */
export const PASSAGE_CHAR_BUDGET = Math.floor(
  (CONTEXT_WINDOW_TOKENS - MAX_ANSWER_TOKENS - 400) * CHARS_PER_TOKEN,
)

/**
 * Look up a model record by either of its build ids.
 *
 * @param {string} modelId
 * @returns {typeof EVALUATED_MODELS[number] | undefined}
 */
export function findModel(modelId) {
  return EVALUATED_MODELS.find((m) => m.id === modelId || m.f16Id === modelId)
}

/**
 * Choose the build to load: the 16-bit build when the adapter supports
 * `shader-f16`, otherwise the 32-bit build.
 *
 * @param {string} modelId
 * @param {boolean} supportsF16
 * @returns {string}
 */
export function resolveModelBuild(modelId, supportsF16) {
  const model = findModel(modelId)
  if (!model) return modelId
  return supportsF16 && model.f16Id ? model.f16Id : model.id
}

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
        shaderF16: Boolean(adapter.features?.has?.('shader-f16')),
        maxBufferMB: adapter.limits?.maxBufferSize
          ? Math.round(adapter.limits.maxBufferSize / (1024 * 1024))
          : null,
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
 * Trim passages so the prompt fits the model's context window. Passages are
 * kept in rank order; the last one that fits is cut at a sentence boundary.
 *
 * @param {Array<{ text: string }>} chunks
 * @param {number} [budget=PASSAGE_CHAR_BUDGET]
 * @returns {Array<any>}
 */
export function fitPassagesToBudget(chunks, budget = PASSAGE_CHAR_BUDGET) {
  const out = []
  let used = 0
  for (const chunk of chunks) {
    const text = (chunk.text || '').trim()
    const remaining = budget - used
    if (remaining < 200) break
    if (text.length <= remaining) {
      out.push(chunk)
      used += text.length
      continue
    }
    const cut = text.slice(0, remaining)
    const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('.\n'))
    out.push({ ...chunk, text: `${lastStop > 120 ? cut.slice(0, lastStop + 1) : cut}…` })
    break
  }
  return out
}

/**
 * Construct a strictly grounded prompt instructing the model to use only
 * the provided evidence passages with citations [1], [2], etc.
 *
 * @param {string} question - The user query.
 * @param {Array<{ id?: number, docName: string, locator: string, text: string }>} chunks
 * @returns {Array<{ role: string, content: string }>}
 */
export function buildGroundedMessages(question, chunks) {
  const contextBlocks = chunks
    .map((c, i) => `[Passage ${i + 1}] Source: ${c.docName} (${c.locator})\n${c.text}`)
    .join('\n\n')

  const systemPrompt = `You are DocuMind AI, a document assistant that runs on the user's own device.
Your answers must be grounded strictly and exclusively in the provided document passages.
Rules:
1. Cite the relevant passage number using brackets (e.g. [1], [2]) after every sentence that uses it. Only cite passage numbers that exist.
2. If the passages do not contain enough information to answer, say "The documents do not answer this." and stop. Do not guess.
3. Do NOT add facts, numbers, names, or recommendations that are not written in the passages. Copy figures exactly as written.
4. If passages disagree, say so and cite each side.
5. Answer directly in a few sentences or a short list. Do not repeat the question or describe the passages.`

  const userPrompt = `Passages:\n\n${contextBlocks}\n\nQuestion: ${question}\n\nAnswer using only the passages above, with bracketed citations:`

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]
}

/**
 * Check the bracketed citations in a generated answer against the passages
 * that were actually sent. References to passages that do not exist are
 * removed from the text.
 *
 * @param {string} answer
 * @param {number} passageCount
 * @returns {{ text: string, citedIds: number[], invalidIds: number[] }}
 */
export function validateCitations(answer, passageCount) {
  const cited = new Set()
  const invalid = new Set()
  const text = answer
    .replace(/\[(\d+(?:\s*,\s*\d+)*)\]/g, (_m, group) => {
      const ids = group.split(',').map((s) => Number(s.trim()))
      const kept = ids.filter((n) => n >= 1 && n <= passageCount)
      ids.filter((n) => !(n >= 1 && n <= passageCount)).forEach((n) => invalid.add(n))
      kept.forEach((n) => cited.add(n))
      return kept.length > 0 ? kept.map((n) => `[${n}]`).join('') : ''
    })
    .replace(/[ \t]+([.,;:])/g, '$1')
    .trim()

  return {
    text,
    citedIds: [...cited].sort((a, b) => a - b),
    invalidIds: [...invalid].sort((a, b) => a - b),
  }
}

/**
 * Create or initialize an on-device engine with progress updates and cancellation.
 *
 * @param {Object} options
 * @param {string} [options.modelId]
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
  const buildId = resolveModelBuild(modelId, gpuCheck.info?.shaderF16)

  // 2. Load WebLLM (bundled as its own lazy chunk) and confirm it ships this model
  const webllm = await import('@mlc-ai/web-llm')
  const known = webllm.prebuiltAppConfig?.model_list?.some((m) => m.model_id === buildId)
  if (!known) {
    throw new Error(`The model ${buildId} is not available in this version of WebLLM.`)
  }
  if (signal?.aborted) {
    throw new DOMException('Model initialization cancelled by user.', 'AbortError')
  }

  // 3. Download (or read from the browser cache) and compile the model on the GPU.
  // WebLLM cannot cancel a load in flight, so a cancel rejects at once and the
  // engine is unloaded as soon as the load settles.
  let cancelled = false
  const enginePromise = webllm.CreateMLCEngine(buildId, {
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
    modelId: buildId,
    modelName: findModel(buildId)?.name || buildId,
    type: 'webllm',
    chatCompletion: async ({
      messages,
      temperature,
      max_tokens: maxTokens,
      signal: completionSignal,
      onToken,
    }) => {
      if (completionSignal?.aborted) {
        throw new DOMException('Generation cancelled by user.', 'AbortError')
      }
      const onAbort = () => engine.interruptGenerate()
      completionSignal?.addEventListener('abort', onAbort, { once: true })
      try {
        if (typeof onToken !== 'function') {
          const response = await engine.chat.completions.create({
            messages,
            temperature,
            max_tokens: maxTokens,
          })
          if (completionSignal?.aborted) {
            throw new DOMException('Generation cancelled by user.', 'AbortError')
          }
          return response
        }

        // Streamed generation: hand each piece to the caller as it arrives.
        const stream = await engine.chat.completions.create({
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: true,
        })
        let content = ''
        for await (const part of stream) {
          const delta = part.choices?.[0]?.delta?.content || ''
          if (delta) {
            content += delta
            onToken(delta, content)
          }
        }
        if (completionSignal?.aborted) {
          throw new DOMException('Generation cancelled by user.', 'AbortError')
        }
        return { choices: [{ message: { role: 'assistant', content } }] }
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
 * @param {(delta: string, soFar: string) => void} [options.onToken] - Streaming callback.
 * @returns {Promise<{ answer: string, citations: Array<any>, excerpts: Array<any>, hasEvidence: boolean, isRealModel: boolean, citedIds?: number[], uncited?: boolean }>}
 */
export async function generateAnswerWithFallback({
  question,
  retrievedChunks,
  engine = null,
  signal = null,
  onToken,
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

  // 2. Format citations from retrieved chunks (trimmed to fit the context window)
  const fitted = fitPassagesToBudget(retrievedChunks)
  const citations = fitted.map((chunk, index) => ({
    id: index + 1,
    docId: chunk.docId,
    docName: chunk.docName,
    docType: chunk.docType,
    chunkIndex: chunk.chunkIndex,
    locator: chunk.locator,
    page: chunk.page,
    bbox: chunk.bbox,
    text: chunk.text,
    rerankScore: chunk.rerankScore,
    rerankMethod: chunk.rerankMethod,
  }))

  // 3. If an on-device engine is initialized and ready, run local inference
  if (engine && typeof engine.chatCompletion === 'function') {
    try {
      const messages = buildGroundedMessages(question, citations)
      const response = await engine.chatCompletion({
        messages,
        temperature: 0.1, // Low temperature for factual, deterministic grounding
        max_tokens: MAX_ANSWER_TOKENS,
        signal,
        onToken,
      })

      const generatedText = response.choices?.[0]?.message?.content?.trim()
      if (generatedText) {
        const checked = validateCitations(generatedText, citations.length)
        const declined = /documents do not answer/i.test(checked.text)
        return {
          answer: checked.text,
          citations,
          excerpts: citations,
          citedIds: checked.citedIds,
          // A substantive answer with no valid citation cannot be traced to a passage.
          uncited: !declined && checked.citedIds.length === 0,
          hasEvidence: !declined,
          isRealModel: true,
          modelName: engine.modelName,
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') throw err
      console.warn('[DocuMind AI] On-device model error, falling back to evidence preview:', err)
    }
  }

  // 4. Default / Fallback: Deterministic Evidence Preview
  const fallback = await generateGroundedAnswer(question, fitted, signal)
  return {
    ...fallback,
    isRealModel: false,
  }
}
