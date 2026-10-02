'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { haptic } from '@/lib/appMode'
import { setShareCard } from '@/lib/shareCard'
import { MiniArea } from '@/components/site/MiniArea'
import { localeDate } from '@/lib/date'
import '@/styles/econ-page.css'

/**
 * The app's rate screens are built from these three pieces: the hero price
 * card (brand gradient, source, freshness, 30-day line), the converter, and
 * a pair of figure tiles. Numbers only — the explanations live on the website.
 */
export const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
export const nfQ = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
export const nf2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
/** Enough digits to be useful at any magnitude. */
export const fmtAny = (v: number) => (v >= 100 ? nf0.format(v) : v >= 1 ? nfQ.format(v) : v.toPrecision(3))

function ago(iso: string | null | undefined, locale: 'ar' | 'en'): string | null {
  if (!iso) return null
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (!isFinite(mins) || mins < 0) return null
  const rtf = new Intl.RelativeTimeFormat(locale === 'ar' ? 'ar' : 'en', { numeric: 'auto' })
  if (mins < 60) return rtf.format(-Math.max(1, mins), 'minute')
  if (mins < 60 * 24) return rtf.format(-Math.round(mins / 60), 'hour')
  return rtf.format(-Math.round(mins / 1440), 'day')
}

export interface HeroProps {
  label: string
  flag?: string
  value: number | null
  unit: string
  /** Change since the previous close, in the same unit as `value`. */
  delta?: number | null
  /** A rising dollar is a falling dinar: colour the change the way /fx does. */
  invert?: boolean
  deltaLabel?: string
  /** The day's move in percent when the screen has its own rule for it (the dollar). */
  pct?: number | null
  updatedAt?: string | null
  stale?: boolean
  source?: string
  /** The chart under the figure: dated points, oldest first (interactive, as on the website). */
  spark?: { date: string; value: number }[]
  /** The date the headline figure is for: the chart's last point is pinned to it. */
  asOf?: string | null
  sparkLabel?: string
  foot?: string
  tone?: 'gold'
  /** Formats the headline and the change; default: sensible digits for the size. */
  format?: (v: number) => string
  deltaFormat?: (v: number) => string
  /** The share image: its headline (default: the label) and extra lines. */
  shareTitle?: string
  shareLines?: string[]
}

export function RateHero(p: HeroProps) {
  const { t, locale } = useLocale()
  const R = t.app.rate
  const R2 = t.app.share
  const [when, setWhen] = useState<string | null>(null)
  useEffect(() => {
    const tick = () => setWhen(ago(p.updatedAt, locale))
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [p.updatedAt, locale])
  const d = p.delta
  const good = d != null && (p.invert ? d < 0 : d > 0)
  const fmt = p.format ?? fmtAny
  const dfmt = p.deltaFormat ?? fmtAny
  /* What this screen's share image says (lib/shareCard). */
  useEffect(() => {
    if (p.value == null) return
    const at = p.updatedAt ? new Date(p.updatedAt) : null
    const when = at && !isNaN(+at)
      ? new Intl.DateTimeFormat(locale === 'ar' ? 'ar-u-nu-latn' : 'en-GB', { timeZone: 'Asia/Baghdad', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(at)
      : undefined
    setShareCard({
      title: p.shareTitle ?? p.label, value: fmt(p.value), unit: p.unit, tone: p.tone,
      delta: d != null && isFinite(d) ? { text: `${d > 0 ? '▲' : d < 0 ? '▼' : '•'} ${dfmt(Math.abs(d))}${p.deltaLabel ? ` ${p.deltaLabel}` : ''}`, tone: d === 0 ? 'flat' : good ? 'good' : 'bad' } : undefined,
      lines: [...(p.shareLines ?? []), ...(p.source ? [R2.source(p.source)] : []), ...(p.foot ? [p.foot] : [])],
      when, foot: { site: R2.site, cta: R2.cta },
    })
    return () => setShareCard(null)
  }, [p.value, p.unit, p.label, d, p.updatedAt, locale]) // eslint-disable-line react-hooks/exhaustive-deps
  /* The board's chip: percent only, up green and down red for every price. */
  const pct = p.pct !== undefined ? p.pct : d != null && isFinite(d) && p.value != null && p.value - d !== 0 ? (d / (p.value - d)) * 100 : null
  return (
    <section className="rk-hero rk3-hero" aria-label={p.label}>
      <div className="rk3-tag">
        <i aria-hidden="true" />
        <span className="rk3-label">{p.flag ? <span className="rk-flag" aria-hidden="true">{p.flag}</span> : null}{p.label}</span>
        {p.source ? <span className="rk3-src">{p.source}</span> : null}
      </div>
      <p className="rk3-num id-num">
        <span className="rk3-num-in">
          <bdi>{p.value == null ? '—' : fmt(p.value)}</bdi>
          <svg className="rk3-swoosh" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
            <path d="M4 30 C 50 10, 110 4, 196 20" fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
        </span>
      </p>
      <div className="rk3-line">
        {pct != null ? <span className={`id-chg ${Math.abs(pct) < 0.005 ? 'is-flat' : pct > 0 ? 'is-up' : 'is-down'}`}><bdi dir="ltr">{pct > 0 ? '+' : pct < 0 ? '−' : ''}{Math.abs(pct).toFixed(2)}%</bdi></span> : null}
        <span>{p.unit}{pct != null && p.deltaLabel ? ` · ${p.deltaLabel}` : ''}</span>
      </div>
      {p.updatedAt || p.stale ? (
        <p className="rk3-live">
          <span className={`rk-dot ${p.stale ? 'is-stale' : ''}`} aria-hidden="true" />
          {p.stale ? R.stale : when ? R.ago(when) : ''}
        </p>
      ) : null}
      {p.spark && p.spark.length > 1 ? (
        <RateChart series={p.spark} now={p.asOf && p.value != null ? { date: p.asOf, value: p.value } : null} format={fmt} label={p.label} />
      ) : null}
      {p.foot ? <p className="rk3-foot">{p.foot}</p> : null}
    </section>
  )
}

/* Timeframes in days; a chip shows only when the history reaches past the
   frame before it, so a short series (gold's week) offers no empty choices. */
const FRAMES = [['w', 7], ['m', 31], ['q', 92], ['y', 366], ['all', Infinity]] as const
type Frame = (typeof FRAMES)[number][0]
const daysBetween = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86_400_000

/**
 * The chart under a rate: the website's interactive chart (tap a day for its
 * value), timeframe chips, and a full-screen view with the same chips.
 */
export function RateChart({ series, now, format, label }: {
  series: { date: string; value: number }[]
  now: { date: string; value: number } | null
  format: (v: number) => string
  label: string
}) {
  const { t, locale } = useLocale()
  const C = t.app.chart
  const latest = now?.date ?? series[series.length - 1]?.date ?? ''
  const span = series.length ? daysBetween(series[0].date, latest) : 0
  const frames = FRAMES.filter((_, i) => i === 0 || span > FRAMES[i - 1][1]).filter(([k]) => k !== 'all' || span > 31)
  const [frame, setFrame] = useState<Frame>(frames.some(([k]) => k === 'm') ? 'm' : frames[frames.length - 1]?.[0] ?? 'all')
  const [full, setFull] = useState(false)
  const days = FRAMES.find(([k]) => k === frame)![1]
  const pts = days === Infinity ? series : series.filter((x) => daysBetween(x.date, latest) <= days)
  /* Over a year, a date needs its year («23 يونيو 2022»). */
  const dl = days > 92 ? (d: string) => localeDate(d, locale) : undefined
  useEffect(() => {
    if (!full) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setFull(false) }
    window.addEventListener('keydown', esc)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', esc) }
  }, [full])

  const chips = frames.length > 1 ? (
    <div className="fx-quick rk3-frames" role="group" aria-label={C.range}>
      {frames.map(([k]) => <button key={k} type="button" className="fx-qbtn" aria-pressed={frame === k} onClick={() => { haptic(); setFrame(k) }}>{C.frames[k]}</button>)}
    </div>
  ) : null

  return (
    <>
      <figure className="rk-spark-wrap rk3-spark">
        <div className="rk3-chart-bar">
          {chips}
          <button type="button" className="rk3-full-btn" aria-label={C.full} title={C.full} onClick={() => { haptic(); setFull(true) }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
          </button>
        </div>
        <MiniArea points={pts} now={now} format={format} label={label} tone="world" dateLabel={dl} />
      </figure>
      {full ? (
        <div className="rk3-full" role="dialog" aria-modal="true" aria-label={label}>
          <div className="rk3-full-head">
            <b>{label}</b>
            <button type="button" className="rk3-full-btn" aria-label={C.close} onClick={() => { haptic(); setFull(false) }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          {chips}
          <div className="rk3-full-chart"><MiniArea points={pts} now={now} height={420} format={format} label={label} tone="world" dateLabel={dl} /></div>
        </div>
      ) : null}
    </>
  )
}

export interface ConverterProps {
  /** Dinars per ONE unit of the foreign currency, at the market and the official rate. */
  market: number | null
  official: number | null
  code: string
  name: string
  flag: string
  /** Street unit multiplier for the quick amounts (e.g. tomans are quoted per 100,000). */
  quick: number[]
  /** Displayed amount × this = units of the currency (toman → rial is 10). */
  factor?: number
}

export function Converter({ market, official, code, name, flag, quick, factor = 1 }: ConverterProps) {
  const { t } = useLocale()
  const R = t.app.rate
  const [toIqd, setToIqd] = useState(true)
  const [useOfficial, setUseOfficial] = useState(false)
  const [amount, setAmount] = useState(String(quick[0]))
  const rate = (useOfficial ? official : market) ?? null
  const num = Number(amount.replace(/[,٬\s]/g, '').replace(/[\u0660-\u0669]/g, (c) => String(c.charCodeAt(0) - 0x0660))) || 0
  const out = useMemo(() => {
    if (!rate) return null
    return toIqd ? num * factor * rate : num / rate / factor
  }, [num, rate, toIqd, factor])
  const from = toIqd ? { flag, name } : { flag: '🇮🇶', name: R.dinar }
  const to = toIqd ? { flag: '🇮🇶', name: R.dinar } : { flag, name }
  const quickHere = toIqd ? quick : [100_000, 250_000, 1_000_000]

  return (
    <section className="rk-conv id-print is-key rk3-conv" aria-label={R.converter}>
      <h2 className="rk-h">{R.converter}</h2>
      <label className="rk-conv-field">
        <span className="rk-conv-cur"><span aria-hidden="true">{from.flag}</span>{from.name}</span>
        <input
          id={`rk-amount-${code}`} className="rk-conv-in id-num" inputMode="decimal" value={amount} aria-label={R.amount}
          onChange={(e) => setAmount(e.target.value)} onFocus={(e) => e.target.select()}
        />
      </label>
      <button type="button" className="rk-swap" aria-label={R.swap} onClick={() => {
        haptic()
        if (out != null) setAmount(toIqd ? String(Math.round(out)) : String(Math.round(out * 100) / 100))
        setToIqd((v) => !v)
      }}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" /></svg>
      </button>
      <div className="rk-conv-field is-out">
        <span className="rk-conv-cur"><span aria-hidden="true">{to.flag}</span>{to.name}</span>
        <output className="rk-conv-out id-num" htmlFor={`rk-amount-${code}`}><bdi>{out == null ? '—' : toIqd ? nf0.format(out) : fmtAny(out)}</bdi></output>
      </div>
      <div className="rk-quick fx-quick" role="group" aria-label={R.amount}>
        {quickHere.map((q) => (
          <button key={q} type="button" className="fx-qbtn" aria-pressed={num === q} onClick={() => { haptic(); setAmount(String(q)) }}>
            <bdi>{nf0.format(q)}</bdi>
          </button>
        ))}
      </div>
      {official ? (
        <div className="rk-seg" role="group" aria-label={R.useRate}>
          <button type="button" aria-pressed={!useOfficial} onClick={() => { haptic(); setUseOfficial(false) }}>{R.market} · <bdi>{market ? fmtAny(market * factor) : '—'}</bdi></button>
          <button type="button" aria-pressed={useOfficial} onClick={() => { haptic(); setUseOfficial(true) }}>{R.officialShort} · <bdi>{fmtAny(official * factor)}</bdi></button>
        </div>
      ) : null}
    </section>
  )
}

export function Tiles({ items }: { items: { label: string; value: string; note?: string; tone?: 'good' | 'bad' }[] }) {
  return (
    <dl className="rk-tiles rk3-tiles id-num">
      {items.map((i) => (
        <div key={i.label} className="rk-tile">
          <dt>{i.label}</dt>
          <dd className={i.tone ? `is-${i.tone}` : ''}><bdi>{i.value}</bdi></dd>
          {i.note ? <small>{i.note}</small> : null}
        </div>
      ))}
    </dl>
  )
}
