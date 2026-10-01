'use client'

import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import { localeDate } from '@/lib/date'
import { existsIn } from '@/lib/i18n/routes'
import type { HomeWorlds as Worlds } from '@/lib/homeWorlds'
import type { IndexRow } from '@/lib/homeData'
import { DayChip } from './DayChip'
import '@/styles/home-worlds.css'

/**
 * The top of the homepage (identity v3, loud level): «مانشيت اليوم», one
 * newspaper line written from the day's moves, then a card per money world
 * (dollar, gold, ISX60) and the first lesson. Replaces the welcome card.
 *
 * Not the page's <h1>: the homepage ranks for the market, and its one
 * heading stays «السوق في آخر جلسة» below.
 */
const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const nfQ = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
const LESSON = '/learn/invest'
/* Under this, ISX60's session move reads as a quiet market, not a direction. */
const QUIET_PCT = 0.3

export function HomeWorlds({ worlds, index }: { worlds: Worlds | null; index: { latest: IndexRow; prev: IndexRow | null } | null }) {
  const { t, locale, href: L } = useLocale()
  const W = t.home.worlds
  const R = t.rates
  const d = (iso: string) => localeDate(iso, locale)

  const dollar = worlds?.dollar ?? null
  const gold = worlds?.gold ?? null
  const isx = index?.latest ?? null
  const isxPct = isx && index?.prev?.isx60 ? ((isx.isx60 - index.prev.isx60) / index.prev.isx60) * 100 : null

  /* The line states only what a move supports; a missing move drops its clause. */
  const parts: string[] = []
  if (dollar?.move) {
    const abs = Math.abs(dollar.move.abs), shown = Math.round(abs * 100) / 100
    const amount = W.line.dinars(shown, nfQ.format(shown))
    parts.push(shown === 0 ? W.line.dollarFlat : dollar.move.abs > 0 ? W.line.dollarUp(amount) : W.line.dollarDown(amount))
  }
  if (gold?.move) {
    const p = Math.round(gold.move.pct * 100) / 100
    parts.push(p > 0 ? W.line.goldUp : p < 0 ? W.line.goldDown : W.line.goldFlat)
  }
  if (isxPct != null) parts.push(Math.abs(isxPct) < QUIET_PCT ? W.line.isxQuiet : isxPct > 0 ? W.line.isxUp : W.line.isxDown)
  const line = parts.length ? W.line.join(parts) : null
  const asOf = dollar?.date ?? gold?.date ?? isx?.date ?? null
  const lesson = existsIn(LESSON, locale) ? LESSON : '/learn'

  return (
    <section className="hw id-full" aria-label={W.label}>
      <header className="hw-head">
        <p className="id-eyebrow">{W.label}{asOf ? ` · ${d(asOf)}` : ''}</p>
        <h2 className="id-display hw-title">{W.title}</h2>
        <p className="id-lede">{W.lead}</p>
      </header>

      {line ? (
        <div className="hw-manchette">
          <span className="id-eyebrow">{W.manchette}</span>
          <p>{line}</p>
        </div>
      ) : null}

      <div className="hw-grid">
        {dollar ? (
          <Link href={L('/fx')} className="id-print hw-card" data-world="dinar">
            <span className="id-tag">{W.dollar.tag}</span>
            <span className="hw-row">
              <span className="hw-val id-num"><bdi>{nf0.format(dollar.sell)}</bdi></span>
              {dollar.move ? <DayChip pct={dollar.move.pct} invert label={R.tools.vsPrev(d(dollar.move.prevDate))} /> : null}
            </span>
            <span className="id-cap">{dollar.move ? W.dollar.unit(d(dollar.move.prevDate)) : R.gold.iqd}</span>
          </Link>
        ) : null}
        {gold ? (
          <Link href={L('/gold')} className="id-print hw-card" data-world="ochre">
            <span className="id-tag">{W.gold.tag}</span>
            <span className="hw-row">
              <span className="hw-val id-num"><bdi>{nf0.format(gold.mithqal21)}</bdi></span>
              {gold.move ? <DayChip pct={gold.move.pct} label={R.tools.vsPrev(d(gold.move.prevDate))} /> : null}
            </span>
            <span className="id-cap">{gold.move ? W.gold.unit(d(gold.move.prevDate)) : R.gold.iqd}</span>
          </Link>
        ) : null}
        {isx ? (
          <a href="#market" className="id-print hw-card" data-world="lapis">
            <span className="id-tag">{W.isx.tag}</span>
            <span className="hw-row">
              <span className="hw-val id-num"><bdi>{nfQ.format(isx.isx60)}</bdi></span>
              {isxPct != null && index?.prev ? <DayChip pct={isxPct} label={R.tools.vsPrev(d(index.prev.date))} /> : null}
            </span>
            <span className="id-cap">{W.isx.unit(d(isx.date))}</span>
          </a>
        ) : null}
        <Link href={L(lesson)} className="id-print is-fill is-hand hw-card hw-learn" data-world="brick">
          <span className="hw-learn-tag">{W.learn.tag}</span>
          <span className="hw-learn-title">{W.learn.title}</span>
          <span className="hw-learn-cta">{W.learn.cta} <span aria-hidden="true">{locale === 'ar' ? '←' : '→'}</span></span>
        </Link>
      </div>
    </section>
  )
}
