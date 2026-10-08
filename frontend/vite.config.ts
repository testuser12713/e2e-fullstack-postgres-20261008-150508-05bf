/// <reference types="vitest/config" />
import { configDefaults } from 'vitest/config'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBaseUrl = env.VITE_API_BASE_URL || 'http://localhost:8000'

  const proxy = {
    '/api': {
      target: apiBaseUrl,
      changeOrigin: true,
    },
  }

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy,
    },
    preview: {
      port: 5173,
      proxy,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/setupTests.ts'],
      css: true,
      exclude: [...configDefaults.exclude, 'e2e/**'],
    },
  }
})
