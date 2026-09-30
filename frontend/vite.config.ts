import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // pdf.js is imported lazily: pre-bundle it so the first PDF import doesn't trigger a dependency re-optimization mid-conversion.
  optimizeDeps: { include: ['pdfjs-dist'] },
  // In dev, the API runs in Docker (docker compose up backend).
  server: { proxy: { '/api': 'http://localhost:8000' } },
})
