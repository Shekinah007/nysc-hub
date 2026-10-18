'use client'

/**
 * Root error boundary. Catches unexpected errors in any route segment and keeps
 * the user inside the app shell instead of a blank page.
 * Docs: https://nextjs.org/docs/app/api-reference/file-conventions/error
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Something went wrong
        </h1>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          An unexpected error occurred. Try again, and if it persists, refresh
          the page.
        </p>
        <button
          onClick={reset}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            border: '1px solid #ccc',
            background: '#fff',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
        {error.digest && (
          <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#999' }}>
            Reference: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
