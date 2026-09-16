'use client'

import Link from 'next/link'
import { Fragment, useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { SiteShell } from './SiteShell'
import { DoorRail } from './DoorRail'
import { PageTitle } from './PageTitle'
import { AboutSection } from './AboutSection'
import type { FinancialsInitial, FinancialsJson } from '@/lib/marketServer'
import {
  TEMPLATES, RATIOS, RATIO_GROUPS, pickUnit, fmtUnit, fmtRatio, unitLabel, stmtLabel,
  reportedUnitLabel, colLabel, colKey, type StatementId, type ColMeta, type PeriodMode,
} from '@/lib/financials'
import { sectorLabel } from '@/lib/screener'
import '@/styles/financials-page.css'

/**
 * /c/[sym]/financials · the statements.
 *
 * A filing is a table, so the page is tables: one per statement, a column
 * per filed period, a row per line as the template names it. Full width —
 * this is an information surface, and a balance sheet with six columns
 * does not fit a reading measure.
 *
 * Above the tables, the one figure a reader came for: the latest financial
 * year's revenue, net profit, assets and equity, each against the year
 * before — and a bar chart of the years, so the trend is visible before
 * the detail.
 *
 * ── Nothing here is computed from the filings ────────────────────────────
 * The lead's «vs previous year» compares two FILED annual numbers; it does
 * not sum quarters or split cumulative periods. See `lib/financials` for
 * the policy. The model itself is built on the server (`loadFinancials`);
 * this component fetches nothing.
 */
const RAIL = [
  { key: 'market', route: '/' }, { key: 'board', route: '/market' }, { key: 'companies', route: '/companies' },
  { key: 'screener', route: '/screener' }, { key: 'heatmap', route: '/heatmap' }, { key: 'statistics', route: '/statistics' }, { key: 'pulse', route: '/pulse' },
] as const

const STATEMENTS: StatementId[] = ['income', 'balance', 'cashflow']
const MAX_COLS = 8

const cell = (fin: FinancialsJson, s: StatementId, key: string, c: ColMeta) =>
  fin.facts[`${s}:${key}:${c.col.y}:${c.col.p}`]

export function FinancialsPage({ initial }: { initial: FinancialsInitial }) {
  const { t, locale, href: L } = useLocale()
  const C = t.company
  const F = C.fin
  const ar = locale === 'ar'
  const name = ar ? initial.ar : initial.en || initial.ar
  const fin = initial.fin
  const [mode, setMode] = useState<PeriodMode>('ANNUAL')

  const rail = <DoorRail door="markets" items={RAIL.map((r) => ({ label: t.market.page.rail[r.key], route: r.route }))} />

  /* The lead: latest annual column against the one before it. */
  const lead = useMemo(() => {
    if (!fin || fin.valuesWithheld || !fin.annualCols.length) return null
    const [cur, prev] = fin.annualCols
    const bank = fin.template === 'bank'
    const rows: { label: string; key: string; s: StatementId }[] = bank
      ? [{ label: F.financingIncome, key: 'financing_income', s: 'income' }, { label: C.netProfit, key: 'net_income', s: 'income' },
         { label: F.totalAssets, key: 'total_assets', s: 'balance' }, { label: F.totalEquity, key: 'total_equity', s: 'balance' }]
      : [{ label: C.revenue, key: 'revenue', s: 'income' }, { label: C.netProfit, key: 'net_income', s: 'income' },
         { label: F.totalAssets, key: 'total_assets', s: 'balance' }, { label: F.totalEquity, key: 'total_equity', s: 'balance' }]
    const items = rows.map((r) => {
      const v = cell(fin, r.s, r.key, cur)?.v ?? null
      const p = prev ? cell(fin, r.s, r.key, prev)?.v ?? null : null
      const chg = v != null && p != null && p !== 0 ? ((v - p) / Math.abs(p)) * 100 : null
      return { ...r, v, chg }
    }).filter((r) => r.v != null)
    const unit = pickUnit(items.map((r) => r.v as number))
    return { year: cur.col.y, items, unit }
  }, [fin, F, C])

  /* The trend: two lines by financial year, oldest first. */
  const trend = useMemo(() => {
    if (!fin || fin.valuesWithheld || fin.annualCols.length < 2) return null
    const bank = fin.template === 'bank'
    const topKey = bank ? 'financing_income' : 'revenue'
    const cols = fin.annualCols.slice().reverse()
    const pts = cols.map((c) => ({
      y: c.col.y,
      top: cell(fin, 'income', topKey, c)?.v ?? null,
      ni: cell(fin, 'income', 'net_income', c)?.v ?? null,
    })).filter((p) => p.top != null || p.ni != null)
    if (pts.length < 2) return null
    const vals = pts.flatMap((p) => [p.top, p.ni]).filter((v): v is number => v != null)
    const max = Math.max(1, ...vals.map(Math.abs))
    return { pts, max, unit: pickUnit(vals), topLabel: bank ? F.financingIncome : C.revenue }
  }, [fin, F, C])

  const cols = useMemo(() => {
    if (!fin) return []
    return (mode === 'ANNUAL' ? fin.annualCols : fin.quarterCols).slice(0, MAX_COLS)
  }, [fin, mode])

  if (!initial.found) {
    return (
      <SiteShell>
        <main className="fin id-full iq-door">{rail}<div className="fin-body"><p className="id-note">{C.page.notFound}</p></div></main>
      </SiteShell>
    )
  }

  const head = (
    <header className="fin-head">
      <p className="id-eyebrow"><Link href={L(`/c/${initial.sym}`)}>{name}</Link> · <bdi>{initial.sym}</bdi> · {sectorLabel(initial.sec, locale)}</p>
      <PageTitle title={F.title(name)} note={F.note} />
      {fin?.latest ? (
        <p className="fin-meta id-num">
          <span>{F.latestFiling}: <bdi>{colLabel(fin.latest.col, locale)}</bdi></span>
          {fin.latest.reportedUnit ? <span>{F.reportedUnit}: {reportedUnitLabel(fin.latest.reportedUnit, locale)}</span> : null}
          {fin.latest.pdfUrl ? <a className="id-link" href={fin.latest.pdfUrl} target="_blank" rel="noopener">{F.pdf} ↗</a> : null}
        </p>
      ) : null}
    </header>
  )

  if (!fin) {
    return (
      <SiteShell>
        <main className="fin id-full iq-door">{rail}<div className="fin-body">
          {head}
          <p className="id-note">{F.none(name)}</p>
          <p><Link className="id-btn is-sm" href={L(`/c/${initial.sym}`)}>{F.backToCompany}</Link></p>
          <AboutSection title={F.about.title} body={F.about.body} />
        </div></main>
      </SiteShell>
    )
  }

  const filings = [...fin.annualCols, ...fin.quarterCols]
    .sort((a, b) => b.col.y - a.col.y || (b.col.p === 'ANNUAL' ? 5 : Number(b.col.p[1])) - (a.col.p === 'ANNUAL' ? 5 : Number(a.col.p[1])))

  const sources = (
    <section className="id-panel fin-panel" aria-label={F.filings}>
      <h2 className="id-h3">{F.filings}</h2>
      <div className="id-table-scroll">
        <table className="id-table fin-src id-num">
          <thead><tr><th scope="col">{F.period}</th><th scope="col">{F.unitCol}</th><th scope="col" className="is-end">{F.pdf}</th></tr></thead>
          <tbody>
            {filings.map((c) => (
              <tr key={colKey(c.col)}>
                <td><bdi>{colLabel(c.col, locale)}</bdi></td>
                <td>{c.reportedUnit ? reportedUnitLabel(c.reportedUnit, locale) : '—'}</td>
                <td className="is-end">{c.pdfUrl ? <a className="id-link" href={c.pdfUrl} target="_blank" rel="noopener">{F.open} ↗</a> : <span className="id-cap">{F.noPdf}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )

  if (fin.valuesWithheld) {
    return (
      <SiteShell>
        <main className="fin id-full iq-door">{rail}<div className="fin-body">
          {head}
          <p className="id-note fin-withheld">{F.withheld(name)}</p>
          {sources}
          <AboutSection title={F.about.title} body={F.about.body} />
        </div></main>
      </SiteShell>
    )
  }

  const tpl = TEMPLATES[fin.template]
  const pct = (v: number | null) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1)}%`)
  const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })

  return (
    <SiteShell>
      <main className="fin id-full iq-door">
        {rail}
        <div className="fin-body">
          {head}

          {lead ? (
            <section className="fin-lead" aria-label={F.lead(String(lead.year))}>
              <p className="id-cap fin-lead-h">{F.lead(String(lead.year))} · {F.unitIn(unitLabel(lead.unit, locale))}</p>
              <div className="id-stats id-num">
                {lead.items.map((r) => (
                  <div className="id-stat" key={r.key}>
                    <small>{r.label}</small>
                    <b className={(r.v ?? 0) < 0 ? 'id-down' : ''}><bdi>{fmtUnit(r.v, lead.unit)}</bdi></b>
                    {r.chg != null ? (
                      <span className={`id-chg ${r.chg > 0 ? 'is-up' : r.chg < 0 ? 'is-down' : 'is-flat'}`} title={F.vsPrev}><bdi>{pct(r.chg)}</bdi></span>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {trend ? (
            <section className="id-panel fin-panel" aria-label={fin.template === 'bank' ? F.trendBank : F.trend}>
              <h2 className="id-h3">{fin.template === 'bank' ? F.trendBank : F.trend}</h2>
              <p className="id-cap">{F.unitIn(unitLabel(trend.unit, locale))}</p>
              <div className="fin-trend id-num" role="img" aria-label={fin.template === 'bank' ? F.trendBank : F.trend}>
                <span className="fin-mark" aria-hidden="true">IRAQSM.COM</span>
                {trend.pts.map((p) => (
                  <div className="fin-yr" key={p.y}>
                    <div className="fin-bars">
                      {[{ v: p.top, k: 'top' }, { v: p.ni, k: 'ni' }].map(({ v, k }) => (
                        <div className="fin-bar-slot" key={k}>
                          {v != null ? (
                            <i className={`fin-bar is-${k} ${v < 0 ? 'is-neg' : ''}`.trim()} style={{ height: `${(Math.abs(v) / trend.max) * 100}%` }}>
                              <b><bdi>{nf.format(Math.abs(v) / trend.unit.div)}{v < 0 ? '−' : ''}</bdi></b>
                            </i>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    <span className="fin-yr-label">{p.y}</span>
                  </div>
                ))}
              </div>
              <p className="fin-legend id-cap">
                <span><i className="is-top" />{trend.topLabel}</span>
                <span><i className="is-ni" />{C.netProfit}</span>
              </p>
            </section>
          ) : null}

          <div className="fin-mode">
            <div className="id-pills" role="group" aria-label={F.mode}>
              <button type="button" className="id-pill is-sm" aria-pressed={mode === 'ANNUAL'} onClick={() => setMode('ANNUAL')}>{F.annual}</button>
              <button type="button" className="id-pill is-sm" aria-pressed={mode === 'QUARTER'} onClick={() => setMode('QUARTER')}
                disabled={!fin.quarterCols.length}>{F.quarterly}</button>
            </div>
            {fin.conflicts ? <p className="id-cap">{F.conflictsN(String(fin.conflicts))}</p> : null}
          </div>

          {!cols.length ? <p className="id-note">{F.noQuarters}</p> : STATEMENTS.map((s) => {
            const st = tpl[s]
            if (!st) return null
            const lines = st.lines.filter((ln) => cols.some((c) => cell(fin, s, ln.key, c)))
            if (!lines.length) return null
            const unit = pickUnit(lines.flatMap((ln) => cols.map((c) => cell(fin, s, ln.key, c)?.v)).filter((v): v is number => v != null))
            return (
              <section className="id-panel fin-panel" key={s} aria-label={stmtLabel(st, locale)}>
                <h2 className="id-h3">{stmtLabel(st, locale)}</h2>
                <p className="id-cap">{F.unitIn(unitLabel(unit, locale))}</p>
                <div className="id-table-scroll">
                  <table className="id-table fin-stmt id-num" style={{ ['--cols' as string]: cols.length }}>
                    <thead>
                      <tr>
                        <th scope="col" className="fin-line">{F.lineCol}</th>
                        {cols.map((c) => (
                          <th scope="col" className="is-end" key={colKey(c.col)}>
                            {c.pdfUrl ? <a className="fin-colh" href={c.pdfUrl} target="_blank" rel="noopener" title={F.pdf}><bdi>{colLabel(c.col, locale)}</bdi></a> : <bdi>{colLabel(c.col, locale)}</bdi>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((ln) => (
                        <tr key={ln.key} className={`${ln.total ? 'is-total' : ln.subtotal ? 'is-sub' : ''} ${ln.depth ? 'is-d1' : ''}`.trim()}>
                          <th scope="row" className="fin-line">
                            <span className="id-name">{ar ? ln.ar : ln.en}</span>
                            {/* The filing's own wording, where it differs. */}
                            {ar && fin.sourceLabels[ln.key] && fin.sourceLabels[ln.key] !== ln.ar
                              ? <span className="fin-help id-cap">{fin.sourceLabels[ln.key]}</span> : null}
                          </th>
                          {cols.map((c) => {
                            const x = cell(fin, s, ln.key, c)
                            return (
                              <td className="is-end" key={colKey(c.col)}>
                                {x?.conflict
                                  ? <abbr className="fin-conf" title={F.conflict}>?</abbr>
                                  : <bdi className={(x?.v ?? 0) < 0 ? 'id-down' : ''}>{fmtUnit(x?.v ?? null, unit)}</bdi>}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )
          })}

          {fin.years.length && Object.keys(fin.ratios).length ? (
            <section className="id-panel fin-panel" aria-label={F.ratios}>
              <h2 className="id-h3">{F.ratios}</h2>
              <p className="id-cap">{F.ratiosNote}</p>
              <div className="id-table-scroll">
                <table className="id-table fin-stmt fin-ratios id-num" style={{ ['--cols' as string]: Math.min(6, fin.years.length) }}>
                  <thead>
                    <tr>
                      <th scope="col" className="fin-line">{F.ratioCol}</th>
                      {fin.years.slice(-6).reverse().map((y) => <th scope="col" className="is-end" key={y}>{y}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {RATIO_GROUPS.map((g) => {
                      const keys = g.keys.filter((k) => fin.years.some((y) => fin.ratios[`${k}:${y}`] != null))
                      if (!keys.length) return null
                      return (
                        <Fragment key={g.en}>
                          <tr className="fin-group"><th scope="rowgroup" colSpan={1 + Math.min(6, fin.years.length)}>{ar ? g.ar : g.en}</th></tr>
                          {keys.map((k) => {
                            const r = RATIOS[k]
                            return (
                              <tr key={k}>
                                <th scope="row" className="fin-line">
                                  <span className="id-name">{ar ? r.ar : r.en}</span>
                                  {/* The definition stays in the markup; it shows on hover or focus. */}
                                  <span className="fin-help id-cap">{ar ? r.help : r.helpEn}</span>
                                </th>
                                {fin.years.slice(-6).reverse().map((y) => {
                                  const v = fin.ratios[`${k}:${y}`]
                                  return <td className="is-end" key={y}><bdi className={v != null && v < 0 ? 'id-down' : ''}>{fmtRatio(v, r.unit)}</bdi></td>
                                })}
                              </tr>
                            )
                          })}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {sources}

          <AboutSection title={F.about.title} body={F.about.body} />
        </div>
      </main>
    </SiteShell>
  )
}
