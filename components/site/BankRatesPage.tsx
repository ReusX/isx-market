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
import { describeCondition, money, basisLabel } from '@/lib/bankFacts'
import '@/styles/banks-page.css'

/**
 * /banks/deposits · /banks/loans — the published rates, compared.
 *
 * One table each: bank · product · the rate · its basis and the scenario
 * that makes it true · term · amount · date checked. Deposits sort highest
 * first, loans lowest first; a product with no published rate keeps its
 * row at the bottom and says so, because "this bank names the product and
 * publishes no number" is a fact a reader came for.
 *
 * The rate logic is the profile's, unchanged: the `rate` fact is the
 * headline only while `isCurrentEnough`; older figures are shown with the
 * date that demoted them. Filters live in the URL.
 */

type Filter = 'all' | 'conventional' | 'islamic' | 'rated'
const FILTERS: Filter[] = ['all', 'conventional', 'islamic', 'rated']

function headlineOf(r: RateRow) {
  const f = r.facts.find((x) => x.field_key === 'rate')
  if (!f || f.state !== 'KNOWN' || f.value_num == null) return { rate: null as number | null, dated: null as string | null, fact: f ?? null }
  return isCurrentEnough(f) ? { rate: f.value_num, dated: null, fact: f } : { rate: null, dated: f.effective_date, fact: f }
}

export function BankRatesPage({ family, initial }: { family: 'deposits' | 'loans'; initial: BankRatesInitial }) {
  const { t, locale, href: L } = useLocale()
  const B = t.banks
  const R = B.rates
  const F = R[family]
  const ar = locale === 'ar'
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

  const rows = useMemo(() => {
    const list = initial.rows.filter((r) => {
      if (kind !== 'all' && r.kind !== kind) return false
      if (filter === 'islamic') return r.financing_type === 'islamic'
      if (filter === 'conventional') return r.financing_type === 'conventional'
      if (filter === 'rated') return headlineOf(r).rate != null
      return true
    })
    const dir = family === 'deposits' ? -1 : 1
    return list.map((r) => ({ r, h: headlineOf(r) })).sort((a, b) => {
      if (a.h.rate == null && b.h.rate == null) return (ar ? a.r.bankAr : a.r.bankEn).localeCompare(ar ? b.r.bankAr : b.r.bankEn, ar ? 'ar' : 'en')
      if (a.h.rate == null) return 1
      if (b.h.rate == null) return -1
      return (a.h.rate - b.h.rate) * dir
    })
  }, [initial.rows, filter, kind, family, ar])

  const term = (r: RateRow) => {
    const m = r.term_months ?? r.max_term_months
    if (!m) return null
    const s = m % 12 === 0 && m >= 12 ? B.years(String(m / 12)) : B.months(String(m))
    return r.term_months ? s : R.upTo(s)
  }
  const amount = (r: RateRow) => {
    const unit = r.currency === 'USD' ? 'usd' : 'iqd'
    if (r.min_amount != null && r.max_amount != null) return R.fromTo(money(r.min_amount, unit), money(r.max_amount, unit))
    if (r.max_amount != null) return R.upTo(money(r.max_amount, unit))
    if (r.min_amount != null) return R.from(money(r.min_amount, unit))
    return null
  }

  return (
    <SiteShell>
      <main className="bnk id-full iq-door">
        <DoorRail door="banking" />
        <div className="bnk-body">
          <header className="bnk-head">
            <p className="id-eyebrow"><Link href={L('/banks')}>{B.hub.eyebrow}</Link> · <Link href={L('/banks')}>{B.profile.back}</Link></p>
            <PageTitle title={F.title} note={F.note} />
            {initial.asOf ? <p className="id-cap">{R.asOf(localeDate(initial.asOf, locale))}</p> : null}
          </header>

          <div className="bnk-tools">
            <div className="id-pills" role="group" aria-label={B.filterGroup}>
              {FILTERS.map((f) => (
                <button key={f} type="button" className="id-pill is-sm" aria-pressed={filter === f} onClick={() => setFilter(f)}>{R.filters[f]}</button>
              ))}
            </div>
            {kinds.length > 1 ? (
              <div className="id-pills bnk-sort" role="group">
                <button type="button" className="id-pill is-sm" aria-pressed={kind === 'all'} onClick={() => setKind('all')}>{R.filters.all}</button>
                {kinds.map((k) => (
                  <button key={k} type="button" className="id-pill is-sm" aria-pressed={kind === k} onClick={() => setKind(k)}>{(R.kinds as Record<string, string>)[k] ?? k}</button>
                ))}
              </div>
            ) : null}
          </div>
          <p className="id-cap bnk-shown">{R.shown(String(rows.length))}</p>

          <div className="id-table-scroll">
            <table className="id-table bnk-rates id-num">
              <thead>
                <tr>
                  <th scope="col">{R.cols.bank}</th>
                  <th scope="col">{R.cols.product}</th>
                  <th scope="col" className="is-end">{R.cols.rate}</th>
                  <th scope="col">{R.cols.basis}</th>
                  <th scope="col">{R.cols.term}</th>
                  <th scope="col">{R.cols.amount}</th>
                  <th scope="col" className="is-end">{R.cols.verified}</th>
                </tr>
              </thead>
              <tbody>
                {!rows.length ? <tr><td colSpan={7} className="bnk-empty">{F.empty}</td></tr> : rows.map(({ r, h }) => {
                  const basisFact = r.facts.find((x) => x.field_key === 'rate_basis')
                  const basis = basisFact?.state === 'KNOWN' && basisFact.value_text ? (basisLabel(basisFact.value_text, B) ?? basisFact.value_text) : null
                  const scenario = h.fact ? r.conditions.filter((x) => x.fact_id === h.fact!.id).map((x) => describeCondition(x, B)) : []
                  return (
                    <tr key={r.id}>
                      <td>
                        <Link href={L(`/banks/${r.bank_slug}`)} className="bnk-name"><span className="id-name">{ar ? r.bankAr : r.bankEn}</span></Link>
                        {r.financing_type === 'islamic' ? <span className="id-sub">{B.type.islamic}</span> : null}
                      </td>
                      <td>
                        <span>{ar ? r.name_ar : r.name_en}</span>
                        <span className="id-sub">{(R.kinds as Record<string, string>)[r.kind] ?? r.kind}{r.currency !== 'IQD' ? ` · ${r.currency}` : ''}</span>
                      </td>
                      <td className="is-end bnk-rate-cell">
                        {h.rate != null ? <b><bdi>{h.rate}%</bdi></b>
                          : h.dated ? <span className="id-cap">{R.dated(localeDate(h.dated, locale))}</span>
                            : <span className="id-cap">{R.noRate}</span>}
                      </td>
                      <td className="bnk-basis">
                        {basis ? <span>{basis}</span> : null}
                        {scenario.length ? <span className="id-sub">{scenario.join(' · ')}</span> : null}
                        {!basis && !scenario.length ? <span className="id-cap">—</span> : null}
                      </td>
                      <td>{term(r) ?? <span className="id-cap">—</span>}</td>
                      <td>{amount(r) ? <bdi>{amount(r)}</bdi> : <span className="id-cap">—</span>}</td>
                      <td className="is-end">{r.last_verified ? <span className="id-cap">{localeDate(r.last_verified, locale)}</span> : <span className="id-cap">—</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="id-cap">{B.ed.ratesFoot}</p>

          <AboutSection title={R.about.title} body={R.about.body} />
        </div>
      </main>
    </SiteShell>
  )
}
