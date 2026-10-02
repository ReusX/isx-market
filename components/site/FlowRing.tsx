'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import { shortDate } from '@/lib/date'

/**
 * Foreign investor flow as a ring.
 *
 * Two arcs on one circle — buying in moss, selling in sand — and the net in
 * the middle, so the answer («are foreigners buying or selling?») is read
 * before any number is. The arcs draw themselves in when the data lands and
 * whenever the period changes; hovering a side thickens its arc and its
 * legend row together; and under the legend a strip of the last twenty
 * sessions shows buying above the line and selling below it, to scale.
 * Hovering a session in the strip turns the ring into THAT session — the
 * ring is a viewer for the strip — and a tooltip names the day's figures.
 */
export type FlowRow = { date: string; side: string; value: number | null }
type Period = 'session' | 'month'

const R = 74, SW = 14, C = 2 * Math.PI * R

export function FlowRing({ rows, session, compact }: { rows: FlowRow[]; session: string | null; compact: (v: number) => string }) {
  const { t, locale, href: L } = useLocale()
  const c = t.market.page.flow
  const [period, setPeriod] = useState<Period>('session')
  const [side, setSide] = useState<'buy' | 'sell' | null>(null)
  const [drawn, setDrawn] = useState(false)
  const [peek, setPeek] = useState<string | null>(null)   // a session hovered in the strip

  const days = useMemo(() => {
    const byDate = new Map<string, { buy: number; sell: number }>()
    for (const r of rows) {
      const d = byDate.get(r.date) ?? { buy: 0, sell: 0 }
      if (r.side === 'buy') d.buy += r.value ?? 0; else if (r.side === 'sell') d.sell += r.value ?? 0
      byDate.set(r.date, d)
    }
    return Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-20).map(([date, v]) => ({ date, ...v, net: v.buy - v.sell }))
  }, [rows])

  const flow = useMemo(() => {
    if (!days.length) return null
    const last = days[days.length - 1]
    const sel = peek ? [days.find((d) => d.date === peek) ?? last]
      : period === 'session' ? [days.find((d) => d.date === session) ?? last] : days
    const buy = sel.reduce((s, d) => s + d.buy, 0), sell = sel.reduce((s, d) => s + d.sell, 0)
    const total = buy + sell
    return { buy, sell, net: buy - sell, buyShare: total ? buy / total : 0, sellShare: total ? sell / total : 0, total }
  }, [days, session, period, peek])

  /* Draw-in: the arcs start at zero length and grow to their share. Re-run
     when the period flips so the change is seen, not just noticed. */
  useEffect(() => { setDrawn(false); const id = requestAnimationFrame(() => requestAnimationFrame(() => setDrawn(true))); return () => cancelAnimationFrame(id) }, [period, flow?.total])

  if (!flow || !flow.total) {
    return <section className="fr id-print is-calm"><h2 className="id-h3">{c.title}</h2><p className="id-note">{c.empty}</p></section>
  }
  const gap = 0.012 * C
  const buyLen = drawn ? Math.max(0, flow.buyShare * C - gap) : 0
  const sellLen = drawn ? Math.max(0, flow.sellShare * C - gap) : 0
  const mood = Math.abs(flow.buyShare - 0.5) < 0.03 ? 'even' : flow.net > 0 ? 'buy' : 'sell'
  /* Bar heights on a log scale, floored at 100k IQD. Foreign flow spans
     four orders of magnitude within a month (a 10k day next to a 12bn day),
     and on a linear scale nineteen sessions collapse into a hairline under
     one. Log keeps every session legible and the heavy one still tallest;
     the caption says so, and the tooltip and ring carry exact figures. */
  const maxSide = Math.max(1e6, ...days.map((d) => Math.max(d.buy, d.sell)))
  const FLOOR = 5 // log10(100k)
  const bar = (v: number) => v > 0 ? `${Math.max(6, Math.min(100, ((Math.log10(Math.max(v, 1e5)) - FLOOR) / (Math.log10(maxSide) - FLOOR)) * 100))}%` : '0'
  const shownDate = peek ?? (period === 'session' ? (days.find((d) => d.date === session)?.date ?? days[days.length - 1].date) : null)

  const sign = flow.net > 0 ? '+' : flow.net < 0 ? '−' : ''
  /* Number and magnitude word apart, or bidi carries the sign to the far end. */
  const [, netNum = '', netUnit = ''] = compact(Math.abs(flow.net)).match(/^([\d.,]+)\s*(.*)$/) ?? [null, compact(Math.abs(flow.net)), '']
  return (
    <section className={`fr id-print is-calm ${side ? `is-${side}` : ''}`.trim()} aria-label={c.title}>
      <header className="fr-head">
        <h2 className="id-h3 fr-title">{c.title}</h2>
        <div className="fx-quick" role="group">
          {(['session', 'month'] as Period[]).map((p) => (
            <button key={p} type="button" className="fx-qbtn" aria-pressed={period === p} onClick={() => setPeriod(p)}>{c.periods[p]}</button>
          ))}
        </div>
      </header>

      {/* The answer first: the net, big and coloured, with the ring beside it. */}
      <div className="fr-top">
        <div className="fr-answer">
          <p className={`fr-big id-num is-${mood}`}><bdi dir="ltr">{sign}{netNum}</bdi>{netUnit ? <span className="fr-unit"> {netUnit}</span> : null}</p>
          <p className="fr-sub">{mood === 'even' ? c.even : mood === 'buy' ? c.netBuy : c.netSell}{shownDate ? <> · <span className="id-num">{shortDate(shownDate, locale)}</span></> : <> · {c.periods.month}</>}</p>
        </div>
        <svg className="fr-ring" viewBox="0 0 180 180" role="img" aria-label={c.label(compact(flow.buy), compact(flow.sell))}>
          <circle cx="90" cy="90" r={R} className="fr-track" strokeWidth={SW} />
          <circle cx="90" cy="90" r={R} className="fr-buy" strokeWidth={SW}
            strokeDasharray={`${buyLen} ${C - buyLen}`} strokeDashoffset={C / 4 - gap / 2}
            onPointerEnter={() => setSide('buy')} onPointerLeave={() => setSide(null)} />
          <circle cx="90" cy="90" r={R} className="fr-sell" strokeWidth={SW}
            strokeDasharray={`${sellLen} ${C - sellLen}`} strokeDashoffset={C / 4 - gap / 2 - (drawn ? flow.buyShare * C : 0)}
            onPointerEnter={() => setSide('sell')} onPointerLeave={() => setSide(null)} />
          <text x="90" y="98" className="fr-ringpct id-num">{Math.round(flow.buyShare * 100)}%</text>
        </svg>
      </div>

      {/* Buy against sell: one split bar, the two figures under its ends. */}
      <div className="fr-split id-num">
        <span className="fr-splitbar" aria-hidden="true">
          <i className="is-buy" style={{ flex: Math.max(flow.buyShare, 0.02) }} onPointerEnter={() => setSide('buy')} onPointerLeave={() => setSide(null)} />
          <i className="is-sell" style={{ flex: Math.max(flow.sellShare, 0.02) }} onPointerEnter={() => setSide('sell')} onPointerLeave={() => setSide(null)} />
        </span>
        <dl className="fr-pair">
          {(['buy', 'sell'] as const).map((k) => (
            <div key={k} className={`is-${k}`} onPointerEnter={() => setSide(k)} onPointerLeave={() => setSide(null)}>
              <dt><i />{c[k]} <span>{Math.round((k === 'buy' ? flow.buyShare : flow.sellShare) * 100)}%</span></dt>
              <dd>{compact(flow[k])}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Twenty sessions, to scale: buying up from the line, selling down. */}
      <div className="fr-strip" onPointerLeave={() => setPeek(null)}>
        {days.map((d) => (
          <button type="button" key={d.date} className={`fr-bar ${d.date === shownDate ? 'is-on' : ''}`.trim()}
            onPointerEnter={() => setPeek(d.date)} onFocus={() => setPeek(d.date)} onBlur={() => setPeek(null)}
            aria-label={`${shortDate(d.date, locale)} · ${c.buy} ${compact(d.buy)} · ${c.sell} ${compact(d.sell)}`}>
            <i className="is-buy" style={{ height: bar(d.buy) }} />
            <i className="is-sell" style={{ height: bar(d.sell) }} />
          </button>
        ))}
      </div>
      <p className="id-cap fr-note id-num">
        {peek
          ? <>{shortDate(peek, locale)} · {c.buy} {compact(days.find((d) => d.date === peek)!.buy)} · {c.sell} {compact(days.find((d) => d.date === peek)!.sell)}</>
          : <>{c.periods.month} · {c.strip}</>}
      </p>

      <footer className="fr-foot">
        <span className="fr-mark" aria-hidden="true">IRAQSM.COM</span>
        <Link href={L('/statistics/foreign-flow')} className="id-btn is-sm">{c.full} →</Link>
      </footer>
    </section>
  )
}
