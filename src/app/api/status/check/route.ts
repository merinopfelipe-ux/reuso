import { NextResponse } from 'next/server'
import { getCachedStatus } from '@/lib/status-checker'

export const dynamic = 'force-dynamic'

export async function GET() {
  const results = await getCachedStatus()
  return NextResponse.json(results)
}
