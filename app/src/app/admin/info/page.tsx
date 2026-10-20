import Link from 'next/link'
import { connection } from 'next/server'

import { listAllArticles } from '@/server/info/queries'

/**
 * /admin/info — the info-hub admin landing (Task 15).
 *
 * Lists every article regardless of status (drafts included — the queue's
 * whole purpose), with a link to the per-article editor. The editor route
 * itself is guarded server-side; this page renders only what the query
 * layer returns and trusts nothing client-side.
 *
 * Admin pages are intentionally blocking (`instant = false`): they hit the
 * database behind a guard, so there is nothing to prerender and no shell
 * worth streaming.
 */
export const instant = false

export default async function AdminInfoPage() {
  // Request time: DB access during prerender is forbidden under Cache
  // Components, and the guard below hits the database.
  await connection()
  const articles = await listAllArticles()

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Info Hub articles</h1>
          <p className="text-sm text-muted">
            Drafts are invisible on public routes until published.
          </p>
        </div>
        <Link
          href="/admin/info/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white"
        >
          New article
        </Link>
      </header>

      {articles.length === 0 ? (
        <p className="rounded-md border border-border bg-surface p-4 text-sm text-muted">
          No articles yet. Create the first one.
        </p>
      ) : (
        <ul className="space-y-2">
          {articles.map((article) => (
            <li
              key={article.slug}
              className="flex flex-col gap-1 rounded-md border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <Link
                  href={`/admin/info/${article.slug}`}
                  className="font-medium text-primary underline"
                >
                  {article.title}
                </Link>
                <p className="text-xs text-muted">
                  {article.category} · {article.tags.length} tags ·{' '}
                  {article.reviewedAt
                    ? `reviewed ${article.reviewedAt.toLocaleDateString('en-GB')}`
                    : 'never reviewed'}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
