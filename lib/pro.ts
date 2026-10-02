import 'server-only'
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * «IQWealth برو» · paid passes through Wayl (https://api.thewayl.com).
 *
 * Wayl has no recurring billing, so a purchase is a time pass. The flow:
 *   1. /api/pro/checkout creates a pro_orders row and a Wayl link for it.
 *   2. Wayl calls /api/pro/webhook; the return page also calls
 *      /api/pro/verify. Neither trusts what it is told: both re-read the
 *      link from Wayl with our key (`confirmPaid`) and only then call
 *      pro_mark_paid, which adds the days once per order.
 * The key lives only in WAYL_API_KEY (server). WAYL_ENV picks 'test' or
 * 'live' (default 'test', so nothing charges real money until it is set).
 */
export const PLANS = {
  month: { days: 31, iqd: 5_000 },
  year: { days: 366, iqd: 50_000 },
} as const
export type Plan = keyof typeof PLANS

const BASE = 'https://api.thewayl.com/api/v1'
/* Tolerant of how the value was typed in Vercel («live», «Live», «live » or quoted). */
export const waylEnv = (): 'test' | 'live' => ((process.env.WAYL_ENV ?? '').trim().replace(/^["']|["']$/g, '').toLowerCase() === 'live' ? 'live' : 'test')
/**
 * Test payments grant nothing on the live site (a test card would otherwise
 * buy real Pro), unless WAYL_ALLOW_TEST=1 is set there on purpose.
 */
export const testAllowed = () => process.env.VERCEL_ENV !== 'production' || process.env.WAYL_ALLOW_TEST === '1'
export const checkoutOpen = () => waylEnv() === 'live' || testAllowed()

function key(): string {
  const k = process.env.WAYL_API_KEY?.trim()
  if (!k) throw new Error('WAYL_API_KEY missing')
  return k
}

/** The webhook secret Wayl signs with: WAYL_WEBHOOK_SECRET, else derived from the API key (never sent anywhere else). */
function webhookSecret(): string {
  return process.env.WAYL_WEBHOOK_SECRET || createHmac('sha256', key()).update('iqwealth-pro-webhook').digest('hex')
}

/** The signed-in user from a Supabase access token (Authorization: Bearer …). */
export async function userFromRequest(req: Request): Promise<{ id: string; email: string | null } | null> {
  const token = /^Bearer\s+(.+)$/.exec(req.headers.get('authorization') ?? '')?.[1]
  if (!token) return null
  const { data, error } = await createAdminClient().auth.getUser(token)
  return error || !data?.user ? null : { id: data.user.id, email: data.user.email ?? null }
}

/** The end of the user's pass, or null when they have none or it has run out. */
export async function proUntil(userId: string): Promise<string | null> {
  const { data } = await createAdminClient().from('pro_entitlements').select('pro_until').eq('user_id', userId).maybeSingle()
  const until = (data as { pro_until: string } | null)?.pro_until ?? null
  return until && Date.parse(until) > Date.now() ? until : null
}

export async function createCheckout(userId: string, plan: Plan, origin: string): Promise<string> {
  const p = PLANS[plan]
  const env = waylEnv()
  const ref = `pro-${plan}-${Date.now().toString(36)}-${randomBytes(6).toString('hex')}`
  const db = createAdminClient()
  /* At most five unpaid links an hour per user: each one is a Wayl call. */
  const since = new Date(Date.now() - 3_600_000).toISOString()
  const { count } = await db.from('pro_orders').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('paid_at', null).gte('created_at', since)
  if ((count ?? 0) >= 5) throw new Error('rate')
  const ins = await db.from('pro_orders').insert({ reference_id: ref, user_id: userId, plan, days: p.days, amount_iqd: p.iqd, env })
  if (ins.error) throw new Error('order insert failed')
  const r = await fetch(`${BASE}/links`, {
    method: 'POST',
    headers: { 'X-WAYL-AUTHENTICATION': key(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      env, referenceId: ref, total: p.iqd, currency: 'IQD',
      lineItem: [{ label: plan === 'year' ? 'IQWealth Pro · 1 year' : 'IQWealth Pro · 1 month', amount: p.iqd, type: 'increase' }],
      webhookUrl: `${origin}/api/pro/webhook`, webhookSecret: webhookSecret(),
      redirectionUrl: `${origin}/pro/done`, linkExpiresIn: '1h',
    }),
    cache: 'no-store',
  })
  const j = (await r.json().catch(() => null)) as { data?: { url?: string } } | null
  const url = j?.data?.url
  if (!r.ok || !url) {
    await db.from('pro_orders').update({ status: 'failed' }).eq('reference_id', ref)
    throw new Error(`wayl ${r.status}`)
  }
  await db.from('pro_orders').update({ pay_url: url }).eq('reference_id', ref)
  return url
}

const PAID = new Set(['complete', 'delivered'])

/**
 * Ask Wayl whether the order is paid, and if it is (for the full amount),
 * grant the pass. Safe to call any number of times, from anywhere.
 */
export async function confirmPaid(ref: string): Promise<{ paid: boolean; status: string; userId: string | null }> {
  const db = createAdminClient()
  const { data: o } = await db.from('pro_orders').select('user_id,amount_iqd,env,paid_at').eq('reference_id', ref).maybeSingle()
  const order = o as { user_id: string; amount_iqd: number; env: string; paid_at: string | null } | null
  if (!order) return { paid: false, status: 'unknown', userId: null }
  if (order.paid_at) return { paid: true, status: 'complete', userId: order.user_id }
  if (order.env === 'test' && !testAllowed()) return { paid: false, status: 'test', userId: order.user_id }
  const r = await fetch(`${BASE}/links/${encodeURIComponent(ref)}`, { headers: { 'X-WAYL-AUTHENTICATION': key() }, cache: 'no-store' })
  const j = (await r.json().catch(() => null)) as { data?: { status?: string; total?: string | number } } | null
  const status = String(j?.data?.status ?? 'unknown').toLowerCase()
  if (!r.ok) return { paid: false, status, userId: order.user_id }
  const full = Number(j?.data?.total) >= order.amount_iqd
  if (PAID.has(status) && full) {
    await db.rpc('pro_mark_paid', { ref })
    return { paid: true, status, userId: order.user_id }
  }
  await db.from('pro_orders').update({ status }).eq('reference_id', ref).is('paid_at', null)
  return { paid: false, status, userId: order.user_id }
}

/** Wayl's webhook signature: hex HMAC-SHA256 of the raw body. */
export function signatureOk(raw: string, header: string | null): boolean {
  if (!header) return false
  const want = createHmac('sha256', webhookSecret()).update(raw).digest('hex')
  const got = header.replace(/^sha256=/, '').trim()
  return got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want))
}
