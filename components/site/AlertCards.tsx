'use client'

import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import { localeDate } from '@/lib/date'
import { nf2 } from './tools'
import type { Alert } from '@/lib/portfolio'

/**
 * The reader's price alerts as the board draws them (board 2, page 7): one
 * card per alert, a dot, the condition as the line, the price now (or the
 * day it hit) beneath, and a state pill. Shared by /alerts and the side of
 * /portfolio; a hit pill is green because a hit is good news the reader
 * asked for, not a price move.
 */
export function AlertCards({ alerts, prices, name, onRemove }: {
  alerts: Alert[]
  prices: Record<string, number>
  name: (sym: string) => string
  onRemove?: (id: string) => void
}) {
  const { t, locale, href: L } = useLocale()
  const A = t.personal.tools.alerts
  const W = t.personal.watchlist
  return (
    <ul className="ac-list id-num">
      {alerts.map((a) => {
        const p = prices[a.sym]
        const now = p ? nf2.format(p) : W.noPrice
        return (
          <li key={a.id} className={`id-print is-calm ac-card${a.triggeredAt ? ' is-hit' : ''}`}>
            <span className={`ac-dot is-${a.dir}`} aria-hidden="true" />
            <div className="ac-body">
              <b><Link href={L(`/c/${a.sym}`)}>{name(a.sym)}</Link> {a.dir === 'above' ? A.above : A.below} <bdi>{nf2.format(a.target)}</bdi></b>
              <small>{a.triggeredAt ? A.board.hitAt(localeDate(a.triggeredAt.slice(0, 10), locale), now) : A.board.now(now)}</small>
            </div>
            <span className="ac-pill">{a.triggeredAt ? A.hit : A.waiting}</span>
            {onRemove ? <button type="button" className="ac-x" onClick={() => onRemove(a.id)} aria-label={`${A.remove} · ${name(a.sym)}`}>×</button> : null}
          </li>
        )
      })}
    </ul>
  )
}
