'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { fetchLive, fetchCompanyMeta, mergeCompanies, companyName, liveMcap, SECTORS } from '@/lib/market'
import { CompanyLogo } from '@/components/CompanyLogo'
import { sessionDate, type IndexRow } from '@/lib/homeData'
import { useLocale } from '@/context/LocaleContext'
import { SiteShell } from './SiteShell'
import { DoorRail } from './DoorRail'
import { IndexChart, type IndexPoint, type IndexSeries } from './IndexChart'
import { FlowRing, type FlowRow } from './FlowRing'
import { WelcomeCard } from './WelcomeCard'
import '@/styles/markets.css'
import '@/styles/landing.css'
import type { Company } from '@/types'

/**
 * The market · the root of the site, and the الأسواق door.
 *
 * It lives at `/` (the URL that carries the site's authority); `/market`
 * redirects here. With `welcome`, the globe card sits above the content
 * for first-time visitors.
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

type Units = { bn: string; mn: string; k: string }
function compact(v: number | null | undefined, u: Units): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const a = Math.abs(v)
  if (a >= 1e9) return `${(v / 1e9).toFixed(a >= 1e10 ? 0 : 1)} ${u.bn}`
  if (a >= 1e6) return `${(v / 1e6).toFixed(a >= 1e7 ? 0 : 1)} ${u.mn}`
  if (a >= 1e3) return `${(v / 1e3).toFixed(0)} ${u.k}`
  return int.format(v)
}

function Change({ pct, stale, untraded, noChange }: { pct: number; stale?: boolean; untraded: string; noChange: string }) {
  if (stale) return <span className="id-chg is-flat">{untraded}</span>
  if (!pct) return <span className="id-chg is-flat">{noChange}</span>
  const up = pct > 0
  return <span className={`id-chg ${up ? 'is-up' : 'is-down'}`}>{up ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%</span>
}

/* A percentage as coloured text: mint up, coral down, muted flat. */
function Pct({ v }: { v: number }) {
  const cls = v > 0 ? 'id-up' : v < 0 ? 'id-down' : 'id-cap'
  return <bdi className={`iqm-pct ${cls}`}>{v > 0 ? '+' : ''}{v.toFixed(2)}%</bdi>
}

const RAIL = [
  { key: 'market', route: '/' }, { key: 'companies', route: '/companies' }, { key: 'screener', route: '/screener' },
  { key: 'heatmap', route: '/heatmap' }, { key: 'statistics', route: '/statistics' }, { key: 'pulse', route: '/pulse' },
] as const

export function MarketPage({ welcome = false }: { welcome?: boolean }) {
  const { t, locale, href: L } = useLocale()
  const m = t.market
  const p = m.page
  const u = t.site.units
  const ar = locale === 'ar'

  const [companies, setCompanies] = useState<Company[]>([])
  const [session, setSession] = useState<string | null>(null)
  const [index, setIndex] = useState<{ latest: IndexRow; prev: IndexRow | null } | null>(null)
  /* The last 21 sessions' totals: the latest, and the twenty before it that
     give each figure its «عن متوسط 20 جلسة» context. */
  const [recent, setRecent] = useState<IndexRow[]>([])
  const [series, setSeries] = useState<IndexSeries>({ isx60: [], rsisx: [] })
  const [flowRows, setFlowRows] = useState<FlowRow[]>([])
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [sector, setSector] = useState('all')
  const [showAll, setShowAll] = useState(false)
  /* Column sort. Default is session volume, descending — the busiest
     companies first, the untraded ones last; a click on a header
     sorts by that column, a second click flips it. Untraded companies
     always sink below traded ones when sorting by a change column, because
     their change is not a number. */
  type SortKey = 'mcap' | 'name' | 'price' | 'd1' | 'd7' | 'd30' | 'volume' | 'shares'
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'volume', dir: 'desc' })
  const sortBy = (key: SortKey) => setSort((s) => s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: key === 'name' ? 'asc' : 'desc' })
  /* Closes per ticker for the last ~45 days, for the 7- and 30-day changes. */
  const [hist, setHist] = useState<Record<string, { date: string; close: number }[]>>({})

  useEffect(() => {
    let alive = true
    ;(async () => {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      await Promise.allSettled([
        (async () => {
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
          setRecent(rows.slice(-21))
        })(),
        /* Price history for the 7- and 30-day columns: 45 calendar days of
           closes for every ticker, paged under PostgREST's 1000-row cap. */
        (async () => {
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
  }, [])


  /* Sessions the market has held, newest last — for the untraded streak. */
  const sessions = useMemo(() => series.isx60.map((p) => p.date), [series.isx60])
  const streakOf = (c: Company) => (c.lastTrade ? sessions.filter((d) => d > c.lastTrade!).length : sessions.length)

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
        case 'name': return companyName(c, locale)
        case 'price': return c.close || null
        case 'd1': return c.stale ? null : c.pct
        case 'd7': return c.stale ? null : changeOver(c, 7)
        case 'd30': return c.stale ? null : changeOver(c, 30)
        case 'volume': return c.stale ? null : c.shares_traded || 0
        case 'shares': return c.shares || null
        default: return liveMcap(c)
      }
    }
    const dir = sort.dir === 'asc' ? 1 : -1
    return companies
      .filter((c) => sector === 'all' || c.sec === sector)
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
  }, [companies, q, sector, sort, hist, session, locale])
  const rows = showAll || q.trim() ? filtered : filtered.slice(0, 20)

  return (
    <SiteShell>
      {welcome ? <WelcomeCard /> : null}
      <main className="iqm id-full iq-door" id="market">
        <DoorRail door="markets" items={RAIL.map((r) => ({ label: p.rail[r.key], route: r.route }))} />
        <div className="iqm-body">
        <header className="iqm-head">
          <p className="id-eyebrow">{p.eyebrow}</p>
          <h1 className="id-h1">{m.title}</h1>
        </header>

        <div className="iqm-openers">
          <IndexChart series={series} />
          <FlowRing rows={flowRows} session={index?.latest.date ?? null} compact={(v) => compact(v, u)} />
        </div>

        <section className="iqm-session id-block is-navy id-num" aria-label={m.summaryLabel}>
          <div className="iqm-session-head">
            <span>{session ? p.sessionOf(sessionDate(session, locale)) : ' '}</span>
            {index?.latest.traded_companies != null && index.latest.listed_companies != null ? (
              <span className="iqm-part">
                {p.tradedOf(String(index.latest.traded_companies), String(index.latest.listed_companies))}
                <span className="iqm-part-bar" aria-hidden="true"><i style={{ width: `${(index.latest.traded_companies / index.latest.listed_companies) * 100}%` }} /></span>
              </span>
            ) : null}
          </div>
          <div className="iqm-figures">
            <div className="iqm-breadth">
              <small>{p.breadth.label}</small>
              <strong>
                <span className="is-up">{int.format(breadth.up)}</span> {p.breadth.up}
                <span className="iqm-dot">·</span>
                <span className="is-down">{int.format(breadth.down)}</span> {p.breadth.down}
              </strong>
              {/* The mood as a bar: mint / grey / coral, to scale. */}
              {breadth.up + breadth.down + breadth.flat > 0 ? (
                <span className="iqm-bar" aria-hidden="true">
                  <i className="is-up" style={{ flex: breadth.up }} /><i className="is-flat" style={{ flex: breadth.flat }} /><i className="is-down" style={{ flex: breadth.down }} />
                </span>
              ) : null}
              <em>{p.breadth.flat(int.format(breadth.flat))}</em>
            </div>
            <div><small>{m.tradedValue}</small><strong>{compact(index?.latest.total_value, u)}</strong><em>{u.iqd}</em><Delta v={vsAvg('total_value')} /></div>
            <div><small>{m.volume}</small><strong>{compact(index?.latest.total_volume, u)}</strong><em>{u.shares}</em><Delta v={vsAvg('total_volume')} /></div>
            <div><small>{m.trades}</small><strong>{index?.latest.total_trades != null ? int.format(index.latest.total_trades) : '—'}</strong><Delta v={vsAvg('total_trades')} /></div>
          </div>
        </section>

        <section className="iqm-board" aria-label={m.tableLabel}>
          <div className="iqm-controls">
            <input id="iqm-q" className="id-input" type="search" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder={m.searchPlaceholder} aria-label={m.searchLabel} />
            <div className="id-pills" role="group" aria-label={m.sectorLabel}>
              {SECTORS.map((s) => (
                <button key={s.id} type="button" className="id-pill is-sm" aria-pressed={sector === s.id} onClick={() => setSector(s.id)}>
                  {ar ? s.ar : s.en}
                </button>
              ))}
            </div>
          </div>

          {failed ? <p className="id-note">{p.loadFailed}</p> : null}

          <div className="id-table-scroll">
            <table className="id-table id-num iqm-table" aria-label={p.board.title}>
              <colgroup><col /><col className="iqm-c-price" /><col className="iqm-c-chg" /><col className="iqm-c-chg iqm-hide-sm" /><col className="iqm-c-chg iqm-hide-sm" /><col className="iqm-c-val iqm-hide-sm" /><col className="iqm-c-val iqm-hide-sm" /><col className="iqm-c-val iqm-hide-md" /></colgroup>
              <thead>
                <tr>
                  {([
                    ['name', m.colCompany, ''], ['price', p.board.price, 'is-end'], ['d1', p.board.d1, 'is-end'],
                    ['d7', p.board.d7, 'is-end iqm-hide-sm'], ['d30', p.board.d30, 'is-end iqm-hide-sm'],
                    ['volume', p.board.volume, 'is-end iqm-hide-sm'], ['mcap', p.board.mcap, 'is-end iqm-hide-sm'], ['shares', p.board.shares, 'is-end iqm-hide-md'],
                  ] as [SortKey, string, string][]).map(([key, label, cls]) => {
                    const on = sort.key === key
                    return (
                      <th key={key} className={cls} aria-sort={on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                        <button type="button" className={`iqm-sort ${on ? 'is-on' : ''}`.trim()} onClick={() => sortBy(key)}>
                          {label}<span className="iqm-sort-arrow" aria-hidden="true">{on ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}</span>
                        </button>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const streak = c.stale ? streakOf(c) : 0
                  const d7 = c.stale ? null : changeOver(c, 7), d30 = c.stale ? null : changeOver(c, 30)
                  return (
                    <tr key={c.sym} className={c.stale ? 'is-untraded' : undefined}>
                      <td>
                        <Link href={L(`/c/${c.sym}`)} className="iqm-co">
                          <CompanyLogo sym={c.sym} logo={c.logo} color={c.color} className="iqm-logo" />
                          <span className="iqm-co-text">
                            <span className="id-name">{companyName(c, locale)}</span>
                            <span className="id-sub">{c.sym} · {SECTORS.find((s) => s.id === c.sec)?.[ar ? 'ar' : 'en'] ?? c.sec}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="is-end iqm-price">{c.close ? price.format(c.close) : '—'}</td>
                      {c.stale ? (
                        <>
                          <td className="is-end iqm-untraded"><span className="iqm-untraded-chip">{streak > 1 ? p.board.streak(streak) : p.board.untraded}</span></td>
                          <td className="iqm-hide-sm" /><td className="iqm-hide-sm" />
                        </>
                      ) : (
                        <>
                          <td className="is-end"><Change pct={c.pct} untraded={p.untraded} noChange={p.noChange} /></td>
                          <td className="is-end iqm-hide-sm">{d7 == null ? <span className="id-cap">—</span> : <Pct v={d7} />}</td>
                          <td className="is-end iqm-hide-sm">{d30 == null ? <span className="id-cap">—</span> : <Pct v={d30} />}</td>
                        </>
                      )}
                      <td className="is-end iqm-hide-sm">{c.stale ? '—' : compact(c.shares_traded, u)}</td>
                      <td className="is-end iqm-hide-sm">{liveMcap(c) ? compact(liveMcap(c), u) : '—'}</td>
                      <td className="is-end iqm-hide-md">{c.shares ? compact(c.shares, u) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {filtered.length > 20 && !q.trim() ? (
            <div className="iqm-more">
              <button type="button" className="id-btn" onClick={() => setShowAll((v) => !v)}>{showAll ? p.board.showLess : p.board.showAll(int.format(filtered.length))}</button>
            </div>
          ) : null}
          {!loading && !rows.length && !failed ? (
            <div className="iqm-empty"><p className="id-h3">{p.emptyTitle}</p><p className="id-cap">{p.emptyNote}</p></div>
          ) : null}
          {rows.length ? <p className="id-cap iqm-count">{p.showing(int.format(filtered.length))}{sort.key === 'volume' ? ` · ${p.board.sortNote}` : ''}</p> : null}
        </section>
        </div>
      </main>
    </SiteShell>
  )
}
