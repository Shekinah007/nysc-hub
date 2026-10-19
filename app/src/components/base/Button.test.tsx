import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/base/Button'

describe('Button', () => {
  it('renders its children', () => {
    render(<Button>Register</Button>)
    expect(
      screen.getByRole('button', { name: 'Register' }),
    ).toBeInTheDocument()
  })

  it('applies the primary variant classes by default', () => {
    render(<Button>Register</Button>)
    const button = screen.getByRole('button', { name: 'Register' })
    expect(button.className).toContain('bg-primary')
    expect(button.className).toContain('text-white')
  })

  it('applies size classes', () => {
    render(<Button size="lg">Register</Button>)
    const button = screen.getByRole('button', { name: 'Register' })
    expect(button.className).toContain('px-6')
    expect(button.className).toContain('text-base')
  })

  it('forwards a click handler and standard button attributes', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick} type="submit">Go</Button>)
    await user.click(screen.getByRole('button', { name: 'Go' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  it('merges a custom className without dropping variant classes', () => {
    render(<Button className="mt-4">Register</Button>)
    const button = screen.getByRole('button', { name: 'Register' })
    expect(button.className).toContain('mt-4')
    expect(button.className).toContain('bg-primary')
  })

  it('keeps the 44px touch target for mobile-first sizing', () => {
    render(<Button>Register</Button>)
    const button = screen.getByRole('button', { name: 'Register' })
    expect(button.className).toContain('min-h-[44px]')
  })
})
