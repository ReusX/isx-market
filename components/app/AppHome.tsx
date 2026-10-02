'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { useApp } from '@/context/AppContext'
import { localeDate } from '@/lib/date'
import {
  CARD_NEEDS, INTERESTS, SETTINGS, defaultPrefs, readPrefs, interestDef,
  type AppPrefs, type CardId, type Interest,
} from '@/lib/appMode'
import { RailIcon } from '@/components/site/RailIcon'
import '@/styles/econ-page.css'
import '@/styles/app.css'

/**
 * /app · the app's home: the reader's cards, in the reader's order.
 *
 * Every card reads one of the public feeds (/data/*.json) the site already
 * publishes, so home is always the same numbers as the pages it links to.
 * Pull-to-refresh fires `iq:refresh`, which re-reads them.
 */
type Fx = { asOf: string; parallel: { buy: number; sell: number; stale: boolean }; official: { cbi: number } }
type FxHist = { parallel: { rows: { date: string; sell: number }[] } }
type Gold = { asOf: string; gramByCarat: { karat: number; iqd: number; mithqalIqd: number }[]; previous?: { date: string; gramByCarat: { karat: number; iqd: number; mithqalIqd: number }[] } | null }
type Idx = { sessions: { date: string; isx60: number; valueIqd: number; trades: number }[] }
type Quotes = { asOf: string; companies: { ticker: string; nameAr: string; nameEn: string; close: number; changePct: number | null; traded: boolean }[] }

const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const nf2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const nfQ = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

async function get<T>(url: string): Promise<T | null> {
  try { const r = await fetch(url, { cache: 'no-store' }); return r.ok ? ((await r.json()) as T) : null } catch { return null }
}

/** The day's move as the board's chip: percent only, up green and down red
 *  for every price (the dollar included, as on /fx). */
function Chip({ pct }: { pct: number | null | undefined }) {
  if (pct == null || !isFinite(pct)) return null
  const cls = Math.abs(pct) < 0.005 ? 'is-flat' : pct > 0 ? 'is-up' : 'is-down'
  return <span className={`id-chg ${cls}`}><bdi dir="ltr">{pct > 0 ? '+' : pct < 0 ? '−' : ''}{nf2.format(Math.abs(pct))}%</bdi></span>
}

export function AppHome() {
  const { t, locale, href: L } = useLocale()
  const H = t.app.home
  const { watchlist } = useApp()
  const [prefs, setPrefs] = useState<AppPrefs>(defaultPrefs(INTERESTS.map((i) => i.id)))
  const [fx, setFx] = useState<Fx | null>(null)
  const [fxPrev, setFxPrev] = useState<number | null>(null)
  const [gold, setGold] = useState<Gold | null>(null)
  const [idx, setIdx] = useState<Idx | null>(null)
  const [quotes, setQuotes] = useState<Quotes | null>(null)
  const [loaded, setLoaded] = useState(false)

  const has = (i: Interest) => prefs.interests.includes(i)

  const load = useCallback(async () => {
    const [a, h, g, x, q] = await Promise.all([
      get<Fx>('/data/fx.json'), get<FxHist>('/data/fx-history.json'), get<Gold>('/data/gold.json'),
      get<Idx>('/data/index.json'), get<Quotes>('/data/quotes.json'),
    ])
    setFx(a); setGold(g); setIdx(x); setQuotes(q)
    const rows = h?.parallel.rows ?? []
    const prev = rows.filter((r) => r.date < (a?.asOf ?? '')).pop()
    setFxPrev(prev?.sell ?? null)
    setLoaded(true)
  }, [])

  useEffect(() => {
    const p = readPrefs()
    if (p) setPrefs(p)
    load()
    const r = () => { load() }
    const pr = () => { const n = readPrefs(); if (n) setPrefs(n) }
    window.addEventListener('iq:refresh', r)
    window.addEventListener('iq:prefs', pr)
    return () => { window.removeEventListener('iq:refresh', r); window.removeEventListener('iq:prefs', pr) }
  }, [load])

  const cards = prefs.cards.filter((c) => c.on && CARD_NEEDS[c.id].some(has)).map((c) => c.id)
  const name = (c: { ticker: string; nameAr: string; nameEn: string }) => (locale === 'ar' ? c.nameAr || c.nameEn : c.nameEn || c.nameAr) || c.ticker
  const fail = <p className="id-cap">{loaded ? H.failed : H.loading}</p>

  /* Gold's day: today's 21-karat mithqal against the source's previous day. */
  const goldPct = (() => {
    const now = gold?.gramByCarat.find((g) => g.karat === 21)?.iqd
    const was = gold?.previous?.gramByCarat.find((g) => g.karat === 21)?.iqd
    return now && was ? ((now - was) / was) * 100 : null
  })()

  /* «مانشيت اليوم»: one sentence from the day's numbers, like a front page. */
  const mast = (() => {
    const sell = fx?.parallel.sell
    const [s0, s1] = idx?.sessions ?? []
    const parts: string[] = []
    if (sell && fxPrev) {
      const d = Math.round((sell - fxPrev) * 100) / 100
      parts.push(d > 0 ? H.mast.fxUp(nfQ.format(d)) : d < 0 ? H.mast.fxDown(nfQ.format(-d)) : H.mast.fxFlat)
    }
    if (goldPct != null) parts.push(goldPct > 0.05 ? H.mast.goldUp : goldPct < -0.05 ? H.mast.goldDown : H.mast.goldFlat)
    if (s0 && s1) {
      const pc = ((s0.isx60 - s1.isx60) / s1.isx60) * 100
      parts.push(pc > 0.25 ? H.mast.mkUp : pc < -0.25 ? H.mast.mkDown : H.mast.mkFlat)
    }
    return parts.length ? `${parts.join(locale === 'ar' ? '، ' : ', ')}.` : null
  })()

  const render: Record<CardId, () => React.ReactNode> = {
    fx: () => {
      const sell = fx?.parallel.sell
      return (
        <Card key="fx" title={H.fx.title} href={L('/app/fx')} open={H.open} world="dinar">
          {sell ? (
            <>
              <p className="ap3-row"><span className="ap3-big id-num"><bdi>{nf0.format(sell * 100)}</bdi></span><Chip pct={fxPrev ? ((sell - fxPrev) / fxPrev) * 100 : null} /></p>
              <p className="ap3-unit">{H.fx.hundred('').trim()}{fxPrev ? ` · ${H.fx.vsYesterday}` : ''}</p>
              <dl className="ap3-stats id-num">
                <div><dt>{H.fx.buy}</dt><dd><bdi>{nfQ.format(fx!.parallel.buy)}</bdi></dd></div>
                <div><dt>{H.fx.sell}</dt><dd><bdi>{nfQ.format(sell)}</bdi></dd></div>
                <div><dt>{H.fx.official}</dt><dd><bdi>{nf0.format(fx!.official.cbi)}</bdi></dd></div>
              </dl>
              <p className="ap3-when">{H.asOf(localeDate(fx!.asOf, locale))}</p>
            </>
          ) : fail}
        </Card>
      )
    },
    gold: () => {
      const k21 = gold?.gramByCarat.find((g) => g.karat === 21)
      const k24 = gold?.gramByCarat.find((g) => g.karat === 24)
      const k18 = gold?.gramByCarat.find((g) => g.karat === 18)
      return (
        <Card key="gold" title={H.gold.title} href={L('/app/gold')} open={H.open} world="ochre">
          {k21 ? (
            <>
              <p className="ap3-row"><span className="ap3-big id-num"><bdi>{nf0.format(k21.mithqalIqd)}</bdi></span><Chip pct={goldPct} /></p>
              <p className="ap3-unit">{H.gold.dinar} · {H.gold.mithqal21}{goldPct != null ? ` · ${H.fx.vsYesterday}` : ''}</p>
              <dl className="ap3-stats id-num">
                {k18 ? <div><dt>{H.gold.mithqal18}</dt><dd><bdi>{nf0.format(k18.mithqalIqd)}</bdi></dd></div> : null}
                <div><dt>{H.gold.gram21}</dt><dd><bdi>{nf0.format(k21.iqd)}</bdi></dd></div>
                {k24 ? <div><dt>{H.gold.gram24}</dt><dd><bdi>{nf0.format(k24.iqd)}</bdi></dd></div> : null}
              </dl>
              <p className="ap3-when">{H.asOf(localeDate(gold!.asOf.replace(/\//g, '-'), locale))}</p>
            </>
          ) : fail}
        </Card>
      )
    },
    market: () => {
      const [s, p] = idx?.sessions ?? []
      return (
        <Card key="market" title={H.market.title} href={L('/app/market')} open={H.open} world="lapis">
          {s ? (
            <>
              <p className="ap3-row"><span className="ap3-big id-num"><bdi>{nf2.format(s.isx60)}</bdi></span><Chip pct={p ? ((s.isx60 - p.isx60) / p.isx60) * 100 : null} /></p>
              <p className="ap3-unit">{H.market.isx60}</p>
              <dl className="ap3-stats id-num">
                <div><dt>{H.market.value}</dt><dd><bdi dir="ltr">{nf2.format(s.valueIqd / 1e9)}</bdi> <small>{H.billionUnit}</small></dd></div>
                <div><dt>{H.market.trades}</dt><dd><bdi>{nf0.format(s.trades)}</bdi></dd></div>
              </dl>
              <p className="ap3-when">{H.asOf(localeDate(s.date, locale))}</p>
            </>
          ) : fail}
        </Card>
      )
    },
    watchlist: () => {
      const rows = watchlist.map((sym) => quotes?.companies.find((c) => c.ticker === sym)).filter(Boolean).slice(0, 8) as Quotes['companies']
      return (
        <Card key="watchlist" title={H.watchlist.title} href={L('/watchlist')} open={H.open} world="lapis" calm>
          {!watchlist.length ? (
            <p className="app-empty">{H.watchlist.empty} <Link href={L('/companies')}>{H.watchlist.add}</Link></p>
          ) : rows.length ? (
            <ul className="app-rows id-num">
              {rows.map((c) => (
                <li key={c.ticker}>
                  <Link href={L(`/c/${c.ticker}`)}>
                    <span className="app-row-name">{name(c)}<small>{c.ticker}</small></span>
                    <span className="app-row-val"><bdi>{nfQ.format(c.close)}</bdi><Chip pct={c.changePct} /></span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : fail}
        </Card>
      )
    },
    movers: () => {
      const traded = (quotes?.companies ?? []).filter((c) => c.traded && c.changePct != null)
      const up = [...traded].filter((c) => c.changePct! > 0).sort((a, b) => b.changePct! - a.changePct!).slice(0, 3)
      const down = [...traded].filter((c) => c.changePct! < 0).sort((a, b) => a.changePct! - b.changePct!).slice(0, 3)
      const list = (rows: typeof traded, h: string) => rows.length ? (
        <div className="app-movers-col">
          <h3 className="app-mini-h">{h}</h3>
          <ul className="app-rows id-num">
            {rows.map((c) => (
              <li key={c.ticker}>
                <Link href={L(`/c/${c.ticker}`)}>
                  <span className="app-row-name">{name(c)}<small>{c.ticker}</small></span>
                  <span className="app-row-val"><bdi>{nfQ.format(c.close)}</bdi><Chip pct={c.changePct} /></span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null
      return (
        <Card key="movers" title={H.movers.title} href={L('/app/market')} open={H.open} world="lapis" calm>
          {!quotes ? fail : up.length || down.length ? <>{list(up, H.movers.up)}{list(down, H.movers.down)}</> : <p className="app-empty">{H.movers.none}</p>}
        </Card>
      )
    },
    links: () => {
      const mine = INTERESTS.filter((i) => ['banks', 'economy', 'learn', 'news'].includes(i.id) && has(i.id))
      return (
        <section key="links" className="ap3-links-sec">
          <h2 className="ap3-sec-h">{H.links.title}</h2>
          <ul className="fx-quick ap3-links">
            {mine.map((i) => (
              <li key={i.id}>
                <Link href={L(interestDef(i.id).tab)} className="fx-qbtn">
                  <RailIcon name={i.id === 'economy' ? 'oil' : (i.id as 'banks' | 'learn' | 'news')} />
                  <span>{t.app.interests[i.id].name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )
    },
  }

  return (
    <main className="app-home ap3">
      <header className="ap3-head">
        <div className="ap3-top">
          <p className="ap3-date">{localeDate(new Date().toISOString().slice(0, 10), locale)}</p>
          <Link href={L(SETTINGS)} className="ap3-custom">{H.customise}</Link>
        </div>
        {mast ? <h1 className="ap3-mast" aria-label={H.mast.label}>{mast}</h1> : null}
      </header>
      {cards.map((c) => render[c]())}
    </main>
  )
}

/** One topic as a print card in its world's ink (board 1, «بطاقة رقم»). */
function Card({ title, href, open, world, calm, children }: {
  title: string; href: string; open: string; world: 'dinar' | 'ochre' | 'lapis' | 'tile'; calm?: boolean; children: React.ReactNode
}) {
  return (
    <section className={`id-print ap3-card ${calm ? 'is-calm' : ''}`.trim()} data-world={world}>
      <Link href={href} className="ap3-tag">
        <i aria-hidden="true" />
        <h2>{title}</h2>
        <span className="ap3-open">{open} ←</span>
      </Link>
      {children}
    </section>
  )
}
