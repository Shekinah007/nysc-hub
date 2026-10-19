import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/**
 * Inline alert for form feedback and page-level notices.
 * Renders a role="alert" so assistive tech announces it.
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

export type AlertProps = HTMLAttributes<HTMLDivElement> & {
  tone?: Tone
  title?: string
}

export function Alert({
  tone = 'info',
  title,
  className,
  children,
  ...props
}: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex gap-2 items-start p-3 rounded-md border text-sm',
        tones[tone],
        className,
      )}
      {...props}
    >
      <span aria-hidden className="font-bold leading-relaxed">
        {icons[tone]}
      </span>
      <div>
        {title && <p className="font-semibold">{title}</p>}
        {children}
      </div>
    </div>
  )
}
