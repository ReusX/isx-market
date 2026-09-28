import 'server-only'
import { createAdminClient } from '@/lib/supabase/server'
import { fetchFx, fetchGold } from '@/lib/rates'
import { sendToMany, sendToToken, type Push } from './fcm'
import companiesData from '@/public/data/companies.json'

/**
 * What to send, decided every 15 minutes by /api/cron/push.
 *
 *  · topic 'fx'     — once per new published dollar rate (per 100 dollars, the
 *                     way the market quotes it), with the change since the last
 *  · topic 'gold'   — once per new gold list: the 21K mithqal
 *  · topic 'market' — once per new ISX session: ISX60 close and turnover
 *  · price alerts   — each one fires once, the first time its condition holds
 *
 * Idempotent: push_state records what was last announced, so a run that finds
 * nothing new sends nothing. The first run for a topic only records the
 * current value — it never announces news that is already hours old.
 *
 * Quiet hours (23:00–07:00 Baghdad): nothing is sent and nothing is recorded,
 * so whatever is new is announced by the first run after 07:00.
 */
type DB = ReturnType<typeof createAdminClient>

const MITHQAL_G = 4.608
const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const nf2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const NAMES = new Map((companiesData as { sym: string; ar: string }[]).map((c) => [c.sym, c.ar]))

export function quietNow(d = new Date()): boolean {
  const h = (d.getUTCHours() + 3) % 24
  return h >= 23 || h < 7
}

function delta(now: number, before: number | undefined, fmt: (v: number) => string) {
  if (before == null) return ''
  const d = now - before
  if (Math.abs(d) < 1e-9) return ' · دون تغيير'
  return ` · ${d > 0 ? '▲' : '▼'} ${fmt(Math.abs(d))}`
}

async function getState(db: DB, key: string): Promise<Record<string, unknown> | null> {
  const { data } = await db.from('push_state').select('value').eq('key', key).maybeSingle()
  return (data?.value as Record<string, unknown>) ?? null
}
async function setState(db: DB, key: string, value: Record<string, unknown>) {
  await db.from('push_state').upsert({ key, value, updated_at: new Date().toISOString() })
}

async function tokensFor(db: DB, topic: string): Promise<string[]> {
  const out: string[] = []
  for (let from = 0; ; from += 1000) {
    const { data } = await db.from('push_devices').select('token').contains('topics', [topic]).is('disabled_at', null).range(from, from + 999)
    out.push(...(data ?? []).map((r) => r.token as string))
    if (!data || data.length < 1000) return out
  }
}

/* A token FCM calls dead (app uninstalled, data cleared) will never work again.
   The phone and its alerts are DELETED, not flagged — the privacy policy says
   so («نحذف الهاتف وتنبيهاته من سجلّاتنا عند أول محاولة إرسال تفشل»), and the
   alerts go with it through the foreign key's on-delete cascade. */
async function disable(db: DB, tokens: string[]) {
  if (tokens.length) await db.from('push_devices').delete().in('token', tokens)
}

async function broadcast(db: DB, topic: string, p: Push) {
  const tokens = await tokensFor(db, topic)
  const { sent, dead } = await sendToMany(tokens, p)
  await disable(db, dead)
  return { topic, devices: tokens.length, sent }
}

interface Alert { id: string; device_token: string; kind: string; symbol: string | null; op: 'above' | 'below'; target: number }

async function liveAlerts(db: DB, kind: string): Promise<Alert[]> {
  const { data } = await db.from('push_alerts')
    .select('id, device_token, kind, symbol, op, target, push_devices!inner(disabled_at)')
    .eq('kind', kind).is('triggered_at', null).is('push_devices.disabled_at', null).limit(5000)
  return (data ?? []) as unknown as Alert[]
}

const hit = (a: Alert, v: number) => (a.op === 'above' ? v >= a.target : v <= a.target)

/** Send each triggered alert to its device; mark it fired only if delivery worked (or the device is gone). */
async function fire(db: DB, alerts: Alert[], value: (a: Alert) => number | null, message: (a: Alert, v: number) => Push) {
  let fired = 0
  for (const a of alerts) {
    const v = value(a)
    if (v == null || !hit(a, v)) continue
    const r = await sendToToken(a.device_token, message(a, v))
    if (r === 'dead') await disable(db, [a.device_token])
    if (r === 'error') continue // transient — try again next run
    await db.from('push_alerts').update({ triggered_at: new Date().toISOString(), triggered_value: v }).eq('id', a.id)
    fired += 1
  }
  return fired
}

const opWord = (a: Alert) => (a.op === 'above' ? 'تجاوز' : 'نزل تحت')

export async function runChecks() {
  const db = createAdminClient()
  const report: Record<string, unknown> = {}

  /* ── Dollar ─────────────────────────────────────────────────────────────── */
  const fx = await fetchFx()
  const rate = fx?.sell ?? fx?.buy ?? null
  if (fx && rate && fx.date && !fx.stale) {
    const hundred = rate * 100
    const s = await getState(db, 'fx')
    if (!s) await setState(db, 'fx', { date: fx.date, value: hundred })
    else if (s.date !== fx.date) {
      report.fx = await broadcast(db, 'fx', {
        title: 'سعر الدولار اليوم',
        body: `${nf0.format(hundred)} دينار لكل 100 دولار${delta(hundred, s.value as number, nf0.format)}`,
        url: '/fx', tag: 'fx',
      })
      await setState(db, 'fx', { date: fx.date, value: hundred })
    }
    report.fxAlerts = await fire(db, await liveAlerts(db, 'fx'), () => hundred, (a, v) => ({
      title: 'تنبيه الدولار',
      body: `سعر 100 دولار ${opWord(a)} ${nf0.format(a.target)} دينار — السعر الآن ${nf0.format(v)}`,
      url: '/fx/100-dollar', tag: `alert-${a.id}`,
    }))
  }

  /* ── Gold ───────────────────────────────────────────────────────────────── */
  const gold = await fetchGold()
  const g21 = gold?.grams.find((g) => g.karat === 21)?.iqd
  if (gold?.date && g21) {
    const mithqal = g21 * MITHQAL_G
    const s = await getState(db, 'gold')
    if (!s) await setState(db, 'gold', { date: gold.date, value: mithqal })
    else if (s.date !== gold.date) {
      report.gold = await broadcast(db, 'gold', {
        title: 'سعر الذهب اليوم',
        body: `مثقال عيار 21: ${nf0.format(mithqal)} دينار${delta(mithqal, s.value as number, nf0.format)}`,
        url: '/gold/mithqal', tag: 'gold',
      })
      await setState(db, 'gold', { date: gold.date, value: mithqal })
    }
    report.goldAlerts = await fire(db, await liveAlerts(db, 'gold'), () => mithqal, (a, v) => ({
      title: 'تنبيه الذهب',
      body: `مثقال الذهب عيار 21 ${opWord(a)} ${nf0.format(a.target)} دينار — السعر الآن ${nf0.format(v)}`,
      url: '/gold/mithqal', tag: `alert-${a.id}`,
    }))
  }

  /* ── Market close + stock alerts ────────────────────────────────────────── */
  const { data: idx } = await db.from('daily_index').select('date, isx60, total_value').gt('isx60', 0).order('date', { ascending: false }).limit(2)
  const [today, prev] = (idx ?? []) as { date: string; isx60: number; total_value: number }[]
  if (today) {
    const s = await getState(db, 'market')
    if (!s) await setState(db, 'market', { date: today.date })
    else if (s.date !== today.date) {
      const pct = prev?.isx60 ? ((today.isx60 - prev.isx60) / prev.isx60) * 100 : null
      report.market = await broadcast(db, 'market', {
        title: 'إغلاق بورصة العراق',
        body: `مؤشر ISX60 أغلق عند ${nf2.format(today.isx60)}${pct == null ? '' : ` (${pct >= 0 ? '+' : ''}${nf2.format(pct)}%)`} · التداول ${nf2.format(today.total_value / 1e9)} مليار دينار`,
        url: '/market', tag: 'market',
      })
      await setState(db, 'market', { date: today.date })
    }
    const stock = await liveAlerts(db, 'stock')
    const syms = Array.from(new Set(stock.map((a) => a.symbol as string)))
    const close = new Map<string, number>()
    if (syms.length) {
      const { data } = await db.from('daily_prices').select('ticker, close').eq('date', today.date).in('ticker', syms)
      for (const r of data ?? []) if (r.close > 0) close.set(r.ticker as string, r.close as number)
    }
    report.stockAlerts = await fire(db, stock, (a) => close.get(a.symbol as string) ?? null, (a, v) => ({
      title: `تنبيه ${NAMES.get(a.symbol as string) ?? a.symbol}`,
      body: `سعر السهم ${opWord(a)} ${nf2.format(a.target)} دينار — أغلق اليوم على ${nf2.format(v)}`,
      url: `/c/${a.symbol}`, tag: `alert-${a.id}`,
    }))
  }

  return report
}
