import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Input } from '@/components/base/Input'

describe('Input', () => {
  it('renders a text input by default', () => {
    render(<Input placeholder="Email" />)
    const input = screen.getByPlaceholderText('Email')
    expect(input).toHaveAttribute('type', 'text')
  })

  it('forwards the type attribute', () => {
    render(<Input type="email" placeholder="Email" />)
    expect(screen.getByPlaceholderText('Email')).toHaveAttribute(
      'type',
      'email',
    )
  })

  it('keeps the 44px touch target', () => {
    render(<Input placeholder="Email" />)
    expect(screen.getByPlaceholderText('Email').className).toContain(
      'min-h-[44px]',
    )
  })

  it('shows surface and border classes', () => {
    render(<Input placeholder="Email" />)
    const input = screen.getByPlaceholderText('Email')
    expect(input.className).toContain('bg-surface')
    expect(input.className).toContain('border-border')
  })

  it('is disabled when the disabled attribute is set', () => {
    render(<Input placeholder="Email" disabled />)
    expect(screen.getByPlaceholderText('Email')).toBeDisabled()
  })

  it('merges a custom className', () => {
    render(<Input placeholder="Email" className="mt-2" />)
    expect(screen.getByPlaceholderText('Email').className).toContain('mt-2')
  })
})
