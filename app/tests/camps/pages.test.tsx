/**
 * Camp page tests (SPEC-camps.md surface):
 *   - /camps renders all camps anonymously (no session required)
 *   - state filter and search narrow the list
 *   - status badges render the exact spec copy
 *   - /camps/[slug] renders the profile, unknown slug 404s
 *
 * Pages are async server components; these render them directly against the
 * seeded in-memory DB, which is exactly what an anonymous visitor hits.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { connectTestDb, disconnectTestDb } from '../db'
import { seedCamps } from '../../scripts/seed-camps'

import { CampDirectory } from '@/app/camps/page'
import { CampProfile } from '@/app/camps/[slug]/page'
import { Camp } from '@/models/camps'

describe('camp pages', () => {
  beforeAll(async () => {
    await connectTestDb()
    await seedCamps()
  })
  afterAll(async () => {
    await disconnectTestDb()
  })

    describe('/camps list page', () => {

    it('renders all 37 camps anonymously', async () => {
      const ui = await CampDirectory({ searchParams: Promise.resolve({}) })
      const { container } = render(ui)
      // Each camp card is a link to /camps/<slug>.
      const links = container.querySelectorAll('a[href^="/camps/"]')
      expect(links.length).toBe(37)
    })

    it('filters by state', async () => {
      const ui = await CampDirectory({
        searchParams: Promise.resolve({ state: 'Lagos' }),
      })
      const { container } = render(ui)
      const links = container.querySelectorAll('a[href^="/camps/"]')
      expect(links.length).toBe(1)
      expect(links[0].getAttribute('href')).toBe('/camps/lagos')
    })

    it('searches by city', async () => {
      const ui = await CampDirectory({
        searchParams: Promise.resolve({ q: 'Kubwa' }),
      })
      const { container } = render(ui)
      const links = container.querySelectorAll('a[href^="/camps/"]')
      expect(links.length).toBe(1)
      expect(links[0].getAttribute('href')).toBe('/camps/fct-abuja')
    })

    it('renders the exact spec status badge copy', async () => {
      // Flip one camp to each status so all three badges render.
      await Camp.updateOne({ stateCode: 'LA' }, { $set: { status: 'claimed' } })
      await Camp.updateOne({ stateCode: 'FC' }, { $set: { status: 'authorized' } })

      const ui = await CampDirectory({ searchParams: Promise.resolve({}) })
      const { container } = render(ui)
      const text = container.textContent ?? ''
      expect(text).toContain('Community-managed')
      expect(text).toContain('Claimed by camp crew (unofficial)')
      expect(text).toContain('Authorized by camp official')
    })

    it('shows the empty state when nothing matches', async () => {
      const ui = await CampDirectory({
        searchParams: Promise.resolve({ q: 'zzzz-none' }),
      })
      render(ui)
      expect(screen.getByText(/no camps match/i)).toBeTruthy()
    })
  })

    describe('/camps/[slug] profile page', () => {

    it('renders the camp profile with address and maps link', async () => {
      const ui = await CampProfile({ params: Promise.resolve({ slug: 'fct-abuja' }) })
      const { container } = render(ui)
      expect(screen.getByRole('heading', { name: /NYSC Permanent Orientation Camp/i })).toBeTruthy()
      expect(screen.getByText(/Kubwa/i)).toBeTruthy()
      const mapLink = screen.getByRole('link', { name: /open in google maps/i })
      expect(mapLink.getAttribute('href')).toContain('google.com/maps')
      // FC was flipped to 'authorized' by the badge test above.
    expect(container.textContent).toContain('Authorized by camp official')
    })

    it('404s for an unknown slug', async () => {
      await expect(
        CampProfile({ params: Promise.resolve({ slug: 'no-such-camp' }) }),
      ).rejects.toThrow()
    })

    it('renders the claimed badge when the camp is claimed', async () => {
      await Camp.updateOne({ stateCode: 'LA' }, { $set: { status: 'claimed' } })
      const ui = await CampProfile({ params: Promise.resolve({ slug: 'lagos' }) })
      const { container } = render(ui)
      expect(container.textContent).toContain('Claimed by camp crew (unofficial)')
    })
  })
})
