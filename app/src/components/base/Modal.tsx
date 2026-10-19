import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

/**
 * Accessible modal dialog. Renders in a portal so it sits outside the
 * page stack. Closes on Escape or backdrop click (configurable).
 * Docs: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/dialog_role
 */
type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'full'
  closeOnOverlayClick?: boolean
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  full: 'max-w-4xl',
} as const

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  closeOnOverlayClick = true,
}: ModalProps) {
  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby={description ? 'modal-desc' : undefined}
    >
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        className={cn(
          'relative w-full bg-surface rounded-lg border border-border',
          'shadow-xl p-6',
          sizes[size],
          'max-h-[calc(100vh-2rem)] overflow-auto',
        )}
      >
        <div className="mb-4">
          <h2 id="modal-title" className="text-lg font-semibold text-foreground">
            {title}
          </h2>
          {description && (
            <p id="modal-desc" className="text-sm text-muted mt-1">
              {description}
            </p>
          )}
        </div>
        {children}
        <button
          type="button"
          className={cn(
            'absolute top-3 right-3 rounded-full p-1',
            'hover:bg-border text-muted transition-colors',
            'focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-primary',
          )}
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
      </div>
    </div>,
    document.body,
  )
}