import { cn } from '@/lib/utils'

/**
 * Circular avatar with initials fallback when no image is provided.
 * Deterministic color from the name hash so the same person always
 * gets the same tint — avoids the generic gray-default look.
 */
const sizes = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-lg',
} as const

type Size = keyof typeof sizes

const palette = [
  'bg-primary-soft text-primary-strong',
  'bg-accent-soft text-warning',
  'bg-info-soft text-info',
  'bg-success-soft text-success',
  'bg-danger-soft text-danger',
]

function hashString(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export type AvatarProps = {
  name: string
  src?: string
  size?: Size
  className?: string
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const tint = palette[hashString(name) % palette.length]

  if (src) {
    return (
      // Avatars receive arbitrary remote URLs with unknown dimensions, so
      // next/image would need a remote-pattern + loader config per host —
      // out of v1 scope. Plain img with an explicit alt is the right trade.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={cn(
          'rounded-full object-cover flex-shrink-0',
          sizes[size],
          className,
        )}
      />
    )
  }

  return (
    <span
      aria-label={name}
      className={cn(
        'rounded-full inline-flex items-center justify-center',
        'font-semibold flex-shrink-0',
        sizes[size],
        tint,
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}