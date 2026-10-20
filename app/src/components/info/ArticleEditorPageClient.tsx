'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { ArticleEditor, type ArticleEditorData } from '@/components/info/ArticleEditor'

/**
 * Client half of the article editor. Talks to the admin article API; every
 * mutation is guarded server-side, so this component carries no trust.
 */
type Status = 'draft' | 'published' | 'archived'

export function ArticleEditorPageClient({
  slug,
  initial,
  initialStatus,
}: {
  slug: string
  initial: ArticleEditorData
  initialStatus: Status
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>()
  const [status, setStatus] = useState<Status>(initialStatus)

  async function call(url: string, method: string, body?: unknown) {
    const response = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!response.ok) {
      const json = await response.json().catch(() => ({}))
      throw Object.assign(new Error(json.error ?? `HTTP ${response.status}`), {
        fieldErrors: json.fieldErrors,
      })
    }
    return response.json()
  }

  async function save(data: ArticleEditorData) {
    setSaving(true)
    setError('')
    setFieldErrors(undefined)
    try {
      await call(`/api/admin/info/${slug}`, 'PATCH', data)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'save failed')
      setFieldErrors((e as { fieldErrors?: Record<string, string[]> }).fieldErrors)
    } finally {
      setSaving(false)
    }
  }

  async function publish() {
    setPublishing(true)
    setError('')
    try {
      await call(`/api/admin/info/${slug}/publish`, 'POST')
      setStatus('published')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'publish failed')
    } finally {
      setPublishing(false)
    }
  }

  async function unpublish() {
    setPublishing(true)
    setError('')
    try {
      await call(`/api/admin/info/${slug}/unpublish`, 'POST')
      setStatus('draft')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unpublish failed')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <ArticleEditor
      slug={slug}
      initial={initial}
      existingStatus={status}
      onSave={save}
      onPublish={publish}
      onUnpublish={unpublish}
      saving={saving}
      publishing={publishing}
      error={error}
      fieldErrors={fieldErrors}
    />
  )
}
