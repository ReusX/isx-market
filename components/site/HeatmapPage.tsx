'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { SiteShell } from './SiteShell'
import { DoorRail } from './DoorRail'
import { AboutSection } from './AboutSection'
import { PageTitle } from './PageTitle'
import {
  PERIODS, bandOf, bandLabel, capFor, pctText, sectorNodes, squarify, universe, matchesQuery,
  type Band, type MapRow, type PeriodId, type SectorNode,
} from '@/lib/heatmap'
import { periodChange, toRow, sectorLabel } from '@/lib/screener'
import { CompanyLogo } from '@/components/CompanyLogo'
import type { ScreenerInitial } from '@/lib/marketServer'
import { shortDate, localeDate } from '@/lib/date'
import { downloadImage, copyImage } from '@/lib/watermark'
import '@/styles/markets.css'
import '@/styles/heatmap-page.css'

/**
 * /heatmap · the market in one picture.
 *
 * SIZE = market cap (or 20-session traded value, on request). COLOUR = change
 * over the chosen period, in seven bands scaled to the period's own cap.
 * GROUP = sector. Missing readings are hatched, never neutral. Click selects
 * into the side card; the legend is a filter on hover. The layout, the
 * bands, the exclusions and the null policy are lib/heatmap, unchanged.
 * Rows arrive from the server.
 */
const RAIL = [
  { key: 'market', route: '/' }, { key: 'board', route: '/market' }, { key: 'companies', route: '/companies' },
  { key: 'screener', route: '/screener' }, { key: 'heatmap', route: '/heatmap' }, { key: 'statistics', route: '/statistics' }, { key: 'pulse', route: '/pulse' },
] as const

const int = new Intl.NumberFormat('en-US')
const price = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const GAP = 4, HEAD = 26

export function HeatmapPage({ initial }: { initial: ScreenerInitial }) {
  const { t, locale, href: L } = useLocale()
  const h = t.heatmap
  const pg = h.page
  const u = t.site.units
  const ar = locale === 'ar'

  const [period, setPeriod] = useState<PeriodId>('1d')
  const [sizeBy, setSizeBy] = useState<'cap' | 'value'>('cap')
  const [ready, setReady] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  /* The view lives in the URL (?period=1m&size=value) so a shared link opens
     on the same picture. */
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const pp = sp.get('period'); if (pp && PERIODS.some((x) => x.id === pp)) setPeriod(pp as PeriodId)
    if (sp.get('size') === 'value') setSizeBy('value')
    setReady(true)
  }, [])
  useEffect(() => {
    if (!ready) return
    const sp = new URLSearchParams()
    if (period !== '1d') sp.set('period', period)
    if (sizeBy === 'value') sp.set('size', 'value')
    const qs = sp.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`)
  }, [period, sizeBy, ready])
  const q = ''
  const [band, setBand] = useState<Band | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  /* Zoom: one sector filling the map, so its small tiles become readable
     without distorting the proportions of the whole. */
  const [zoom, setZoom] = useState<string | null>(null)
  const [hover, setHover] = useState<{ r: MapRow; x: number; y: number } | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<[number, number]>([1000, 620])
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => { const w = Math.round(e.contentRect.width); if (w > 0) setSize([w, Math.max(520, Math.round(w * 0.75))]) })
    ro.observe(el); return () => ro.disconnect()
  }, [])

  const rows = useMemo(() => {
    const meta = new Map(initial.meta.map((m) => [m.sym, m]))
    return initial.metrics.map((m) => { const r = toRow(m, meta.get(m.ticker), ar); const pe = initial.pe[m.ticker]; return { ...r, pe: pe != null && pe > 0 ? pe : null } })
  }, [initial, ar])
  const uni = useMemo(() => universe(rows, initial.metrics), [rows, initial.metrics])
  /* Weight for layout: cap by default; average traded value on request
     (companies with no average keep a floor so they still appear). */
  const weighted = useMemo<MapRow[]>(() => sizeBy === 'cap' ? uni.rows
    : uni.rows.map((r) => ({ ...r, marketCap: Math.max(r.avg_value_20d ?? 0, 1e5) })), [uni.rows, sizeBy])
  const sectors = useMemo(() => sectorNodes(weighted, period, locale).sort((a, b) => b.marketCap - a.marketCap), [weighted, period, locale])
  const cap = capFor(period)
  const periodLabel = ar ? PERIODS.find((p) => p.id === period)!.ar : PERIODS.find((p) => p.id === period)!.en

  const [W, H] = size
  const layout = useMemo(() => {
    const shown = zoom ? sectors.filter((s) => s.id === zoom) : sectors
    const outer = squarify(shown.map((s) => ({ item: s, value: s.marketCap })), 0, 0, W, H)
    return outer.map(({ item: s, box }) => ({
      sector: s,
      box,
      tiles: squarify(s.list.map((r) => ({ item: r, value: r.marketCap })), box.x + GAP, box.y + HEAD, Math.max(0, box.w - GAP * 2), Math.max(0, box.h - HEAD - GAP)),
    }))
  }, [sectors, W, H, zoom])

  const summary = useMemo(() => {
    let up = 0, down = 0, flat = 0, none = 0
    for (const r of uni.rows) { const p = periodChange(r, period); if (p == null) none++; else if (p > 0) up++; else if (p < 0) down++; else flat++ }
    return { up, down, flat, none }
  }, [uni.rows, period])

  const sel = selected ? uni.rows.find((r) => r.ticker === selected) ?? null : null

  /* The map as a PNG: the same boxes redrawn on a canvas at 2× in the current
     theme's colours, with a title, the session, the scale and IRAQSM.COM —
     so what gets shared carries where it came from. */
  const latestDate = useMemo(() => uni.rows.reduce<string | null>((m, r) => (r.last_date && (!m || r.last_date > m) ? r.last_date : m), null), [uni.rows])
  const render = async (): Promise<Blob | null> => {
    const el = boxRef.current
    if (!el) return null
    const css = getComputedStyle(el)
    const colour = (cls: string) => { const probe = document.createElement('span'); probe.className = cls; probe.style.display = 'none'; el.appendChild(probe); const c = getComputedStyle(probe); const out = { bg: c.backgroundColor, fg: c.color }; probe.remove(); return out }
    const bands = new Map<string, { bg: string; fg: string }>()
    for (const b of [-3, -2, -1, 0, 1, 2, 3]) bands.set(`b${b}`, colour(`is-b${b}`))
    const none = colour('is-none')
    const ink = css.color, page = getComputedStyle(document.body).backgroundColor, panel = css.backgroundColor, muted = getComputedStyle(document.body).getPropertyValue('--muted') || ink
    const S = 2, PAD = 40, TOP = 96, BOT = 64
    const c = document.createElement('canvas'); c.width = (W + PAD * 2) * S; c.height = (H + TOP + BOT) * S
    const g = c.getContext('2d')!; g.scale(S, S)
    const font = getComputedStyle(document.body).fontFamily
    g.fillStyle = page; g.fillRect(0, 0, W + PAD * 2, H + TOP + BOT)
    g.fillStyle = ink; g.textBaseline = 'middle'; g.direction = ar ? 'rtl' : 'ltr'; g.textAlign = ar ? 'right' : 'left'
    const sx = ar ? W + PAD : PAD
    g.font = `500 26px ${font}`; g.fillText(pg.imageTitle(periodLabel), sx, 36)
    g.font = `400 14px ${font}`; g.fillStyle = muted; g.fillText(pg.summary(int.format(summary.up), int.format(summary.down), int.format(summary.flat), int.format(summary.none), periodLabel), sx, 68)
    g.save(); g.translate(PAD, TOP)
    g.fillStyle = panel; g.fillRect(0, 0, W, H)
    const rr = (x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.roundRect(x, y, w, h, r); }
    for (const { sector: sc, box, tiles } of layout) {
      g.fillStyle = page; rr(box.x, box.y, box.w, box.h, 8); g.fill()
      g.fillStyle = ink; g.font = `500 13px ${font}`; g.textAlign = ar ? 'right' : 'left'
      g.fillText(`${sc.label} ${pctText(sc.pct)}`, ar ? box.x + box.w - 8 : box.x + 8, box.y + 13)
      for (const { item: r, box: tb } of tiles) {
        const p = periodChange(r, period); const b = bandOf(p, cap)
        const col = b == null ? none : bands.get(`b${b}`)!
        g.fillStyle = col.bg; rr(tb.x, tb.y, tb.w, tb.h, 6); g.fill()
        if (b == null) { g.strokeStyle = muted; g.lineWidth = 1; for (let d = -tb.h; d < tb.w; d += 10) { g.beginPath(); g.moveTo(tb.x + d, tb.y + tb.h); g.lineTo(tb.x + d + tb.h, tb.y); g.stroke() } }
        if (tb.w > 40 && tb.h > 22) { g.fillStyle = col.fg === 'rgba(0, 0, 0, 0)' ? ink : col.fg; g.font = `500 12px ${font}`; g.textAlign = 'left'; g.direction = 'ltr'; g.fillText(r.ticker, tb.x + 7, tb.y + 12) }
        if (tb.w > 72 && tb.h > 40) { g.font = `400 13px ${font}`; g.textAlign = 'left'; g.fillText(pctText(p), tb.x + 7, tb.y + tb.h - 12) }
      }
    }
    g.restore()
    /* Foot: the session and the encoding on one side, the mark on the other. */
    g.direction = ar ? 'rtl' : 'ltr'; g.textAlign = ar ? 'right' : 'left'; g.fillStyle = muted; g.font = `400 13px ${font}`
    g.fillText(pg.imageFoot(latestDate ? localeDate(latestDate, locale) : ''), sx, H + TOP + 32)
    g.direction = 'ltr'; g.textAlign = ar ? 'left' : 'right'; g.fillStyle = ink; g.font = `700 22px ${font}`
    g.fillText('IRAQSM.COM', ar ? PAD : W + PAD, H + TOP + 32)
    return new Promise((res) => c.toBlob((b) => res(b), 'image/png'))
  }
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 2000) }
  const fileName = () => `iraqsm-heatmap-${latestDate ?? 'latest'}-${period}.png`
  const onDownload = async () => { const b = await render(); if (!b) return; const url = URL.createObjectURL(b); downloadImage(url, fileName()); setTimeout(() => URL.revokeObjectURL(url), 5000) }
  const onCopy = async () => { const b = await render(); if (!b) return; flash((await copyImage(b)) ? pg.copied : pg.copyUnsupported) }
  const onShare = async () => {
    const b = await render(); if (!b) return
    const file = new File([b], fileName(), { type: 'image/png' })
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
    if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) { try { await nav.share({ files: [file], title: pg.imageTitle(periodLabel), url: window.location.href }) } catch {} }
    else onDownload()
  }
  const lit = (r: MapRow) => (!q || matchesQuery(r, q)) && (band == null || bandOf(periodChange(r, period), cap) === band)

  return (
    <SiteShell>
      <main className="hm2 id-full iq-door">
        <DoorRail door="markets" items={RAIL.map((r) => ({ label: t.market.page.rail[r.key], route: r.route }))} />
        <div className="hm2-body">
          <header className="hm2-head">
            <p className="id-eyebrow">{pg.eyebrow}</p>
            <PageTitle title={h.title} note={pg.lede} />
            <p className="id-cap hm2-summary id-num">{pg.summary(int.format(summary.up), int.format(summary.down), int.format(summary.flat), int.format(summary.none), periodLabel)}</p>
          </header>

          <div className="hm2-controls">
            <div className="id-pills" role="group" aria-label={h.periodLabel}>
              {PERIODS.map((p) => <button key={p.id} type="button" className="id-pill" aria-pressed={period === p.id} onClick={() => setPeriod(p.id)}>{ar ? p.ar : p.en}</button>)}
            </div>
            {/* One quiet scale: coral … grey … mint, with the period's cap at the ends. */}
            <div className="hm2-scale id-num" role="group" aria-label={h.bandsLabel} onPointerLeave={() => setBand(null)}>
              <bdi className="id-cap">−{cap}%</bdi>
              {([-3, -2, -1, 0, 1, 2, 3] as Band[]).map((b) => (
                <button key={b} type="button" className={`hm2-step is-b${b} ${band === b ? 'is-on' : ''}`.trim()} aria-label={h.highlightBand(bandLabel(b, cap))}
                  onPointerEnter={() => setBand(b)} onFocus={() => setBand(b)} onBlur={() => setBand(null)} onClick={() => setBand(band === b ? null : b)} />
              ))}
              <bdi className="id-cap">+{cap}%</bdi>
            </div>
          </div>

          <div className="hm2-stage">
            {zoom ? (
              <div className="hm2-crumb">
                <button type="button" className="id-pill is-sm" onClick={() => setZoom(null)}>← {h.allSectors}</button>
                <span className="id-cap">{sectors.find((s) => s.id === zoom)?.label}</span>
              </div>
            ) : null}
            <div ref={boxRef} className="hm2-map" role="figure" aria-label={h.title} style={{ height: H }}>
              <span className="id-mark hm2-mark" aria-hidden="true">IRAQSM.COM</span>
              {hover ? (
                <div className="hm2-tip id-num" style={{ left: hover.x - (boxRef.current?.getBoundingClientRect().left ?? 0), top: hover.y - (boxRef.current?.getBoundingClientRect().top ?? 0) }} aria-hidden="true">
                  <b>{hover.r.name}</b> <span className="id-cap">{hover.r.ticker}</span>
                  <bdi className={periodChange(hover.r, period) == null ? '' : periodChange(hover.r, period)! > 0 ? 'id-up' : periodChange(hover.r, period)! < 0 ? 'id-down' : ''}>{pctText(periodChange(hover.r, period))}</bdi>
                </div>
              ) : null}
              {layout.map(({ sector: s, box, tiles }) => (
                <div key={s.id} className="hm2-sector" style={{ left: box.x, top: box.y, width: box.w, height: box.h }} aria-label={h.nodeLabel(s.label, int.format(s.list.length), pctText(s.pct))}>
                  <button type="button" className="hm2-sector-name id-num" onClick={() => setZoom(zoom === s.id ? null : s.id)} aria-label={h.sectorOf(s.label)}>
                    <b>{s.label}</b> <bdi className={s.pct == null ? '' : s.pct > 0 ? 'id-up' : s.pct < 0 ? 'id-down' : ''}>{pctText(s.pct)}</bdi>
                    <span className="hm2-zoom" aria-hidden="true">{zoom === s.id ? '⤡' : '⤢'}</span>
                  </button>
                  {tiles.map(({ item: r, box: tb }) => {
                    const p = periodChange(r, period)
                    const b = bandOf(p, cap)
                    const on = lit(r)
                    const big = tb.w > 72 && tb.h > 40
                    return (
                      <button key={r.ticker} type="button"
                        className={`hm2-tile ${b == null ? 'is-none' : `is-b${b}`} ${on ? '' : 'is-dim'} ${selected === r.ticker ? 'is-sel' : ''}`.trim()}
                        style={{ left: tb.x - box.x, top: tb.y - box.y, width: tb.w, height: tb.h }}
                        onClick={() => setSelected(selected === r.ticker ? null : r.ticker)}
                        onPointerEnter={(e) => setHover({ r, x: e.clientX, y: e.clientY })} onPointerMove={(e) => setHover({ r, x: e.clientX, y: e.clientY })} onPointerLeave={() => setHover(null)}
                        aria-label={h.tileLabel(r.name, r.ticker, pctText(p), `${(r.marketCap / 1e9).toFixed(1)} ${u.bn}`)}>
                        {tb.w > 40 && tb.h > 22 ? <span className="hm2-tick">{r.ticker}</span> : null}
                        {big ? <bdi className="hm2-pct id-num">{pctText(p)}</bdi> : null}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>

            {sel ? (
              <aside className="hm2-card id-panel" aria-live="polite">
                <div className="hm2-side-head">
                  <CompanyLogo sym={sel.ticker} logo={sel.logo} color={sel.color} className="iqm-logo" />
                  <div><p className="id-h3">{sel.name}</p><p className="id-cap">{sel.ticker} · {sectorLabel(sel.sector, locale)}</p></div>
                  <button type="button" className="id-pill is-sm" onClick={() => setSelected(null)} aria-label={h.close}>×</button>
                </div>
                <dl className="hm2-facts id-num">
                  <div><dt>{h.lastPrice}</dt><dd>{price.format(sel.last_close)} <span className="id-cap">{h.currency}</span></dd></div>
                  <div><dt>{h.changeIn(periodLabel)}</dt><dd className={periodChange(sel, period) == null ? '' : periodChange(sel, period)! > 0 ? 'id-up' : periodChange(sel, period)! < 0 ? 'id-down' : ''}><bdi>{pctText(periodChange(sel, period))}</bdi></dd></div>
                  <div><dt>{h.marketCap}</dt><dd>{sel.mcap != null ? `${(sel.mcap / 1e9).toFixed(1)} ${u.bn}` : '—'}</dd></div>
                </dl>
                <Link href={L(`/c/${sel.ticker}`)} className="id-btn is-sm">{h.openCompany} →</Link>
              </aside>
            ) : null}
          </div>

          <div className="hm2-foot">
            <div className="id-pills hm2-export">
              <button type="button" className="id-btn is-sm" onClick={onShare}>{pg.share}</button>
              <button type="button" className="id-pill is-sm" onClick={onCopy}>{pg.copy}</button>
              <button type="button" className="id-pill is-sm" onClick={onDownload}>{pg.download}</button>
              {msg ? <span className="id-cap" role="status">{msg}</span> : null}
            </div>
            <div className="id-pills" role="group" aria-label={pg.sizeBy}>
              <span className="id-cap">{pg.sizeBy}</span>
              <button type="button" className="id-pill is-sm" aria-pressed={sizeBy === 'cap'} onClick={() => setSizeBy('cap')}>{pg.sizeCap}</button>
              <button type="button" className="id-pill is-sm" aria-pressed={sizeBy === 'value'} onClick={() => setSizeBy('value')}>{pg.sizeValue}</button>
            </div>
            <p className="id-cap">{pg.excluded(int.format(uni.excludedNoCap.length + uni.excludedStale.length + uni.excludedUnknownAge.length))}</p>
          </div>

          <AboutSection title={pg.about.title} body={pg.about.body} />
        </div>
      </main>
    </SiteShell>
  )
}
