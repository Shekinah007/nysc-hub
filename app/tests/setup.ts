import { beforeEach, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

/**
 * Runtime environment for tests. jsdom so React components render; module
 * setup handles React Testing Library cleanup between tests so DOM state
 * never leaks across cases.
 * Docs: https://vitest.dev/guide/environment.html
 *
 * Database-backed tests use the dedicated harness in tests/db.ts instead —
 * spawning MongoMemoryServer here would make every component test wait on
 * a database it never touches.
 */
beforeEach(() => {
  cleanup()
})

afterEach(() => {
  cleanup()
})
