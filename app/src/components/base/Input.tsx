import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/**
 * Base text input. Unstyled-by-default in favour of one controlled look:
 * bordered surface field that clears to a focus ring in the primary color.
 * Mobile-first: min height 44px.
 */
export type InputProps = InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, type = 'text', ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'w-full min-h-[44px] px-3 py-2 rounded-md text-sm',
          'bg-surface border border-border text-foreground',
          'placeholder:text-muted',
          'focus-visible:outline-none focus-visible:ring-2 ' +
            'focus-visible:ring-primary focus-visible:border-transparent',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        )}
        {...props}
      />
    )
  },
)
