/**
 * Web Worker that runs the sentence-embedding model off the main thread.
 *
 * Messages in:  { type: 'load', id } | { type: 'embed', id, texts: string[] }
 * Messages out: { type: 'progress', progress, text } | { type: 'ready', id }
 *               | { type: 'embedded', id, data: Float32Array, dim }
 *               | { type: 'error', id?, message }
 */
import { env, pipeline } from '@huggingface/transformers'
import { EMBEDDING_MODEL } from './embeddings.js'

// Models come from the Hugging Face hub and are cached by the browser;
// there is no local /models folder on this site.
env.allowLocalModels = false

let extractorPromise = null

function load() {
  if (!extractorPromise) {
    const files = new Map()
    extractorPromise = pipeline('feature-extraction', EMBEDDING_MODEL, {
      dtype: 'q8',
      progress_callback: (p) => {
        if (p.status === 'progress' && p.file) {
          files.set(p.file, { loaded: p.loaded || 0, total: p.total || 0 })
          let loaded = 0
          let total = 0
          for (const f of files.values()) { loaded += f.loaded; total += f.total }
          self.postMessage({
            type: 'progress',
            progress: total ? loaded / total : 0,
            text: `Downloading search model (${Math.round(loaded / 1048576)} of ${Math.round(total / 1048576)} MB)`,
          })
        }
      },
    })
    extractorPromise.catch(() => { extractorPromise = null })
  }
  return extractorPromise
}

self.onmessage = async (event) => {
  const msg = event.data || {}
  try {
    if (msg.type === 'load') {
      await load()
      self.postMessage({ type: 'ready', id: msg.id })
      return
    }
    if (msg.type === 'embed') {
      const extractor = await load()
      const output = await extractor(msg.texts, { pooling: 'cls', normalize: true })
      const data = Float32Array.from(output.data)
      self.postMessage({ type: 'embedded', id: msg.id, data, dim: output.dims[1] }, [data.buffer])
    }
  } catch (err) {
    self.postMessage({ type: 'error', id: msg.id, message: err?.message || String(err) })
  }
}
