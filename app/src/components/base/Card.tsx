import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/**
 * Surface card — the base container for grouped content.
 * Compound parts (Header/Content/Footer) for the common card layout.
 */
export type CardProps = HTMLAttributes<HTMLDivElement>

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-surface p-4',
        'shadow-[0_1px_2px_rgba(16,29,23,0.05)]',
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({
  title,
  description,
  className,
}: {
  title: string
  description?: string
  className?: string
}) {
  return (
    <div className={cn('mb-3', className)}>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted mt-0.5">{description}</p>
      )}
    </div>
  )
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('text-sm text-foreground', className)} {...props} />
  )
}

export function CardFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mt-4 flex items-center justify-end gap-2', className)}
      {...props}
    />
  )
}

Card.Header = CardHeader
Card.Content = CardContent
Card.Footer = CardFooter
