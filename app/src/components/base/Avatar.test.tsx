import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Avatar } from '@/components/base/Avatar'

describe('Avatar', () => {
  it('renders initials from a two-word name', () => {
    render(<Avatar name="Shekinah Hope" />)
    expect(screen.getByLabelText('Shekinah Hope').textContent).toBe('SH')
  })

  it('renders two letters of a single-word name', () => {
    render(<Avatar name="OneWordName" />)
    expect(screen.getByLabelText('OneWordName').textContent).toBe('ON')
  })

  it('renders a question mark for an empty name', () => {
    render(<Avatar name="" />)
    expect(screen.getByLabelText('').textContent).toBe('?')
  })

  it('assigns the same tint to the same name', () => {
    const { rerender } = render(<Avatar name="Ada Obi" />)
    const first = screen.getByLabelText('Ada Obi').className
    rerender(<Avatar name="Ada Obi" />)
    expect(screen.getByLabelText('Ada Obi').className).toBe(first)
  })

  it('renders an image when src is provided', () => {
    render(<Avatar name="Ada Obi" src="/avatar.png" />)
    const img = screen.getByRole('img', { name: 'Ada Obi' })
    expect(img).toHaveAttribute('src', '/avatar.png')
  })

  it('applies size classes', () => {
    render(<Avatar name="Ada Obi" size="lg" />)
    expect(screen.getByLabelText('Ada Obi').className).toContain('w-16')
  })
})
