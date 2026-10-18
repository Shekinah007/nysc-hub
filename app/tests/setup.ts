import { beforeEach, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

/**
 * Runtime environment for tests. jsdom so React components render; module
 * setup handles React Testing Library cleanup between tests so DOM state
 * never leaks across cases.
 * Docs: https://vitest.dev/guide/environment.html
 */
beforeEach(() => {
  cleanup()
})

afterEach(() => {
  cleanup()
})
