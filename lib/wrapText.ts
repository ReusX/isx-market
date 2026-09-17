import type { Messages } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n/locale'
import { localeDate } from '@/lib/date'
import type { SessionWrap } from '@/lib/wrapServer'
import type { WrapVars } from '@/lib/i18n/messages/ar/wrap'

/** Numbers → words-ready strings. Latin digits everywhere, units from the dictionary. */
const n2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const n0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const n1 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })
type Dir = 'up' | 'down' | 'flat'
const dirOf = (x: number | null, eps = 0.005): Dir | null => (x == null ? null : x > eps ? 'up' : x < -eps ? 'down' : 'flat')

export function compactIqd(v: number, w: Messages['wrap']): string {
  const a = Math.abs(v)
  if (a >= 1e9) return `${n1.format(v / 1e9)} ${w.unitBn}`
  if (a >= 1e6) return `${n1.format(v / 1e6)} ${w.unitMn}`
  if (a >= 1e3) return `${n0.format(v / 1e3)} ${w.unitK}`
  return n0.format(v)
}

export function wrapVars(s: SessionWrap, t: Messages, locale: Locale): WrapVars {
  const w = t.wrap
  const d = new Date(`${s.date}T00:00:00Z`)
  const dateShort = localeDate(s.date, locale)
  const day = `${w.weekdays[d.getUTCDay()]} ${dateShort}`
  const dir = dirOf(s.index.pct) ?? 'flat'
  const relPct = (a: number | null, b: number | null) => (a != null && b ? ((a - b) / b) * 100 : null)
  const weekPctN = relPct(s.index.close, s.index.weekAgo), ytdPctN = relPct(s.index.close, s.index.yearStart)
  const valueVs = s.totals.avgValue20 ? ((s.totals.value - s.totals.avgValue20) / s.totals.avgValue20) * 100 : null
  /* Registered names run to a dozen words («المنصور للصناعات الدوائية
     والمستلزمات الطبية ومواد التجميل والمياه المعقمة»); in a sentence the
     first four carry the identity. The tables keep the full name. */
  const name = (m: { ar: string; en: string }) => {
    const full = locale === 'ar' ? m.ar : m.en
    const words = full.split(/\s+/)
    return words.length > 6 ? words.slice(0, 4).join(' ') : full
  }
  const mover = (m: SessionWrap['gainers'][number]) => ({ name: name(m), pct: n2.format(Math.abs(m.pct)), close: n2.format(m.close) })
  const f = s.foreign
  return {
    day, dateShort,
    close: n2.format(s.index.close), prevClose: s.index.prevClose != null ? n2.format(s.index.prevClose) : '—',
    pts: s.index.change != null ? n2.format(Math.abs(s.index.change)) : '—', pct: s.index.pct != null ? n2.format(Math.abs(s.index.pct)) : '—',
    dir,
    isx15: s.index.isx15 ? n2.format(s.index.isx15) : null,
    weekPct: weekPctN != null ? n2.format(Math.abs(weekPctN)) : null, weekDir: dirOf(weekPctN),
    ytdPct: ytdPctN != null ? n2.format(Math.abs(ytdPctN)) : null, ytdDir: dirOf(ytdPctN),
    nearHigh: s.index.high52 != null && s.index.close >= s.index.high52 * 0.99,
    nearLow: s.index.low52 != null && s.index.close <= s.index.low52 * 1.01,
    high52: s.index.high52 != null ? n2.format(s.index.high52) : null, low52: s.index.low52 != null ? n2.format(s.index.low52) : null,
    up: n0.format(s.breadth.up), down: n0.format(s.breadth.down), flat: n0.format(s.breadth.flat), traded: n0.format(s.breadth.traded), listed: n0.format(s.breadth.listed),
    value: compactIqd(s.totals.value, w), trades: n0.format(s.totals.trades), volume: compactIqd(s.totals.volume, w),
    valueVsAvg: valueVs != null ? n0.format(Math.abs(valueVs)) : null, valueAbove: valueVs != null ? valueVs >= 0 : null,
    gainers: s.gainers.map(mover), losers: s.losers.map(mover),
    active: s.active.map((a) => ({ name: name(a), value: compactIqd(a.value, w) })),
    foreign: f ? {
      net: compactIqd(Math.abs(f.net), w), netDir: dirOf(f.net, 1) ?? 'flat',
      buy: compactIqd(f.buy.value, w), sell: compactIqd(f.sell.value, w),
      bought: f.buy.top.map(name), sold: f.sell.top.map(name),
    } : null,
  }
}
