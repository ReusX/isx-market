'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { useApp } from '@/context/AppContext'
import { street as S, type ShopId } from '@/lib/moneyStreetCopy'
import type { StreetData, StreetYear } from '@/lib/moneyStreet'
import { Shopfront, Lamp } from './StreetArt'
import '@/styles/money-street.css'

/**
 * «شارع المال» · /learn/invest. A walk past five shops with a million dinars.
 *
 * One piece of state drives the page: the year the reader «entered the
 * street». Each shop answers for that year from the data the route loaded
 * (lib/moneyStreet.ts), and the end of the street lines the four answers up.
 * The bank stop is left out of that comparison on purpose: we hold no deposit
 * rate history, and the page says so instead of guessing one.
 */
const MILLION = 1_000_000
const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const nf1 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })
const nf2 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

const SHOPS: ShopId[] = ['house', 'sarraf', 'gold', 'bank', 'bourse']
const U = S.units

function big(n: number): string {
  if (n >= 1e9) return `${nf1.format(n / 1e9)} ${U.billion}`
  if (n >= 1e6) return `${nf1.format(n / 1e6)} ${U.million}`
  return nf0.format(n)
}
const pct = (v: number) => `${nf0.format(Math.abs(v))}%`
function tiny(p: number): string {
  // 0.0000322% reads as a number; 3.2e-5% does not.
  const digits = Math.max(2, -Math.floor(Math.log10(p)) + 1)
  return `${p.toFixed(Math.min(digits, 10))}%`
}

type Outcome = { id: Exclude<ShopId, 'bank'>; value: number | null }

function outcomes(y: StreetYear | undefined, d: StreetData): Outcome[] {
  const { usdBuy, goldOunceUsd, isx60 } = d.now
  if (!y) return []
  const dollars = MILLION / y.usd
  return [
    { id: 'house', value: MILLION },
    { id: 'sarraf', value: usdBuy ? dollars * usdBuy : null },
    { id: 'gold', value: usdBuy && goldOunceUsd ? (dollars / y.goldUsd) * goldOunceUsd * usdBuy : null },
    { id: 'bourse', value: isx60 ? MILLION * (isx60 / y.isx60) : null },
  ]
}

function YearPicker({ years, value, onChange, id }: { years: number[]; value: number; onChange: (y: number) => void; id: string }) {
  return (
    <fieldset className="ms-years">
      <legend className="ms-years-q">{S.year.label}</legend>
      <div className="ms-years-row" role="radiogroup" aria-label={S.year.label}>
        {years.map((y) => (
          <label key={y} className={`ms-year ${y === value ? 'is-on' : ''}`}>
            <input type="radio" name={id} value={y} checked={y === value} onChange={() => onChange(y)} />
            <span className="id-num">{y}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function Stop({ id, children, live, index }: { id: ShopId; children: React.ReactNode; live?: { buy?: string; sell?: string; ticker?: string }; index: number }) {
  const T = S.shops[id]
  return (
    <section id={`ms-${id}`} className={`ms-stop is-${id}`} aria-labelledby={`ms-${id}-h`}>
      <div className="ms-stop-art">
        <Lamp />
        <Shopfront shop={id} sign={T.sign} live={live} />
      </div>
      <div className="ms-stop-card">
        <p className="ms-stop-n"><span className="id-num">{index}</span>{T.name}</p>
        <h2 id={`ms-${id}-h`} className="ms-stop-h">{T.title}</h2>
        {children}
      </div>
    </section>
  )
}

function Since({ children, tone }: { children: React.ReactNode; tone?: 'up' | 'down' }) {
  return <p className={`ms-since ${tone ? `is-${tone}` : ''}`}>{children}</p>
}

export function MoneyStreet({ data }: { data: StreetData }) {
  const { href: L } = useLocale()
  const { user } = useApp()
  const years = data.years.map((y) => y.year)
  const [year, setYear] = useState(years.includes(2020) ? 2020 : years[0])
  const Y = data.years.find((y) => y.year === year)
  const out = useMemo(() => outcomes(Y, data), [Y, data])
  const val = (id: Outcome['id']) => out.find((o) => o.id === id)?.value ?? null
  const n = data.now

  const [rate, setRate] = useState(() => data.deposits[0]?.rate ?? 5)
  const [term, setTerm] = useState(3)
  const deposit = MILLION * Math.pow(1 + rate / 100, term)

  const share = data.share
  const shareN = share?.price ? Math.floor(MILLION / share.price) : null
  const max = Math.max(MILLION, ...out.map((o) => o.value ?? 0))
  const ranked = [...out].sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
  const asOf = Array.from(new Set([n.usdDate, n.goldDate, n.isx60Date]
    .filter((d): d is string => Boolean(d)).map((d) => d.slice(0, 10).replace(/\//g, '-')))).sort().reverse()[0] ?? null

  return (
    <main className="ms">
      {/* ── The street sign ─────────────────────────────────────────── */}
      <header className="ms-hero">
        <div className="ms-hero-txt">
          <p className="ms-eyebrow">{S.hero.eyebrow}</p>
          <h1 className="ms-title">{S.hero.title}</h1>
          <p className="ms-lead">{S.hero.lead}</p>
          <div className="ms-hero-acts">
            <span className="ms-wallet">
              <span className="ms-wallet-k">{S.hero.wallet}</span>
              <b className="id-num">{nf0.format(MILLION)}</b> {S.hero.dinar}
            </span>
            <a className="id-btn is-primary" href="#ms-house">{S.hero.start}</a>
            <span className="ms-mins">{S.hero.minutes}</span>
          </div>
        </div>
        <nav className="ms-panorama" aria-label={S.hero.mapLabel}>
          {SHOPS.map((id) => (
            <a key={id} href={`#ms-${id}`} className={`ms-pano is-${id}`}>
              <Shopfront shop={id} sign={S.shops[id].sign} live={id === 'sarraf' ? { buy: n.usdBuy ? nf0.format(n.usdBuy) : undefined, sell: n.usdSell ? nf0.format(n.usdSell) : undefined } : undefined} />
              <span>{S.shops[id].name}</span>
            </a>
          ))}
        </nav>
      </header>

      <div className="ms-yearbar">
        <YearPicker years={years} value={year} onChange={setYear} id="ms-year-top" />
        <p className="ms-years-hint">{S.year.hint}</p>
      </div>

      <div className="ms-street">
        {/* ── 1 · The house ─────────────────────────────────────────── */}
        <Stop id="house" index={1}>
          <p className="ms-p">{S.shops.house.body}</p>
          {Y && n.usdSell ? (
            <div className="ms-pair">
              <div className="ms-fig"><small>{year}</small><b className="id-num">${nf0.format(MILLION / Y.usd)}</b></div>
              <div className="ms-arrow" aria-hidden="true">←</div>
              <div className="ms-fig is-down"><small>{S.end.today}</small><b className="id-num">${nf0.format(MILLION / n.usdSell)}</b></div>
            </div>
          ) : null}
          {Y && n.usdSell ? (
            <Since tone="down">
              {S.shops.house.then(year, nf0.format(MILLION / Y.usd))} {S.shops.house.now(nf0.format(MILLION / n.usdSell))}{' '}
              {MILLION / n.usdSell < MILLION / Y.usd ? S.shops.house.lost(pct((1 - Y.usd / n.usdSell) * 100)) : null}
            </Since>
          ) : null}
          <p className="ms-lesson">{S.shops.house.lesson}</p>
          <p className="ms-aside">{S.shops.house.history}</p>
        </Stop>

        {/* ── 2 · The money changer ─────────────────────────────────── */}
        <Stop id="sarraf" index={2} live={{ buy: n.usdBuy ? nf0.format(n.usdBuy) : undefined, sell: n.usdSell ? nf0.format(n.usdSell) : undefined }}>
          <p className="ms-p">{S.shops.sarraf.body}</p>
          {n.usdBuy && n.usdSell ? (
            <div className="ms-board">
              <div><small>{S.shops.sarraf.buys}</small><b className="id-num is-up">{nf0.format(n.usdBuy)}</b></div>
              <div><small>{S.shops.sarraf.sells}</small><b className="id-num is-down">{nf0.format(n.usdSell)}</b></div>
              <p className="ms-board-per">{S.shops.sarraf.per}</p>
            </div>
          ) : null}
          {n.usdBuy && n.usdSell ? <p className="ms-p">{S.shops.sarraf.spread(nf0.format((n.usdSell - n.usdBuy) * 100))}</p> : null}
          {n.usdOfficial ? <p className="ms-aside">{S.shops.sarraf.official(nf0.format(n.usdOfficial))}</p> : null}
          {Y && val('sarraf') ? (
            <Since tone={(val('sarraf') ?? 0) >= MILLION ? 'up' : 'down'}>
              {S.shops.sarraf.since(year, nf0.format(Y.usd), nf0.format(n.usdBuy!), nf0.format(val('sarraf')!))}
            </Since>
          ) : null}
          <p className="ms-lesson">{S.shops.sarraf.lesson}</p>
          <Link className="ms-link" href={L('/fx')}>{S.shops.sarraf.cta} ←</Link>
        </Stop>

        {/* ── 3 · The goldsmith ─────────────────────────────────────── */}
        <Stop id="gold" index={3}>
          <p className="ms-p">{S.shops.gold.body}</p>
          <ul className="ms-karats">
            {S.shops.gold.karats.map((k) => (
              <li key={k.k}>
                <span className="ms-karat-k"><b className="id-num">{k.k}</b> {S.shops.gold.karat}</span>
                <span className="ms-karat-bar"><i style={{ inlineSize: `${k.pct}%` }} /></span>
                <span className="ms-karat-v"><b className="id-num">{k.pct}%</b> {k.note}</span>
              </li>
            ))}
          </ul>
          {n.mithqal21 ? <p className="ms-price">{S.shops.gold.price(21, nf0.format(n.mithqal21))}</p> : null}
          <p className="ms-aside">{S.shops.gold.mithqal('4.608')} · {S.shops.gold.making}</p>
          {Y && val('gold') ? <Since tone={(val('gold') ?? 0) >= MILLION ? 'up' : 'down'}>{S.shops.gold.since(year, nf0.format(val('gold')!))}</Since> : null}
          <p className="ms-lesson">{S.shops.gold.lesson}</p>
          <Link className="ms-link" href={L('/gold')}>{S.shops.gold.cta} ←</Link>
        </Stop>

        {/* ── 4 · The bank ──────────────────────────────────────────── */}
        <Stop id="bank" index={4}>
          <p className="ms-p">{S.shops.bank.body}</p>
          {data.deposits.length ? (
            <div className="ms-rates">
              <p className="ms-mini-h">{S.shops.bank.top}</p>
              <ol>
                {data.deposits.slice(0, 3).map((d, i) => (
                  <li key={`${d.slug}-${i}`}>
                    <button type="button" className={`ms-rate ${rate === d.rate ? 'is-on' : ''}`} onClick={() => setRate(d.rate)}>
                      <b className="id-num">{d.rate}%</b>
                      <span>{d.bank}{d.months ? ` · ${S.shops.bank.months(d.months)}` : ''}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
          <div className="ms-calc">
            <p className="ms-mini-h">{S.shops.bank.calc}</p>
            <label className="ms-calc-row">
              <span>{S.shops.bank.rate}</span>
              <input id="ms-rate" type="range" min={1} max={15} step={0.5} value={rate} onChange={(e) => setRate(Number(e.target.value))} />
              <b className="id-num">{rate}%</b>
            </label>
            <label className="ms-calc-row">
              <span>{S.shops.bank.years}</span>
              <input id="ms-term" type="range" min={1} max={10} step={1} value={term} onChange={(e) => setTerm(Number(e.target.value))} />
              <b className="id-num">{term}</b>
            </label>
            <p className="ms-since is-up">{S.shops.bank.result(term, nf0.format(deposit))}</p>
          </div>
          <p className="ms-lesson">{S.shops.bank.real}</p>
          <p className="ms-aside">{S.shops.bank.noHistory}</p>
          <Link className="ms-link" href={L('/banks/deposits')}>{S.shops.bank.cta} ←</Link>
        </Stop>

        {/* ── 5 · The exchange ──────────────────────────────────────── */}
        <Stop id="bourse" index={5} live={{ ticker: [n.isx60 ? `ISX60 ${nf1.format(n.isx60)}` : '', share?.price ? `TASC ${share.price}` : ''].filter(Boolean).join('   ·   ') }}>
          <p className="ms-p">{S.shops.bourse.body}</p>
          {share ? (
            <div className="ms-share">
              <p className="ms-p">{S.shops.bourse.example(share.nameAr, big(share.shares))}</p>
              {share.price && shareN ? (
                <>
                  <p className="ms-p">{S.shops.bourse.buys(nf2.format(share.price), nf0.format(shareN))}</p>
                  <div className="ms-slice" aria-hidden="true">
                    <span className="ms-slice-whole" />
                    <span className="ms-slice-you" />
                  </div>
                  <p className="ms-p">{S.shops.bourse.own(tiny((shareN / share.shares) * 100))}</p>
                </>
              ) : null}
            </div>
          ) : null}
          {n.isx60 ? <p className="ms-p">{S.shops.bourse.index(nf1.format(n.isx60))}</p> : null}
          {Y && val('bourse') ? <Since tone={(val('bourse') ?? 0) >= MILLION ? 'up' : 'down'}>{S.shops.bourse.since(year, nf0.format(val('bourse')!))}</Since> : null}
          <p className="ms-aside">{S.shops.bourse.dividends}</p>
          <p className="ms-lesson">{S.shops.bourse.lesson}</p>
          <p className="ms-p">{S.shops.bourse.how}</p>
          <div className="ms-links">
            <Link className="ms-link" href={L('/market')}>{S.shops.bourse.cta} ←</Link>
            <Link className="ms-link" href={L('/learn/trading-from-zero')}>{S.shops.bourse.guide} ←</Link>
          </div>
        </Stop>
      </div>

      {/* ── The end of the street ────────────────────────────────────── */}
      <section className="ms-end" aria-labelledby="ms-end-h">
        <p className="ms-eyebrow">{S.end.eyebrow}</p>
        <h2 id="ms-end-h" className="ms-end-h">{S.end.title}</h2>
        <YearPicker years={years} value={year} onChange={setYear} id="ms-year-end" />
        <p className="ms-p">{S.end.lead(year)}</p>
        <ol className="ms-race">
          {ranked.map((o) => (
            <li key={o.id} className={`is-${o.id}`}>
              <span className="ms-race-name">{S.end.rows[o.id]}{o.id === 'house' ? <small>{S.end.flat}</small> : null}</span>
              <span className="ms-race-track">
                <i className={o.id === 'house' ? 'is-flat' : (o.value ?? 0) >= MILLION ? 'is-up' : 'is-down'} style={{ inlineSize: `${Math.max(2, ((o.value ?? 0) / max) * 100)}%` }} />
                <em style={{ insetInlineStart: `${(MILLION / max) * 100}%` }} aria-hidden="true" />
              </span>
              <span className="ms-race-v id-num">{o.value ? nf0.format(o.value) : '—'}</span>
            </li>
          ))}
        </ol>
        <p className="ms-race-key"><em aria-hidden="true" /> {S.end.start}: {nf0.format(MILLION)} {U.iqd}</p>
        <p className="ms-aside">{S.end.note}</p>

        <h3 className="ms-ideas-h">{S.end.ideas}</h3>
        <ul className="ms-ideas">
          {S.end.idea.map((i, k) => (
            <li key={i.t}><span className="ms-idea-n id-num">{k + 1}</span><b>{i.t}</b><span>{i.b}</span></li>
          ))}
        </ul>
      </section>

      {/* ── The street goes on: the academy teaser ───────────────────── */}
      <section className="ms-next" aria-labelledby="ms-next-h">
        <div className="ms-next-txt">
          <p className="ms-eyebrow is-light">{S.next.eyebrow}</p>
          <h2 id="ms-next-h" className="ms-end-h">{S.next.title}</h2>
          <p className="ms-p">{S.next.body}</p>
          {user
            ? <p className="ms-next-ok">{S.next.signed}</p>
            : <Link className="id-btn is-primary ms-next-cta" href={L('/signup')}>{S.next.cta}</Link>}
          <p className="ms-aside">{S.next.meanwhile} <Link href={L('/learn/trading-from-zero')}>{S.shops.bourse.guide}</Link></p>
        </div>
        <ul className="ms-locked">
          {S.next.lessons.map((t) => (
            <li key={t}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
              <span>{t}</span>
              <small>{S.next.locked}</small>
            </li>
          ))}
        </ul>
      </section>

      <footer className="ms-foot">
        <p><b>{S.foot.disclaimer}</b></p>
        <p>{S.foot.sources}</p>
        {asOf ? <p>{S.foot.asOf(asOf)}</p> : null}
      </footer>
    </main>
  )
}
