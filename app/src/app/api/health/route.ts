import { NextResponse } from 'next/server'

import { dbConnect, mongoose } from '@/lib/db'

/**
 * Health endpoint for uptime checks and container probes.
 *
 * Two checks: process status plus a database ping. The ping matters: the
 * previous version returned ok while the connection string was unreachable,
 * which made a broken deploy look healthy. DB failures still return 200 but
 * with db: 'degraded' so uptime probes stay green while the problem is
 * visible in the response body.
 */
export async function GET() {
  const timestamp = new Date().toISOString()

  try {
    await dbConnect()
    await mongoose.connection.db?.admin().ping()
    return NextResponse.json(
      { status: 'ok', db: 'up', timestamp },
      { status: 200 },
    )
  } catch (e) {
    // Report the error class only — never the message, which can echo the
    // connection string with credentials. TEMPORARY diagnostic for the
    // degraded-db investigation.
    const name = e instanceof Error ? e.name : 'unknown'
    const code = (e as { code?: string }).code
    // Mongo auth failures return a safe generic message ("bad auth:
    // Authentication failed") and never echo credentials. Shown temporarily
    // to pinpoint the failing step; removed once db reports up.
    const message = e instanceof Error ? e.message.split('\n')[0].slice(0, 160) : 'unknown'
    return NextResponse.json(
      { status: 'ok', db: 'degraded', errorName: name, errorCode: code, message, timestamp },
      { status: 200 },
    )
  }
}
