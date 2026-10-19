import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ToastProvider, useToast } from '@/components/base/Toast'

/** Probe component that pushes toasts through the public hook. */
function ToastProbe({ message }: { message?: string }) {
  const { push } = useToast()
  return (
    <button
      type="button"
      onClick={() =>
        push({ tone: 'success', message: message ?? 'Saved' })
      }
    >
      Push
    </button>
  )
}

/** Click inside act() so the state update flushes before assertions. */
function click(name: string) {
  act(() => {
    screen.getByRole('button', { name }).click()
  })
}

describe('Toast', () => {
  it('renders nothing until the hook is called', () => {
    render(
      <ToastProvider>
        <ToastProbe />
      </ToastProvider>,
    )
    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
  })

  it('renders a pushed toast with role=status in the portal', () => {
    render(
      <ToastProvider>
        <ToastProbe />
      </ToastProvider>,
    )
    click('Push')
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('Saved')).toBeInTheDocument()
  })

  it('throws when useToast is used outside the provider', () => {
    const Broken = () => {
      useToast()
      return null
    }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Broken />)).toThrow(
      'useToast must be used within a ToastProvider',
    )
    spy.mockRestore()
  })

  it('dismisses a toast via its dismiss button', () => {
    render(
      <ToastProvider>
        <ToastProbe message="Dismissible" />
      </ToastProvider>,
    )
    click('Push')
    expect(screen.getByText('Dismissible')).toBeInTheDocument()
    click('Dismiss')
    expect(screen.queryByText('Dismissible')).not.toBeInTheDocument()
  })

  it('removes a toast after its duration elapses', () => {
    vi.useFakeTimers()
    function DurationProbe() {
      const { push } = useToast()
      return (
        <button
          type="button"
          onClick={() =>
            push({ tone: 'info', message: 'Timed', duration: 1000 })
          }
        >
          Push
        </button>
      )
    }
    render(
      <ToastProvider>
        <DurationProbe />
      </ToastProvider>,
    )
    click('Push')
    expect(screen.getByText('Timed')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(screen.queryByText('Timed')).not.toBeInTheDocument()
    vi.useRealTimers()
  })
})
