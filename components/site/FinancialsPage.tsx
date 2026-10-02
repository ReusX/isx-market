'use client'

import Link from 'next/link'
import { Fragment, useEffect, useMemo, useState } from 'react'
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
import { proFetch, usePro } from '@/lib/proClient'
import { ProLock } from './ProLock'
import '@/styles/econ-page.css'
import '@/styles/company-page.css'
import '@/styles/financials-page.css'

/**
 * /c/[sym]/financials · the statements.
 *
 * A filing is a table, so the page is tables: one per statement, a column
 * per filed period, a row per line as the template names it. Full width —
 * this is an information surface, and a balance sheet with six columns
 * does not fit a reading measure.
 *
 * On the board (identity v3): the latest financial year's net profit is the
 * figure, with its change against the year before and the years drawn as
 * bars; the year's four headline lines and the filing sit in the key card.
 * Then the statements, the ratios and the sources as board tables.
 *
 * ── Nothing here is computed from the filings ────────────────────────────
 * The lead's «vs previous year» compares two FILED annual numbers; it does
 * not sum quarters or split cumulative periods. See `lib/financials` for
 * the policy. The model itself is built on the server (`loadFinancials`);
 * this component fetches nothing.
 */

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
  /* The page carries the free part (latest years); a «برو» reader loads the rest. */
  const pro = usePro()
  const [full, setFull] = useState<FinancialsJson | null>(null)
  useEffect(() => {
    const l = initial.fin?.locked
    if (!pro.until || !l || l.annual + l.quarter === 0) return
    proFetch(`/api/pro/financials/${initial.sym}`).then((r) => (r.ok ? r.json() : null)).then((j: { fin?: FinancialsJson } | null) => { if (j?.fin) setFull(j.fin) }).catch(() => {})
  }, [pro.until, initial.sym, initial.fin?.locked])
  const fin = full ?? initial.fin
  const lockedN = full ? 0 : (initial.fin?.locked?.annual ?? 0) + (initial.fin?.locked?.quarter ?? 0)
  const [mode, setMode] = useState<PeriodMode>('ANNUAL')

  const rail = <DoorRail door="markets" />

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
    const niVals = pts.map((p) => p.ni).filter((v): v is number => v != null)
    return { pts, max, unit: pickUnit(niVals.length ? niVals : vals), topLabel: bank ? F.financingIncome : C.revenue }
  }, [fin, F, C])

  const cols = useMemo(() => {
    if (!fin) return []
    return (mode === 'ANNUAL' ? fin.annualCols : fin.quarterCols).slice(0, MAX_COLS)
  }, [fin, mode])

  if (!initial.found) {
    return (
      <SiteShell>
        <main className="fin id-full iq-door" data-world="lapis" data-level="calm">{rail}<div className="fin-body"><p className="id-note">{C.page.notFound}</p></div></main>
      </SiteShell>
    )
  }

  const crumbs = <p className="id-cap fin-crumbs"><Link href={L(`/c/${initial.sym}`)}>{name}</Link> · <bdi>{initial.sym}</bdi> · {sectorLabel(initial.sec, locale)}</p>
  const meta = fin?.latest ? (
    <p className="fin-meta id-num">
      <span>{F.latestFiling}: <bdi>{colLabel(fin.latest.col, locale)}</bdi></span>
      {fin.latest.reportedUnit ? <span>{F.reportedUnit}: {reportedUnitLabel(fin.latest.reportedUnit, locale)}</span> : null}
      {fin.latest.pdfUrl ? <a className="id-link" href={fin.latest.pdfUrl} target="_blank" rel="noopener">{F.pdf} ↗</a> : null}
    </p>
  ) : null
  const head = (
    <header className="fin-head">
      {crumbs}
      <PageTitle title={F.title(name)} note={F.note} />
      {meta}
    </header>
  )
  const FB = F.board
  const ni = lead?.items.find((r) => r.key === 'net_income') ?? null
  /* Each figure in its own natural unit: 519 billion reads as 519.20, not
     as 0.52 trillion because the balance sheet runs to trillions. */
  const own = (v: number | null) => pickUnit(v == null ? [] : [v])
  const niUnit = ni ? own(ni.v) : null

  if (!fin) {
    return (
      <SiteShell>
        <main className="fin id-full iq-door" data-world="lapis" data-level="calm">{rail}<div className="fin-body">
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
    <section className="cur-all fin-sec" aria-label={F.filings}>
      <h2 className="id-h3">{F.filings}</h2>
      {/* One small document card per filing: the period, its unit, and the
          original PDF behind the whole card. */}
      <ul className="fin-docs id-num">
        {filings.map((c) => {
          const body = (
            <>
              <svg className="fin-doc-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M14 3v4h4M9 12h6M9 16h6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
              <b><bdi>{colLabel(c.col, locale)}</bdi></b>
              <small>{c.reportedUnit ? reportedUnitLabel(c.reportedUnit, locale) : '—'}</small>
              <span className="fin-doc-go">{c.pdfUrl ? <>{F.open} ↗</> : F.noPdf}</span>
            </>
          )
          return (
            <li key={colKey(c.col)} className={c.col.p === 'ANNUAL' ? 'is-annual' : undefined}>
              {c.pdfUrl
                ? <a className="fin-doc" href={c.pdfUrl} target="_blank" rel="noopener" aria-label={`${F.pdf} · ${colLabel(c.col, locale)}`}>{body}</a>
                : <div className="fin-doc is-none">{body}</div>}
            </li>
          )
        })}
      </ul>
    </section>
  )

  if (fin.valuesWithheld) {
    return (
      <SiteShell>
        <main className="fin id-full iq-door" data-world="lapis" data-level="calm">{rail}<div className="fin-body">
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
  const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
  const nf1 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })
  const nf = { format: (x: number) => (x >= 100 ? nf0 : nf1).format(x) }

  return (
    <SiteShell>
      <main className="fin id-full iq-door" data-world="lapis" data-level="calm">
        {rail}
        <div className="fin-body">
          {/* Identity v3: net profit as the figure, the years as bars, the
              year's headline lines and the filing as the key card. */}
          <div className="fx-frame fin-frame">
            <div className="fx-board">
              <div className="fx-lead">
                {crumbs}
                <PageTitle title={F.title(name)} note={F.note} className="fx-title" />
                {ni && lead ? (
                  <>
                    <p className={`fx-huge id-num ${(ni.v ?? 0) < 0 ? 'fin-neg' : ''}`.trim()}>
                      <span className="fx-huge-num">
                        <bdi dir="ltr">{fmtUnit(ni.v, niUnit!)}</bdi>
                        <svg className="fx-swoosh" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
                          <path d="M4 30 C 50 10, 110 4, 196 20" pathLength={1} fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                        </svg>
                      </span>
                    </p>
                    <p className="fx-line">
                      {ni.chg != null ? <span className={`id-chg ${ni.chg > 0 ? 'is-up' : ni.chg < 0 ? 'is-down' : 'is-flat'}`} title={F.vsPrev}><bdi dir="ltr">{pct(ni.chg)}</bdi></span> : null}
                      <span>{FB.netLine(unitLabel(niUnit!, locale), String(lead.year))}{ni.chg != null ? ` · ${F.vsPrev}` : ''}</span>
                    </p>
                  </>
                ) : null}
                {trend ? (
                  <figure className="fin-chart" aria-label={fin.template === 'bank' ? F.trendBank : F.trend}>
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
                    <figcaption className="fin-legend fx-chart-note">
                      <span><i className="is-top" />{trend.topLabel}</span>
                      <span><i className="is-ni" />{C.netProfit}</span>
                      <span>{F.unitIn(unitLabel(trend.unit, locale))}</span>
                    </figcaption>
                  </figure>
                ) : null}
              </div>

              {lead ? (
                <section className="id-print is-key fx-calc" aria-label={FB.keyTitle(String(lead.year))}>
                  <h2 className="fx-calc-title">{FB.keyTitle(String(lead.year))}</h2>
                  <ul className="fin-keys id-num">
                    {lead.items.map((r) => (
                      <li key={r.key}>
                        <small>{r.label}</small>
                        <b className={(r.v ?? 0) < 0 ? 'id-down' : ''}><bdi dir="ltr">{fmtUnit(r.v, own(r.v))}</bdi> <em>{unitLabel(own(r.v), locale)}</em></b>
                        {r.chg != null ? <span className={`id-chg ${r.chg > 0 ? 'is-up' : r.chg < 0 ? 'is-down' : 'is-flat'}`} title={F.vsPrev}><bdi dir="ltr">{pct(r.chg)}</bdi></span> : <span />}
                      </li>
                    ))}
                  </ul>
                  {meta}
                </section>
              ) : null}
            </div>
          </div>

          <div className="fin-mode">
            <div className="fx-quick" role="group" aria-label={F.mode}>
              <button type="button" className="fx-qbtn" aria-pressed={mode === 'ANNUAL'} onClick={() => setMode('ANNUAL')}>{F.annual}</button>
              <button type="button" className="fx-qbtn" aria-pressed={mode === 'QUARTER'} onClick={() => setMode('QUARTER')}
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
              <section className="cur-all fin-sec" key={s} aria-label={stmtLabel(st, locale)}>
                <h2 className="id-h3">{stmtLabel(st, locale)}</h2>
                <p className="id-cap">{F.unitIn(unitLabel(unit, locale))}</p>
                <div className="id-table-scroll">
                  <table className="id-table fin-stmt id-num" style={{ ['--cols' as string]: cols.length }}>
                    <thead>
                      <tr>
                        <th scope="col" className="fin-line">{F.lineCol}</th>
                        {cols.map((c, ci) => (
                          <th scope="col" className={ci === 0 ? 'is-end is-now' : 'is-end'} key={colKey(c.col)}>
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
                          {cols.map((c, ci) => {
                            const x = cell(fin, s, ln.key, c)
                            return (
                              <td className={ci === 0 ? 'is-end is-now' : 'is-end'} key={colKey(c.col)}>
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

          {lockedN > 0 && !pro.loading ? <ProLock /> : null}
          {fin.years.length && Object.keys(fin.ratios).length ? (
            <section className="cur-all fin-sec" aria-label={F.ratios}>
              <h2 className="id-h3">{F.ratios}</h2>
              <p className="id-cap">{F.ratiosNote}</p>
              <div className="id-table-scroll">
                <table className="id-table fin-stmt fin-ratios id-num" style={{ ['--cols' as string]: Math.min(6, fin.years.length) }}>
                  <thead>
                    <tr>
                      <th scope="col" className="fin-line">{F.ratioCol}</th>
                      {fin.years.slice(-6).reverse().map((y, yi) => <th scope="col" className={yi === 0 ? 'is-end is-now' : 'is-end'} key={y}>{y}</th>)}
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
                                {fin.years.slice(-6).reverse().map((y, yi) => {
                                  const v = fin.ratios[`${k}:${y}`]
                                  return <td className={yi === 0 ? 'is-end is-now' : 'is-end'} key={y}><bdi className={v != null && v < 0 ? 'id-down' : ''}>{fmtRatio(v, r.unit)}</bdi></td>
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
