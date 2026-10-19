/**
 * Camp read queries (SPEC-camps.md surface).
 *
 * Server-only. Pages call these and stay thin; tests cover the queries
 * directly against the seeded in-memory DB.
 */
import { Camp, type CampStatus } from '@/models/camps'
import { CAMP_STATUS_LABELS } from '@/models/camps/Camp'

export type CampListItem = {
  _id: string
  slug: string
  name: string
  state: string
  stateCode: string
  city: string
  address: string
  status: CampStatus
}

export type CampDetail = CampListItem & {
  coordinates?: { lat: number; lng: number }
  travelInfo?: string
  description?: string
  contactPhone?: string
  contactEmail?: string
  verifiedSource?: string
}

export function statusLabel(status: CampStatus): string {
  return CAMP_STATUS_LABELS[status]
}

/** All camps, optionally filtered by state name and/or free-text search. */
export async function getCamps(filters: {
  state?: string
  search?: string
} = {}): Promise<CampListItem[]> {
  const query: Record<string, unknown> = {}

  if (filters.state && filters.state !== 'All') {
    query.state = filters.state
  }

  const search = filters.search?.trim()
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { state: { $regex: search, $options: 'i' } },
      { city: { $regex: search, $options: 'i' } },
      { address: { $regex: search, $options: 'i' } },
    ]
  }

  const camps = await Camp.find(query).sort('state').lean()
  return camps.map((c) => ({
    _id: String(c._id),
    slug: c.slug,
    name: c.name,
    state: c.state,
    stateCode: c.stateCode,
    city: c.city,
    address: c.address,
    status: c.status,
  }))
}

/** Every distinct state name — populates the state filter. */
export async function listCampStates(): Promise<string[]> {
  const states = await Camp.distinct('state')
  return states.sort()
}

/** One camp by slug, or null when the slug is unknown. */
export async function getCampBySlug(slug: string): Promise<CampDetail | null> {
  const camp = await Camp.findOne({ slug: slug.toLowerCase() }).lean()
  if (!camp) return null
  return {
    _id: String(camp._id),
    slug: camp.slug,
    name: camp.name,
    state: camp.state,
    stateCode: camp.stateCode,
    city: camp.city,
    address: camp.address,
    status: camp.status,
    coordinates: camp.coordinates
      ? { lat: camp.coordinates.lat, lng: camp.coordinates.lng }
      : undefined,
    travelInfo: camp.travelInfo || undefined,
    description: camp.description || undefined,
    contactPhone: camp.contactPhone || undefined,
    contactEmail: camp.contactEmail || undefined,
    verifiedSource: camp.verifiedSource || undefined,
  }
}

/** Google Maps link from the camp's verified coordinates (SPEC-camps.md:
 * link out in v1, no embedded map). */
export function mapsUrl(camp: Pick<CampDetail, 'coordinates'>): string | null {
  if (!camp.coordinates) return null
  return `https://www.google.com/maps?q=${camp.coordinates.lat},${camp.coordinates.lng}`
}
