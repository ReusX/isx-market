'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { localeDate } from '@/lib/date'
import { SiteShell } from './SiteShell'
import { DoorRail } from './DoorRail'
import { PageTitle } from './PageTitle'
import { AboutSection } from './AboutSection'
import type { BankRatesInitial, RateRow } from '@/lib/banksServer'
import { isCurrentEnough } from '@/lib/banks'
import { describeCondition, money, basisLabel, factNote } from '@/lib/bankFacts'
import '@/styles/econ-page.css'
import '@/styles/banks-page.css'

/**
 * /banks/deposits · /banks/loans · on the approved board (board 2, page 6).
 *
 * The frame carries the best published rate for the chosen product type as
 * the figure with the swoosh (lowest for loans, highest for deposits), a
 * ladder of every published rate of that type, and a calculator as the key
 * card (monthly payment, or what a deposit earns). Below it, every product
 * is a rate card: the rate big, the bank, the product, its terms as chips;
 * the best one carries the tag. Products whose bank names them but publishes
 * no rate keep their cards at the bottom and say so.
 *
 * The rate logic is the profile's, unchanged: the `rate` fact is the
 * headline only while `isCurrentEnough`; older figures are shown with the
 * date that demoted them. A rate is not a price, so the chips stay neutral.
 * Filters live in the URL.
 */

type Filter = 'all' | 'conventional' | 'islamic'
const FILTERS: Filter[] = ['all', 'conventional', 'islamic']

const pct = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

function headlineOf(r: RateRow) {
  const f = r.facts.find((x) => x.field_key === 'rate')
  if (!f || f.state !== 'KNOWN' || f.value_num == null) return { rate: null as number | null, dated: null as string | null, fact: f ?? null }
  return isCurrentEnough(f) ? { rate: f.value_num, dated: null, fact: f } : { rate: null, dated: f.effective_date, fact: f }
}

/** Monthly payment on a reducing balance. */
function installment(principal: number, annualPct: number, months: number) {
  if (months <= 0) return 0
  const i = annualPct / 100 / 12
  if (i === 0) return principal / months
  return (principal * i) / (1 - Math.pow(1 + i, -months))
}

export function BankRatesPage({ family, initial }: { family: 'deposits' | 'loans'; initial: BankRatesInitial }) {
  const { t, locale, href: L } = useLocale()
  const B = t.banks
  const R = B.rates
  const F = R[family]
  const W = R.board
  const ar = locale === 'ar'
  const loans = family === 'loans'
  const dir = loans ? 1 : -1
  const kindName = (k: string) => (R.kinds as Record<string, string>)[k] ?? k

  const kinds = useMemo(() => Array.from(new Set(initial.rows.map((r) => r.kind))), [initial.rows])
  const [filter, setFilter] = useState<Filter>('all')
  const [kind, setKind] = useState<string>('all')

  /* Filters in the URL, read on mount and written on change, so a view is
     shareable. Static route: nothing here reaches the server. */
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const f = sp.get('filter') as Filter | null
    if (f && FILTERS.includes(f)) setFilter(f)
    const k = sp.get('kind')
    if (k && kinds.includes(k)) setKind(k)
  }, [kinds])
  useEffect(() => {
    const sp = new URLSearchParams()
    if (filter !== 'all') sp.set('filter', filter)
    if (kind !== 'all') sp.set('kind', kind)
    const qs = sp.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`)
  }, [filter, kind])

  const all = useMemo(() => initial.rows.map((r) => ({ r, h: headlineOf(r) })), [initial.rows])
  const ofKind = useMemo(() => all.filter(({ r }) => kind === 'all' || r.kind === kind), [all, kind])

  /* The frame follows the type chips only; the card filter below narrows the cards. */
  const ladder = useMemo(
    () => ofKind.filter((x) => x.h.rate != null).sort((a, b) => (a.h.rate! - b.h.rate!) * dir),
    [ofKind, dir],
  )
  const best = ladder[0] ?? null

  const cards = useMemo(() => {
    const list = ofKind.filter(({ r }) => (filter === 'all' ? true : r.financing_type === filter))
    const name = (r: RateRow) => (ar ? r.bankAr : r.bankEn)
    return [...list].sort((a, b) => {
      if (a.h.rate == null && b.h.rate == null) return name(a.r).localeCompare(name(b.r), ar ? 'ar' : 'en')
      if (a.h.rate == null) return 1
      if (b.h.rate == null) return -1
      return (a.h.rate - b.h.rate) * dir
    })
  }, [ofKind, filter, dir, ar])
  const rated = cards.filter((c) => c.h.rate != null)
  const unrated = cards.filter((c) => c.h.rate == null)

  /* Calculator: the three best distinct rates of the type are the rate chips. */
  const rateChips = useMemo(() => Array.from(new Set(ladder.map((x) => x.h.rate!))).slice(0, 3), [ladder])
  const [amount, setAmount] = useState(loans ? '10000000' : '25000000')
  const [rate, setRate] = useState<number | null>(null)
  const [months, setMonths] = useState<number>(loans ? 36 : 12)
  const useRate = rate != null && rateChips.includes(rate) ? rate : (rateChips[0] ?? 0)
  const principal = parseFloat(amount.replace(/,/g, '')) || 0
  const monthly = installment(principal, useRate, months)
  const earned = principal * (useRate / 100) * (months / 12)
  const termChips = loans ? [12, 36, 60, 120] : [6, 12, 24, 36]
  const termLabel = (m: number) => (m % 12 === 0 ? W.yearsN(m / 12) : W.monthsN(m))

  const term = (r: RateRow) => {
    const m = r.term_months ?? r.max_term_months
    if (!m) return null
    const s = m % 12 === 0 && m >= 12 ? B.years(String(m / 12)) : B.months(String(m))
    return r.term_months ? s : R.upTo(s)
  }
  const amountText = (r: RateRow) => {
    const unit = r.currency === 'USD' ? 'usd' : 'iqd'
    /* Each figure in its own LTR isolate (U+2066…U+2069) so «من 120.0M»
       keeps the Arabic word and the number in their places. */
    const iso = (v: number) => `\u2066${money(v, unit)}\u2069`
    if (r.min_amount != null && r.max_amount != null) return R.fromTo(iso(r.min_amount), iso(r.max_amount))
    if (r.max_amount != null) return R.upTo(iso(r.max_amount))
    if (r.min_amount != null) return R.from(iso(r.min_amount))
    return null
  }
  const ladderMax = ladder.reduce((m, x) => Math.max(m, x.h.rate!), 0) || 1

  const card = ({ r, h }: { r: RateRow; h: ReturnType<typeof headlineOf> }) => {
    const isBest = best != null && h.rate != null && h.rate === best.h.rate
    const basisFact = r.facts.find((x) => x.field_key === 'rate_basis')
    const basis = basisFact?.state === 'KNOWN' && basisFact.value_text ? (basisLabel(basisFact.value_text, B) ?? basisFact.value_text) : null
    const scenario = h.fact ? r.conditions.filter((x) => x.fact_id === h.fact!.id).map((x) => describeCondition(x, B)) : []
    const tm = term(r)
    const am = amountText(r)
    return (
      <li key={r.id} className={`id-print is-calm br-card${isBest ? ' is-best' : ''}${h.rate == null ? ' is-unrated' : ''}`}>
        {isBest ? <span className="br-tag">{loans ? W.bestTag : W.bestTagDep}</span> : null}
        {h.rate != null ? (
          <p className="br-rate id-num"><bdi>{pct.format(h.rate)}%</bdi></p>
        ) : (
          <p className="br-rate-none">{h.dated ? R.dated(localeDate(h.dated, locale)) : h.fact?.state === 'NOT_APPLICABLE' ? (factNote(h.fact, locale) ?? B.notApplicable) : R.noRate}</p>
        )}
        <Link href={L(`/banks/${r.bank_slug}`)} className="br-bank">{ar ? r.bankAr : r.bankEn}</Link>
        <p className="br-product">{ar ? r.name_ar : r.name_en}</p>
        {h.rate == null && h.fact?.state !== 'NOT_APPLICABLE' && factNote(h.fact ?? undefined, locale) ? <p className="br-basis">{factNote(h.fact ?? undefined, locale)}</p> : null}
        {basis || scenario.length ? <p className="br-basis">{[basis, ...scenario].filter(Boolean).join(' · ')}</p> : null}
        <div className="br-meta">
          <span>{kindName(r.kind)}{r.currency !== 'IQD' ? ` · ${r.currency}` : ''}</span>
          {tm ? <span>{tm}</span> : null}
          {am ? <span className="id-num">{am}</span> : null}
          {r.financing_type === 'islamic' ? <span>{W.islamic}</span> : null}
        </div>
        {r.last_verified ? <p className="br-when">{W.verified(localeDate(r.last_verified, locale))}</p> : null}
      </li>
    )
  }

  return (
    <SiteShell>
      <main className="bnk id-full iq-door" data-world="tile" data-level="accent">
        <DoorRail door="banking" />
        <div className="bnk-body">
          <p className="id-eyebrow fx-crumb"><Link href={L('/banks')}>{B.hub.eyebrow}</Link> · <Link href={L('/banks')}>{B.profile.back}</Link></p>

          <div className="fx-frame">
            <div className="fx-board">
              <div className="fx-lead">
                <header className="fx-head">
                  <PageTitle title={F.title} note={F.note} className="fx-title" />
                </header>
                {best ? (
                  <>
                    <p className="fx-huge id-num">
                      <span className="fx-huge-num">
                        <bdi>{pct.format(best.h.rate!)}%</bdi>
                        <svg className="fx-swoosh" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
                          <path d="M4 30 C 50 10, 110 4, 196 20" pathLength={1} fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                        </svg>
                      </span>
                    </p>
                    <p className="fx-line">
                      <span className="id-chg is-flat">{loans ? W.lowest : W.highest}</span>
                      <span>{ar ? best.r.bankAr : best.r.bankEn} · {ar ? best.r.name_ar : best.r.name_en}</span>
                    </p>
                  </>
                ) : <p className="br-none">{W.none}</p>}
                {kinds.length > 1 ? (
                  <div className="fx-quick" role="group" aria-label={W.kindGroup}>
                    <button type="button" className="fx-qbtn" aria-pressed={kind === 'all'} onClick={() => setKind('all')}>{R.filters.all}</button>
                    {kinds.map((k) => (
                      <button key={k} type="button" className="fx-qbtn" aria-pressed={kind === k} onClick={() => setKind(k)}>{kindName(k)}</button>
                    ))}
                  </div>
                ) : null}
                {ladder.length > 1 ? (
                  <figure className="fx-ladder">
                    <figcaption>{loans ? W.ladder : W.ladderDep}</figcaption>
                    <ol>
                      {ladder.slice(0, 6).map(({ r, h }, i) => (
                        <li key={r.id}>
                          <span>{ar ? r.bankAr : r.bankEn}</span>
                          <i className={i === 0 ? 'is-best' : undefined} style={{ width: `${Math.max(4, (h.rate! / ladderMax) * 100)}%` }} />
                          <b className="id-num"><bdi>{pct.format(h.rate!)}%</bdi></b>
                        </li>
                      ))}
                    </ol>
                  </figure>
                ) : null}
              </div>

              <section className="id-print is-key fx-calc" aria-label={loans ? W.calcLoan : W.calcDep}>
                <h2 className="fx-calc-title">{loans ? W.calcLoan : W.calcDep}</h2>
                <label className="fx-calc-in" htmlFor="br-amount">
                  <span>{W.amount}</span>
                  <input id="br-amount" className="id-num" inputMode="decimal" dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </label>
                {rateChips.length ? (
                  <div className="fx-quick" role="group" aria-label={W.rate}>
                    {rateChips.map((v) => <button key={v} type="button" className="fx-qbtn id-num" aria-pressed={useRate === v} onClick={() => setRate(v)}>{pct.format(v)}%</button>)}
                  </div>
                ) : null}
                <div className="fx-quick" role="group" aria-label={W.term}>
                  {termChips.map((m) => <button key={m} type="button" className="fx-qbtn" aria-pressed={months === m} onClick={() => setMonths(m)}>{termLabel(m)}</button>)}
                </div>
                {loans ? (
                  <>
                    <p className="fx-calc-out id-num"><bdi>{nf0.format(monthly)}</bdi> <span>{W.perMonth}</span></p>
                    <p className="fx-calc-note">{W.totalCost(nf0.format(monthly * months))}</p>
                  </>
                ) : (
                  <p className="fx-calc-out id-num"><bdi>{nf0.format(earned)}</bdi> <span>{W.earned}</span></p>
                )}
                <p className="fx-calc-note">{loans ? W.loanNote : W.depNote}</p>
                <p className="fx-calc-prev"><Link href={L(loans ? '/banks/deposits' : '/banks/loans')}>{loans ? W.toDeposits : W.toLoans}</Link></p>
              </section>
            </div>
          </div>
          <div className="fx-captions">
            {initial.asOf ? <p className="id-cap">{R.asOf(localeDate(initial.asOf, locale))}</p> : null}
          </div>

          <div className="br-tools">
            <div className="fx-quick" role="group" aria-label={B.filterGroup}>
              {FILTERS.map((f) => (
                <button key={f} type="button" className="fx-qbtn" aria-pressed={filter === f} onClick={() => setFilter(f)}>{R.filters[f]}</button>
              ))}
            </div>
            <p className="id-cap">{R.shown(String(cards.length))}</p>
          </div>

          {!cards.length ? <p className="br-none">{F.empty}</p> : null}
          {rated.length ? <ul className="br-cards">{rated.map(card)}</ul> : null}
          {unrated.length ? (
            <section className="br-unrated" aria-label={W.unrated}>
              <h2 className="id-h3">{W.unrated}</h2>
              <ul className="br-cards">{unrated.map(card)}</ul>
            </section>
          ) : null}
          <p className="id-cap br-note">{W.disclaimer} {B.ed.ratesFoot}</p>

          <AboutSection title={R.about.title} body={R.about.body} />
        </div>
      </main>
    </SiteShell>
  )
}
