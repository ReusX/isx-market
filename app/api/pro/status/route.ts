import { NextResponse } from 'next/server'
import { proUntil, userFromRequest, waylEnv } from '@/lib/pro'

/** GET /api/pro/status · the signed-in user's pass: {proUntil} (null when none) and whether payments are in Wayl's test mode. */
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const user = await userFromRequest(req)
  if (!user) return NextResponse.json({ proUntil: null, test: waylEnv() === 'test' })
  return NextResponse.json({ proUntil: await proUntil(user.id), test: waylEnv() === 'test' }, { headers: { 'Cache-Control': 'private, no-store' } })
}
