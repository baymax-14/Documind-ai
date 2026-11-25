import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)

/**
 * Serves the text-recognition (OCR) runtime from this site instead of a CDN,
 * so reading a scanned PDF sends nothing to another server.
 *
 * Published paths (all under /ocr/):
 *   worker.min.js                 tesseract.js worker
 *   core/tesseract-core-*.wasm.js the engine; the worker picks one for the browser
 *   lang/eng.traineddata.gz       English model (best_int, ~2.9 MB)
 *
 * The files are fetched only when someone asks for text recognition.
 */
function ocrFiles() {
  const tesseractDir = path.dirname(require.resolve('tesseract.js/package.json'))
  const coreDir = path.dirname(require.resolve('tesseract.js-core/package.json'))
  const langDir = path.dirname(require.resolve('@tesseract.js-data/eng/package.json'))
  const files = {
    'ocr/worker.min.js': path.join(tesseractDir, 'dist', 'worker.min.js'),
    'ocr/lang/eng.traineddata.gz': path.join(langDir, '4.0.0_best_int', 'eng.traineddata.gz'),
  }
  for (const variant of ['lstm', 'simd-lstm', 'relaxedsimd-lstm']) {
    const name = `tesseract-core-${variant}.wasm.js`
    files[`ocr/core/${name}`] = path.join(coreDir, name)
  }
  return files
}

const TYPES = { '.js': 'text/javascript', '.gz': 'application/octet-stream' }

export default function ocrAssets() {
  const files = ocrFiles()
  return {
    name: 'documind-ocr-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const key = decodeURIComponent((req.url || '').split('?')[0]).replace(/^\//, '')
        const source = files[key]
        if (!source) return next()
        res.setHeader('Content-Type', TYPES[path.extname(key)] || 'application/octet-stream')
        res.end(readFileSync(source))
      })
    },
    generateBundle() {
      for (const [fileName, source] of Object.entries(files)) {
        this.emitFile({ type: 'asset', fileName, source: readFileSync(source) })
      }
    },
  }
}
