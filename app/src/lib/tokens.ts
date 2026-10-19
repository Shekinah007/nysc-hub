import { createHash, randomBytes } from 'node:crypto'

/**
 * Token utilities for email verification and password reset.
 *
 * Only a SHA-256 hash of each token is stored (see SPEC-identity.md), so a
 * leaked database cannot be used to hijack accounts. The raw token exists
 * only in the outbound email link.
 */

/** Random URL-safe token, 43 chars of entropy. */
export function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

/** SHA-256 hex digest — the form stored in EmailToken.tokenHash. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** 15-minute validity window. */
export const TOKEN_TTL_MS = 15 * 60 * 1000

export function tokenExpiry(): Date {
  return new Date(Date.now() + TOKEN_TTL_MS)
}
