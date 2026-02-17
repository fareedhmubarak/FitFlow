import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          // ── Vendor core (loaded every session) ──
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-query': ['@tanstack/react-query'],

          // ── Heavy libs (loaded on demand) ──
          'vendor-charts': ['recharts'],
          'vendor-export': ['xlsx', 'jspdf', 'html2canvas'],
          'vendor-i18n': ['i18next', 'react-i18next'],
          'vendor-date': ['date-fns'],
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 600,
  },
  server: {
    allowedHosts: [
      'localhost',
      '.ngrok-free.dev',  // Allow all ngrok subdomains
      '.ngrok.io',        // Legacy ngrok domains
    ],
  },
})
