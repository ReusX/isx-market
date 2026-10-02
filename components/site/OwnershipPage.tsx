'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { SiteShell } from './SiteShell'
import { DoorRail } from './DoorRail'
import { AboutSection } from './AboutSection'
import { PageTitle } from './PageTitle'
import type { OwnershipInitial } from '@/lib/marketServer'
import { monthLabel } from '@/lib/statistics'
import '@/styles/statistics-page.css'
import '@/styles/ownership-page.css'
import '@/styles/markets.css'
import '@/styles/econ-page.css'
import '@/styles/company-page.css'

/**
 * /statistics/ownership · الملكية الأجنبية — who owns the deposited capital.
 *
 * One question, answered once at the top: how much of the market's deposited
 * capital sits in foreign names. Then the companies that carry that foreign
 * ownership, largest share first.
 *
 * ── What this page may and may not say ────────────────────────────────────
 * The Iraqi/foreign split is a DISCLOSED field, so the headline figure is
 * real. The market totals are summed over EVERY row of the filing, because a
 * sum needs no company name; the table shows only the companies whose record
 * could be proven against the register, and the coverage line says so — that
 * is product copy, not an apology. Nothing is guessed.
 *
 * The holder-change field is absent on purpose: almost every value in it is
 * zero or null, and a default zero cannot be told from a real one.
 */
const SUB = [
  { key: 'overview', route: '/statistics' }, { key: 'flow', route: '/statistics/foreign-flow' },
  { key: 'ownership', route: '/statistics/ownership' }, { key: 'holders', route: '/statistics/shareholders' },
] as const

const int = new Intl.NumberFormat('en-US')
const PAGE = 60

type Units = { tn: string; bn: string; mn: string; k: string }
function compact(v: number, u: Units): string {
  const a = Math.abs(v)
  if (!Number.isFinite(v)) return '—'
  if (a >= 1e12) return `${(a / 1e12).toFixed(a >= 1e13 ? 0 : 1)} ${u.tn}`
  if (a >= 1e9) return `${(a / 1e9).toFixed(a >= 1e10 ? 0 : 1)} ${u.bn}`
  if (a >= 1e6) return `${(a / 1e6).toFixed(a >= 1e7 ? 0 : 1)} ${u.mn}`
  if (a >= 1e3) return `${(a / 1e3).toFixed(0)} ${u.k}`
  return int.format(a)
}

export function OwnershipPage({ initial }: { initial: OwnershipInitial }) {
  const { t, locale, href: L } = useLocale()
  const P = t.ownership.page
  const O = t.ownership.own
  const u = t.site.units
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(PAGE)

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return initial.rows
    return initial.rows.filter((r) => r.sym.toLowerCase().includes(needle) || r.name.toLowerCase().includes(needle))
  }, [initial.rows, q])

  const m = initial.market
  const foreignPct = m.pct
  const iraqiPct = 100 - foreignPct
  const month = monthLabel(initial.month, locale)

  return (
    <SiteShell>
      <main className="own id-full iq-door" data-world="lapis" data-level="calm">
        <DoorRail door="markets" />
        <div className="own-body">
          <header className="stx-head">
            <p className="id-eyebrow">{P.eyebrow}</p>
            <PageTitle title={O.title} note={O.lede} />
            <nav className="fx-quick stx-sub" aria-label={t.statistics.tabsLabel}>
              {SUB.map((s) => <Link key={s.key} href={L(s.route)} className="fx-qbtn" aria-current={s.key === 'ownership' ? 'page' : undefined} aria-pressed={s.key === 'ownership'}>{t.statistics.page.sub[s.key]}</Link>)}
            </nav>
          </header>

          {initial.failed || !initial.month ? (
            <p className="id-note">{P.empty}</p>
          ) : (
            <>
              {/* Identity v3, as the other statistics tabs: the market's foreign
                  share as the figure, its split, the filing's figures as the
                  key card; the companies below as the board. */}
              <div className="fx-frame">
                <div className="fx-board">
                  <section className="fx-lead" aria-label={O.headline}>
                    <h2 className="fx-title own-h">{O.headline} · {P.filing(month)}</h2>
                    <p className="fx-huge id-num">
                      <span className="fx-huge-num"><bdi>{foreignPct.toFixed(2)}%</bdi>
                    <svg className="fx-swoosh" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M4 30 C 50 10, 110 4, 196 20" pathLength={1} fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                    </svg>
                      </span>
                    </p>
                    <p className="fx-line"><span>{O.foreignShare}</span></p>
                    <div className="own-split" aria-hidden="true">
                      <i className="is-iraqi" style={{ flexBasis: `${iraqiPct}%` }} />
                      <i className="is-foreign" style={{ flexBasis: `${foreignPct}%` }} />
                    </div>
                    <dl className="own-legend id-num">
                      <div className="is-iraqi"><dt><i />{O.iraqiShare}</dt><dd><bdi>{iraqiPct.toFixed(2)}%</bdi></dd></div>
                      <div className="is-foreign"><dt><i />{O.foreignShare}</dt><dd><bdi>{foreignPct.toFixed(2)}%</bdi></dd></div>
                    </dl>
                  </section>
                  <section className="id-print is-key fx-calc" aria-label={O.headline}>
                    <h2 className="fx-calc-title">{P.filing(month)}</h2>
                    <div className="cmp-mstats own-kfigs id-num">
                      <div><small>{O.figures.companies}</small><b>{int.format(m.companies)}</b></div>
                      <div><small>{O.figures.foreignShares}</small><b>{compact(m.foreign, u)}</b></div>
                      <div><small>{O.figures.holders}</small><b>{int.format(m.holders)}</b></div>
                      <div><small>{O.figures.matched}</small><b>{int.format(initial.coverage.matched)}</b></div>
                    </div>
                  </section>
                </div>
              </div>

              <section className="own-panel own-board" aria-label={O.tableTitle}>
                <div className="own-head">
                  <div>
                    <h2 className="id-h3">{O.tableTitle}</h2>
                    <p className="id-cap">{O.tableNote(int.format(rows.length))}</p>
                  </div>
                  <div className="own-search">
                    <label>
                      <span className="sr-only">{P.searchLabel}</span>
                      <input type="search" className="cur-search-in" value={q} dir="auto" placeholder={O.search}
                        onChange={(e) => { setQ(e.target.value); setLimit(PAGE) }} />
                    </label>
                  </div>
                </div>

                {!initial.rows.length ? (
                  <div className="own-empty"><strong>{O.none}</strong></div>
                ) : !rows.length ? (
                  <div className="own-empty"><strong>{P.noMatch}</strong><span className="id-cap">{P.noMatchHint}</span></div>
                ) : (
                  <>
                    <div className="own-scroll id-table-scroll">
                      <table className="mb-table own-table id-num">
                        <caption className="sr-only">{P.tableCaption}</caption>
                        <thead>
                          <tr>
                            <th scope="col">{O.cols.company}</th>
                            <th scope="col" className="is-end own-col-pct">{O.cols.pct}</th>
                            <th scope="col" className="is-end own-col-shares">{O.cols.shares}</th>
                            <th scope="col" className="is-end own-col-holders">{O.cols.holders}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Every matching row is rendered; the ones past the
                              cap are hidden by CSS so they stay in the HTML. */}
                          {rows.map((r, i) => (
                            <tr key={r.sym} className={i >= limit ? 'is-over' : undefined}>
                              <td>
                                <Link href={L(`/c/${r.sym}`)}>
                                  <span className="id-name" dir="auto">{r.name}</span>
                                  <span className="id-sub"><bdi>{r.sym}</bdi></span>
                                </Link>
                              </td>
                              <td className="is-end own-col-pct">
                                <div className="own-pct">
                                  <bdi>{r.pct.toFixed(2)}%</bdi>
                                  <span className="own-pct-track" aria-hidden="true"><i style={{ inlineSize: `${Math.max(0, Math.min(100, r.pct))}%` }} /></span>
                                </div>
                              </td>
                              <td className="is-end"><bdi>{compact(r.foreign, u)}</bdi></td>
                              <td className="is-end"><bdi>{r.holders == null ? '—' : int.format(r.holders)}</bdi></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {rows.length > limit ? (
                      <div className="own-more">
                        <button type="button" className="fx-qbtn" onClick={() => setLimit((n) => n + PAGE)}>{P.showMore(int.format(Math.min(PAGE, rows.length - limit)))}</button>
                      </div>
                    ) : null}
                  </>
                )}

                {initial.coverage.matched < initial.coverage.sourceCompanies ? (
                  <p className="id-cap own-note">{P.coverage(int.format(initial.coverage.matched), int.format(initial.coverage.sourceCompanies))}</p>
                ) : null}
              </section>
            </>
          )}

          <AboutSection title={O.about.title} body={O.about.body} />
        </div>
      </main>
    </SiteShell>
  )
}
