'use client'

import { useState } from 'react'

import { Button } from '@/components/base/Button'

/**
 * Claim request form on the camp profile. Any signed-in user can submit;
 * unverified and unauthenticated users get the exact reason inline so the
 * next step is obvious (SPEC-camps.md: "any email-verified user").
 *
 * The form never reveals who else has requested a claim — requester
 * identity is review-queue-only.
 */
export function ClaimRequestForm({ campSlug }: { campSlug: string }) {
  const [message, setMessage] = useState('')
  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setState('submitting')
    setError('')

    const response = await fetch(`/api/camps/${campSlug}/claim-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })

    if (response.ok) {
      setState('success')
      return
    }

    let code = 'request failed'
    try {
      const body = await response.json()
      code = body.error ?? code
    } catch {
      // Malformed error body keeps the fallback message.
    }
    setError(code)
    setState('error')
  }

  if (state === 'success') {
    return (
      <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-800">
        <p className="font-semibold">Request submitted for review</p>
        <p className="mt-1">
          The NYSC-Hub team reviews every claim by hand. You will hear back by email before the
          camp workspace is handed over.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label htmlFor="claim-message" className="block text-sm font-medium text-gray-700">
        Why should you run this camp workspace?
      </label>
      <textarea
        id="claim-message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        minLength={10}
        maxLength={1000}
        placeholder="Which camp crew are you on, and what would you post here?"
        className="w-full rounded-md border border-gray-300 p-2 text-sm"
      />
      <p className="text-xs text-gray-500">{message.length}/1000 characters</p>

      {state === 'error' && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" disabled={state === 'submitting' || message.trim().length < 10}>
        {state === 'submitting' ? 'Sending…' : 'Request to run this camp'}
      </Button>
    </form>
  )
}
