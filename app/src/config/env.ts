import { z } from 'zod'

/**
 * Application environment schema.
 * Source convention: all external input is validated with Zod at the boundary —
 * environment variables included. Fails fast with a readable error so a missing
 * variable is a 5-second diagnosis, not a mystery at runtime.
 *
 * Usage:
 *   import { env } from '@/config/env'
 *   env.MONGODB_URI
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  MONGODB_URI: z
    .string()
    .url('MONGODB_URI must be a valid MongoDB connection URL'),
  NEXTAUTH_SECRET: z
    .string()
    .min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url().optional(),
  EMAIL_FROM: z.string().email().optional(),
  RESEND_API_KEY: z.string().optional(),
})

function loadEnv() {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    // Deliberately thrown during module load: the app cannot start safely with
    // an invalid environment, and a stack trace is useless here.
    throw new Error(`Invalid environment variables:\n${issues}`)
  }
  return parsed.data
}

export const env = loadEnv()
