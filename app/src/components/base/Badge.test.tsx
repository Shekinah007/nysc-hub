import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from '@/components/base/Badge'

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge>Community-managed</Badge>)
    expect(screen.getByText('Community-managed')).toBeInTheDocument()
  })

  it('applies the neutral tone by default', () => {
    render(<Badge>Neutral</Badge>)
    const badge = screen.getByText('Neutral')
    expect(badge.className).toContain('bg-surface')
  })

  it.each([
    ['success', 'bg-success-soft'],
    ['warning', 'bg-warning-soft'],
    ['danger', 'bg-danger-soft'],
    ['info', 'bg-info-soft'],
  ] as const)('applies the %s tone classes', (tone, expectedClass) => {
    render(<Badge tone={tone}>{tone}</Badge>)
    expect(screen.getByText(tone).className).toContain(expectedClass)
  })

  it('renders as an accessible element with the expected shape', () => {
    render(<Badge>Trust</Badge>)
    const badge = screen.getByText('Trust')
    expect(badge.tagName).toBe('SPAN')
    expect(badge.className).toContain('rounded-full')
  })
})
