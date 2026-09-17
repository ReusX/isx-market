'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { SiteShell } from './SiteShell'
import { DoorRail } from './DoorRail'
import { AboutSection } from './AboutSection'
import { PageTitle } from './PageTitle'
import type { HoldersInitial } from '@/lib/marketServer'
import { monthLabel } from '@/lib/statistics'
import '@/styles/statistics-page.css'
import '@/styles/ownership-page.css'

/**
 * /statistics/shareholders · كبار المساهمين — the largest disclosed stakes.
 *
 * ── One snapshot, not a union of months ───────────────────────────────────
 * The loader reads the latest period of `major_shareholders` and pages until
 * it is exhausted, so this is one filing. An earlier implementation took the
 * first thousand rows across every period and de-duplicated, which presented
 * seven months as a single snapshot.
 *
 * ── Three fields the source has and this page does not show ───────────────
 * `change_pct` and `prev_pct` — almost every value is zero or null, and a
 * default zero is indistinguishable from a real one, so there are no arrows
 * and no deltas. `nationality` — every disclosed stake in the period is
 * recorded as Iraqi, so a two-value filter would be a control with one
 * option; the fact is stated as a fact about the FILING instead.
 *
 * Holder names are never matched or translated. A shareholder is a person or
 * a legal entity and the filing's spelling is the only record of it there is,
 * so an English reader sees the Arabic name, exactly as filed.
 */
const SUB = [
  { key: 'overview', route: '/statistics' }, { key: 'flow', route: '/statistics/foreign-flow' },
  { key: 'ownership', route: '/statistics/ownership' }, { key: 'holders', route: '/statistics/shareholders' },
] as const

const int = new Intl.NumberFormat('en-US')
const PAGE = 60

export function ShareholdersPage({ initial }: { initial: HoldersInitial }) {
  const { t, locale, href: L } = useLocale()
  const P = t.ownership.page
  const H = t.ownership.holders
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(PAGE)

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return initial.rows
    return initial.rows.filter((r) => r.sym.toLowerCase().includes(needle)
      || r.company.toLowerCase().includes(needle)
      || r.holder.toLowerCase().includes(needle))
  }, [initial.rows, q])

  /* Rows arrive sorted by share, so the largest stake is the first one. */
  const top = initial.rows[0] ?? null
  const over50 = useMemo(() => initial.rows.filter((r) => r.pct > 50).length, [initial.rows])
  const month = monthLabel(initial.month, locale)

  return (
    <SiteShell>
      <main className="own id-full iq-door">
        <DoorRail door="markets" />
        <div className="own-body">
          <header className="stx-head">
            <p className="id-eyebrow">{P.eyebrow}</p>
            <PageTitle title={H.title} note={H.lede} />
            <nav className="id-pills stx-sub" aria-label={t.statistics.tabsLabel}>
              {SUB.map((s) => <Link key={s.key} href={L(s.route)} className="id-pill" aria-current={s.key === 'holders' ? 'page' : undefined}>{t.statistics.page.sub[s.key]}</Link>)}
            </nav>
          </header>

          {initial.failed || !initial.month ? (
            <p className="id-note">{P.empty}</p>
          ) : (
            <>
              <section className="id-panel own-lead" aria-label={H.headline}>
                <div className="own-lead-head">
                  <div><h2 className="id-h3">{H.headline}</h2><p className="id-cap">{P.filing(month)}</p></div>
                </div>
                <p className="own-big id-num">
                  <strong><bdi>{top ? `${top.pct.toFixed(2)}%` : '—'}</bdi></strong>
                  {top ? <span dir="auto"><bdi>{top.holder}</bdi> · {top.company}</span> : null}
                </p>
                <div className="own-figs id-num">
                  <div><small>{H.figures.stakes}</small><b>{int.format(initial.rows.length)}</b></div>
                  <div><small>{H.figures.companies}</small><b>{int.format(initial.companies)}</b></div>
                  <div><small>{H.figures.over50}</small><b>{int.format(over50)}</b></div>
                  <div><small>{H.figures.matched}</small><b>{int.format(initial.coverage.matched)}</b></div>
                </div>
              </section>

              <section className="id-panel own-panel" aria-label={H.tableTitle}>
                <div className="own-head">
                  <div>
                    <h2 className="id-h3">{H.tableTitle}</h2>
                    <p className="id-cap">{H.tableNote(int.format(rows.length))}</p>
                  </div>
                  <div className="own-search">
                    <label>
                      <span className="sr-only">{P.searchLabel}</span>
                      <input type="search" className="id-input" value={q} dir="auto" placeholder={H.search}
                        onChange={(e) => { setQ(e.target.value); setLimit(PAGE) }} />
                    </label>
                  </div>
                </div>

                {!initial.rows.length ? (
                  <div className="own-empty"><strong>{H.none}</strong></div>
                ) : !rows.length ? (
                  <div className="own-empty"><strong>{P.noMatch}</strong><span className="id-cap">{P.noMatchHint}</span></div>
                ) : (
                  <>
                    <div className="own-scroll id-table-scroll">
                      <table className="id-table own-table id-num">
                        <caption className="sr-only">{P.tableCaption}</caption>
                        <thead>
                          <tr>
                            <th scope="col">{H.cols.holder}</th>
                            <th scope="col">{H.cols.company}</th>
                            <th scope="col" className="is-end own-col-pct">{H.cols.pct}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Every matching row is rendered; the ones past the
                              cap are hidden by CSS so they stay in the HTML. */}
                          {rows.map((r, i) => (
                            <tr key={r.id} className={i >= limit ? 'is-over' : undefined}>
                              {/* The cell keeps the TABLE's direction so the column
                                  aligns with its own header in English; the bdi
                                  isolates the Arabic run inside it. `dir="auto"` on
                                  the cell would right-align every row of an LTR
                                  table. */}
                              <td className="own-holder"><bdi>{r.holder}</bdi></td>
                              <td>
                                <Link href={L(`/c/${r.sym}`)}>
                                  <span className="id-name" dir="auto">{r.company}</span>
                                  <span className="id-sub"><bdi>{r.sym}</bdi></span>
                                </Link>
                              </td>
                              <td className="is-end own-col-pct">
                                <div className="own-pct">
                                  <bdi>{r.pct.toFixed(2)}%</bdi>
                                  <span className="own-pct-track" aria-hidden="true"><i style={{ inlineSize: `${Math.max(0, Math.min(100, r.pct))}%` }} /></span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {rows.length > limit ? (
                      <div className="own-more">
                        <button type="button" className="id-btn is-sm" onClick={() => setLimit((n) => n + PAGE)}>{P.showMore(int.format(Math.min(PAGE, rows.length - limit)))}</button>
                      </div>
                    ) : null}
                  </>
                )}

                {initial.nationalities.length === 1 ? <p className="id-cap own-note">{H.nationality}</p> : null}
                {initial.coverage.matched < initial.coverage.sourceCompanies ? (
                  <p className="id-cap own-note">{P.coverage(int.format(initial.coverage.matched), int.format(initial.coverage.sourceCompanies))}</p>
                ) : null}
              </section>
            </>
          )}

          <AboutSection title={H.about.title} body={H.about.body} />
        </div>
      </main>
    </SiteShell>
  )
}
