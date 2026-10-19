import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Alert } from '@/components/base/Alert'

describe('Alert', () => {
  it('is announced by assistive tech via role="alert"', () => {
    render(<Alert>Something happened</Alert>)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('renders a title and body', () => {
    render(<Alert title="Caution">Reception at camp is limited</Alert>)
    expect(screen.getByText('Caution')).toBeInTheDocument()
    expect(
      screen.getByText('Reception at camp is limited'),
    ).toBeInTheDocument()
  })

  it.each([
    ['info', 'bg-info-soft'],
    ['success', 'bg-success-soft'],
    ['warning', 'bg-warning-soft'],
    ['danger', 'bg-danger-soft'],
  ] as const)('applies the %s tone classes', (tone, expectedClass) => {
    render(<Alert tone={tone}>{tone}</Alert>)
    expect(screen.getByRole('alert').className).toContain(expectedClass)
  })

  it('omits the title when not provided', () => {
    render(<Alert>No title</Alert>)
    expect(screen.getByRole('alert').textContent).toContain('No title')
  })

  it('renders the tone icon alongside the message', () => {
    render(<Alert tone="success">Saved</Alert>)
    expect(screen.getByRole('alert').textContent).toContain('✓')
  })
})
