import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from '@/components/base/Modal'

describe('Modal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <Modal open={false} onClose={() => {}} title="Hidden">
        Body
      </Modal>,
    )
    expect(container.firstChild).toBeNull()
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument()
  })

  it('renders the title, description, and body when open', () => {
    render(
      <Modal open onClose={() => {}} title="Confirm" description="Are you sure?">
        Delete this announcement?
      </Modal>,
    )
    expect(
      screen.getByRole('dialog', { name: 'Confirm' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
    expect(
      screen.getByText('Delete this announcement?'),
    ).toBeInTheDocument()
  })

  it('marks the dialog as modal for assistive tech', () => {
    render(
      <Modal open onClose={() => {}} title="Confirm">
        Body
      </Modal>,
    )
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
  })

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Confirm">
        Body
      </Modal>,
    )
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the backdrop is clicked by default', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Confirm">
        Body
      </Modal>,
    )
    // The modal portals into document.body, so query from there — not from
    // the render container.
    const backdrop = document.body.querySelector('[aria-hidden="true"]')
    expect(backdrop).not.toBeNull()
    await user.click(backdrop as Element)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not close on backdrop click when disabled', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Confirm" closeOnOverlayClick={false}>
        Body
      </Modal>,
    )
    const backdrop = document.body.querySelector('[aria-hidden="true"]')
    await user.click(backdrop as Element)
    expect(onClose).not.toHaveBeenCalled()
  })
})
