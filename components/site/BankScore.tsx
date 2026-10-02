'use client'

import { useLocale } from '@/context/LocaleContext'
import { PILLARS, type BankScore, type Grade, type Metric, type Pillar, type Ungraded } from '@/lib/bankScore'

/**
 * The bank health score on the page: a grade chip (table, key card) and the
 * five-area card (profile). Grades are inked on a calm scale — green for
 * the top two, neutral for «good», sand/red for the bottom two — because a
 * grade is a reading of statements, not a price move.
 */

export function GradeChip({ s, why, compact }: { s: BankScore | null | undefined; why?: Ungraded | null; compact?: boolean }) {
  const { t } = useLocale()
  const G = t.banks.score
  /* The bank's own situation first (state, foreign, guardianship…), then a
     data reason (old or thin statements). */
  if (!s?.grade || s.score == null) {
    if (why) return <span className={`bs-chip is-none is-why is-${why}`} title={G.whyLong[why]}>{G.why[why]}</span>
    if (!s) return <span className="bs-chip is-none">{G.notListed}</span>
    return <span className="bs-chip is-none">{s.reason === 'stale' ? G.stale : G.thin}</span>
  }
  return (
    <span className={`bs-chip is-${s.grade}`}>
      <b className="id-num">{s.score}</b>{compact ? null : <span>{G.grades[s.grade]}</span>}
      {compact ? <span>{G.grades[s.grade]}</span> : null}
    </span>
  )
}

export function ScoreBar({ v }: { v: number }) {
  return <span className="bs-bar" aria-hidden="true"><i style={{ width: `${Math.max(3, Math.min(100, v))}%` }} /></span>
}

/* One plain sentence per area, from the bank's own numbers. */
function line(p: Pillar, s: BankScore, G: ReturnType<typeof useLocale>['t']['banks']['score']): string | null {
  const m = s.metrics, r = s.rank
  const pct = (v: number) => `${Math.round(v * 100)}%`
  const beats = (k: Metric) => (r[k] != null ? G.beats(String(r[k])) : '')
  switch (p) {
    case 'capital':
      if (m.car != null) return G.lines.car(pct(m.car), beats('car'))
      return m.eq != null ? G.lines.eq(pct(m.eq), beats('eq')) : null
    case 'profit':
      if (m.roa == null) return null
      return m.roa < 0 ? G.lines.loss(pct(Math.abs(m.roa))) : G.lines.roa(pct(m.roa), m.roe != null ? pct(m.roe) : '—', beats('roa'))
    case 'liquidity':
      if (m.lcr != null) return G.lines.lcr(pct(m.lcr))
      return m.liq != null ? G.lines.liq(pct(Math.min(m.liq, 5)), beats('liq')) : null
    case 'efficiency':
      return m.ci != null ? G.lines.ci(pct(m.ci), beats('ci')) : null
    case 'activity':
      return m.fin != null ? G.lines.fin(pct(m.fin), beats('fin')) : m.dg != null ? G.lines.dg(pct(m.dg)) : null
  }
}

export function ScoreCard({ s, financialsHref }: { s: BankScore; financialsHref: string | null }) {
  const { t } = useLocale()
  const G = t.banks.score
  return (
    <section className="id-print is-calm bs-card" aria-label={G.title}>
      <header className="bs-head">
        <div>
          <h2 className="id-h3">{G.title}</h2>
          <p className="id-cap">{G.basis(String(s.asOf.year), G.periods[s.asOf.period] ?? G.annual)}</p>
        </div>
        <GradeChip s={s} />
      </header>
      <ul className="bs-pillars">
        {PILLARS.map((p) => {
          const v = s.pillars[p]
          const text = v != null ? line(p, s, G) : null
          return (
            <li key={p} className={v == null ? 'is-none' : undefined}>
              <span className="bs-p-name">{G.pillars[p]}</span>
              {v != null ? <><ScoreBar v={v} /><b className="id-num">{v}</b></> : <span className="id-cap">{G.noData}</span>}
              {text ? <p>{text}</p> : null}
            </li>
          )
        })}
      </ul>
      <p className="id-cap bs-foot">{G.disclaimer}{financialsHref ? <> · <a className="id-link" href={financialsHref}>{G.toStatements}</a></> : null}</p>
    </section>
  )
}

export type { BankScore, Grade }
