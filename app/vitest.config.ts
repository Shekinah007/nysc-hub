import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

/**
 * Vitest configuration.
 * - jsdom environment so React components render in tests.
 * - `@/*` path alias to match the tsconfig used by the app.
 * - Module setup: RTL cleanup + jest-dom matchers.
 * Docs: https://vitest.dev/config/
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
