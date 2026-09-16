import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'
import { fetchLiveWith, mergeCompanies } from '@/lib/market'
import companiesData from '@/public/data/companies.json'
import iscTiers from '@/public/data/isc-tiers.json'
import type { Company, CompanyMeta } from '@/types'
import type { IndexRow } from '@/lib/homeData'
import type { Metric } from '@/lib/screener'
import { REBASE, type Session, type SectorMonthRow } from '@/lib/statistics'

/**
 * What the market page needs on the SERVER, so the session figures and the
 * board are in the HTML — for first paint and for the crawler — rather than
 * arriving after JavaScript.
 *
 * A plain client whose fetches revalidate every 60s: `supabase-js` uses the
 * global fetch, and left to Next's Data Cache the session would freeze for
 * ever (the bug that once froze every company chart at 1 September). Not
 * `no-store`, though — that would opt the ROOT out of prerendering, and the
 * root must stay a static, revalidating page.
 */
export type MarketInitial = {
  session: string | null
  /** Session dates the picker can move between, newest first (≈ two years). */
  sessions: string[]
  companies: Company[]
  /** The last 21 sessions' totals, oldest first. */
  recent: IndexRow[]
  /** 45 days of closes per ticker, for the 7- and 30-day columns. */
  hist: Record<string, { date: string; close: number }[]>
}

function client() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { fetch: (u, i) => fetch(u, { ...i, next: { revalidate: 60 } }) },
    auth: { persistSession: false },
  })
}

/**
 * `date`: a past session for the board; omitted → the latest. A date with no
 * session (a Friday, a holiday) snaps to the last session on or before it.
 * Wrapped in React's `cache` so the page and its metadata share one load.
 */
export const loadMarketInitial = cache(async (date?: string): Promise<MarketInitial> => {
  const sb = client()
  const empty: MarketInitial = { session: null, sessions: [], companies: [], recent: [], hist: {} }
  let until = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined
  if (until) {
    const { data } = await sb.from('daily_prices').select('date').lte('date', until).order('date', { ascending: false }).limit(1)
    until = (data?.[0]?.date as string | undefined) ?? undefined
  }
  try {
    const [live, recentRes, hist, sessionsRes] = await Promise.all([
      fetchLiveWith(sb, until),
      (until
        ? sb.from('daily_index').select('date,isx60,total_value,total_volume,total_trades,traded_companies,listed_companies').gt('isx60', 0).lte('date', until)
        : sb.from('daily_index').select('date,isx60,total_value,total_volume,total_trades,traded_companies,listed_companies').gt('isx60', 0)
      ).order('date', { ascending: false }).limit(21),
      (async () => {
        const end = until ? new Date(until).getTime() : Date.now()
        const since = new Date(end - 45 * 86400_000).toISOString().slice(0, 10)
        const by: MarketInitial['hist'] = {}
        for (let from = 0; ; from += 1000) {
          let q = sb.from('daily_prices').select('ticker,date,close').gte('date', since)
          if (until) q = q.lte('date', until)
          const { data, error } = await q.order('date').range(from, from + 999)
          if (error || !data?.length) break
          for (const r of data as { ticker: string; date: string; close: number | null }[]) {
            if (r.close != null && r.close > 0) (by[r.ticker] ??= []).push({ date: r.date, close: r.close })
          }
          if (data.length < 1000) break
        }
        return by
      })(),
      sb.from('daily_index').select('date').gt('isx60', 0).order('date', { ascending: false }).limit(500),
    ])
    return {
      session: live.updated || null,
      sessions: ((sessionsRes.data ?? []) as { date: string }[]).map((r) => r.date),
      companies: mergeCompanies(companiesData as CompanyMeta[], live.stocks),
      recent: ((recentRes.data ?? []) as IndexRow[]).slice().reverse(),
      hist,
    }
  } catch {
    return empty
  }
})

/**
 * The directory's rows: every listed company with its facts and its trading
 * status as of the latest session — no prices. Facts come from the curated
 * profiles where one exists (founded, listed, headquarters, first line of
 * the about text); status from the session snapshot.
 */
export type DirectoryRow = {
  sym: string; ar: string; en: string; logo: string | null; color: string | null; sec: string
  shares: number | null
  status: 'active' | 'untraded' | 'suspended'
  lastTrade: string | null
  /** ISC register market: 1 regular, 2 second; null when the register does not list the company. */
  tier: 1 | 2 | null
  founded: string | null; listed: string | null; hq: string | null
  blurb: string | null
}

export const loadDirectory = cache(async (locale: 'ar' | 'en'): Promise<{ session: string | null; rows: DirectoryRow[] }> => {
  const { COMPANY_PROFILES, FACT_LABELS } = await import('@/lib/companyProfiles')
  const sb = client()
  let live: Awaited<ReturnType<typeof fetchLiveWith>> | null = null
  try { live = await fetchLiveWith(sb) } catch { live = null }
  const bySym = new Map((live?.stocks ?? []).map((x) => [x.code, x]))
  const session = live?.updated || null
  const fact = (facts: { label: string; value: string }[] | undefined, labels: string[]) =>
    facts?.find((f) => labels.includes(f.label.trim()))?.value ?? null
  const rows = (companiesData as CompanyMeta[]).map((c): DirectoryRow => {
    const st = bySym.get(c.sym)
    const days = st?.lastTrade && session ? (new Date(session).getTime() - new Date(st.lastTrade).getTime()) / 86400_000 : null
    const status: DirectoryRow['status'] = !st || !st.stale ? 'active' : days != null && days > 60 ? 'suspended' : 'untraded'
    const prof = COMPANY_PROFILES[c.sym]
    const p = (locale === 'ar' ? prof?.ar : prof?.en) ?? prof?.ar
    const about = p?.about ?? null
    return {
      sym: c.sym, ar: c.ar, en: c.en, logo: c.logo && !/placeholder/.test(c.logo) ? c.logo : null, color: c.color ?? null, sec: String(c.sec),
      shares: c.shares ?? null,
      status, lastTrade: st?.lastTrade ?? null,
      tier: ((iscTiers as Record<string, number>)[c.sym] === 1 ? 1 : (iscTiers as Record<string, number>)[c.sym] === 2 ? 2 : null),
      founded: fact(p?.facts, FACT_LABELS.founded),
      listed: fact(p?.facts, FACT_LABELS.listed),
      hq: fact(p?.facts, FACT_LABELS.hq),
      blurb: about ? about.split(/(?<=[.。؟!])\s/)[0].slice(0, 220) : null,
    }
  })
  return { session, rows }
})

/**
 * The screener's rows on the server: the `company_metrics` view, the
 * identity file, and trailing P/E where financials exist. P/E is allowed to
 * fail on its own — losing it must not lose the other six measures.
 */
export type ScreenerInitial = { metrics: Metric[]; meta: CompanyMeta[]; pe: Record<string, number>; peFailed: boolean; marketSession: string | null }

export const loadScreener = cache(async (): Promise<ScreenerInitial> => {
  const sb = client()
  const [{ data }, latest] = await Promise.all([
    sb.from('company_metrics').select('*'),
    sb.from('daily_prices').select('date').order('date', { ascending: false }).limit(1),
  ])
  const metrics = (data ?? []) as Metric[]
  const marketSession = (latest.data?.[0]?.date as string | undefined) ?? null
  let pe: Record<string, number> = {}, peFailed = false
  try {
    const { fetchTtmPe } = await import('@/lib/fundamentals')
    const prices: Record<string, number> = {}
    for (const m of metrics) if (m.last_close > 0) prices[m.ticker] = m.last_close
    const res = await fetchTtmPe(sb, prices)
    pe = Object.fromEntries(Object.entries(res).map(([t, v]) => [t, v.pe]))
  } catch { peFailed = true }
  return { metrics, meta: companiesData as CompanyMeta[], pe, peFailed, marketSession }
})

/**
 * The statistics hub on the server: the daily series since the rebase
 * (paged), the latest month's sector table, recent foreign flow, and the
 * latest ownership month aggregated to two numbers. Each part fails alone.
 */
export type StatisticsInitial = {
  sessions: Session[]
  sectorRows: SectorMonthRow[]
  flow: { date: string; side: string; value: number | null }[]
  ownership: { month: string; iraqi: number; foreign: number } | null
}

export const loadStatistics = cache(async (): Promise<StatisticsInitial> => {
  const sb = client()
  const out: StatisticsInitial = { sessions: [], sectorRows: [], flow: [], ownership: null }
  await Promise.allSettled([
    (async () => {
      for (let from = 0; from < 8000; from += 1000) {
        const { data, error } = await sb.from('daily_index')
          .select('date,isx60,total_value,total_volume,total_trades,traded_companies,listed_companies')
          .gte('date', REBASE).order('date').range(from, from + 999)
        if (error || !data?.length) break
        for (const r of data as Record<string, number | string | null>[]) {
          out.sessions.push({ date: r.date as string, isx60: r.isx60 as number | null, value: r.total_value as number | null, volume: r.total_volume as number | null,
            trades: r.total_trades as number | null, traded: r.traded_companies as number | null, listed: r.listed_companies as number | null })
        }
        if (data.length < 1000) break
      }
    })(),
    sb.from('sector_monthly').select('year,month,sector,volume,value,trades,traded_companies,listed_companies')
      .order('year', { ascending: false }).order('month', { ascending: false }).limit(40)
      .then(({ data }) => { const rows = (data ?? []) as SectorMonthRow[]; if (rows.length) out.sectorRows = rows.filter((r) => r.year === rows[0].year && r.month === rows[0].month) }),
    sb.from('foreign_flow_company_daily').select('date,side,value').order('date', { ascending: false }).limit(2400)
      .then(({ data }) => { out.flow = (data ?? []) as StatisticsInitial['flow'] }),
    sb.from('ownership_monthly').select('year,month,iraqi_shares,foreign_shares').order('year', { ascending: false }).order('month', { ascending: false }).limit(400)
      .then(({ data }) => {
        const rows = (data ?? []) as { year: number; month: number; iraqi_shares: number | null; foreign_shares: number | null }[]
        if (!rows.length) return
        const y = rows[0].year, m = rows[0].month
        const cur = rows.filter((r) => r.year === y && r.month === m)
        out.ownership = { month: `${y}-${String(m).padStart(2, '0')}`, iraqi: cur.reduce((a, r) => a + (r.iraqi_shares ?? 0), 0), foreign: cur.reduce((a, r) => a + (r.foreign_shares ?? 0), 0) }
      }),
  ])
  return out
})
