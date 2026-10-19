import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'

import { Card } from '@/components/base/Card'
import { CampStatusBadge } from '@/components/camps/CampStatusBadge'
import { getCamps, listCampStates } from '@/server/camps/queries'

export const metadata: Metadata = {
  title: 'NYSC Orientation Camps | NYSC-Hub',
  description:
    'All 37 NYSC permanent orientation camps across Nigeria — addresses, locations, and travel info for prospective and serving corp members.',
}

/**
 * /camps — public camp directory (SPEC-camps.md).
 *
 * Cache Components (Next 16): searchParams is request-bound, so it is read
 * inside a Suspense boundary rather than at the top of the page. The header
 * stays a static shell; the directory streams in per request.
 */
export default function CampsPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; q?: string }>
}) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          NYSC Orientation Camps
        </h1>
        <p className="mt-1 text-sm text-muted">
          All 37 permanent orientation camps across the 36 states and FCT.
        </p>
      </header>

      <Suspense fallback={<DirectorySkeleton />}>
        <CampDirectory searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

function DirectorySkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-label="Loading camps">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-24 rounded-lg border border-border bg-surface p-4"
        />
      ))}
    </div>
  )
}

export async function CampDirectory({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; q?: string }>
}) {
  const { state, q } = await searchParams
  const [camps, states] = await Promise.all([
    getCamps({ state, search: q }),
    listCampStates(),
  ])

  return (
    <>
      {/* Filter + search. GET-based so it is bookmarkable and crawlable. */}
      <form className="mb-6 flex flex-col gap-3 sm:flex-row" method="GET">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-foreground">State</span>
          <select
            name="state"
            defaultValue={state ?? 'All'}
            className="min-h-[44px] rounded-md border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="All">All states</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-medium text-foreground">Search</span>
          <input
            name="q"
            type="search"
            defaultValue={q ?? ''}
            placeholder="Camp, city, or address..."
            className="min-h-[44px] rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </label>
        <button
          type="submit"
          className="min-h-[44px] rounded-md bg-primary px-5 text-sm font-medium text-white"
        >
          Filter
        </button>
      </form>

      {camps.length === 0 ? (
        <Card>
          <Card.Content>
            <p className="text-muted">
              No camps match this filter.{' '}
              <Link href="/camps" className="text-primary underline">
                Clear filters
              </Link>
              .
            </p>
          </Card.Content>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {camps.map((camp) => (
            <li key={camp.slug}>
              <Link href={`/camps/${camp.slug}`} className="block">
                <Card className="transition-shadow hover:shadow-md">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-foreground">
                        {camp.name}
                      </h2>
                      <p className="text-sm text-muted">
                        {camp.city}, {camp.state}
                      </p>
                      <p className="mt-1 text-sm text-muted line-clamp-2">
                        {camp.address}
                      </p>
                    </div>
                    <CampStatusBadge status={camp.status} />
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
