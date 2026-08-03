import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import inlineThemeBootstrap from './plugins/inline-theme-bootstrap.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), inlineThemeBootstrap()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  }
})
