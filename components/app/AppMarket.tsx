'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { useApp } from '@/context/AppContext'
import { localeDate } from '@/lib/date'
import { haptic } from '@/lib/appMode'
import { RateHero, Tiles, nf0, nf2, nfQ } from './RateKit'
import '@/styles/app.css'

/**
 * /app/market and /app/companies · the app's stock-market screens. Session
 * summary and movers first, every company one tap away; the company page
 * itself is the website's /c/{ticker}.
 */
export interface Quote {
  t: string; ar: string; en: string; sec: string | null; logo: string | null
  close: number | null; chg: number | null; traded: boolean; value: number
}
export interface Session { date: string; isx60: number; isx15: number | null; value: number; trades: number; traded: number; listed: number }
export interface MarketScreenData { sessions: Session[]; quotes: Quote[] }

export function Logo({ q }: { q: Pick<Quote, 't' | 'logo'> }) {
  return q.logo
    // eslint-disable-next-line @next/next/no-img-element
    ? <img className="rk-logo" src={q.logo} alt="" loading="lazy" width={36} height={36} />
    : <span className="rk-logo is-text" aria-hidden="true">{q.t.slice(0, 2)}</span>
}

function Chg({ v }: { v: number | null }) {
  if (v == null) return null
  return <bdi className={`rk-chg ${v > 0 ? 'is-up' : v < 0 ? 'is-down' : ''}`}>{v > 0 ? '+' : ''}{nf2.format(v)}%</bdi>
}

function QuoteRow({ q, right, extra }: { q: Quote; right?: React.ReactNode; extra?: React.ReactNode }) {
  const { locale, href: L, t } = useLocale()
  const name = (locale === 'ar' ? q.ar || q.en : q.en || q.ar) || q.t
  return (
    <li className={extra ? 'rk-li-x' : undefined}>
      <Link href={L(`/c/${q.t}`)} className="rk-row" onClick={haptic}>
        <Logo q={q} />
        <span className="rk-row-name"><b>{name}</b><small>{q.t}</small></span>
        <span className="rk-row-val id-num">
          <bdi>{q.close == null ? '—' : nfQ.format(q.close)}</bdi>
          {right ?? (q.traded ? <Chg v={q.chg} /> : <small>{t.app.market.notTraded}</small>)}
        </span>
      </Link>
      {extra}
    </li>
  )
}

export function AppMarket({ d }: { d: MarketScreenData }) {
  const { t, locale, href: L } = useLocale()
  const M = t.app.market
  const { watchlist } = useApp()
  const [tab, setTab] = useState<'gainers' | 'losers' | 'active'>('gainers')
  const [s, p] = d.sessions
  const traded = d.quotes.filter((q) => q.traded)
  const up = traded.filter((q) => (q.chg ?? 0) > 0).length
  const down = traded.filter((q) => (q.chg ?? 0) < 0).length
  const flat = traded.length - up - down
  const list = useMemo(() => {
    const withChg = traded.filter((q) => q.chg != null)
    if (tab === 'gainers') return withChg.filter((q) => q.chg! > 0).sort((a, b) => b.chg! - a.chg!).slice(0, 10)
    if (tab === 'losers') return withChg.filter((q) => q.chg! < 0).sort((a, b) => a.chg! - b.chg!).slice(0, 10)
    return [...traded].sort((a, b) => b.value - a.value).slice(0, 10)
  }, [tab, traded])
  const mine = watchlist.map((w) => d.quotes.find((q) => q.t === w)).filter(Boolean) as Quote[]

  return (
    <main className="rk-screen">
      <RateHero
        label={M.title} value={s?.isx60 ?? null} unit={s ? `${M.isx60} · ${M.session(localeDate(s.date, locale))}` : M.isx60}
        delta={s && p ? ((s.isx60 - p.isx60) / p.isx60) * 100 : null} deltaLabel={M.vsPrev}
        format={(v) => nf2.format(v)} deltaFormat={(v) => `${nf2.format(v)}%`}
        spark={[...d.sessions].reverse().map((x) => x.isx60)} sparkLabel={M.sessions30}
      />
      {s ? (
        <Tiles items={[
          { label: M.value, value: nf2.format(s.value / 1e9), note: M.billion },
          { label: M.trades, value: nf0.format(s.trades), note: M.of(nf0.format(s.traded), nf0.format(s.listed)) + ' · ' + M.traded },
        ]} />
      ) : null}
      {traded.length ? (
        <section className="rk-breadth" aria-label={`${up} ${M.up} · ${down} ${M.down}`}>
          <div className="rk-breadth-bar">
            <span className="is-up" style={{ flexGrow: up }} />
            <span className="is-flat" style={{ flexGrow: flat }} />
            <span className="is-down" style={{ flexGrow: down }} />
          </div>
          <p className="id-num"><span className="is-up">{up} {M.up}</span> · <span>{flat} {M.flat}</span> · <span className="is-down">{down} {M.down}</span></p>
        </section>
      ) : null}

      {mine.length ? (
        <>
          <div className="rk-h-row"><h2 className="rk-h is-sub">{M.watchlist}</h2><Link href={L('/watchlist')} className="rk-more">{M.seeAll}</Link></div>
          <ul className="rk-list">{mine.slice(0, 6).map((q) => <QuoteRow key={q.t} q={q} />)}</ul>
        </>
      ) : null}

      <div className="rk-seg is-3" role="tablist">
        {(['gainers', 'losers', 'active'] as const).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} aria-pressed={tab === k} onClick={() => { haptic(); setTab(k) }}>{M[k]}</button>
        ))}
      </div>
      {list.length ? (
        <ul className="rk-list">
          {list.map((q) => <QuoteRow key={q.t} q={q} right={tab === 'active' ? <small><bdi>{nf2.format(q.value / 1e6)}M</bdi></small> : undefined} />)}
        </ul>
      ) : <p className="rk-empty">{M.none}</p>}
      <Link href={L('/app/companies')} className="id-btn rk-wide" onClick={haptic}>{M.companies} · <bdi>{d.quotes.length}</bdi></Link>
    </main>
  )
}

export function AppCompanies({ d }: { d: MarketScreenData }) {
  const { t, locale } = useLocale()
  const M = t.app.market
  const { watchlist, toggleWatchlist } = useApp()
  const [q, setQ] = useState('')
  const [sec, setSec] = useState<string>('all')
  const [sort, setSort] = useState<'name' | 'value' | 'change'>('value')
  const secs = Array.from(new Set(d.quotes.map((x) => x.sec).filter(Boolean))) as string[]
  const norm = (s: string) => s.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
  const rows = useMemo(() => {
    const k = norm(q.trim())
    const out = d.quotes.filter((x) => (sec === 'all' || x.sec === sec) && (!k || norm(`${x.ar} ${x.en} ${x.t}`).includes(k)))
    const name = (x: Quote) => (locale === 'ar' ? x.ar || x.en : x.en || x.ar) || x.t
    if (sort === 'name') return out.sort((a, b) => name(a).localeCompare(name(b), locale))
    if (sort === 'change') return out.sort((a, b) => (b.chg ?? -999) - (a.chg ?? -999))
    return out.sort((a, b) => b.value - a.value || name(a).localeCompare(name(b), locale))
  }, [q, sec, sort, d.quotes, locale])

  return (
    <main className="rk-screen">
      <div className="rk-search">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        <input id="rk-co-search" type="search" placeholder={M.search} aria-label={M.search} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="app-chips is-inline" role="group" aria-label={M.companies}>
        {['all', ...secs].map((x) => (
          <button key={x} type="button" className="app-chip" aria-pressed={sec === x} aria-current={sec === x ? 'page' : undefined} onClick={() => { haptic(); setSec(x) }}>
            {x === 'all' ? M.all : M.sectors[x] ?? x}
          </button>
        ))}
      </div>
      <div className="rk-seg is-3" role="group">
        <button type="button" aria-pressed={sort === 'value'} onClick={() => setSort('value')}>{M.sortValue}</button>
        <button type="button" aria-pressed={sort === 'change'} onClick={() => setSort('change')}>{M.sortChange}</button>
        <button type="button" aria-pressed={sort === 'name'} onClick={() => setSort('name')}>{M.sortName}</button>
      </div>
      {rows.length ? (
        <ul className="rk-list">
          {rows.map((x) => {
            const on = watchlist.includes(x.t)
            return (
              <QuoteRow key={x.t} q={x} extra={
                <button type="button" className={`rk-star ${on ? 'is-on' : ''}`} aria-pressed={on} aria-label={on ? M.unwatch : M.watch} onClick={() => { haptic(); toggleWatchlist(x.t) }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg>
                </button>
              } />
            )
          })}
        </ul>
      ) : <p className="rk-empty">{M.noMatch}</p>}
    </main>
  )
}
