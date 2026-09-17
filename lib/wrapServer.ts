import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'
import companiesData from '@/public/data/companies.json'
import type { CompanyMeta } from '@/types'

/**
 * The session wrap: everything a reader would ask about one trading day,
 * read straight from the tables the daily cron fills. No prose here — the
 * numbers only; `lib/wrapText` turns them into sentences.
 */
export type Mover = { sym: string; ar: string; en: string; close: number; pct: number; value: number }
export type FlowSide = { value: number; trades: number; top: { sym: string; ar: string; en: string; value: number }[] }
export type SessionWrap = {
  date: string
  prev: string | null
  next: string | null
  index: { close: number; prevClose: number | null; change: number | null; pct: number | null
           weekAgo: number | null; yearStart: number | null; high52: number | null; low52: number | null; isx15: number | null }
  breadth: { up: number; down: number; flat: number; traded: number; listed: number }
  totals: { value: number; volume: number; trades: number; avgValue20: number | null; avgTrades20: number | null }
  gainers: Mover[]
  losers: Mover[]
  active: Mover[]
  foreign: { buy: FlowSide; sell: FlowSide; net: number } | null
}

type IndexRow = { date: string; isx60: number; isx15: number | null; total_value: number; total_volume: number; total_trades: number; traded_companies: number; listed_companies: number }
type PriceRow = { ticker: string; date: string; close: number | null; value: number | null; volume: number | null; trades: number | null }
type FlowRow = { ticker: string; side: 'buy' | 'sell'; value: number; trades: number }

function client() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { fetch: (u, i) => fetch(u, { ...i, next: { revalidate: 300 } }) },
    auth: { persistSession: false },
  })
}
const META = new Map((companiesData as CompanyMeta[]).map((c) => [c.sym, c]))
const nameOf = (sym: string) => ({ ar: META.get(sym)?.ar || sym, en: META.get(sym)?.en || sym })

/** Session dates, newest first. */
export const loadSessions = cache(async (limit = 600): Promise<string[]> => {
  const { data } = await client().from('daily_index').select('date').gt('isx60', 0).order('date', { ascending: false }).limit(limit)
  return ((data ?? []) as { date: string }[]).map((r) => r.date)
})

export const loadSessionWrap = cache(async (date: string): Promise<SessionWrap | null> => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const sb = client()
  const sessions = await loadSessions()
  const i = sessions.indexOf(date)
  if (i < 0) return null
  const prev = sessions[i + 1] ?? null, next = sessions[i - 1] ?? null
  const yearAgo = new Date(new Date(date).getTime() - 366 * 86400_000).toISOString().slice(0, 10)

  const [idxRes, pxRes, flowRes] = await Promise.all([
    sb.from('daily_index').select('date,isx60,isx15,total_value,total_volume,total_trades,traded_companies,listed_companies')
      .gt('isx60', 0).gte('date', yearAgo).lte('date', date).order('date', { ascending: false }),
    prev
      ? sb.from('daily_prices').select('ticker,date,close,value,volume,trades').in('date', [date, prev]).range(0, 1999)
      : sb.from('daily_prices').select('ticker,date,close,value,volume,trades').eq('date', date).range(0, 1999),
    sb.from('foreign_flow_company_daily').select('ticker,side,value,trades').eq('date', date),
  ])
  const idx = (idxRes.data ?? []) as IndexRow[]
  const today = idx[0]
  if (!today || today.date !== date) return null
  const prevIdx = idx[1] ?? null
  const last20 = idx.slice(1, 21)
  const avg = (k: 'total_value' | 'total_trades') => (last20.length ? last20.reduce((t, r) => t + (r[k] ?? 0), 0) / last20.length : null)
  const year = date.slice(0, 4)
  const yearRows = idx.filter((r) => r.date.startsWith(year))
  const yearStart = yearRows.length ? yearRows[yearRows.length - 1].isx60 : null
  const closes = idx.map((r) => r.isx60)

  const px = (pxRes.data ?? []) as PriceRow[]
  const prevClose = new Map<string, number>()
  for (const r of px) if (r.date === prev && r.close) prevClose.set(r.ticker, r.close)
  const movers: Mover[] = []
  let up = 0, down = 0, flat = 0
  for (const r of px) {
    if (r.date !== date || !r.close || !(r.trades ?? 0)) continue
    const p = prevClose.get(r.ticker)
    const pct = p ? ((r.close - p) / p) * 100 : 0
    if (p) { if (pct > 0.001) up++; else if (pct < -0.001) down++; else flat++ }
    movers.push({ sym: r.ticker, ...nameOf(r.ticker), close: r.close, pct: p ? pct : 0, value: r.value ?? 0 })
  }
  const byPct = movers.filter((m) => prevClose.has(m.sym))
  const gainers = byPct.filter((m) => m.pct > 0).sort((a, b) => b.pct - a.pct).slice(0, 5)
  const losers = byPct.filter((m) => m.pct < 0).sort((a, b) => a.pct - b.pct).slice(0, 5)
  const active = movers.slice().sort((a, b) => b.value - a.value).slice(0, 5)

  const flows = (flowRes.data ?? []) as FlowRow[]
  const side = (s: 'buy' | 'sell'): FlowSide => {
    const rows = flows.filter((f) => f.side === s)
    return {
      value: rows.reduce((t, f) => t + f.value, 0),
      trades: rows.reduce((t, f) => t + f.trades, 0),
      top: rows.sort((a, b) => b.value - a.value).slice(0, 3).map((f) => ({ sym: f.ticker, ...nameOf(f.ticker), value: f.value })),
    }
  }
  const buy = side('buy'), sell = side('sell')
  const foreign = flows.length ? { buy, sell, net: buy.value - sell.value } : null

  return {
    date, prev, next,
    index: {
      close: today.isx60, prevClose: prevIdx?.isx60 ?? null,
      change: prevIdx ? today.isx60 - prevIdx.isx60 : null,
      pct: prevIdx ? ((today.isx60 - prevIdx.isx60) / prevIdx.isx60) * 100 : null,
      weekAgo: idx[5]?.isx60 ?? null, yearStart,
      high52: closes.length ? Math.max(...closes) : null, low52: closes.length ? Math.min(...closes) : null,
      isx15: today.isx15,
    },
    breadth: { up, down, flat, traded: movers.length || today.traded_companies, listed: today.listed_companies },
    totals: { value: today.total_value, volume: today.total_volume, trades: today.total_trades, avgValue20: avg('total_value'), avgTrades20: avg('total_trades') },
    gainers, losers, active, foreign,
  }
})
