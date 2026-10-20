import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import { getArticleForAdmin } from '@/server/info/queries'
import { ArticleEditorPageClient } from '@/components/info/ArticleEditorPageClient'
import { requirePlatformAdmin } from '@/lib/auth-guards'
import type { ArticleEditorData } from '@/components/info/ArticleEditor'

/**
 * /admin/info/[slug] — the markdown editor for one article (Task 15).
 *
 * Guarded server-side: the shell renders only for platform admins, and the
 * API routes the client posts to enforce the same guard again. Blocking
 * route (`instant = false`): the guard + article load hit the database, so
 * there is no shell worth prerendering.
 */
export const instant = false

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  await connection()

  const guard = await requirePlatformAdmin()
  if (!guard.ok) {
    notFound()
  }

  const { slug } = await params
  const article = await getArticleForAdmin(slug)
  if (!article) {
    notFound()
  }

  // Sources are stored as structured records; the editor edits them as
  // "Title — URL" lines, which is far friendlier to type by hand.
  const sources = article.sources
    .map((s) => `${s.title} — ${s.url}`)
    .join('\n')

  const initial: ArticleEditorData = {
    title: article.title,
    category: article.category,
    body: article.body,
    tags: article.tags.join(', '),
    sources,
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Edit article</h1>
        <p className="text-sm text-muted">
          Markdown with live preview. Output is sanitized on render, both here
          and on the public page.
        </p>
      </header>
      <ArticleEditorPageClient
        slug={article.slug}
        initial={initial}
        initialStatus={article.status}
      />
    </div>
  )
}
