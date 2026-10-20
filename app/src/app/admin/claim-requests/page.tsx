'use client'

import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/base/Button'

/**
 * /admin/claim-requests — the platform owner's review queue (Task 14).
 *
 * Every decision (approve / deny / revoke) posts to
 * /api/admin/claim-requests and is audited. Non-admins are rejected by the
 * API guard with 403 + an admin.access-denied AuditEntry, so this page
 * simply renders whatever the API authorizes — no client-side trust.
 */
type PendingRequest = {
  id: string
  message: string
  createdAt: string
  camp: { id: string; name: string; slug: string; state: string }
  requester: { email: string; name: string }
}

export default function ClaimRequestsPage() {
  const [requests, setRequests] = useState<PendingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const response = await fetch('/api/admin/claim-requests')
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${response.status}`)
      }
      const body = await response.json()
      return body.requests ?? []
    } catch (e) {
      throw e instanceof Error ? e : new Error('failed to load')
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    // setState only happens after an await, never synchronously in the
    // effect body (react-hooks/set-state-in-effect).
    void (async () => {
      try {
        const list = await load()
        if (!cancelled) {
          setRequests(list)
          setError('')
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [load])

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      const list = await load()
      setRequests(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to load')
    } finally {
      setLoading(false)
    }
  }

  async function decide(
    action: 'approve' | 'deny',
    requestId: string,
    note?: string,
  ) {
    setBusyId(requestId)
    setError('')
    try {
      const response = await fetch('/api/admin/claim-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, requestId, reviewNote: note }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${response.status}`)
      }
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'action failed')
    } finally {
      setBusyId('')
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Claim requests</h1>
          <p className="text-sm text-muted">
            Approving hands a camp workspace to the requester. Nothing is automatic.
          </p>
        </div>
        <Button variant="secondary" onClick={refresh} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </header>

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {loading && requests.length === 0 ? (
        <p className="text-sm text-muted">Loading the review queue…</p>
      ) : requests.length === 0 ? (
        <p className="rounded-md border border-border bg-surface p-4 text-sm text-muted">
          No pending claim requests. Every camp stays community-managed until a crew is approved.
        </p>
      ) : (
        <ul className="space-y-3">
          {requests.map((request) => (
            <li
              key={request.id}
              className="space-y-2 rounded-lg border border-border bg-surface p-4"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-foreground">
                    {request.requester.name}{' '}
                    <span className="font-normal text-muted">({request.requester.email})</span>
                  </p>
                  <p className="text-sm text-muted">
                    {request.camp.name} — {request.camp.state}
                  </p>
                </div>
                <a
                  href={`/camps/${request.camp.slug}`}
                  className="text-sm text-primary underline"
                >
                  View camp
                </a>
              </div>

              <p className="whitespace-pre-line text-sm text-foreground">{request.message}</p>

              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={() => decide('approve', request.id)}
                  disabled={busyId === request.id}
                >
                  {busyId === request.id ? 'Working…' : 'Approve'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => decide('deny', request.id)}
                  disabled={busyId === request.id}
                >
                  Deny
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
