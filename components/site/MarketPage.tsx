'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { fetchLive, fetchCompanyMeta, mergeCompanies, companyName, liveMcap, isSuspended, SECTORS } from '@/lib/market'
import { useRouter } from 'next/navigation'
import { shortDate } from '@/lib/date'
import { CompanyLogo } from '@/components/CompanyLogo'
import { sessionDate, type IndexRow } from '@/lib/homeData'
import { useLocale } from '@/context/LocaleContext'
import { SiteShell } from './SiteShell'
import { DoorRail } from './DoorRail'
import { PageTitle } from './PageTitle'
import { IndexChart, type IndexPoint, type IndexSeries } from './IndexChart'
import { FlowRing, type FlowRow } from './FlowRing'
import { DayChip } from './DayChip'
import '@/styles/markets.css'
import type { Company } from '@/types'
import type { MarketInitial } from '@/lib/marketServer'

/**
 * The market · the root of the site, and the الأسواق door.
 *
 * The overview lives at `/` (the URL that carries the site's authority)
 * and the full board at `/market`, which is the site's top result for the
 * prices query and keeps its own title. Same component, two variants.
 *
 * Top to bottom:
 *
 *   0. The two openers: the ISX60 drawn to scale, and foreign flow as a ring.
 *   1. The session in four figures — ISX60, traded value, volume, breadth —
 *      on a data block.
 *   2. The door's rail: the pages that belong to الأسواق, as a sidebar.
 *   3. The board (public name: جدول الشركات): every listed company, one row
 *      each — logo and name, the price large, then 24h / 7-day / 30-day
 *      change, session volume, market cap and shares outstanding — busiest
 *      first, twenty rows then «عرض الكل». A company that did not trade says
 *      so in place of its change, with a streak when it has been more than
 *      one session. One search field and the sector pills. A row links to
 *      the company page.
 *
 * An information surface, so it runs full width (.id-full); only the lede
 * caps its own line length.
 *
 * Data comes from the same sources as before (lib/market, daily_index);
 * nothing about how it is SHOWN is inherited. Both sources are fetched
 * independently, so a failed index does not blank the board.
 */
const price = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const int = new Intl.NumberFormat('en-US')

type Units = { tn: string; bn: string; mn: string; k: string }
function compact(v: number | null | undefined, u: Units): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const a = Math.abs(v)
  if (a >= 1e12) return `${(v / 1e12).toFixed(a >= 1e13 ? 0 : 1)} ${u.tn}`
  if (a >= 1e9) return `${(v / 1e9).toFixed(a >= 1e10 ? 0 : 1)} ${u.bn}`
  if (a >= 1e6) return `${(v / 1e6).toFixed(a >= 1e7 ? 0 : 1)} ${u.mn}`
  if (a >= 1e3) return `${(v / 1e3).toFixed(0)} ${u.k}`
  return int.format(v)
}

/* A percentage as coloured text: mint up, coral down, muted flat. */
function Pct({ v }: { v: number }) {
  const cls = v > 0 ? 'id-up' : v < 0 ? 'id-down' : 'id-cap'
  return <bdi className={`iqm-pct ${cls}`}>{v > 0 ? '+' : ''}{v.toFixed(2)}%</bdi>
}


/**
 * `root`: the overview — session strip, ISX60 and foreign flow, thirty rows, and a
 * link to /market for the rest. `full`: /market — every company, every
 * column, no card.
 */
export function MarketPage({ variant = 'root', initial }: { variant?: 'root' | 'full'; initial?: MarketInitial }) {
  const full = variant === 'full'
  const { t, locale, href: L } = useLocale()
  const m = t.market
  const p = m.page
  const u = t.site.units
  const ar = locale === 'ar'

  /* Seeded from the server when the page was rendered with data, so the
     session figures and the board are on screen — and in the HTML — before
     any client fetch. The client then only fetches what the server did
     not: the index series for the chart, RSISX, and foreign flow. */
  const [companies, setCompanies] = useState<Company[]>(initial?.companies ?? [])
  const [session, setSession] = useState<string | null>(initial?.session ?? null)
  const [index, setIndex] = useState<{ latest: IndexRow; prev: IndexRow | null } | null>(
    initial?.recent.length ? { latest: initial.recent[initial.recent.length - 1], prev: initial.recent[initial.recent.length - 2] ?? null } : null)
  /* The last 21 sessions' totals: the latest, and the twenty before it that
     give each figure its «عن متوسط 20 جلسة» context. */
  const [recent, setRecent] = useState<IndexRow[]>(initial?.recent ?? [])
  const [series, setSeries] = useState<IndexSeries>({ isx60: [], rsisx: [] })
  const [flowRows, setFlowRows] = useState<FlowRow[]>([])
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(!initial)
  const [q, setQ] = useState('')
  const [sector, setSector] = useState('all')
  type Listing = 'all' | 'traded' | 'untraded' | 'suspended'
  const [listing, setListing] = useState<Listing>('all')
  const router = useRouter()
  /* Column sort. Default is session volume, descending — the busiest
     companies first, the untraded ones last; a click on a header
     sorts by that column, a second click flips it. Untraded companies
     always sink below traded ones when sorting by a change column, because
     their change is not a number. */
  type SortKey = 'mcap' | 'name' | 'price' | 'd1' | 'd7' | 'd30' | 'volume' | 'shares' | 'value' | 'deals'
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'value', dir: 'desc' })
  const sortBy = (key: SortKey) => setSort((s) => s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: key === 'name' ? 'asc' : 'desc' })
  /* Closes per ticker for the last ~45 days, for the 7- and 30-day changes. */
  const [hist, setHist] = useState<Record<string, { date: string; close: number }[]>>(initial?.hist ?? {})

  useEffect(() => {
    let alive = true
    ;(async () => {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      const seeded = Boolean(initial?.companies.length)
      if (full && seeded) { setLoading(false); return }   // the full board is served whole
      await Promise.allSettled([
        seeded ? Promise.resolve() : (async () => {
          const [live, meta] = await Promise.all([fetchLive(), fetchCompanyMeta()])
          if (!alive) return
          setCompanies(mergeCompanies(meta, live.stocks))
          setSession(live.updated || null)
        })().catch(() => alive && setFailed(true)),
        /* The whole index history, in pages: PostgREST caps a query at 1000
           rows, and an unbounded ascending query once made a years-old close
           look like the latest session. Zero closes are data holes. */
        (async () => {
          const rows: IndexRow[] = []
          for (let from = 0; ; from += 1000) {
            const { data, error } = await sb.from('daily_index')
              .select('date,isx60,total_value,total_volume,total_trades,traded_companies,listed_companies')
              .gt('isx60', 0).order('date').range(from, from + 999)
            if (error || !data?.length) break
            rows.push(...(data as IndexRow[]))
            if (data.length < 1000) break
          }
          if (!alive || !rows.length) return
          setSeries((s) => ({ ...s, isx60: rows.map((r) => ({ date: r.date, isx60: r.isx60 })) }))
          setIndex({ latest: rows[rows.length - 1], prev: rows[rows.length - 2] ?? null })
          if (!initial?.recent.length) setRecent(rows.slice(-21))
        })(),
        /* Price history for the 7- and 30-day columns: 45 calendar days of
           closes for every ticker, paged under PostgREST's 1000-row cap. */
        initial?.hist && Object.keys(initial.hist).length ? Promise.resolve() : (async () => {
          const since = new Date(Date.now() - 45 * 86400_000).toISOString().slice(0, 10)
          const by: Record<string, { date: string; close: number }[]> = {}
          for (let from = 0; ; from += 1000) {
            const { data, error } = await sb.from('daily_prices').select('ticker,date,close').gte('date', since).order('date').range(from, from + 999)
            if (error || !data?.length) break
            for (const r of data as { ticker: string; date: string; close: number | null }[]) {
              if (r.close != null && r.close > 0) (by[r.ticker] ??= []).push({ date: r.date, close: r.close })
            }
            if (data.length < 1000) break
          }
          if (alive) setHist(by)
        })(),
        /* RSISX through our own proxy (Rabee's API refuses direct calls). */
        fetch('/api/index/rsisx').then((r) => (r.ok ? r.json() : [])).then((rows: { date: string; iqd: number; usd: number }[]) => {
          if (!alive || !Array.isArray(rows) || !rows.length) return
          setSeries((s) => ({ ...s, rsisx: rows.map((r) => ({ date: r.date, isx60: r.iqd })) }))
        }).catch(() => {}),
        sb.from('foreign_flow_company_daily')
          .select('date,side,value').order('date', { ascending: false }).limit(1200)
          .then(({ data }) => { if (alive && data) setFlowRows(data as FlowRow[]) }),
      ])
      if (alive) setLoading(false)
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  /* Sessions the market has held, oldest first, up to the session shown —
     for the untraded streak. From the server's list when there is one,
     else from the chart's series. */
  const sessions = useMemo(() => {
    const all = initial?.sessions.length ? initial.sessions.slice().reverse() : series.isx60.map((p) => p.date)
    return session ? all.filter((d) => d <= session) : all
  }, [initial?.sessions, series.isx60, session])
  const streakOf = (c: Company) => (c.lastTrade ? sessions.filter((d) => d > c.lastTrade!).length : sessions.length)
  /* Suspended = more than sixty days without a trade, measured at the
     session shown, not at today — a past board must not know the future. */
  const suspended = (c: Company) => Boolean(c.stale) && (c.lastTrade
    ? (new Date(session ?? Date.now()).getTime() - new Date(c.lastTrade).getTime()) / 86400_000 > 60
    : isSuspended(c))

  /* Change over N calendar days: against the last close on or before
     session − N days. Null when there is no such close. */
  const changeOver = (c: Company, days: number): number | null => {
    const h = hist[c.sym]
    if (!h?.length || !session) return null
    const cutoff = new Date(new Date(session).getTime() - days * 86400_000).toISOString().slice(0, 10)
    let base: number | null = null
    for (const r of h) { if (r.date <= cutoff) base = r.close; else break }
    return base ? ((c.close - base) / base) * 100 : null
  }

  /* Each session figure against the mean of the twenty sessions before it. */
  const vsAvg = (key: 'total_value' | 'total_volume' | 'total_trades'): number | null => {
    if (recent.length < 6) return null
    const prev = recent.slice(0, -1).map((r) => r[key]).filter((v): v is number => v != null && v > 0)
    const now = recent[recent.length - 1][key]
    if (!prev.length || now == null) return null
    return (now / (prev.reduce((a, b) => a + b, 0) / prev.length) - 1) * 100
  }
  const Delta = ({ v }: { v: number | null }) => v == null ? null
    : <em className={`iqm-delta ${v > 0 ? 'is-up' : v < 0 ? 'is-down' : ''}`.trim()}><bdi className="iqm-pct">{v > 0 ? '+' : ''}{Math.round(v)}%</bdi> {p.vsAvg('').trim()}</em>

  /* Breadth, from the companies that TRADED this session only. A company
     carried forward without a trade is neither unchanged nor anything else
     — it is absent from these counts. */
  const breadth = useMemo(() => {
    const traded = companies.filter((c) => !c.stale)
    return { up: traded.filter((c) => c.pct > 0).length, down: traded.filter((c) => c.pct < 0).length, flat: traded.filter((c) => c.pct === 0).length }
  }, [companies])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const val = (c: Company): number | string | null => {
      switch (sort.key) {
        case 'name': return companyName(c, c.sym, locale)
        case 'price': return c.close || null
        case 'd1': return c.stale ? null : c.pct
        case 'd7': return c.stale ? null : changeOver(c, 7)
        case 'd30': return c.stale ? null : changeOver(c, 30)
        case 'volume': return c.stale ? null : c.shares_traded || 0
        case 'value': return c.stale ? null : c.vol || 0
        case 'deals': return c.stale ? null : c.deals || 0
        case 'shares': return c.shares || null
        default: return liveMcap(c)
      }
    }
    const dir = sort.dir === 'asc' ? 1 : -1
    return companies
      .filter((c) => sector === 'all' || c.sec === sector)
      .filter((c) => listing === 'all' ? true
        : listing === 'traded' ? !c.stale
        : listing === 'suspended' ? suspended(c)
        : Boolean(c.stale) && !suspended(c))
      .filter((c) => !needle || c.sym.toLowerCase().includes(needle) || c.ar.includes(q.trim()) || c.en.toLowerCase().includes(needle))
      .sort((a, b) => {
        const x = val(a), y = val(b)
        if (x == null && y == null) return liveMcap(b) - liveMcap(a)
        if (x == null) return 1
        if (y == null) return -1
        if (typeof x === 'string' && typeof y === 'string') return x.localeCompare(y, locale) * dir
        return ((x as number) - (y as number)) * dir || liveMcap(b) - liveMcap(a)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies, q, sector, listing, sort, hist, session, locale])
  const rows = full || q.trim() ? filtered : filtered.slice(0, 30)

  /* CSV of the current view — the rows as filtered and sorted, with the
     column names the reader sees. Built in the browser; a BOM so Excel
     opens the Arabic as Arabic. */
  const exportCsv = () => {
    const head = [m.colCompany, 'Symbol', p.board.price, p.board.d1, p.board.d7, p.board.d30, p.board.volume, p.board.mcap, p.board.shares]
    const cell = (v: string | number | null | undefined) => v == null ? '' : `"${String(v).replace(/"/g, '""')}"`
    const lines = filtered.map((c) => [
      companyName(c, c.sym, locale), c.sym, c.close || '', c.stale ? '' : c.pct.toFixed(2),
      c.stale ? '' : changeOver(c, 7)?.toFixed(2) ?? '', c.stale ? '' : changeOver(c, 30)?.toFixed(2) ?? '',
      c.stale ? '' : c.shares_traded || 0, liveMcap(c) || '', c.shares || '',
    ].map(cell).join(','))
    const blob = new Blob(['\ufeff' + [head.map(cell).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `iraqsm-market-${session ?? 'latest'}.csv`; a.click()
    URL.revokeObjectURL(a.href)
  }

  /* Session picker (full board): move between sessions or type a date. */
  const sessionsList = initial?.sessions ?? []
  const at = session ? sessionsList.indexOf(session) : -1
  const goTo = (d: string | null) => router.push(d && d !== sessionsList[0] ? `${L('/market')}?date=${d}` : L('/market'))
  const onPick = (d: string) => {
    if (!d) return
    if (sessionsList.includes(d)) goTo(d)
    else {
      /* Not a trading day: the nearest session on or before it. */
      const near = sessionsList.find((x) => x <= d)
      if (near) goTo(near)
    }
  }

  return (
    <SiteShell>
      <main className="iqm id-full iq-door" id="market" data-world="lapis" data-level="calm">
        <DoorRail door="markets" />
        <div className="iqm-body">
        <header className="iqm-head">
          <p className="id-eyebrow">{p.eyebrow}</p>
          <PageTitle title={full ? p.full.title : m.title} note={full ? p.full.intro : undefined} />
        </header>

        {full ? (
          <div className="iqm-picker id-num" role="group" aria-label={p.full.session}>
            <button type="button" className="id-pill is-sm" disabled={at < 0 || at >= sessionsList.length - 1} onClick={() => goTo(sessionsList[at + 1])} aria-label={p.full.prev}>{ar ? '→' : '←'} {p.full.prev}</button>
            <label className="iqm-picker-date">
              <span className="id-cap">{p.full.session}</span>
              <input id="iqm-date" type="date" className="id-input" value={session ?? ''} max={sessionsList[0]} min={sessionsList[sessionsList.length - 1]}
                onChange={(e) => onPick(e.target.value)} aria-label={p.full.pick} />
            </label>
            <button type="button" className="id-pill is-sm" disabled={at <= 0} onClick={() => goTo(sessionsList[at - 1])} aria-label={p.full.next}>{p.full.next} {ar ? '←' : '→'}</button>
            {at > 0 ? <button type="button" className="id-pill is-sm" onClick={() => goTo(null)}>{p.full.latest}</button> : null}
            <button type="button" className="id-pill is-sm iqm-csv" onClick={exportCsv}>{p.full.csv}</button>
          </div>
        ) : null}

        {/* The session strip (identity v3, the approved board): ISX60 as the
            one key card, then four calm figures. Summary before detail. */}
        <section className="mb-session id-num" aria-label={m.summaryLabel}>
          <p className="id-eyebrow mb-when">{session ? p.sessionOf(sessionDate(session, locale)) : ' '}</p>
          <div className="mb-strip">
            <div className="id-print is-key mb-key">
              <small>ISX60</small>
              <strong><bdi>{index?.latest.isx60 != null ? price.format(index.latest.isx60) : '—'}</bdi></strong>
              {index?.latest && index.prev?.isx60 ? (
                <DayChip pct={((index.latest.isx60 - index.prev.isx60) / index.prev.isx60) * 100} abs={index.latest.isx60 - index.prev.isx60} fmt={(v) => price.format(v)}
                  label={t.rates.tools.vsPrev(sessionDate(index.prev.date, locale))} />
              ) : null}
            </div>
            <div className="mb-stat mb-breadth">
              <small>{p.breadth.label}</small>
              <strong>
                <span className="id-up">{int.format(breadth.up)}</span> {p.breadth.up}
                <span className="mb-dot">·</span>
                <span className="id-down">{int.format(breadth.down)}</span> {p.breadth.down}
              </strong>
              {breadth.up + breadth.down + breadth.flat > 0 ? (
                <span className="mb-mood" aria-hidden="true">
                  <i className="is-up" style={{ flex: breadth.up }} /><i className="is-flat" style={{ flex: breadth.flat }} /><i className="is-down" style={{ flex: breadth.down }} />
                </span>
              ) : null}
              <em>{p.breadth.flat(int.format(breadth.flat))}</em>
            </div>
            <div className="mb-stat"><small>{m.tradedValue}</small><strong>{compact(index?.latest.total_value, u)}</strong><em>{u.iqd}</em><Delta v={vsAvg('total_value')} /></div>
            <div className="mb-stat"><small>{m.trades}</small><strong>{index?.latest.total_trades != null ? int.format(index.latest.total_trades) : '—'}</strong><Delta v={vsAvg('total_trades')} /></div>
            <div className="mb-stat">
              <small>{p.board.traded}</small>
              <strong>{index?.latest.traded_companies != null && index.latest.listed_companies != null ? `${int.format(index.latest.traded_companies)} / ${int.format(index.latest.listed_companies)}` : '—'}</strong>
              {index?.latest.traded_companies != null && index.latest.listed_companies ? (
                <span className="mb-part" aria-hidden="true"><i style={{ width: `${(index.latest.traded_companies / index.latest.listed_companies) * 100}%` }} /></span>
              ) : null}
            </div>
          </div>
        </section>

        {full ? null : (
          <div className="iqm-openers">
            <IndexChart series={series} />
            <FlowRing rows={flowRows} session={index?.latest.date ?? null} compact={(v) => compact(v, u)} />
          </div>
        )}

        <section className="iqm-board" aria-label={m.tableLabel}>
          <div className="iqm-controls">
            <input id="iqm-q" className="id-input" type="search" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder={m.searchPlaceholder} aria-label={m.searchLabel} />
            {full ? (
              <div className="id-pills" role="group" aria-label={m.listingLabel}>
                {(['all', 'traded', 'untraded', 'suspended'] as Listing[]).map((k) => (
                  <button key={k} type="button" className="id-pill is-sm" aria-pressed={listing === k} onClick={() => setListing(k)}>{p.full.listing[k]}</button>
                ))}
              </div>
            ) : null}
            <div className="id-pills" role="group" aria-label={m.sectorLabel}>
              {SECTORS.map((s) => (
                <button key={s.id} type="button" className="id-pill is-sm" aria-pressed={sector === s.id} onClick={() => setSector(s.id)}>
                  {ar ? s.ar : s.en}
                </button>
              ))}
            </div>
          </div>

          {failed ? <p className="id-note">{p.loadFailed}</p> : null}

          {/* The board (identity v3): name over «ticker · sector», close, the
              move as coloured text, value, trades and each company's share of
              the session's traded value. One or two giant trades are flagged
              «صفقة خاصة» so they do not read as the market. */}
          <div className="mb-scroll">
            <table className="mb-table id-num" aria-label={p.board.title}>
              <thead>
                <tr>
                  {([
                    ['name', m.colCompany, ''], ['price', p.board.price, ''], ['d1', p.board.d1, ''],
                    ...(full ? [['d7', p.board.d7, 'mb-hide-sm'], ['d30', p.board.d30, 'mb-hide-sm']] : []),
                    ['value', p.board.value, ''], ['deals', p.board.deals, 'mb-hide-sm'],
                    ...(full ? [['mcap', p.board.mcap, 'mb-hide-md']] : []),
                  ] as [SortKey, string, string][]).map(([key, label, cls]) => {
                    const on = sort.key === key
                    return (
                      <th key={key} className={cls || undefined} aria-sort={on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                        <button type="button" className={`iqm-sort ${on ? 'is-on' : ''}`.trim()} onClick={() => sortBy(key)}>
                          {label}<span className="iqm-sort-arrow" aria-hidden="true">{on ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}</span>
                        </button>
                      </th>
                    )
                  })}
                  <th className="mb-col-bar mb-hide-sm">{p.board.share}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const streak = c.stale ? streakOf(c) : 0
                  const d7 = c.stale ? null : changeOver(c, 7), d30 = c.stale ? null : changeOver(c, 30)
                  const total = index?.latest.total_value ?? 0
                  const share = !c.stale && total > 0 && c.vol ? (c.vol / total) * 100 : null
                  const special = !c.stale && (c.deals ?? 0) > 0 && c.deals <= 2 && share != null && share >= 10
                  return (
                    <tr key={c.sym} className={c.stale ? 'is-untraded' : undefined}>
                      <td>
                        <Link href={L(`/c/${c.sym}`)} className="mb-co">
                          <CompanyLogo sym={c.sym} logo={c.logo} color={c.color} className="iqm-logo" />
                          <span className="mb-co-text">
                            <span className="mb-name"><b>{companyName(c, c.sym, locale)}</b>{special ? <span className="mb-flag">{p.board.special}</span> : null}</span>
                            <small>{c.sym} · {SECTORS.find((s) => s.id === c.sec)?.[ar ? 'ar' : 'en'] ?? c.sec}</small>
                          </span>
                        </Link>
                      </td>
                      <td>{c.close ? price.format(c.close) : '—'}</td>
                      {c.stale ? (
                        <td colSpan={full ? 3 : 1} className="mb-untraded"><span className={`iqm-untraded-chip ${suspended(c) ? 'is-suspended' : ''}`.trim()}>
                          {suspended(c) && c.lastTrade ? p.full.suspended(shortDate(c.lastTrade, locale)) : streak > 1 ? p.board.streak(streak) : p.board.untraded}
                        </span></td>
                      ) : (
                        <>
                          <td>{c.noPrior || !c.pct ? <span className="id-cap">{c.noPrior ? '—' : '0.00%'}</span> : <Pct v={c.pct} />}</td>
                          {full ? <td className="mb-hide-sm">{d7 == null ? <span className="id-cap">—</span> : <Pct v={d7} />}</td> : null}
                          {full ? <td className="mb-hide-sm">{d30 == null ? <span className="id-cap">—</span> : <Pct v={d30} />}</td> : null}
                        </>
                      )}
                      <td>{c.stale ? '—' : compact(c.vol, u)}</td>
                      <td className="mb-hide-sm">{c.stale ? '—' : int.format(c.deals || 0)}</td>
                      {full ? <td className="mb-hide-md">{liveMcap(c) ? compact(liveMcap(c), u) : '—'}</td> : null}
                      <td className="mb-col-bar mb-hide-sm">
                        {share != null ? (
                          <span className="mb-bar" title={p.board.shareOf(`${share.toFixed(1)}%`)}><i style={{ width: `${Math.max(1.5, Math.min(100, share))}%` }} /></span>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {rows.some((c) => !c.stale && c.deals > 0 && c.deals <= 2 && (index?.latest.total_value ?? 0) > 0 && c.vol / (index?.latest.total_value ?? 1) >= 0.1)
            ? <p className="id-cap mb-note">{p.board.specialNote}</p> : null}
          {!full && filtered.length > 30 && !q.trim() ? (
            <div className="iqm-more">
              {/* The rest lives on /market — a page, not a toggle, so the full
                  table has its own URL and its own ranking. */}
              <Link href={L('/market')} className="id-btn">{p.board.showAll(int.format(filtered.length))} →</Link>
            </div>
          ) : null}
          {!loading && !rows.length && !failed ? (
            <div className="iqm-empty"><p className="id-h3">{p.emptyTitle}</p><p className="id-cap">{p.emptyNote}</p></div>
          ) : null}
          {rows.length ? <p className="id-cap iqm-count">{p.showing(int.format(filtered.length))}{sort.key === 'value' ? ` · ${p.board.sortValue}` : sort.key === 'volume' ? ` · ${p.board.sortNote}` : ''}</p> : null}
        </section>

        {full ? (
          <section className="iqm-about id-read" aria-label={p.full.about.title}>
            <h2 className="id-h2">{p.full.about.title}</h2>
            {p.full.about.body.map((t, i) => <p key={i} className="id-body">{t}</p>)}
            <h2 className="id-h2">{p.full.faq.title}</h2>
            <dl className="iqm-faq">
              {p.full.faq.items.map(([q, a]) => <div key={q}><dt>{q}</dt><dd>{a}</dd></div>)}
            </dl>
          </section>
        ) : null}
        </div>
      </main>
    </SiteShell>
  )
}
