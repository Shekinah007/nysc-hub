/**
 * Opt a render out of static prerendering (Next 16 Cache Components).
 *
 * The MongoDB driver calls Date.now() internally while connecting, and Next
 * treats Date.now() as an unstable value during prerendering — rendering a
 * camp page statically therefore fails with blocking-prerender-current-time.
 * Calling connection() before the first query makes the render request-time,
 * which is what these pages are (filter/search are per-request values).
 *
 * No-op outside a Next runtime (vitest, tsx seed scripts) so the same query
 * layer serves tests and scripts unchanged.
 * Docs: https://nextjs.org/docs/api-reference/functions/connection
 */
export async function requestTime(): Promise<void> {
  if (process.env.NEXT_RUNTIME) {
    const { connection } = await import('next/server')
    await connection()
  }
}
