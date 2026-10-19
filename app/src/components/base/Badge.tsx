import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/**
 * Small status pill. Tones map to the feedback palette tokens.
 * The trust badges (verification module) build on this.
 */
type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

const tones: Record<Tone, string> = {
  neutral: 'bg-surface text-muted border-border',
  success: 'bg-success-soft text-success border-success/20',
  warning: 'bg-warning-soft text-warning border-warning/20',
  danger: 'bg-danger-soft text-danger border-danger/20',
  info: 'bg-info-soft text-info border-info/20',
}

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
        'text-xs font-medium border',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}
