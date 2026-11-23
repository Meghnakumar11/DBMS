import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    strictPort: true,
    // Forward /api calls to the Express backend so the browser sees one origin.
    proxy: { '/api': 'http://localhost:5050' },
  },
})
