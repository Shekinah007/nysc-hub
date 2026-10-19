import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/base/Card'

describe('Card', () => {
  it('renders as a bordered surface container', () => {
    render(<Card data-testid="card">Body</Card>)
    const card = screen.getByTestId('card')
    expect(card.className).toContain('border')
    expect(card.className).toContain('bg-surface')
    expect(card.className).toContain('rounded-lg')
  })

  it('renders the compound parts', () => {
    render(
      <Card>
        <CardHeader title="Camp announcement" description="OBS crew" />
        <CardContent>Body text</CardContent>
        <CardFooter>
          <button type="button">Read</button>
        </CardFooter>
      </Card>,
    )
    expect(
      screen.getByRole('heading', { name: 'Camp announcement' }),
    ).toBeInTheDocument()
    expect(screen.getByText('OBS crew')).toBeInTheDocument()
    expect(screen.getByText('Body text')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Read' }),
    ).toBeInTheDocument()
  })

  it('exposes the parts on the Card component itself', () => {
    expect(Card.Header).toBe(CardHeader)
    expect(Card.Content).toBe(CardContent)
    expect(Card.Footer).toBe(CardFooter)
  })

  it('omits the description when not provided', () => {
    render(<CardHeader title="No description" />)
    expect(screen.getByText('No description')).toBeInTheDocument()
  })
})
