import { createPortal } from 'react-dom'
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
} from 'react'
import { cn } from '@/lib/utils'

/**
 * Non-blocking toast notification. Auto-dismisses after a duration.
 * Multiple toasts stack. Renders in a portal at the top-right.
 * Docs: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/status_role
 */
type Tone = 'info' | 'success' | 'warning' | 'danger'

const tones: Record<Tone, string> = {
  info: 'bg-info-soft text-info border-info/20',
  success: 'bg-success-soft text-success border-success/20',
  warning: 'bg-warning-soft text-warning border-warning/20',
  danger: 'bg-danger-soft text-danger border-danger/20',
}

const icons: Record<Tone, string> = {
  info: 'ℹ',
  success: '✓',
  warning: '!',
  danger: '✕',
}

export type ToastProps = {
  id: string
  tone: Tone
  message: string
  duration?: number
  onClose: (id: string) => void
}

function ToastItem({
  id,
  tone,
  message,
  duration = 5000,
  onClose,
}: ToastProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onClose(id), 150)
    }, duration)
    return () => clearTimeout(timer)
  }, [id, duration, onClose])

  if (!visible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex gap-2 items-start p-3 rounded-md border text-sm',
        'shadow-lg min-w-[240px] max-w-md animate-in slide-in-from-top-2',
        tones[tone],
      )}
    >
      <span aria-hidden className="font-bold leading-relaxed">
        {icons[tone]}
      </span>
      <p className="flex-1">{message}</p>
      <button
        type="button"
        className="text-current opacity-50 hover:opacity-100"
        onClick={() => onClose(id)}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}

type ToastContextType = {
  push: (toast: Omit<ToastProps, 'id' | 'onClose'>) => string
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<
    { id: string; tone: Tone; message: string; duration?: number }[]
  >([])

  const push = useCallback((toast: Omit<ToastProps, 'id' | 'onClose'>) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, ...toast }])
    return id
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ push, dismiss }}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          className="fixed top-4 right-4 z-50 flex flex-col gap-2"
        >
          {toasts.map((t) => (
            <ToastItem key={t.id} {...t} onClose={dismiss} />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}