import { Badge } from '@/components/base/Badge'
import { statusLabel } from '@/server/camps/queries'
import type { CampStatus } from '@/models/camps'

const TONES: Record<CampStatus, 'neutral' | 'warning' | 'success'> = {
  community: 'neutral',
  claimed: 'warning',
  authorized: 'success',
}

/**
 * Status badge rendered on every camp surface (SPEC-camps.md: exact copy).
 * The tones are a visual aid; the label text is the contract.
 */
export function CampStatusBadge({ status }: { status: CampStatus }) {
  return <Badge tone={TONES[status]}>{statusLabel(status)}</Badge>
}
