'use client'

import { useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'

/**
 * Foreign investor flow as a ring.
 *
 * Two arcs on one circle — buying in moss, selling in sand — and the net in
 * the middle, so the answer («are foreigners buying or selling?») is read
 * before any number is. The gap between the arcs is where the ring "opens";
 * the bigger side is the mood of the session. A period switch aggregates
 * the last twenty sessions for the trend behind the day.
 */
export type FlowRow = { date: string; side: string; value: number | null }
type Period = 'session' | 'month'

const R = 74, SW = 14, C = 2 * Math.PI * R

export function FlowRing({ rows, session, compact }: { rows: FlowRow[]; session: string | null; compact: (v: number) => string }) {
  const { t } = useLocale()
  const c = t.market.page.flow
  const [period, setPeriod] = useState<Period>('session')

  const flow = useMemo(() => {
    if (!rows.length) return null
    const dates = Array.from(new Set(rows.map((r) => r.date))).sort().reverse()
    const day = session && dates.includes(session) ? session : dates[0]
    const keep = period === 'session' ? new Set([day]) : new Set(dates.slice(0, 20))
    const sel = rows.filter((r) => keep.has(r.date))
    const buy = sel.filter((r) => r.side === 'buy').reduce((s, r) => s + (r.value ?? 0), 0)
    const sell = sel.filter((r) => r.side === 'sell').reduce((s, r) => s + (r.value ?? 0), 0)
    const total = buy + sell
    return { buy, sell, net: buy - sell, buyShare: total ? buy / total : 0, sellShare: total ? sell / total : 0, total }
  }, [rows, session, period])

  if (!flow || !flow.total) {
    return <section className="fr id-panel"><p className="id-eyebrow">{c.title}</p><p className="id-note">{c.empty}</p></section>
  }
  const gap = 0.012 * C                       // a hairline of air between the arcs
  const buyLen = Math.max(0, flow.buyShare * C - gap)
  const sellLen = Math.max(0, flow.sellShare * C - gap)
  const mood = Math.abs(flow.buyShare - 0.5) < 0.03 ? 'even' : flow.net > 0 ? 'buy' : 'sell'

  return (
    <section className="fr id-panel" aria-label={c.title}>
      <header className="fr-head">
        <p className="id-eyebrow">{c.title}</p>
        <div className="id-pills" role="group">
          {(['session', 'month'] as Period[]).map((p) => (
            <button key={p} type="button" className="id-pill is-sm" aria-pressed={period === p} onClick={() => setPeriod(p)}>{c.periods[p]}</button>
          ))}
        </div>
      </header>
      <div className="fr-body">
        <svg className="fr-ring" viewBox="0 0 180 180" role="img" aria-label={c.label(compact(flow.buy), compact(flow.sell))}>
          <circle cx="90" cy="90" r={R} className="fr-track" strokeWidth={SW} />
          {/* Arcs start at the top and run clockwise: buying first, selling after. */}
          <circle cx="90" cy="90" r={R} className="fr-buy" strokeWidth={SW}
            strokeDasharray={`${buyLen} ${C - buyLen}`} strokeDashoffset={C / 4 - gap / 2} />
          <circle cx="90" cy="90" r={R} className="fr-sell" strokeWidth={SW}
            strokeDasharray={`${sellLen} ${C - sellLen}`} strokeDashoffset={C / 4 - gap / 2 - buyLen - gap} />
          <text x="90" y="84" className={`fr-net id-num is-${mood}`}>{flow.net > 0 ? '+' : flow.net < 0 ? '−' : ''}{compact(Math.abs(flow.net))}</text>
          <text x="90" y="104" className="fr-netlabel">{mood === 'even' ? c.even : mood === 'buy' ? c.netBuy : c.netSell}</text>
        </svg>
        <dl className="fr-legend id-num">
          <div><dt><i className="is-buy" />{c.buy}</dt><dd>{compact(flow.buy)}<span>{Math.round(flow.buyShare * 100)}%</span></dd></div>
          <div><dt><i className="is-sell" />{c.sell}</dt><dd>{compact(flow.sell)}<span>{Math.round(flow.sellShare * 100)}%</span></dd></div>
        </dl>
      </div>
      <p className="id-cap fr-note">{c.note}</p>
    </section>
  )
}
