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
    // MongoMemoryServer: every DB-backed test file spawns its own server in
    // its own worker (457MB each). Ten concurrent servers OOM each other
    // ("Instance closed unexpectedly"), so run the files one at a time.
    // Total wall time is comparable and CI is stable.
    fileParallelism: false,
    // MongoMemoryServer downloads its binary on first run, which can exceed
    // the default 10s hook timeout on a slow connection.
    hookTimeout: 120_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
