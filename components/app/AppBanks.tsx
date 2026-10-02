'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { haptic } from '@/lib/appMode'
import { nfQ } from './RateKit'
import type { Grade, Ungraded } from '@/lib/bankScore'
import '@/styles/econ-page.css'
import '@/styles/bank-score.css'
import '@/styles/app.css'

/**
 * /app/banks · the app's banks screen: the best published deposit rate up
 * top, the leaderboard under it, then every bank with a search and filters.
 * Each bank opens the website's profile, /banks/{slug}.
 */
export interface BankRow {
  slug: string; ar: string; en: string; logo: string | null
  type: string; ownership: string; status: string; usd: boolean; listed: boolean
  best: number | null
  /** The health score (lib/bankScore.ts) and, without one, why. */
  score: { score: number; grade: Grade } | null
  why: Ungraded | null
  reason: 'stale' | 'thin' | null
}
export interface DepositRow { slug: string; ar: string; en: string; logo: string | null; rate: number; rateTo: number | null; term: number | null; currency: string }
export interface BanksScreenData { banks: BankRow[]; deposits: DepositRow[] }

function BankLogo({ logo, name }: { logo: string | null; name: string }) {
  return logo
    // eslint-disable-next-line @next/next/no-img-element
    ? <img className="rk-logo" src={logo} alt="" loading="lazy" width={36} height={36} />
    : <span className="rk-logo is-text" aria-hidden="true">{name.replace(/^(\u0645\u0635\u0631\u0641|\u0628\u0646\u0643)\s+/, '').replace(/^\u0627\u0644/, '').slice(0, 2)}</span>
}

const pct = (v: number) => `${nfQ.format(v)}%`

/** The website's grade chip (components/site/BankScore), from the flat row. */
function Grade({ b }: { b: BankRow }) {
  const G = useLocale().t.banks.score
  if (b.score) return <span className={`bs-chip is-${b.score.grade}`}><b className="id-num">{b.score.score}</b><span>{G.grades[b.score.grade]}</span></span>
  if (b.why) return <span className="bs-chip is-none">{G.why[b.why]}</span>
  return b.reason ? <span className="bs-chip is-none">{b.reason === 'stale' ? G.stale : G.thin}</span> : null
}

export function AppBanks({ d }: { d: BanksScreenData }) {
  const { t, locale, href: L } = useLocale()
  const B = t.app.banks
  const [q, setQ] = useState('')
  const [f, setF] = useState<'all' | 'islamic' | 'state' | 'listed'>('all')
  const [sort, setSort] = useState<'rate' | 'score' | 'name'>('rate')
  const name = (x: { ar: string; en: string }) => (locale === 'ar' ? x.ar : x.en) || x.ar
  const top = d.deposits[0]
  const norm = (s: string) => s.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
  const rows = useMemo(() => {
    const k = norm(q.trim())
    return d.banks
      .filter((b) => f === 'all' || (f === 'islamic' ? b.type === 'islamic' : f === 'state' ? b.ownership === 'state' : b.listed))
      .filter((b) => !k || norm(`${b.ar} ${b.en}`).includes(k))
      .sort((a, b) => (sort === 'rate' ? (b.best ?? -1) - (a.best ?? -1) : sort === 'score' ? (b.score?.score ?? -1) - (a.score?.score ?? -1) : 0) || name(a).localeCompare(name(b), locale))
  }, [q, f, sort, d.banks, locale]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="rk-screen" data-world="tile">
      {top ? (
        <Link href={L(`/banks/${top.slug}`)} className="rk-hero rk3-hero rk3-hero-link" onClick={haptic}>
          <div className="rk3-tag">
            <i aria-hidden="true" />
            <span className="rk3-label">{B.best}</span>
            <span className="rk3-src">{name(top)}</span>
          </div>
          <p className="rk3-num id-num">
            <span className="rk3-num-in">
              <bdi>{pct(top.rate)}</bdi>
              <svg className="rk3-swoosh" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
                <path d="M4 30 C 50 10, 110 4, 196 20" fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              </svg>
            </span>
          </p>
          <p className="rk3-line">{B.bestNote(top.term ? B.months(top.term) : B.anyTerm, B.cur[top.currency] ?? top.currency)}</p>
        </Link>
      ) : null}

      {d.deposits.length > 1 ? (
        <>
          <h2 className="rk-h is-sub">{B.topRates}</h2>
          <ul className="rk-list rk3-list">
            {d.deposits.slice(0, 6).map((x, i) => (
              <li key={`${x.slug}-${i}`}>
                <Link href={L(`/banks/${x.slug}`)} className="rk-row" onClick={haptic}>
                  <BankLogo logo={x.logo} name={x.ar} />
                  <span className="rk-row-name"><b>{name(x)}</b><small>{x.term ? B.months(x.term) : B.anyTerm} · {B.cur[x.currency] ?? x.currency}</small></span>
                  <span className="rk-row-val id-num"><bdi className="rk-rate">{pct(x.rate)}</bdi>{x.rateTo ? <small><bdi>{B.upTo(pct(x.rateTo))}</bdi></small> : null}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <h2 className="rk-h is-sub">{B.all}</h2>
      <div className="rk-search">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        <input id="rk-bank-search" type="search" placeholder={B.search} aria-label={B.search} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="app-chips is-inline" role="group" aria-label={B.all}>
        {(['all', 'islamic', 'state', 'listed'] as const).map((x) => (
          <button key={x} type="button" className="app-chip" aria-pressed={f === x} aria-current={f === x ? 'page' : undefined} onClick={() => { haptic(); setF(x) }}>{B.filters[x]}</button>
        ))}
      </div>
      <div className="rk-seg is-3" role="group">
        {(['rate', 'score', 'name'] as const).map((k) => (
          <button key={k} type="button" aria-pressed={sort === k} onClick={() => { haptic(); setSort(k) }}>{B[k === 'rate' ? 'sortRate' : k === 'score' ? 'sortScore' : 'sortName']}</button>
        ))}
      </div>
      {rows.length ? (
        <ul className="rk-list rk3-list rk3-banks">
          {rows.map((b) => (
            <li key={b.slug}>
              <Link href={L(`/banks/${b.slug}`)} className="rk-row" onClick={haptic}>
                <BankLogo logo={b.logo} name={b.ar} />
                <span className="rk-row-name">
                  <b>{name(b)}</b>
                  <small>
                    {B.type[b.type] ?? b.type}{b.ownership === 'state' ? ` · ${B.state}` : ''}
                    {b.status === 'guardianship' && b.why !== 'guardianship' ? <span className="rk-badge is-warn">{B.guardianship}</span> : null}
                    {b.status === 'liquidation' && b.why !== 'liquidation' ? <span className="rk-badge is-bad">{B.liquidation}</span> : null}
                    {b.usd ? <span className="rk-badge is-warn">{B.usd}</span> : null}
                  </small>
                  <span className="rk3-grade"><Grade b={b} /></span>
                </span>
                {b.best != null ? <span className="rk-row-val id-num"><bdi className="rk-rate">{pct(b.best)}</bdi></span> : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : <p className="rk-empty">{B.noMatch}</p>}
      <p className="rk-foot">{B.note} {B.scoreNote}</p>
    </main>
  )
}
