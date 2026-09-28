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
type Gold = { asOf: string; gramByCarat: { karat: number; iqd: number; mithqalIqd: number }[]; ounce?: { sell?: { usd?: number } } }
type Idx = { sessions: { date: string; isx60: number; valueIqd: number; trades: number }[] }
type Quotes = { asOf: string; companies: { ticker: string; nameAr: string; nameEn: string; close: number; changePct: number | null; traded: boolean }[] }

const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const nf2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const nfQ = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

async function get<T>(url: string): Promise<T | null> {
  try { const r = await fetch(url, { cache: 'no-store' }); return r.ok ? ((await r.json()) as T) : null } catch { return null }
}

/** `invert` for the dollar: a rising dollar is a falling dinar, coloured as the /fx page does. */
function Delta({ v, pct, invert }: { v: number | null; pct?: boolean; invert?: boolean }) {
  if (v == null || !isFinite(v)) return null
  const good = invert ? v < 0 : v > 0
  const cls = v === 0 ? '' : good ? 'id-up' : 'id-down'
  return <bdi className={`app-delta ${cls}`}>{v > 0 ? '▲' : v < 0 ? '▼' : '•'} {pct ? `${nf2.format(Math.abs(v))}%` : nf0.format(Math.abs(v))}</bdi>
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

  const render: Record<CardId, () => React.ReactNode> = {
    fx: () => {
      const sell = fx?.parallel.sell
      return (
        <Card key="fx" title={H.fx.title} href={L('/app/fx')} open={H.open} icon="fx">
          {sell ? (
            <>
              <p className="app-big id-num"><bdi>{nf0.format(sell * 100)}</bdi> <Delta v={fxPrev ? (sell - fxPrev) * 100 : null} invert /></p>
              <p className="app-sub">{H.fx.hundred('').trim()}{fxPrev ? ` · ${H.fx.vsYesterday}` : ''}</p>
              <dl className="app-kv id-num">
                <div><dt>{H.fx.buy}</dt><dd><bdi>{nfQ.format(fx!.parallel.buy)}</bdi></dd></div>
                <div><dt>{H.fx.sell}</dt><dd><bdi>{nfQ.format(sell)}</bdi></dd></div>
                <div><dt>{H.fx.official}</dt><dd><bdi>{nf0.format(fx!.official.cbi)}</bdi></dd></div>
              </dl>
              <p className="id-cap">{H.asOf(localeDate(fx!.asOf, locale))}</p>
            </>
          ) : fail}
        </Card>
      )
    },
    gold: () => {
      const k21 = gold?.gramByCarat.find((g) => g.karat === 21)
      const k24 = gold?.gramByCarat.find((g) => g.karat === 24)
      return (
        <Card key="gold" title={H.gold.title} href={L('/app/gold')} open={H.open} icon="gold">
          {k21 ? (
            <>
              <p className="app-big id-num"><bdi>{nf0.format(k21.mithqalIqd)}</bdi></p>
              <p className="app-sub">{H.gold.mithqal21} · {H.gold.dinar}</p>
              <dl className="app-kv id-num">
                {k24 ? <div><dt>{H.gold.gram24}</dt><dd><bdi>{nf0.format(k24.iqd)}</bdi></dd></div> : null}
                {gold?.ounce?.sell?.usd ? <div><dt>{H.gold.ounce}</dt><dd><bdi>${nf0.format(gold.ounce.sell.usd)}</bdi></dd></div> : null}
              </dl>
            </>
          ) : fail}
        </Card>
      )
    },
    market: () => {
      const [s, p] = idx?.sessions ?? []
      return (
        <Card key="market" title={H.market.title} href={L('/market')} open={H.open} icon="market">
          {s ? (
            <>
              <p className="app-big id-num"><bdi>{nf2.format(s.isx60)}</bdi> <Delta v={p ? ((s.isx60 - p.isx60) / p.isx60) * 100 : null} pct /></p>
              <p className="app-sub">{H.market.isx60}</p>
              <dl className="app-kv id-num">
                <div><dt>{H.market.value}</dt><dd><bdi>{H.market.billion(nf2.format(s.valueIqd / 1e9))}</bdi></dd></div>
                <div><dt>{H.market.trades}</dt><dd><bdi>{nf0.format(s.trades)}</bdi></dd></div>
              </dl>
              <p className="id-cap">{H.asOf(localeDate(s.date, locale))}</p>
            </>
          ) : fail}
        </Card>
      )
    },
    watchlist: () => {
      const rows = watchlist.map((sym) => quotes?.companies.find((c) => c.ticker === sym)).filter(Boolean).slice(0, 8) as Quotes['companies']
      return (
        <Card key="watchlist" title={H.watchlist.title} href={L('/watchlist')} open={H.open} icon="watchlist">
          {!watchlist.length ? (
            <p className="app-empty">{H.watchlist.empty} <Link href={L('/companies')}>{H.watchlist.add}</Link></p>
          ) : rows.length ? (
            <ul className="app-rows id-num">
              {rows.map((c) => (
                <li key={c.ticker}>
                  <Link href={L(`/c/${c.ticker}`)}>
                    <span className="app-row-name">{name(c)}<small>{c.ticker}</small></span>
                    <span className="app-row-val"><bdi>{nfQ.format(c.close)}</bdi><Delta v={c.changePct} pct /></span>
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
                  <span className="app-row-val"><bdi>{nfQ.format(c.close)}</bdi><Delta v={c.changePct} pct /></span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null
      return (
        <Card key="movers" title={H.movers.title} href={L('/market')} open={H.open} icon="pulse">
          {!quotes ? fail : up.length || down.length ? <>{list(up, H.movers.up)}{list(down, H.movers.down)}</> : <p className="app-empty">{H.movers.none}</p>}
        </Card>
      )
    },
    links: () => {
      const mine = INTERESTS.filter((i) => ['banks', 'economy', 'learn', 'news'].includes(i.id) && has(i.id))
      return (
        <section key="links" className="app-card">
          <h2 className="app-card-h">{H.links.title}</h2>
          <ul className="app-links">
            {mine.map((i) => (
              <li key={i.id}>
                <Link href={L(interestDef(i.id).tab)}>
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
    <main className="app-home">
      <div className="app-home-head">
        <h1 className="app-home-h">{t.app.tabs.home}</h1>
        <Link href={L(SETTINGS)} className="id-btn is-sm">{H.customise}</Link>
      </div>
      {cards.map((c) => render[c]())}
    </main>
  )
}

function Card({ title, href, open, icon, children }: {
  title: string; href: string; open: string; icon: Parameters<typeof RailIcon>[0]['name']; children: React.ReactNode
}) {
  return (
    <section className="app-card">
      <Link href={href} className="app-card-head">
        <RailIcon name={icon} />
        <h2 className="app-card-h">{title}</h2>
        <span className="app-card-open">{open}</span>
      </Link>
      {children}
    </section>
  )
}
