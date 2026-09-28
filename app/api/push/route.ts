import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { pushConfigured, sendToToken } from '@/lib/push/fcm'
import companiesData from '@/public/data/companies.json'

/**
 * The app's one endpoint for notification settings.
 *
 *   POST { action: 'register',     token, platform }
 *   POST { action: 'get',          token }
 *   POST { action: 'topics',       token, topics: ('fx'|'gold'|'market')[] }
 *   POST { action: 'add_alert',    token, kind, symbol?, op, target }
 *   POST { action: 'remove_alert', token, id }
 *   POST { action: 'unregister',   token }
 *
 * The FCM token is the device's credential: only the phone holding it can
 * read or change its settings, which is why it travels in the POST body and
 * never in a URL. A new token is dry-run against FCM before it is stored, so
 * this cannot be used to fill the table with made-up devices.
 */
export const dynamic = 'force-dynamic'

const TOPICS = ['fx', 'gold', 'market'] as const
type Topic = (typeof TOPICS)[number]
const MAX_ALERTS = 20
const TOKEN_RE = /^[A-Za-z0-9_:\-]{64,4096}$/
const SYMBOLS = new Set((companiesData as { sym: string }[]).map((c) => c.sym))

/* Sanity bounds on a target, per kind, in the unit the alert is set in:
   dinars per 100 dollars, dinars per 21K mithqal, dinars per share. */
const BOUNDS: Record<'fx' | 'gold' | 'stock', [number, number]> = {
  fx: [50_000, 500_000],
  gold: [100_000, 5_000_000],
  stock: [0.01, 100_000],
}

const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status })

async function state(db: ReturnType<typeof createAdminClient>, token: string) {
  const [{ data: dev }, { data: alerts }] = await Promise.all([
    db.from('push_devices').select('topics, disabled_at').eq('token', token).maybeSingle(),
    db.from('push_alerts').select('id, kind, symbol, op, target, created_at, triggered_at, triggered_value')
      .eq('device_token', token).order('created_at', { ascending: false }).limit(50),
  ])
  return dev ? { topics: dev.topics as Topic[], alerts: alerts ?? [] } : null
}

export async function POST(req: Request) {
  let b: Record<string, unknown>
  try { b = await req.json() } catch { return bad('invalid json') }
  const token = typeof b.token === 'string' ? b.token : ''
  if (!TOKEN_RE.test(token)) return bad('invalid token')
  const db = createAdminClient()
  const action = b.action

  if (action === 'register') {
    const platform = b.platform === 'ios' ? 'ios' : b.platform === 'android' ? 'android' : null
    if (!platform) return bad('invalid platform')
    const { data: known } = await db.from('push_devices').select('token').eq('token', token).maybeSingle()
    if (!known) {
      if (!pushConfigured()) return bad('push not configured', 503)
      if ((await sendToToken(token, { title: '', body: '', url: '/' }, true)) !== 'ok') return bad('token rejected by FCM')
      // A new install starts subscribed to the daily dollar rate — the reason most people install.
      await db.from('push_devices').insert({ token, platform, topics: ['fx'] })
    } else {
      await db.from('push_devices').update({ last_seen: new Date().toISOString(), disabled_at: null, platform }).eq('token', token)
    }
    return NextResponse.json(await state(db, token))
  }

  const current = await state(db, token)
  if (!current) return bad('unknown device', 404)

  if (action === 'get') return NextResponse.json(current)

  if (action === 'topics') {
    const topics = Array.isArray(b.topics) ? Array.from(new Set(b.topics.filter((t): t is Topic => TOPICS.includes(t as Topic)))) : null
    if (!topics) return bad('invalid topics')
    await db.from('push_devices').update({ topics, last_seen: new Date().toISOString() }).eq('token', token)
    return NextResponse.json(await state(db, token))
  }

  if (action === 'add_alert') {
    const kind = b.kind === 'fx' || b.kind === 'gold' || b.kind === 'stock' ? b.kind : null
    const op = b.op === 'above' || b.op === 'below' ? b.op : null
    const target = typeof b.target === 'number' && Number.isFinite(b.target) ? b.target : NaN
    if (!kind || !op) return bad('invalid alert')
    const [lo, hi] = BOUNDS[kind]
    if (!(target >= lo && target <= hi)) return bad('target out of range')
    const symbol = kind === 'stock' ? String(b.symbol ?? '').toUpperCase() : null
    if (kind === 'stock' && !SYMBOLS.has(symbol as string)) return bad('unknown symbol')
    if (current.alerts.filter((a) => !a.triggered_at).length >= MAX_ALERTS) return bad('too many alerts', 409)
    await db.from('push_alerts').insert({ device_token: token, kind, symbol, op, target })
    return NextResponse.json(await state(db, token))
  }

  if (action === 'remove_alert') {
    if (typeof b.id !== 'string' || !/^[0-9a-f-]{36}$/.test(b.id)) return bad('invalid id')
    // Scoped by device: a token can only ever delete its own alerts.
    await db.from('push_alerts').delete().eq('id', b.id).eq('device_token', token)
    return NextResponse.json(await state(db, token))
  }

  if (action === 'unregister') {
    await db.from('push_devices').delete().eq('token', token)
    return NextResponse.json({ ok: true })
  }

  return bad('unknown action')
}
