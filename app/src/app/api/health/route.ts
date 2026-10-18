import { NextResponse } from 'next/server'

/**
 * Lightweight health endpoint for uptime checks and container probes.
 * Intentionally cheap: no database hit, no auth.
 */
export async function GET() {
  return NextResponse.json(
    { status: 'ok', timestamp: new Date().toISOString() },
    { status: 200 },
  )
}
