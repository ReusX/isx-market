import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'
import { fetchLiveWith, mergeCompanies } from '@/lib/market'
import companiesData from '@/public/data/companies.json'
import iscTiers from '@/public/data/isc-tiers.json'
import depositoryAccounts from '@/public/data/depository-accounts.json'
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

/**
 * The foreign-flow page on the server: session totals per side (two years),
 * the sessions' total traded value for the share, the last forty sessions
 * of per-company rows for the most-bought/sold lists, and the new-account
 * series from the monthly reports (a committed JSON, parsed from the PDFs).
 */
export type FlowInitial = {
  daily: { date: string; side: string; value: number; trades: number }[]
  sessionValue: { date: string; value: number }[]
  companies: { date: string; ticker: string; side: string; value: number }[]
  accounts: {
    ym: string
    /** Accounts opened in the month (Table 29, 2025-11 →). */
    new: { natural_iraqi: number; natural_foreign: number; legal_iraqi: number; legal_foreign: number } | null
    /** Accounts held at month end (Table 45, older reports). */
    total: Record<string, number> | null
  }[]
}

export const loadForeignFlow = cache(async (): Promise<FlowInitial> => {
  const sb = client()
  const since = new Date(Date.now() - 2 * 366 * 86400_000).toISOString().slice(0, 10)
  const out: FlowInitial = { daily: [], sessionValue: [], companies: [], accounts: depositoryAccounts as unknown as FlowInitial['accounts'] }
  await Promise.allSettled([
    sb.from('foreign_flow_daily').select('date,side,value,trades').gte('date', since).order('date').limit(1000)
      .then(({ data }) => { out.daily = ((data ?? []) as { date: string; side: string; value: number | null; trades: number | null }[]).map((r) => ({ date: r.date, side: r.side, value: Number(r.value ?? 0), trades: r.trades ?? 0 })) }),
    sb.from('daily_index').select('date,total_value').gte('date', since).gt('total_value', 0).order('date').limit(1000)
      .then(({ data }) => { out.sessionValue = ((data ?? []) as { date: string; total_value: number }[]).map((r) => ({ date: r.date, value: Number(r.total_value) })) }),
    (async () => {
      const { data: dates } = await sb.from('foreign_flow_company_daily').select('date').order('date', { ascending: false }).limit(1)
      const last = dates?.[0]?.date as string | undefined
      if (!last) return
      const from = new Date(new Date(last).getTime() - 70 * 86400_000).toISOString().slice(0, 10)
      const rows: FlowInitial['companies'] = []
      for (let f = 0; ; f += 1000) {
        const { data, error } = await sb.from('foreign_flow_company_daily').select('date,ticker,side,value').gte('date', from).order('date').range(f, f + 999)
        if (error || !data?.length) break
        for (const r of data as { date: string; ticker: string; side: string; value: number | null }[]) rows.push({ date: r.date, ticker: r.ticker, side: r.side, value: Number(r.value ?? 0) })
        if (data.length < 1000) break
      }
      out.companies = rows
    })(),
  ])
  return out
})

/* ═══════════════════════════════════════════════════════════════════════════
   The depository reports · /statistics/ownership and /statistics/shareholders

   Both tables are monthly filings keyed on a company NAME, not a ticker, so
   every read here does three things:

     1. finds the latest period IN THE SOURCE and reads only that period — a
        union of several months is not a snapshot;
     2. pages until the period is exhausted (both tables pass 1000 rows);
     3. resolves the printed name through `resolveSnapshot`, which either
        proves a ticker or leaves the row unresolved. An unresolved row is
        counted in the coverage denominator and never shown against a company.

   Market totals are summed over EVERY row of the period, because a sum needs
   no company name. The table below shows only what could be proven, and the
   page says so rather than quietly showing a shorter list.

   Moved from the client (`components/routes/depositoryData.ts`) so the
   figures and the table are in the HTML for first paint and for the crawler.
   ═══════════════════════════════════════════════════════════════════════════ */

export type Coverage = { sourceCompanies: number; matched: number; rows: number }

export type OwnershipRow = {
  sym: string; name: string
  iraqi: number; foreign: number
  /** Foreign holders of record; null where the report left the count blank. */
  holders: number | null
  total: number; pct: number
}

export type OwnershipInitial = {
  /** `YYYY-MM` of the report, or null when nothing could be read. */
  month: string | null
  rows: OwnershipRow[]
  market: { iraqi: number; foreign: number; pct: number; holders: number; companies: number }
  coverage: Coverage
  failed: boolean
}

export type HolderRow = { id: string; holder: string; sym: string; company: string; pct: number }

export type HoldersInitial = {
  month: string | null
  rows: HolderRow[]
  coverage: Coverage
  companies: number
  /** Distinct nationality values the SOURCE recorded — not a claim about the holders. */
  nationalities: string[]
  failed: boolean
}

type Period = { year: number; month: number }

/** Every row of one period, not the first page. */
async function readPeriod(sb: ReturnType<typeof client>, table: string, select: string, p: Period) {
  const out: Record<string, unknown>[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select(select).eq('year', p.year).eq('month', p.month).range(from, from + 999)
    if (error) break
    const page = (data ?? []) as unknown as Record<string, unknown>[]
    out.push(...page)
    if (page.length < 1000) break
  }
  return out
}

async function latestPeriod(sb: ReturnType<typeof client>, table: string): Promise<Period | null> {
  const { data } = await sb.from(table).select('year,month').order('year', { ascending: false }).order('month', { ascending: false }).limit(1)
  const row = (data?.[0] ?? null) as { year?: number; month?: number } | null
  return row?.year && row?.month ? { year: row.year, month: row.month } : null
}

/** The roster both pages match against. Curated names display; metrics names only match. */
async function roster(sb: ReturnType<typeof client>) {
  const { buildRoster } = await import('@/lib/depositoryNames')
  const { data } = await sb.from('company_metrics').select('ticker,name_ar,name_en')
  return buildRoster(companiesData as CompanyMeta[], (data ?? []) as { ticker: string; name_ar?: string | null; name_en?: string | null }[])
}

const ym = (p: Period) => `${p.year}-${String(p.month).padStart(2, '0')}`

export const loadOwnership = cache(async (locale: 'ar' | 'en'): Promise<OwnershipInitial> => {
  const empty: OwnershipInitial = { month: null, rows: [], market: { iraqi: 0, foreign: 0, pct: 0, holders: 0, companies: 0 }, coverage: { sourceCompanies: 0, matched: 0, rows: 0 }, failed: true }
  try {
    const sb = client()
    const period = await latestPeriod(sb, 'ownership_monthly')
    if (!period) return empty
    const { resolveSnapshot } = await import('@/lib/depositoryNames')
    const [raw, list] = await Promise.all([
      readPeriod(sb, 'ownership_monthly', 'name_ar,iraqi_shares,foreign_shares,iraqi_count,foreign_count', period),
      roster(sb),
    ])
    const bySym = new Map(list.map((r) => [r.sym, r]))
    const res = resolveSnapshot(raw.map((r) => String(r.name_ar ?? '')), list)

    let iraqi = 0, foreign = 0, holders = 0
    const rows: OwnershipRow[] = []
    for (const r of raw) {
      const i = Number(r.iraqi_shares ?? 0), f = Number(r.foreign_shares ?? 0)
      iraqi += i; foreign += f; holders += Number(r.foreign_count ?? 0)
      const hit = res.get(String(r.name_ar ?? ''))
      if (!hit?.sym || f <= 0) continue
      const e = bySym.get(hit.sym)
      /* Prefer the reader's language, but never machine-translate a legal
         company name — the canonical Arabic is the fallback either way. */
      const name = (locale === 'en' ? e?.en || hit.canonical || e?.ar : hit.canonical || e?.ar || e?.en) || hit.sym
      rows.push({ sym: hit.sym, name, iraqi: i, foreign: f, holders: r.foreign_count == null ? null : Number(r.foreign_count), total: i + f, pct: i + f ? (f / (i + f)) * 100 : 0 })
    }
    rows.sort((a, b) => b.pct - a.pct)
    const names = Array.from(res.values())
    return {
      month: ym(period), rows,
      market: { iraqi, foreign, pct: iraqi + foreign ? (foreign / (iraqi + foreign)) * 100 : 0, holders, companies: raw.length },
      coverage: { sourceCompanies: names.length, matched: names.filter((r) => r.sym).length, rows: raw.length },
      failed: false,
    }
  } catch { return empty }
})

export const loadShareholders = cache(async (locale: 'ar' | 'en'): Promise<HoldersInitial> => {
  const empty: HoldersInitial = { month: null, rows: [], coverage: { sourceCompanies: 0, matched: 0, rows: 0 }, companies: 0, nationalities: [], failed: true }
  try {
    const sb = client()
    const period = await latestPeriod(sb, 'major_shareholders')
    if (!period) return empty
    const { resolveSnapshot } = await import('@/lib/depositoryNames')
    const [raw, list] = await Promise.all([
      readPeriod(sb, 'major_shareholders', 'company_name_ar,rank,name_ar,nationality,curr_pct', period),
      roster(sb),
    ])
    const bySym = new Map(list.map((r) => [r.sym, r]))
    const res = resolveSnapshot(raw.map((r) => String(r.company_name_ar ?? '')), list)

    const rows: HolderRow[] = []
    for (const r of raw) {
      const hit = res.get(String(r.company_name_ar ?? ''))
      /* The holder's own name is never matched or translated — it is a person
         or a legal entity, and the report's spelling is the only record of it
         there is. */
      if (!hit?.sym || r.curr_pct == null || !r.name_ar) continue
      const e = bySym.get(hit.sym)
      const company = (locale === 'en' ? e?.en || hit.canonical || e?.ar : hit.canonical || e?.ar || e?.en) || hit.sym
      rows.push({ id: `${hit.sym}·${r.rank}·${String(r.name_ar)}`, holder: String(r.name_ar), sym: hit.sym, company, pct: Number(r.curr_pct) })
    }
    rows.sort((a, b) => b.pct - a.pct)
    const names = Array.from(res.values())
    return {
      month: ym(period), rows,
      coverage: { sourceCompanies: names.length, matched: names.filter((r) => r.sym).length, rows: raw.length },
      companies: new Set(rows.map((r) => r.sym)).size,
      nationalities: Array.from(new Set(raw.map((r) => r.nationality).filter(Boolean))) as string[],
      failed: false,
    }
  } catch { return empty }
})

/* ═══════════════════════════════════════════════════════════════════════════
   /pulse · نبض السوق — the session model, on the server

   The page was entirely client-fetched: a crawler received the module
   headings and not one of the numbers under them, and every visitor paged
   Supabase directly. The model itself (lib/pulse.ts) is unchanged — its
   formulas, thresholds and four-state breadth are the product's own and are
   reused verbatim. Only the fetching moves here.

   ⚠ Two rules from lib/pulse.ts that this loader must not quietly break:

     · `noPrior` is a real fourth state. A company that traded today but had
       no comparable close in the previous session is NOT flat. It is counted
       live for the current session, and left `null` — "this source cannot
       say" — for history, which comes from `breadth_daily` and has nowhere
       to put it.
     · A company whose sector is unknown is left OUT of the sector view
       rather than filed under a guess.

   Sector ids and company names are returned raw, not labelled: the old page
   called `sectorLabel(key, 'ar')` with the locale hard-coded, so the English
   page printed Arabic sector names. The component labels them instead.
   ═══════════════════════════════════════════════════════════════════════════ */

export type PulseInitial = {
  live: PulseSession | null
  prev: PulseSession | null
  history: PulseSession[]
  sectors: PulseSector[]
  byValue: { symbol: string; ar: string | null; en: string | null; value: number; pct: number | null }[]
  /** The bulletin's traded count vs the rows we hold, when they disagree. */
  tradedGap: { index: number; rows: number } | null
  failed: boolean
}

type PulseSession = import('@/lib/pulse').Session
type PulseSector = Omit<import('@/lib/pulse').SectorBreadth, 'label'>

export const loadPulse = cache(async (): Promise<PulseInitial> => {
  const empty: PulseInitial = { live: null, prev: null, history: [], sectors: [], byValue: [], tradedGap: null, failed: true }
  try {
    const { countLive, pctVsPrev } = await import('@/lib/pulse')
    const sb = client()

    /* The canonical session is `daily_index`'s newest row — the same session
       the root, /market and /heatmap resolve. */
    const { data: idxData } = await sb.from('daily_index')
      .select('date,total_volume,total_value,total_trades,traded_companies,listed_companies')
      .order('date', { ascending: false }).limit(260)
    const idx = (idxData ?? []) as { date: string; total_volume: number | null; total_value: number | null; total_trades: number | null; traded_companies: number | null; listed_companies: number | null }[]
    if (!idx.length) return empty

    const latestDate = idx[0].date
    const prevDate = idx[1]?.date ?? null

    const [bRes, pRes, mRes] = await Promise.all([
      sb.from('breadth_daily').select('date,advancers,decliners,unchanged,up_volume,down_volume,new_highs,new_lows,traded')
        .order('date', { ascending: false }).limit(260),
      sb.from('daily_prices').select('date,ticker,close,volume,value')
        .in('date', prevDate ? [latestDate, prevDate] : [latestDate]).limit(2000),
      sb.from('company_metrics').select('ticker,sector'),
    ])
    type BRow = { date: string; advancers: number; decliners: number; unchanged: number; up_volume: number; down_volume: number; new_highs: number | null; new_lows: number | null; traded: number }
    const breadth = (bRes.data ?? []) as BRow[]
    const prices = (pRes.data ?? []) as { date: string; ticker: string; close: number | null; volume: number | null; value: number | null }[]
    const metrics = (mRes.data ?? []) as { ticker: string; sector: string | null }[]

    const todayRows = prices.filter((r) => r.date === latestDate)
    if (!todayRows.length) return empty

    const prevCloses = new Map<string, number>()
    for (const r of prices) if (r.date === prevDate && r.close != null && r.close > 0) prevCloses.set(r.ticker, r.close)

    const counted = countLive(todayRows, prevCloses)
    const bByDate = new Map(breadth.map((r) => [r.date, r]))
    const idxByDate = new Map(idx.map((r) => [r.date, r]))
    const bToday = bByDate.get(latestDate) ?? null

    const live: PulseSession = {
      date: latestDate,
      advancers: counted.advancers, decliners: counted.decliners,
      unchanged: counted.unchanged, noPrior: counted.noPrior,
      upVolume: counted.upVolume, downVolume: counted.downVolume,
      /* The official bulletin's own figures — not derivable from two sessions
         of prices, so absent rather than guessed. */
      newHighs: bToday?.new_highs ?? null, newLows: bToday?.new_lows ?? null,
      traded: todayRows.length, listed: idx[0].listed_companies,
      totalValue: idx[0].total_value, totalVolume: idx[0].total_volume, totalTrades: idx[0].total_trades,
    }

    /* History keeps `breadth_daily`: the only source reaching back to 2010.
       Its three-state definition is why `noPrior` is null here. */
    const history: PulseSession[] = breadth.slice().reverse().map((r) => {
      const i = idxByDate.get(r.date)
      return {
        date: r.date, advancers: r.advancers, decliners: r.decliners, unchanged: r.unchanged, noPrior: null,
        upVolume: r.up_volume, downVolume: r.down_volume, newHighs: r.new_highs, newLows: r.new_lows,
        traded: r.traded, listed: i?.listed_companies ?? null,
        totalValue: i?.total_value ?? null, totalVolume: i?.total_volume ?? null, totalTrades: i?.total_trades ?? null,
      }
    })

    const prevIdx = prevDate ? idxByDate.get(prevDate) : null
    const prevB = prevDate ? bByDate.get(prevDate) : null
    const prev: PulseSession | null = prevDate && prevIdx ? {
      date: prevDate,
      advancers: prevB?.advancers ?? 0, decliners: prevB?.decliners ?? 0, unchanged: prevB?.unchanged ?? 0, noPrior: null,
      upVolume: prevB?.up_volume ?? 0, downVolume: prevB?.down_volume ?? 0,
      newHighs: prevB?.new_highs ?? null, newLows: prevB?.new_lows ?? null,
      traded: prevIdx.traded_companies ?? prevB?.traded ?? 0, listed: prevIdx.listed_companies,
      totalValue: prevIdx.total_value, totalVolume: prevIdx.total_volume, totalTrades: prevIdx.total_trades,
    } : null

    /* A company whose sector is unknown is left out rather than guessed. */
    const secOf = new Map(metrics.map((m) => [m.ticker, m.sector]))
    const buckets = new Map<string, PulseSector>()
    for (const r of todayRows) {
      const key = secOf.get(r.ticker)
      if (!key) continue
      let b = buckets.get(key)
      if (!b) { b = { id: key, up: 0, down: 0, flat: 0, noPrior: 0, measured: 0, traded: 0 }; buckets.set(key, b) }
      b.traded++
      const d = counted.dir.get(r.ticker)
      if (d === 'up') { b.up++; b.measured++ }
      else if (d === 'down') { b.down++; b.measured++ }
      else if (d === 'flat') { b.flat++; b.measured++ }
      else b.noPrior++
    }
    const sectors = Array.from(buckets.values()).sort((a, b) => b.traded - a.traded)

    const meta = new Map((companiesData as CompanyMeta[]).map((m) => [m.sym, m]))
    const byValue = todayRows
      .filter((r) => (r.value ?? 0) > 0)
      .map((r) => {
        const m = meta.get(r.ticker)
        return { symbol: r.ticker, ar: m?.ar || null, en: m?.en || null, value: r.value as number, pct: pctVsPrev(r.close, prevCloses.get(r.ticker)) }
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 40)

    const idxTraded = idx[0].traded_companies
    return {
      live, prev, history, sectors, byValue,
      tradedGap: idxTraded != null && idxTraded !== todayRows.length ? { index: idxTraded, rows: todayRows.length } : null,
      failed: false,
    }
  } catch { return empty }
})

/* ═══════════════════════════════════════════════════════════════════════════
   /c/[sym] · the company page, on the server

   This route had the worst cost profile on the site. It carried no
   `revalidate` and no `generateStaticParams`, so 104 companies × 2 locales
   were rendered dynamically on every view; the component then queried
   Supabase from the browser AND called /api/chart/[sym]. Two function
   invocations and a direct database read per page view.

   ⚠ The expensive part was not the count of queries but two of them:

        ownership_monthly   .limit(2000)
        major_shareholders  .limit(4000)

   Six thousand rows pulled into the browser to find the handful belonging to
   ONE company. Those tables key on a printed company NAME rather than a
   ticker, which is why the old code could not filter — so it fetched
   everything and matched client-side.

   The fix is to read only the LATEST period of each, the same way
   loadOwnership does, and let `ownershipFor` / `holdersFor` do the name
   resolution over ~200 rows instead of 6,000.

   Returns are computed HERE, not shipped: the index-comparison module needs
   eight numbers, not two multi-year series.
   ═══════════════════════════════════════════════════════════════════════════ */

export type CompanyInitial = {
  found: boolean
  sym: string
  ar: string; en: string
  /** A key `sectorLabel` understands — NOT companies.json's 3-letter code. */
  sec: string
  isBank: boolean
  logo: string | null; color: string | null
  shares: number | null
  /** Session snapshot. */
  last: number | null; prev: number | null; change: number | null; changePct: number | null
  volume: number | null; value: number | null; trades: number | null
  session: string | null; lastTrade: string | null; stale: boolean
  high52: number | null; low52: number | null; daysSinceTrade: number | null
  pe: number | null
  /** OHLCV for the chart, oldest first — five years, the longest range
      offered. Candles need the full bar, not just the close. */
  series: { date: string; open: number; high: number; low: number; close: number; volume: number }[]
  /** Price returns for the company and the index, already computed. */
  returns: { co: import('@/lib/companyView').Returns | null; idx: import('@/lib/companyView').Returns | null }
  facts: import('@/lib/companyView').FactRow[]
  ratios: import('@/lib/companyView').RatioRow[]
  flow: { date: string; side: string; value: number }[]
  ownership: import('@/lib/companyView').OwnershipRow | null
  holders: import('@/lib/companyView').Holder[]
}

const SEC_CODE: Record<string, string> = {
  BANK: 'Banks', TEL: 'Telecom', IND: 'Industry', HTL: 'Tourism',
  INS: 'Insurance', SVC: 'Services', AGR: 'Agriculture', INV: 'Investment',
}

export const loadCompany = cache(async (symRaw: string): Promise<CompanyInitial> => {
  const sym = symRaw.toUpperCase()
  const meta = (companiesData as CompanyMeta[]).find((m) => m.sym === sym)
  const base: CompanyInitial = {
    found: false, sym, ar: sym, en: sym, sec: '', isBank: false, logo: null, color: null, shares: null,
    last: null, prev: null, change: null, changePct: null, volume: null, value: null, trades: null,
    session: null, lastTrade: null, stale: false, high52: null, low52: null, daysSinceTrade: null, pe: null,
    series: [], returns: { co: null, idx: null }, facts: [], ratios: [], flow: [], ownership: null, holders: [],
  }
  if (!meta) return base

  const out: CompanyInitial = {
    ...base, found: true,
    ar: meta.ar || sym, en: meta.en || sym,
    /* ⚠ companies.json spells sectors as 3-letter codes (BANK, TEL) while
       SECTOR_LABELS — and every other rebuilt page — is keyed on
       company_metrics.sector (Banks, Telecom). Passing the raw code through
       printed «TEL» on the page instead of «الاتصالات». Mapped here, once,
       and overridden below by the metrics row when there is one. */
    sec: SEC_CODE[String(meta.sec ?? '')] ?? String(meta.sec ?? ''),
    isBank: String(meta.sec ?? '') === 'BANK',
    logo: meta.logo && !/placeholder/.test(meta.logo) ? meta.logo : null,
    color: meta.color ?? null, shares: meta.shares ?? null,
  }

  try {
    const sb = client()
    const { buildReturns } = await import('@/lib/companyView')
    const since = new Date(Date.now() - 5 * 366 * 86400_000).toISOString().slice(0, 10)

    /* Latest period of each depository table — NOT the whole table. */
    const period = async (table: string) => {
      const { data } = await sb.from(table).select('year,month').order('year', { ascending: false }).order('month', { ascending: false }).limit(1)
      const r = (data?.[0] ?? null) as { year?: number; month?: number } | null
      return r?.year && r?.month ? { year: r.year, month: r.month } : null
    }

    const [live, mRes, seriesRows, idxRows, fRes, rRes, ffRes, ownP, holdP] = await Promise.all([
      fetchLiveWith(sb).catch(() => null),
      sb.from('company_metrics').select('ticker,sector,last_close,prev_close,high_52w,low_52w,days_since_trade,last_date').eq('ticker', sym).limit(1),
      (async () => {
        const rows: CompanyInitial['series'] = []
        for (let from = 0; ; from += 1000) {
          const { data, error } = await sb.from('daily_prices').select('date,open,high,low,close,volume')
            .eq('ticker', sym).gte('date', since).order('date').range(from, from + 999)
          if (error || !data?.length) break
          for (const r of data as { date: string; open: number | null; high: number | null; low: number | null; close: number | null; volume: number | null }[]) {
            if (r.close == null || !(r.close > 0)) continue
            /* A bulletin row can carry a close with no open/high/low. Fall
               back to the close so the candle degrades to a doji rather than
               drawing a bar out of nulls. */
            const c = r.close
            rows.push({
              date: r.date,
              open: r.open != null && r.open > 0 ? r.open : c,
              high: r.high != null && r.high > 0 ? r.high : Math.max(c, r.open ?? c),
              low: r.low != null && r.low > 0 ? r.low : Math.min(c, r.open ?? c),
              close: c,
              volume: r.volume ?? 0,
            })
          }
          if (data.length < 1000) break
        }
        return rows
      })(),
      (async () => {
        const rows: { date: string; close: number }[] = []
        for (let from = 0; ; from += 1000) {
          const { data, error } = await sb.from('daily_index').select('date,isx60').gt('isx60', 0).gte('date', since).order('date').range(from, from + 999)
          if (error || !data?.length) break
          for (const r of data as { date: string; isx60: number }[]) rows.push({ date: r.date, close: r.isx60 })
          if (data.length < 1000) break
        }
        return rows
      })(),
      sb.from('financial_facts_public').select('fiscal_year,period,line_key,value_iqd').eq('ticker', sym).eq('statement', 'income')
        .in('line_key', ['revenue', 'net_income', 'financing_income', 'revenue_and_commissions']),
      sb.from('financial_ratios_public').select('fiscal_year,period,ratio_key,value').eq('ticker', sym),
      sb.from('foreign_flow_company_daily').select('date,side,value').eq('ticker', sym).order('date', { ascending: false }).limit(120),
      period('ownership_monthly'),
      period('major_shareholders'),
    ])

    const stock = live?.stocks.find((s) => s.code === sym) ?? null
    const m = (mRes.data?.[0] ?? null) as { sector: string | null; last_close: number | null; prev_close: number | null; high_52w: number | null; low_52w: number | null; days_since_trade: number | null; last_date: string | null } | null

    if (m?.sector) out.sec = m.sector
    out.session = live?.updated || null
    out.last = stock?.close ?? m?.last_close ?? null
    out.prev = m?.prev_close ?? null
    /* ⚠ `vol` is the traded VALUE in IQD — a legacy name — and
       `shares_traded` is the share count. Reading them the other way round
       prints dinars as shares. */
    out.volume = stock?.shares_traded ?? null
    out.value = stock?.vol ?? null
    out.trades = stock?.deals ?? null
    out.lastTrade = stock?.lastTrade ?? m?.last_date ?? null
    out.stale = Boolean(stock?.stale)
    out.high52 = m?.high_52w ?? null
    out.low52 = m?.low_52w ?? null
    out.daysSinceTrade = m?.days_since_trade ?? null
    /* `noPrior` means change and pct are held at 0 for compatibility but are
       NOT measurements. Null here, so the page can say so rather than print a
       zero that reads as «no change». */
    if (stock && !stock.noPrior) {
      out.change = stock.change
      out.changePct = stock.pct
    } else if (out.last != null && out.prev != null && out.prev > 0) {
      out.change = out.last - out.prev
      out.changePct = (out.change / out.prev) * 100
    }

    out.series = seriesRows
    const toPts = (rows: { date: string; close: number }[]) => rows.map((r) => ({ t: Date.parse(`${r.date}T00:00:00Z`), v: r.close }))
    out.returns = { co: buildReturns(toPts(seriesRows)), idx: buildReturns(toPts(idxRows)) }

    out.facts = (fRes.data ?? []) as CompanyInitial['facts']
    out.ratios = (rRes.data ?? []) as CompanyInitial['ratios']
    out.flow = ((ffRes.data ?? []) as { date: string; side: string; value: number | null }[]).map((r) => ({ date: r.date, side: r.side, value: Number(r.value ?? 0) }))

    /* ~126 ownership rows and ~67 shareholder rows, not 6,000.
     *
     * ⚠ Resolved through lib/depositoryNames — the SAME path /statistics
     * uses — rather than through companyView's `matchCompanyRecord`. The
     * point is that the two surfaces cannot disagree about which filed row
     * belongs to which company: the roster normalises orthography, models
     * the lam-alef ligature damage, and carries `company_metrics.name_ar`
     * as an extra match key because it is damaged by the same OCR.
     *
     * It does NOT resolve everything, and must not. The August ownership
     * table spells Bank of Baghdad «مرصف بغداد» — a ر where the ص belongs —
     * and the resolver reports that as `unresolved / no-candidate` rather
     * than guessing. So BBOB's page shows no ownership block at all. That is
     * the intended outcome: the rule is that a false negative is preferable
     * to attaching a filing to the wrong company, and a page showing nothing
     * is honest where a page showing someone else's ownership is not. */
    const { resolveSnapshot } = await import('@/lib/depositoryNames')
    const list = await roster(sb)
    if (ownP) {
      const { data } = await sb.from('ownership_monthly')
        .select('year,month,name_ar,capital,deposited_capital,deposit_ratio,iraqi_shares,foreign_shares,iraqi_count,foreign_count')
        .eq('year', ownP.year).eq('month', ownP.month)
      const rows = (data ?? []) as import('@/lib/companyView').OwnershipRow[]
      const res = resolveSnapshot(rows.map((r) => r.name_ar), list)
      out.ownership = rows.find((r) => res.get(r.name_ar)?.sym === sym) ?? null
    }
    if (holdP) {
      const { data } = await sb.from('major_shareholders')
        .select('year,month,company_name_ar,rank,name_ar,nationality,curr_shares,curr_pct,prev_pct,change_pct')
        .eq('year', holdP.year).eq('month', holdP.month)
      const rows = (data ?? []) as import('@/lib/companyView').ShareholderRow[]
      const res = resolveSnapshot(rows.map((r) => r.company_name_ar), list)
      /* Same shaping holdersFor applies: a nameless holder is not a holder,
         and `change_pct` is unusable in this source, so it is absent rather
         than printed as a zero that would read as «no change». */
      out.holders = rows
        .filter((r) => res.get(r.company_name_ar)?.sym === sym)
        .filter((r) => r.name_ar?.trim() && r.curr_pct != null && r.curr_pct > 0)
        .sort((a, b) => (b.curr_pct ?? 0) - (a.curr_pct ?? 0))
        .map((r, i) => ({
          rank: i + 1, name: r.name_ar.trim(),
          foreign: (r.nationality ?? '').toLowerCase().startsWith('for'),
          pct: r.curr_pct as number, changePct: null,
        }))
    }

    try {
      const { fetchTtmPe } = await import('@/lib/fundamentals')
      if (out.last && out.last > 0) {
        const res = await fetchTtmPe(sb, { [sym]: out.last })
        out.pe = res[sym]?.pe ?? null
      }
    } catch { /* P/E is allowed to fail alone. */ }

    return out
  } catch {
    return out
  }
})
