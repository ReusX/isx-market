'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  PERIODS, BANDS, bandOf, bandLabel, capFor, iqdShort, pctText, arrowOf,
  sectorNodes, squarify, universe, matchesQuery,
  type Band, type Box, type MapRow, type PeriodId, type SectorNode, type Universe,
} from '@/lib/heatmap'
import { periodChange, toRow, sectorLabel, type Metric } from '@/lib/screener'
import { fetchCompanyMeta, fetchLive } from '@/lib/market'
import { nf0 } from '@/lib/statistics'
import { useLocale } from '@/context/LocaleContext'
import { localeDateOrDash } from '@/lib/date'
import type { CompanyMeta, LiveStock } from '@/types'
import '@/styles/heatmap.css'

/**
 * خريطة السوق — the market heatmap.
 *
 * ── What this page is for ─────────────────────────────────────────────────
 * Where the strength, the weakness and the money are right now. The map IS
 * the page: everything above it is one strip and everything beside it appears
 * only when asked for.
 *
 * ── The encoding, stated and never guessed at ─────────────────────────────
 * SIZE = market cap. COLOUR = % change over the selected period. GROUP =
 * sector. All three are printed in the header, because a treemap whose
 * encoding you have to infer is decoration.
 *
 * ── The four decisions worth arguing about ────────────────────────────────
 *
 * 1. SEVEN DISCRETE BANDS, not a continuous ramp. A gradient makes +0.4% and
 *    +0.9% indistinguishable while implying a precision the eye cannot read
 *    back. Bands are legible, they match the legend exactly, and that makes
 *    the legend a control — hover a band and only those companies stay lit.
 *
 * 2. THE PER-PERIOD CAP IS KEPT. Intensity scales against 3% for a day and
 *    60% for a year. One fixed scale would render every long-period map in
 *    flat pastel.
 *
 * 3. CLICK SELECTS, IT DOES NOT NAVIGATE. The shipped page makes every tile a
 *    link, so the only thing you can do with a company is leave the map. A
 *    heatmap is for comparing, and comparing means staying.
 *
 * 4. MISSING IS NOT ZERO. A company with no reading is hatched and labelled
 *    «لا قراءة», never coloured neutral — neutral means flat, and flat is a
 *    fact. On the day, 41 of the 80 mapped companies are measured at exactly
 *    0.00%, which is what makes the distinction carry the page.
 *
 * ── And the thing the shipped page does not say ───────────────────────────
 * Only 40 of the 80 companies on this map traded in the latest session; the
 * rest are priced on a close up to 60 days old and hold 47% of the map's
 * area. A heatmap headed with one date, half of whose area is older than it,
 * is a false claim. The coverage line says so. See docs/HEATMAP_DATA_MAP.md §4.
 */

type Selected = { row: MapRow } | null

/* ISX quotes are small decimals — 2.11, 3.94 — so the price needs two of them.
   `iqd()` is the compact magnitude formatter and rounds 3.94 to «4»; it is
   right for a market cap and wrong for a quote. Same format /market and
   /screener print. */
const nfPrice = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function Heatmap() {
  const { t, locale, href: L } = useLocale()
  const hx = t.heatmap
  const [period, setPeriod] = useState<PeriodId>('1d')
  const [zoom, setZoom] = useState<string | null>(null)
  const [selected, setSelected] = useState<Selected>(null)
  const [hoverBand, setHoverBand] = useState<Band | null>(null)
  const [query, setQuery] = useState('')
  const [size, setSize] = useState({ w: 0, h: 0 })
  const mapRef = useRef<HTMLDivElement>(null)

  const [uni, setUni] = useState<Universe | null>(null)
  const [session, setSession] = useState<string | null>(null)
  const [live, setLive] = useState<Map<string, LiveStock>>(new Map())
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const [{ data, error }, meta] = await Promise.all([
          sb.from('company_metrics').select(
            'ticker,name_en,name_ar,sector,last_date,last_close,prev_close,close_1w,close_1m,close_3m,close_yend,close_52w,high_52w,low_52w,avg_value_20d,days_since_trade,ff_net_30d'),
          fetchCompanyMeta().catch(() => [] as CompanyMeta[]),
        ])
        if (error || !data?.length) { setFailed(true); setLoading(false); return }
        const metrics = data as Metric[]
        const by = new Map(meta.map((m) => [m.sym, m]))
        setUni(universe(metrics.map((m) => toRow(m, by.get(m.ticker), true)), metrics))
      } catch { setFailed(true) }
      setLoading(false)
    })()
  }, [])

  /* The session figures in the selection panel come from the live layer —
     `company_metrics` has no traded value, volume or trade count. Independent
     of the map: if this fails the map is unaffected and the panel says so. */
  useEffect(() => {
    ;(async () => {
      try {
        const d = await fetchLive()
        setSession(d.updated || null)
        setLive(new Map(d.stocks.map((s) => [s.code, s])))
      } catch { /* the panel falls back to `—` */ }
    })()
  }, [])

  /* Pixel size drives label density and nothing else — tiles are laid out in
     percentages, so the browser reflows the map for free on resize.
     Measured directly rather than waiting on the observer: a ResizeObserver
     that never delivers its first callback leaves `size` at 0 and every tile
     at the `none` label step, which is how this shipped with no labels at
     all. The observer stays as the resize path; the first reading does not
     depend on it. */
  useEffect(() => {
    const el = mapRef.current
    if (!el) return
    const read = () => {
      const r = el.getBoundingClientRect()
      setSize((s) => (s.w === r.width && s.h === r.height ? s : { w: r.width, h: r.height }))
    }
    read()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(read) : null
    ro?.observe(el)
    window.addEventListener('resize', read)
    return () => { ro?.disconnect(); window.removeEventListener('resize', read) }
  }, [loading, failed, zoom])

  const cap = capFor(period)
  /* `uni?.rows ?? []` reallocates on every render, which would make the two
     treemap memos below recompute on every hover. */
  const rows = useMemo(() => uni?.rows ?? [], [uni])
  const sectors = useMemo(() => sectorNodes(rows, period, locale), [rows, period, locale])
  const zoomed = zoom ? sectors.find((s) => s.id === zoom) ?? null : null

  const sectorBoxes = useMemo(
    () => squarify(sectors.map((s) => ({ item: s, value: s.marketCap })), 0, 0, 100, 100),
    [sectors])
  const companyBoxes = useMemo(
    () => (zoomed ? squarify(zoomed.list.map((r) => ({ item: r, value: r.marketCap })), 0, 0, 100, 100) : []),
    [zoomed])

  const q = query.trim()
  const hits = useMemo(() => (q ? rows.filter((r) => matchesQuery(r, q)) : []), [q, rows])

  /* Searching from the sector view jumps to the sector holding the first hit,
     because a company cannot be highlighted on a map that is not showing it. */
  useEffect(() => {
    if (q && hits.length && !zoom) setZoom(hits[0].sector)
  }, [q, hits, zoom])

  const dimmed = (r: MapRow) => {
    if (q) return !matchesQuery(r, q)
    if (hoverBand != null) return bandOf(periodChange(r, period), cap) !== hoverBand
    return false
  }

  /* How much of the map is priced on the canonical session, and how much on an
     older close. Printed, never implied. */
  const coverage = useMemo(() => {
    if (!uni || !session) return null
    const onSession = uni.rows.filter((r) => r.last_date === session)
    const area = uni.marketCap
      ? (uni.rows.reduce((a, r) => a + (r.last_date === session ? 0 : r.marketCap), 0) / uni.marketCap) * 100
      : 0
    return { traded: onSession.length, olderArea: area }
  }, [uni, session])

  const shown = zoomed ? zoomed.list.length : rows.length
  const tradedShown = useMemo(() => {
    if (!session) return null
    const list = zoomed ? zoomed.list : rows
    return list.filter((r) => r.last_date === session).length
  }, [zoomed, rows, session])
  const periodLabel = PERIODS.find((p) => p.id === period)![locale]

  return (
    <main className="iq-page hx-page">
      <header className="hx-head">
        <div className="hx-title">
          <h1>{hx.title}</h1>
          {/* The encoding, stated. Not a tooltip, not a help panel — a line of
              text where the reader already is. */}
          <p>
            {hx.sizeIs} <b>{hx.marketCap}</b> · {hx.colourIs} <b>{hx.changeOf(periodLabel)}</b> · {hx.groupIs} <b>{hx.sector}</b>
          </p>
        </div>

        <dl className="hx-meta">
          <div><dt>{hx.lastSession}</dt><dd>{localeDateOrDash(session, locale)}</dd></div>
          <div><dt>{hx.companies}</dt><dd><bdi>{shown || '—'}</bdi></dd></div>
          <div>
            <dt>{hx.tradedIn}</dt>
            {/* Scoped to whatever «الشركات» beside it is counting. Two figures
                in one rail measuring different universes is the fault this
                product keeps finding. */}
            <dd><bdi>{tradedShown ?? '—'}</bdi></dd>
          </div>
        </dl>
      </header>

      <div className="hx-controls">
        <div className="hx-periods" role="group" aria-label={hx.periodLabel}>
          {PERIODS.map((p) => (
            <button key={p.id} type="button" className={period === p.id ? 'active' : ''}
              aria-pressed={period === p.id}
              onClick={() => { setPeriod(p.id); setSelected(null) }}>{p[locale]}</button>
          ))}
        </div>

        <nav className="hx-crumb" aria-label={hx.crumbLabel}>
          <button type="button" className={zoom ? '' : 'is-current'}
            onClick={() => { setZoom(null); setSelected(null) }}>{hx.allSectors}</button>
          {zoomed ? <><i aria-hidden="true">‹</i><span className="is-current">{zoomed.label}</span></> : null}
        </nav>

        {/* It highlights; it never filters. Removing tiles would change the
            geometry, and the geometry is the message. */}
        <label className="hx-mv-search hx-search" data-filled={query ? 'true' : undefined}>
          <span aria-hidden="true" className="hx-mv-search-icon">⌕</span>
          <input value={query} dir="auto" placeholder={hx.searchPlaceholder}
            aria-label={hx.searchLabel} onChange={(e) => setQuery(e.target.value)} />
          {query ? <button type="button" className="hx-mv-search-clear" aria-label={hx.clearSearch}
            onClick={() => setQuery('')}>✕</button> : null}
        </label>
      </div>

      {/* Coverage, always — this map is not one session and must not read as
          one. §4 of the data map. */}
      {uni && coverage ? (
        <p className="hx-mv-note hx-note">
          {hx.coverage(
            String(coverage.traded), String(uni.included), localeDateOrDash(session, locale),
            `${coverage.olderArea.toFixed(0)}%`, String(uni.excludedNoCap.length),
            String(uni.excludedStale.length),
            uni.excludedUnknownAge.length ? String(uni.excludedUnknownAge.length) : '',
          )}
        </p>
      ) : null}

      <section className="hx-stage">
        <div className="hx-field" ref={mapRef}
          aria-label={zoomed ? hx.sectorOf(zoomed.label) : hx.sectorsLabel}>
          {loading ? <SkeletonField /> : failed || !uni ? (
            <div className="hx-empty">
              <strong>{hx.loadFailedTitle}</strong>
              <p>{hx.loadFailedNote} <Link href={L('/market')}>{hx.loadFailedLink}</Link>.</p>
            </div>
          ) : !rows.length ? (
            <div className="hx-empty">
              <strong>{hx.emptyTitle}</strong>
              <p>{hx.emptyNote}</p>
            </div>
          ) : zoomed ? (
            companyBoxes.map(({ item, box }) => (
              <CompanyTile key={item.ticker} row={item} box={box} period={period} cap={cap}
                px={size} dim={dimmed(item)} selected={selected?.row.ticker === item.ticker}
                onSelect={() => setSelected(selected?.row.ticker === item.ticker ? null : { row: item })} />
            ))
          ) : (
            sectorBoxes.map(({ item, box }) => (
              <SectorTile key={item.id} node={item} box={box} cap={cap} px={size}
                dim={hoverBand != null && bandOf(item.pct, cap) !== hoverBand}
                onOpen={() => { setZoom(item.id); setSelected(null) }} />
            ))
          )}
          <span className="hx-brand" aria-hidden="true">iraqsm.com</span>
        </div>

        {selected ? (
          <CompanyPanel row={selected.row} period={period} live={live.get(selected.row.ticker)}
            session={session} onClose={() => setSelected(null)} />
        ) : null}
      </section>

      {/* A control, not a caption: hovering a band leaves only the companies
          inside it lit. */}
      <div className="hx-legend">
        <span className="hx-legend-label">{hx.legendChange}</span>
        <div className="hx-legend-bands" role="group" aria-label={hx.bandsLabel}
          onPointerLeave={() => setHoverBand(null)}>
          {BANDS.map((b) => (
            <button key={b} type="button" data-band={b}
              className={hoverBand === b ? 'is-on' : ''}
              aria-pressed={hoverBand === b}
              aria-label={hx.highlightBand(bandLabel(b, cap))}
              onPointerEnter={() => setHoverBand(b)}
              onFocus={() => setHoverBand(b)} onBlur={() => setHoverBand(null)}
              onClick={() => setHoverBand(hoverBand === b ? null : b)}>
              <i aria-hidden="true" />
              <small>{bandLabel(b, cap)}</small>
            </button>
          ))}
        </div>
        <span className="hx-legend-na"><i aria-hidden="true" />{hx.noReading}</span>
        <span className="hx-legend-scale">
          {hx.scaleNote(String(cap), periodLabel)}
        </span>
      </div>
    </main>
  )
}

/* ── Label density ─────────────────────────────────────────────────────────
   Four steps, decided from the tile's real pixel size. Text that does not fit
   is not shown — a clipped Arabic company name is worse than no name, because
   it reads as a different company. Every step keeps the title and the
   aria-label, so the company is always reachable. */
function detail(box: Box, px: { w: number; h: number }) {
  const w = (box.w / 100) * px.w, h = (box.h / 100) * px.h
  if (w < 34 || h < 26) return 'none'
  if (w < 66 || h < 46) return 'tick'
  if (w < 150 || h < 96) return 'tickpct'
  return 'full'
}

const boxStyle = (box: Box) => ({
  insetInlineStart: `${box.x}%`, insetBlockStart: `${box.y}%`,
  inlineSize: `${box.w}%`, blockSize: `${box.h}%`,
})

function SectorTile({ node, box, cap, px, dim, onOpen }: {
  node: SectorNode; box: Box; cap: number; px: { w: number; h: number }
  dim: boolean; onOpen: () => void
}) {
  const { t } = useLocale()
  const hx = t.heatmap
  const band = bandOf(node.pct, cap)
  const d = detail(box, px)
  return (
    <button type="button" className="hx-tile hx-tile-sector"
      data-band={band ?? 'na'} data-dim={dim || undefined} data-detail={d}
      style={boxStyle(box)} onClick={onOpen}
      aria-label={hx.nodeLabel(node.label, String(node.list.length), node.pct == null ? hx.noReading : pctText(node.pct))}
      title={hx.nodeTitle(node.label, pctText(node.pct), iqdShort(node.marketCap), String(node.list.length), node.missing ? String(node.missing) : '')}>
      <span className="hx-tile-body">
        <strong>{node.label}</strong>
        {d !== 'tick' && d !== 'none' ? (
          <span className="hx-tile-pct">
            {arrowOf(node.pct) ? <i aria-hidden="true">{arrowOf(node.pct)}</i> : null}
            <bdi>{pctText(node.pct)}</bdi>
          </span>
        ) : null}
        {d === 'full' ? (
          <small><bdi>{node.list.length}</bdi> {hx.companyUnit} · <bdi>{iqdShort(node.marketCap)}</bdi></small>
        ) : null}
      </span>
    </button>
  )
}

function CompanyTile({ row, box, period, cap, px, dim, selected, onSelect }: {
  row: MapRow; box: Box; period: PeriodId; cap: number; px: { w: number; h: number }
  dim: boolean; selected: boolean; onSelect: () => void
}) {
  const { t } = useLocale()
  const hx = t.heatmap
  const pct = periodChange(row, period)
  const band = bandOf(pct, cap)
  const d = detail(box, px)
  return (
    <button type="button" className="hx-tile"
      data-band={band ?? 'na'} data-dim={dim || undefined} data-detail={d}
      data-selected={selected || undefined}
      style={boxStyle(box)} onClick={onSelect}
      aria-label={hx.tileLabel(row.name, row.ticker, pct == null ? hx.noReading : pctText(pct), iqdShort(row.marketCap))}
      title={hx.tileTitle(row.name, row.ticker, pct == null ? hx.noReadingPeriod : pctText(pct), nfPrice.format(row.last_close))}>
      <span className="hx-tile-body">
        {d === 'full' ? <strong className="hx-tile-name">{row.name}</strong> : null}
        {d !== 'none' ? <bdi className="hx-tile-ticker">{row.ticker}</bdi> : null}
        {d === 'full' || d === 'tickpct' ? (
          <span className="hx-tile-pct">
            {pct != null && pct !== 0 ? <i aria-hidden="true">{arrowOf(pct)}</i> : null}
            <bdi>{pctText(pct)}</bdi>
          </span>
        ) : null}
      </span>
    </button>
  )
}

/* Selection panel. Floats over the map's edge rather than taking a permanent
   column: the map is the page, and a rail that is empty nine tenths of the
   time has taken 300px for nothing. */
function CompanyPanel({ row, period, live, session, onClose }: {
  row: MapRow; period: PeriodId; live: LiveStock | undefined
  session: string | null; onClose: () => void
}) {
  const { t, locale, href: L } = useLocale()
  const hx = t.heatmap
  const pct = periodChange(row, period)
  /* The session figures are only the session's when the company actually
     traded in it. A carry-forward row is labelled with the date it belongs
     to, and a missing row prints `—` rather than a zero. */
  const traded = live && !live.stale
  const dash = <span className="hx-mv-dash">—</span>
  const rows: [string, React.ReactNode][] = [
    [hx.lastPrice, <><bdi>{nfPrice.format(row.last_close)}</bdi> <small>{hx.currency}</small></>],
    [hx.marketCapCol, <bdi key="c">{iqdShort(row.marketCap)}</bdi>],
    [hx.tradedValue, traded ? <bdi key="v">{iqdShort(live!.vol)}</bdi> : dash],
    [hx.volume, traded ? <bdi key="q">{nf0.format(live!.shares_traded)}</bdi> : dash],
    [hx.trades, traded ? <bdi key="t">{nf0.format(live!.deals)}</bdi> : dash],
  ]
  return (
    <aside className="hx-panel" role="dialog" aria-label={hx.panelOf(row.name)}>
      <div className="hx-panel-head">
        <div>
          <strong title={row.name}>{row.name}</strong>
          <p><bdi className="hx-cd-ticker">{row.ticker}</bdi> · {sectorLabel(row.sector, locale)}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={hx.close}>✕</button>
      </div>
      <div className={`hx-panel-move ${pct == null ? '' : pct > 0 ? 'positive' : pct < 0 ? 'negative' : 'neutral'}`}>
        <bdi>{pctText(pct)}</bdi>
        <small>{hx.changeIn(PERIODS.find((p) => p.id === period)![locale])}</small>
      </div>
      <dl className="hx-panel-rows">
        {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
      <p className="hx-panel-note">
        {traded && session
          ? <>{hx.tradedFrom(localeDateOrDash(session, locale))}</>
          : live?.lastTrade
            ? <>{hx.notTraded(localeDateOrDash(live.lastTrade, locale))}</>
            : <>{hx.noTradeData}</>}
      </p>
      <Link className="hx-panel-link" href={L(`/c/${row.ticker}`)}>{hx.openCompany} <i className="dir-go" aria-hidden="true">←</i></Link>
    </aside>
  )
}

/* A skeleton with the map's own rhythm — a handful of large blocks and a tail
   of small ones, which is the shape a cap-weighted treemap always has. */
function SkeletonField() {
  const blocks = [
    { x: 0, y: 0, w: 44, h: 58 }, { x: 44, y: 0, w: 30, h: 34 }, { x: 74, y: 0, w: 26, h: 34 },
    { x: 44, y: 34, w: 28, h: 24 }, { x: 72, y: 34, w: 28, h: 24 },
    { x: 0, y: 58, w: 26, h: 42 }, { x: 26, y: 58, w: 22, h: 42 }, { x: 48, y: 58, w: 18, h: 22 },
    { x: 66, y: 58, w: 18, h: 22 }, { x: 84, y: 58, w: 16, h: 22 },
    { x: 48, y: 80, w: 26, h: 20 }, { x: 74, y: 80, w: 26, h: 20 },
  ]
  return (
    <>
      {blocks.map((b, i) => (
        <span key={i} className="hx-skel" aria-hidden="true" style={boxStyle(b)} />
      ))}
    </>
  )
}
