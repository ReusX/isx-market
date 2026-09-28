'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { StarMark } from '@/components/brand/StarMark'
import { haptic } from '@/lib/appMode'

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

function Spark({ points }: { points: number[] }) {
  if (points.length < 2) return null
  const W = 300, H = 64, pad = 3
  const lo = Math.min(...points), hi = Math.max(...points), span = hi - lo || 1
  const xy = points.map((v, i) => [pad + (i / (points.length - 1)) * (W - 2 * pad), pad + (1 - (v - lo) / span) * (H - 2 * pad)])
  const line = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const [ex, ey] = xy[xy.length - 1]
  return (
    <svg className="rk-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="rk-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".28" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${W - pad} ${H} L${pad} ${H} Z`} fill="url(#rk-fill)" />
      <path d={line} fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={ex} cy={ey} r="3.5" fill="#fff" />
    </svg>
  )
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
  updatedAt?: string | null
  stale?: boolean
  source?: string
  spark?: number[]
  sparkLabel?: string
  foot?: string
  tone?: 'gold'
  /** Formats the headline and the change; default: sensible digits for the size. */
  format?: (v: number) => string
  deltaFormat?: (v: number) => string
}

export function RateHero(p: HeroProps) {
  const { t, locale } = useLocale()
  const R = t.app.rate
  const [when, setWhen] = useState<string | null>(null)
  useEffect(() => {
    const tick = () => setWhen(ago(p.updatedAt, locale))
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [p.updatedAt, locale])
  const d = p.delta
  const good = d != null && (p.invert ? d < 0 : d > 0)
  return (
    <section className={`rk-hero ${p.tone ? `is-${p.tone}` : ''}`} aria-label={p.label}>
      <StarMark size={180} color="currentColor" />
      <div className="rk-hero-top">
        <span className="rk-hero-label">{p.flag ? <span className="rk-flag" aria-hidden="true">{p.flag}</span> : null}{p.label}</span>
        {p.source ? <span className="rk-chip">{p.source}</span> : null}
      </div>
      <p className="rk-hero-num id-num"><bdi>{p.value == null ? '—' : (p.format ?? fmtAny)(p.value)}</bdi></p>
      <p className="rk-hero-unit">{p.unit}</p>
      <div className="rk-hero-meta">
        {d != null && isFinite(d) ? (
          <span className={`rk-delta ${d === 0 ? '' : good ? 'is-good' : 'is-bad'}`}>
            <bdi>{d > 0 ? '▲' : d < 0 ? '▼' : '•'} {(p.deltaFormat ?? fmtAny)(Math.abs(d))}</bdi>{p.deltaLabel ? ` ${p.deltaLabel}` : ''}
          </span>
        ) : null}
        {p.updatedAt || p.stale ? (
          <span className="rk-live">
            <span className={`rk-dot ${p.stale ? 'is-stale' : ''}`} aria-hidden="true" />
            {p.stale ? R.stale : when ? R.ago(when) : ''}
          </span>
        ) : null}
      </div>
      {p.spark && p.spark.length > 1 ? (
        <figure className="rk-spark-wrap">
          <Spark points={p.spark} />
          {p.sparkLabel ? <figcaption>{p.sparkLabel}</figcaption> : null}
        </figure>
      ) : null}
      {p.foot ? <p className="rk-hero-foot">{p.foot}</p> : null}
    </section>
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
    <section className="rk-conv" aria-label={R.converter}>
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
      <div className="rk-quick" role="group" aria-label={R.amount}>
        {quickHere.map((q) => (
          <button key={q} type="button" className="rk-pill" aria-pressed={num === q} onClick={() => { haptic(); setAmount(String(q)) }}>
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
    <dl className="rk-tiles id-num">
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
