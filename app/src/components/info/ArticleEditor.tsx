'use client'

import { useState } from 'react'

import { Button } from '@/components/base/Button'
import { renderMarkdown } from '@/lib/markdown'

/**
 * The live-preview markdown editor (SPEC-info-hub.md: "markdown editor with
 * live preview, publish/unpublish, category and camp tagging").
 *
 * The preview renders through the SAME sanitized pipeline as the public
 * article page, so what the editor sees is exactly what readers get —
 * scripts and event handlers stripped on both sides.
 */
type EditorState = {
  title: string
  category: 'documents' | 'fees' | 'travel' | 'relocation' | 'general'
  body: string
  tags: string
  sources: string
}

export type ArticleEditorData = EditorState

export function ArticleEditor({
  initial,
  slug,
  existingStatus,
  onSave,
  onPublish,
  onUnpublish,
  saving,
  publishing,
  error,
  fieldErrors,
}: {
  initial: EditorState
  slug: string
  existingStatus: 'draft' | 'published' | 'archived'
  onSave: (data: EditorState) => void
  onPublish: () => void
  onUnpublish: () => void
  saving: boolean
  publishing: boolean
  error: string
  fieldErrors?: Record<string, string[]>
}) {
  const [state, setState] = useState<EditorState>(initial)
  const [preview, setPreview] = useState('')

  async function updatePreview(body: string) {
    setPreview(await renderMarkdown(body))
  }

  function change<K extends keyof EditorState>(key: K, value: EditorState[K]) {
    setState((prev) => ({ ...prev, [key]: value }))
    if (key === 'body') updatePreview(value as string)
  }

  return (
    <div className="space-y-6">
      {error && (
        <p
          className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="mb-1 block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              id="title"
              value={state.title}
              onChange={(e) => change('title', e.target.value)}
              maxLength={160}
              className="w-full rounded-md border border-gray-300 p-2 text-sm"
            />
            {fieldErrors?.title && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.title[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="category" className="mb-1 block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              id="category"
              value={state.category}
              onChange={(e) => change('category', e.target.value as EditorState['category'])}
              className="w-full rounded-md border border-gray-300 p-2 text-sm"
            >
              <option value="documents">Documents</option>
              <option value="fees">Fees</option>
              <option value="travel">Travel</option>
              <option value="relocation">Relocation</option>
              <option value="general">General</option>
            </select>
          </div>

          <div>
            <label htmlFor="body" className="mb-1 block text-sm font-medium text-gray-700">
              Body (markdown)
            </label>
            <textarea
              id="body"
              value={state.body}
              onChange={(e) => change('body', e.target.value)}
              rows={18}
              className="w-full rounded-md border border-gray-300 p-2 font-mono text-sm"
            />
            {fieldErrors?.body && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.body[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="tags" className="mb-1 block text-sm font-medium text-gray-700">
              Tags (comma separated)
            </label>
            <input
              id="tags"
              value={state.tags}
              onChange={(e) => change('tags', e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="sources" className="mb-1 block text-sm font-medium text-gray-700">
              Sources (one per line: Title — URL)
            </label>
            <textarea
              id="sources"
              value={state.sources}
              onChange={(e) => change('sources', e.target.value)}
              rows={4}
              placeholder="NYSC FAQs — https://www.nysc.gov.ng/faq.html"
              className="w-full rounded-md border border-gray-300 p-2 font-mono text-sm"
            />
            {fieldErrors?.sources && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.sources[0]}</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="mb-2 text-sm font-medium text-gray-700">Live preview</h2>
            <div
              className="min-h-[24rem] rounded-md border border-gray-300 bg-white p-4 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: preview }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-4">
        <Button onClick={() => onSave(state)} disabled={saving}>
          {saving ? 'Saving…' : 'Save draft'}
        </Button>

        {existingStatus === 'published' ? (
          <Button variant="secondary" onClick={onUnpublish} disabled={publishing}>
            {publishing ? 'Working…' : 'Unpublish'}
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={onPublish}
            disabled={publishing || state.sources.trim().length === 0}
            title={state.sources.trim().length === 0 ? 'Publishing requires at least one source' : ''}
          >
            {publishing ? 'Working…' : 'Publish'}
          </Button>
        )}

        <span className="self-center text-xs text-gray-500">
          Status: <strong>{existingStatus}</strong> · /info/{state.category}/{slug}
        </span>
      </div>
    </div>
  )
}
