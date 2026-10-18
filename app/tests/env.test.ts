import { describe, it, expect, vi, afterEach } from 'vitest'

/**
 * Environment schema contract test (SPEC-platform.md: "fails fast with a
 * readable error when a variable is missing"). Proves the failure mode before
 * any code depends on `env` at runtime.
 *
 * `env.ts` validates at module load, so each case resets the module registry
 * and re-imports with a freshly manipulated `process.env`.
 */

const REQUIRED_VARS = ['MONGODB_URI', 'NEXTAUTH_SECRET'] as const

function setEnv(overrides: Record<string, string | undefined>) {
  for (const key of REQUIRED_VARS) delete process.env[key]
  Object.assign(process.env, overrides)
}

async function importEnv() {
  vi.resetModules()
  return (await import('@/config/env')).env
}

describe('env schema', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    for (const key of REQUIRED_VARS) delete process.env[key]
  })

  it('fails fast when required variables are missing', async () => {
    setEnv({ MONGODB_URI: '', NEXTAUTH_SECRET: '' })
    await expect(importEnv()).rejects.toThrow('Invalid environment variables')
  })

  it('fails when NEXTAUTH_SECRET is shorter than 32 characters', async () => {
    setEnv({
      MONGODB_URI: 'mongodb://localhost:27017/test',
      NEXTAUTH_SECRET: 'too-short',
    })
    await expect(importEnv()).rejects.toThrow(
      'NEXTAUTH_SECRET must be at least 32 characters',
    )
  })

  it('rejects a malformed MONGODB_URI', async () => {
    setEnv({
      MONGODB_URI: 'not-a-url',
      NEXTAUTH_SECRET: 'a'.repeat(32),
    })
    await expect(importEnv()).rejects.toThrow(
      'MONGODB_URI must be a valid MongoDB connection URL',
    )
  })

  it('loads when all required variables are valid', async () => {
    setEnv({
      MONGODB_URI: 'mongodb://localhost:27017/test',
      NEXTAUTH_SECRET: 'a'.repeat(32),
    })
    await expect(importEnv()).resolves.toBeDefined()
  })
})
