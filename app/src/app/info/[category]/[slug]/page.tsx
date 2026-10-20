import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import Link from 'next/link'

import { renderMarkdown } from '@/lib/markdown'
import { getPublishedBySlug, CATEGORY_LABELS } from '@/server/info/queries'

type Params = Promise<{ slug: string }>

/** Per-article SEO metadata. */
export async function generateMetadata({
  params,
}: {
  params: Params
}): Promise<Metadata> {
  const { slug } = await params
  try {
    const article = await getPublishedBySlug(slug)
    if (!article) return { title: 'Article not found | NYSC-Hub' }
    return {
      title: `${article.title} | NYSC-Hub`,
      description: article.excerpt,
    }
  } catch {
    return { title: 'NYSC-Hub' }
  }
}

/**
 * /info/[category]/[slug] — one published article, rendered from markdown.
 * Drafts 404 here: the public path only ever serves `published` status.
 *
 * Blocking route: the article body comes from the database, so there is
 * no shell worth streaming. SEO metadata is still generated per-article.
 */
export const instant = false

export default async function ArticlePage({
  params,
}: {
  params: Params
}) {
  const { slug } = await params
  // The Mongo driver calls Date.now() while connecting; Cache Components
  // forbids that during prerender, so opt into request time.
  await connection()

  const article = await getPublishedBySlug(slug)
  if (!article) notFound()

  const html = await renderMarkdown(article.body)

  const category = article.category

  return (
    <article className="mx-auto max-w-3xl space-y-6 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/info" className="text-primary underline">
          Info Hub
        </Link>{' '}
        / {CATEGORY_LABELS[category]}
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">{article.title}</h1>
        {article.reviewedAt && (
          <p className="text-xs text-muted">
            Last reviewed {article.reviewedAt.toLocaleDateString('en-GB')}
          </p>
        )}
      </header>

      <div
        className="prose prose-sm max-w-none text-foreground"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {article.sources.length > 0 && (
        <section aria-labelledby="sources" className="border-t border-border pt-4">
          <h2 id="sources" className="mb-2 text-sm font-semibold text-foreground">
            Sources
          </h2>
          <ul className="space-y-1">
            {article.sources.map((source, i) => (
              <li key={i} className="text-sm">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  {source.title}
                </a>
                {source.checkedAt && (
                  <span className="ml-2 text-xs text-muted">
                    (checked {source.checkedAt.toLocaleDateString('en-GB')})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {article.campIds.length > 0 && (
        <section aria-labelledby="camps" className="border-t border-border pt-4">
          <h2 id="camps" className="mb-2 text-sm font-semibold text-foreground">
            Related camps
          </h2>
          <p className="text-sm text-muted">
            This article is linked to {article.campIds.length} camp
            {article.campIds.length === 1 ? '' : 's'} in the directory.
          </p>
        </section>
      )}
    </article>
  )
}
