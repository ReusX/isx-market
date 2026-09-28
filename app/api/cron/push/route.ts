import { NextResponse } from 'next/server'
import { pushConfigured } from '@/lib/push/fcm'
import { quietNow, runChecks } from '@/lib/push/check'

/**
 * GET /api/cron/push — decide and send the app's notifications.
 *
 * Called every 15 minutes by the external pinger (cron-job.org, as for the
 * live statistics — the Hobby plan runs Vercel crons once a day only), with
 * `Authorization: Bearer $CRON_SECRET`. Safe to call as often as you like:
 * lib/push/check.ts only sends what it has not sent before.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!pushConfigured()) return NextResponse.json({ skipped: 'FIREBASE_SERVICE_ACCOUNT not set' })
  if (quietNow()) return NextResponse.json({ skipped: 'quiet hours (23:00–07:00 Baghdad)' })
  try {
    return NextResponse.json({ ok: true, ...(await runChecks()) })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 500 })
  }
}
