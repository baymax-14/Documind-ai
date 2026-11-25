import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import ocrAssets from './vite.ocrAssets.js'

export default defineConfig({
  plugins: [react(), tailwindcss(), ocrAssets()],
  // The search-model worker imports transformers.js on first use; pre-bundling it
  // stops the dev server from reloading the page mid-session when that happens.
  optimizeDeps: {
    include: ['@huggingface/transformers', 'tesseract.js'],
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // WebLLM (about 6 MB) loads only when the user sets up the on-device model
          if (id.includes('node_modules/@mlc-ai/web-llm')) {
            return 'vendor-webllm'
          }
          if (id.includes('node_modules/gsap') || id.includes('node_modules/@gsap')) {
            return 'vendor-gsap'
          }
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router')) {
            return 'vendor-react'
          }
        },
      },
    },
  },
})
