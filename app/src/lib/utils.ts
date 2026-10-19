import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge conditional class names and resolve Tailwind utility conflicts.
 * clsx handles the conditionals, tailwind-merge dedupes competing classes
 * (e.g. cn('p-2', condition && 'p-4') -> 'p-4').
 * Sources: https://github.com/lukeed/clsx, https://github.com/dcastil/tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
