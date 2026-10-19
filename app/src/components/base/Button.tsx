import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/**
 * Base button. Variants cover the ranges we need across the platform:
 * primary action, secondary, ghost links, and destructive.
 * Mobile-first: min height 44px (touch target).
 */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center font-medium rounded-md ' +
  'transition-colors focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-offset-2 focus-visible:ring-primary ' +
  'disabled:opacity-50 disabled:pointer-events-none min-h-[44px]'

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-strong',
  secondary:
    'bg-surface text-foreground border border-border hover:bg-border/40',
  ghost: 'text-primary hover:bg-primary-soft',
  danger: 'bg-danger text-white hover:bg-danger/90',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ className, variant = 'primary', size = 'md', ...props }, ref) {
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    )
  },
)
