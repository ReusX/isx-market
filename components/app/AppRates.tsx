'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { CURRENCY_FLAGS, type CurrencyCode } from '@/lib/currencies'
import { haptic } from '@/lib/appMode'
import { RateHero, Converter, Tiles, nf0, nfQ, fmtAny } from './RateKit'
import '@/styles/app.css'

/**
 * The app's own rate screens: /app/fx, /app/currencies and
 * /app/currencies/[code]. Same figures as the website's /fx and /currencies
 * pages (the routes read the same fetchers), none of the search copy.
 */
export interface FxScreenData {
  buy: number | null
  sell: number | null
  publishedAt: string | null
  date: string | null
  stale: boolean
  kifah: boolean
  official: number
  prev: number | null
  spark: number[]
}

export function AppFx({ d }: { d: FxScreenData }) {
  const { t } = useLocale()
  const R = t.app.rate
  const rate = d.sell ?? d.buy
  const gap = rate ? rate - d.official : null
  return (
    <main className="rk-screen">
      <RateHero
        label={R.dollar} flag="🇺🇸" value={rate} unit={R.perDollar}
        delta={rate && d.prev ? rate - d.prev : null} invert deltaLabel={R.vsYesterday}
        updatedAt={d.publishedAt ?? (d.date ? `${d.date}T12:00:00+03:00` : null)} stale={d.stale}
        source={d.kifah ? R.kifah : undefined} spark={d.spark} sparkLabel={R.days30}
        shareTitle={t.app.share.fxTitle}
        shareLines={rate ? t.app.share.fxLines(d.buy == null ? '—' : nfQ.format(d.buy), d.sell == null ? '—' : nfQ.format(d.sell), nf0.format(rate * 100)) : undefined}
      />
      <Converter market={rate} official={d.official} code="USD" name={R.dollar} flag="🇺🇸" quick={[100, 1000, 10000]} />
      <Tiles items={[
        { label: R.buy, value: d.buy == null ? '—' : nfQ.format(d.buy) },
        { label: R.sell, value: d.sell == null ? '—' : nfQ.format(d.sell) },
      ]} />
      <Tiles items={[
        { label: R.official, value: nf0.format(d.official), note: R.officialNote },
        { label: R.gap, value: gap == null ? '—' : `+${nf0.format(gap)} · ${((gap / d.official) * 100).toFixed(1)}%` },
      ]} />
    </main>
  )
}

export interface CurrencyRow { code: CurrencyCode; perUsd: number }
export interface CurrenciesScreenData { market: number | null; official: number; rows: CurrencyRow[]; updatedAt: string | null }

/** Most-asked first, in the order Iraqis ask for them; the rest alphabetically by name. */
export const POPULAR: CurrencyCode[] = ['EUR', 'TRY', 'IRR', 'SAR', 'AED', 'KWD', 'JOD', 'GBP', 'EGP', 'SYP']
/** Quoted per 1,000 units on the street (the rial per 100,000 toman). */
export const SMALL: CurrencyCode[] = ['LBP', 'KRW']

export function unitOf(code: CurrencyCode) {
  if (code === 'IRR') return { mult: 1_000_000, factor: 10, quick: [100_000, 500_000, 1_000_000] }
  if (SMALL.includes(code)) return { mult: 1000, factor: 1, quick: [1000, 10_000, 100_000] }
  return { mult: 1, factor: 1, quick: [100, 1000, 5000] }
}

export function AppCurrencies({ d }: { d: CurrenciesScreenData }) {
  const { t, href: L } = useLocale()
  const R = t.app.rate
  const names = t.rates.page.currencies.names as Record<string, string>
  const [q, setQ] = useState('')
  const norm = (s: string) => s.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
  const list = useMemo(() => {
    const k = norm(q.trim())
    const hit = (c: CurrencyCode) => !k || norm(names[c] ?? '').includes(k) || c.toLowerCase().includes(k)
    const pop = POPULAR.filter((c) => d.rows.some((r) => r.code === c) && hit(c))
    const rest = d.rows.map((r) => r.code).filter((c) => !POPULAR.includes(c) && hit(c)).sort((a, b) => (names[a] ?? a).localeCompare(names[b] ?? b, 'ar'))
    return { pop, rest, usd: !k || norm(R.dollar).includes(k) || 'usd'.includes(k) }
  }, [q, d.rows, names, R.dollar])
  const row = (c: CurrencyCode) => {
    const r = d.rows.find((x) => x.code === c)!
    const u = unitOf(c)
    const iqd = d.market ? (d.market / r.perUsd) * u.mult : null
    return (
      <li key={c}>
        <Link href={L(`/app/currencies/${c.toLowerCase()}`)} className="rk-row" onClick={haptic}>
          <span className="rk-row-flag" aria-hidden="true">{CURRENCY_FLAGS[c]}</span>
          <span className="rk-row-name"><b>{names[c] ?? c}</b><small>{c === 'IRR' ? R.toman : u.mult > 1 ? R.thousand(c) : c}</small></span>
          <span className="rk-row-val id-num"><bdi>{iqd == null ? '—' : fmtAny(iqd)}</bdi><small>{R.dinar}</small></span>
        </Link>
      </li>
    )
  }
  return (
    <main className="rk-screen">
      <div className="rk-search">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        <input id="rk-cur-search" type="search" placeholder={R.search} aria-label={R.search} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {list.usd ? (
        <ul className="rk-list">
          <li>
            <Link href={L('/app/fx')} className="rk-row is-lead" onClick={haptic}>
              <span className="rk-row-flag" aria-hidden="true">🇺🇸</span>
              <span className="rk-row-name"><b>{R.dollar}</b><small>{R.kifah}</small></span>
              <span className="rk-row-val id-num"><bdi>{d.market ? nf0.format(d.market) : '—'}</bdi><small>{R.dinar}</small></span>
            </Link>
          </li>
        </ul>
      ) : null}
      {list.pop.length ? <><h2 className="rk-h is-sub">{R.popular}</h2><ul className="rk-list">{list.pop.map(row)}</ul></> : null}
      {list.rest.length ? <><h2 className="rk-h is-sub">{R.others}</h2><ul className="rk-list">{list.rest.map(row)}</ul></> : null}
      {!list.usd && !list.pop.length && !list.rest.length ? <p className="rk-empty">{R.noMatch}</p> : null}
      <p className="rk-foot">{R.derived}</p>
    </main>
  )
}

export interface CurrencyScreenData {
  code: CurrencyCode
  perUsd: number | null
  market: number | null
  official: number
  prevMarket: number | null
  spark: number[]
  updatedAt: string | null
  stale: boolean
}

export function AppCurrency({ d }: { d: CurrencyScreenData }) {
  const { t } = useLocale()
  const R = t.app.rate
  const name = (t.rates.page.currencies.names as Record<string, string>)[d.code] ?? d.code
  const u = unitOf(d.code)
  const iqd = d.market && d.perUsd ? d.market / d.perUsd : null
  const iqdOff = d.perUsd ? d.official / d.perUsd : null
  const prev = d.prevMarket && d.perUsd ? d.prevMarket / d.perUsd : null
  const unitLabel = d.code === 'IRR' ? R.toman : u.mult > 1 ? R.thousand(name) : name
  return (
    <main className="rk-screen">
      <RateHero
        label={name} flag={CURRENCY_FLAGS[d.code]} value={iqd == null ? null : iqd * u.mult} unit={R.perUnit(unitLabel)}
        delta={iqd != null && prev != null ? (iqd - prev) * u.mult : null} invert deltaLabel={R.vsYesterday}
        updatedAt={d.updatedAt} stale={d.stale} spark={d.spark.map((v) => v * u.mult)} sparkLabel={R.days30}
        foot={d.perUsd ? R.oneUsd(`${fmtAny(d.code === 'IRR' ? d.perUsd / 10 : d.perUsd)} ${d.code === 'IRR' ? t.rates.page.currency.tomanUnit : d.code}`) : undefined}
      />
      <Converter
        market={iqd} official={iqdOff} code={d.code} name={d.code === 'IRR' ? t.rates.page.currency.tomanUnit : name}
        flag={CURRENCY_FLAGS[d.code]} quick={u.quick} factor={u.factor}
      />
      <Tiles items={[
        { label: R.market, value: iqd == null ? '—' : fmtAny(iqd * u.mult), note: R.perUnit(unitLabel) },
        { label: R.official, value: iqdOff == null ? '—' : fmtAny(iqdOff * u.mult), note: R.officialNote },
      ]} />
      <p className="rk-foot">{R.derived}</p>
    </main>
  )
}
