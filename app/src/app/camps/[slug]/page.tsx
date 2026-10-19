import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { Card } from '@/components/base/Card'
import { CampStatusBadge } from '@/components/camps/CampStatusBadge'
import { getCampBySlug, mapsUrl } from '@/server/camps/queries'

type Params = Promise<{ slug: string }>

/** Per-camp metadata so the profile pages are SEO-indexable. */
export async function generateMetadata({
  params,
}: {
  params: Params
}): Promise<Metadata> {
  const { slug } = await params
  // Build time may have no DB connection; fall back to a generic title
  // rather than failing the build.
  try {
    const camp = await getCampBySlug(slug)
    if (!camp) {
      return { title: 'Camp not found | NYSC-Hub' }
    }
    return {
      title: `${camp.name}, ${camp.state} | NYSC-Hub`,
      description: `${camp.name} — ${camp.address}, ${camp.city}, ${camp.state}. Address, location, and travel info for NYSC orientation.`,
    }
  } catch {
    return { title: 'NYSC Orientation Camp | NYSC-Hub' }
  }
}

/**
 * /camps/[slug] — public camp profile (SPEC-camps.md).
 *
 * Cache Components (Next 16): params is awaited inside a Suspense boundary
 * so the shell prerenders and the profile streams in per request.
 */
export default function CampProfilePage({ params }: { params: Params }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link
        href="/camps"
        className="mb-4 inline-block text-sm text-primary underline"
      >
        ← All camps
      </Link>

      <Suspense fallback={<ProfileSkeleton />}>
        <CampProfile params={params} />
      </Suspense>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div
      className="h-48 rounded-lg border border-border bg-surface p-4"
      aria-label="Loading camp"
    />
  )
}

export async function CampProfile({ params }: { params: Params }) {
  const { slug } = await params
  const camp = await getCampBySlug(slug)
  if (!camp) {
    notFound()
  }

  const mapLink = mapsUrl(camp)

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{camp.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {camp.city}, {camp.state}
          </p>
        </div>
        <CampStatusBadge status={camp.status} />
      </header>

      <Card>
        <Card.Header title="Address" />
        <Card.Content>
          <p>{camp.address}</p>
          {mapLink && (
            <a
              href={mapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm text-primary underline"
            >
              Open in Google Maps
            </a>
          )}
        </Card.Content>
      </Card>

      {camp.travelInfo && (
        <Card>
          <Card.Header title="Travel info" />
          <Card.Content>
            <p className="whitespace-pre-line">{camp.travelInfo}</p>
          </Card.Content>
        </Card>
      )}

      {(camp.contactPhone || camp.contactEmail) && (
        <Card>
          <Card.Header title="Contact" />
          <Card.Content>
            {camp.contactPhone && <p>Phone: {camp.contactPhone}</p>}
            {camp.contactEmail && <p>Email: {camp.contactEmail}</p>}
          </Card.Content>
        </Card>
      )}

      {camp.description && (
        <Card>
          <Card.Header title="About this camp" />
          <Card.Content>
            <p className="whitespace-pre-line">{camp.description}</p>
          </Card.Content>
        </Card>
      )}

      <p className="text-xs text-muted">
        Address and coordinates sourced from NYSC&apos;s official camps
        page (fetched 2026-10-19).
      </p>
    </div>
  )
}
