'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import Link from 'next/link'
import { CompanyLogo } from '@/components/CompanyLogo'
import { companyName, SECTORS } from '@/lib/market'
import { usableName } from '@/lib/statistics'
import {
  TEMPLATES, RATIOS, RATIO_GROUPS, buildFinancials, pickUnit, fmtUnit, fmtRatio,
  colLabel, colKey, unitLabel, reportedUnitLabel, stmtLabel,
  type StatementId, type PeriodMode, type ColMeta, type Financials, type Unit,
  type FactRow, type RatioRow, type ReportRow,
} from '@/lib/financials'
import companiesData from '@/public/data/companies.json'
import type { CompanyMeta } from '@/types'
import '@/styles/panels.css'
import '@/styles/company.css'
import '@/styles/financials.css'

/**
 * البيانات المالية — a direct port of the approved financials page.
 *
 * The statement navigation, the table geometry, the row hierarchy, the period
 * control and the provenance footer are the reference's. What changed is the
 * period vocabulary, and only because the source cannot support the
 * reference's:
 *
 *   · Columns are labelled «Q1 2025» / «سنوي 2025». The reference renames
 *     quarters by assumed duration — Q3 to «التسعة أشهر» — and nothing in this
 *     database establishes a duration, so that label would be an inference
 *     wearing provenance's clothes.
 *   · The reference's «التقارير الربعية تراكمية» note is gone for the same
 *     reason: it asserts a semantics the data does not confirm.
 *   · No derived cells. The reference marks an annual value reconstructed from
 *     Q4 with ≈; nothing here is reconstructed, so the marker never appears.
 *   · Provenance is real: each column links the filing it came from and names
 *     the unit that filing declared.
 */

type Tab = 'overview' | StatementId | 'ratios'

export function CompanyFinancials({ sym }: { sym: string }) {
  const { t: T, locale, href: L } = useLocale()
  const fn = T.financials
  const [rows, setRows] = useState<{ facts: FactRow[]; ratios: RatioRow[]; reports: ReportRow[] } | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [tab, setTab] = useState<Tab>('overview')
  const [mode, setMode] = useState<PeriodMode>('ANNUAL')
  const [hoverCol, setHoverCol] = useState<string | null>(null)

  const meta = companiesData as CompanyMeta[]
  const known = meta.find(m => m.sym === sym) ?? null
  const name = known
    ? companyName(
        { ar: usableName(known.ar) ? known.ar : null, en: usableName(known.en) ? known.en : null },
        sym,
        locale,
      )
    : sym

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const [f, r, rep] = await Promise.all([
          sb.from('financial_facts_public')
            .select('fiscal_year,period,statement,line_key,value_iqd,unit_reported,source_label_ar')
            .eq('ticker', sym).limit(3000),
          sb.from('financial_ratios_public').select('fiscal_year,period,ratio_key,value').eq('ticker', sym).limit(2000),
          sb.from('financial_reports_public')
            .select('fiscal_year,period,pdf_url,unit_reported,template').eq('ticker', sym).limit(200),
        ])
        if (!alive) return
        setRows({
          facts: (f.data ?? []) as FactRow[],
          ratios: (r.data ?? []) as RatioRow[],
          reports: (rep.data ?? []) as ReportRow[],
        })
        setState('ready')
      } catch {
        if (alive) setState('error')
      }
    })()
    return () => { alive = false }
  }, [sym])

  const fin = useMemo(
    () => (rows ? buildFinancials(sym, rows.facts, rows.ratios, rows.reports) : null),
    [rows, sym])

  const statements = useMemo(
    () => (fin ? (Object.keys(TEMPLATES[fin.template]) as StatementId[]) : []),
    [fin])

  // A bank has no cash-flow statement in this schema — the tab is absent, not
  // empty. Falling back keeps a stale tab from rendering a blank table.
  const activeTab: Tab =
    tab === 'overview' || tab === 'ratios' || statements.includes(tab as StatementId) ? tab : 'overview'

  const cols = useMemo(() => {
    if (!fin) return []
    return (mode === 'ANNUAL' ? fin.annualCols : fin.quarterCols).slice(0, 6)
  }, [fin, mode])

  const loading = state === 'loading'
  const sectorLabel = known
    ? SECTORS.find(s => s.id === known.sec)?.[locale === 'ar' ? 'arFull' : 'enFull'] ?? String(known.sec)
    : ''

  return (
    <main className="fn-page iq-page">
      <nav className="cd-crumbs" aria-label={fn.crumbsLabel}>
        <ol>
          <li><Link href={L('/market')}>{fn.companies}</Link></li>
          <li><Link href={`/c/${sym.toLowerCase()}`}>{name}</Link></li>
          <li aria-current="page">{fn.title}</li>
        </ol>
      </nav>

      {/* Compact by instruction: enough to know whose statements these are,
          and no more. Not a second masthead. */}
      <header className="fn-strip">
        <Link className="fn-back" href={L(`/c/${sym.toLowerCase()}`)} aria-label={fn.backToOverview}>
          <i aria-hidden="true">→</i>
        </Link>
        <span className={`cd-mark ${known?.logo ? 'has-logo' : ''}`} aria-hidden="true">
          {known?.logo
            ? <CompanyLogo className="cd-mark-img" sym={sym} logo={known.logo} color={known.color} />
            : sym.slice(0, 2)}
        </span>
        <div className="fn-ident">
          <h1>{name}</h1>
          <p>
            <bdi className="cd-ticker">{sym}</bdi>
            <span className="cd-sep" aria-hidden="true">·</span>
            {sectorLabel}
            {fin ? (
              <>
                <span className="cd-sep" aria-hidden="true">·</span>
                {fin.template === 'bank' ? fn.templateBank : fn.templateIndustrial}
              </>
            ) : null}
          </p>
        </div>
        <Link className="fn-overview-link" href={L(`/c/${sym.toLowerCase()}`)}>{fn.overview}</Link>
      </header>

      {state === 'error' ? (
        <div className="mv-error" role="alert">
          <span className="mv-error-mark" aria-hidden="true">!</span>
          <div>
            <strong>{fn.loadFailed}</strong>
            <p>{fn.loadFailedNote}</p>
          </div>
          <button type="button" onClick={() => window.location.reload()}>{fn.retry}</button>
        </div>
      ) : loading ? (
        <div className="fn-panel"><Skeleton lines={10} /></div>
      ) : !fin ? (
        <NoFinancials name={name} sym={sym} />
      ) : fin.valuesWithheld ? (
        <ValuesWithheld fin={fin} name={name} sym={sym} />
      ) : (
        <>
          <div className="fn-controls">
            <div className="fn-tabs" role="tablist" aria-label={fn.tabsLabel}>
              <button type="button" role="tab" aria-selected={activeTab === 'overview'}
                className={activeTab === 'overview' ? 'active' : ''}
                onClick={() => setTab('overview')}>{fn.tabStatements}</button>
              {statements.map(s => (
                <button key={s} type="button" role="tab" aria-selected={activeTab === s}
                  className={activeTab === s ? 'active' : ''}
                  onClick={() => setTab(s)}>{stmtLabel(TEMPLATES[fin.template][s]!, locale)}</button>
              ))}
              <button type="button" role="tab" aria-selected={activeTab === 'ratios'}
                className={activeTab === 'ratios' ? 'active' : ''}
                onClick={() => setTab('ratios')}>{fn.tabRatios}</button>
            </div>

            {/* Ratios and the overview are annual by construction, so the
                period control is hidden rather than shown doing nothing. */}
            {activeTab !== 'ratios' && activeTab !== 'overview' && fin.quarterCols.length ? (
              <div className="fn-period" role="group" aria-label={fn.periodGroup}>
                <button type="button" className={mode === 'ANNUAL' ? 'active' : ''}
                  aria-pressed={mode === 'ANNUAL'} onClick={() => setMode('ANNUAL')}>{fn.annual}</button>
                <button type="button" className={mode === 'QUARTER' ? 'active' : ''}
                  aria-pressed={mode === 'QUARTER'} onClick={() => setMode('QUARTER')}>{fn.quarterly}</button>
              </div>
            ) : null}
          </div>

          {/* The one thing the reader must know before reading a quarterly
              column, and the only thing the source actually supports saying. */}
          {mode === 'QUARTER' && activeTab !== 'ratios' && activeTab !== 'overview' ? (
            <p className="mv-note fn-note">
              {fn.periodPolicy}
            </p>
          ) : null}

          {activeTab === 'overview' ? (
            <Overview fin={fin} name={name} />
          ) : activeTab === 'ratios' ? (
            <Ratios fin={fin} />
          ) : (
            <Statement fin={fin} statement={activeTab as StatementId} cols={cols}
              hoverCol={hoverCol} setHoverCol={setHoverCol} />
          )}

          <Provenance fin={fin} />
        </>
      )}
    </main>
  )
}

/* ── Overview ─────────────────────────────────────────────────────────────
   The multi-year shape on the left and the latest audited year's headline
   figures on the right: the same numbers seen two ways. */
function Overview({ fin, name }: { fin: Financials; name: string }) {
  const { t: T, locale, href: L } = useLocale()
  const fn = T.financials
  const years = fin.years.slice(-6)
  const at = (key: string, y: number) => fin.facts.get(`income:${key}:${y}:ANNUAL`)?.v ?? null
  const rev = (y: number) => at('revenue', y) ?? (
    at('financing_income', y) != null || at('revenue_and_commissions', y) != null
      ? (at('financing_income', y) ?? 0) + (at('revenue_and_commissions', y) ?? 0)
      : null)

  const series = years.map(y => ({ y, rev: rev(y), ni: at('net_income', y) }))
  const withData = series.filter(s => s.rev != null || s.ni != null)
  const latestY = withData.length ? withData[withData.length - 1].y : null
  const prevY = withData.length > 1 ? withData[withData.length - 2].y : null
  const unit = pickUnit(withData.flatMap(s => [s.rev, s.ni].filter((v): v is number => v != null)))

  const yoy = (now: number | null, before: number | null) =>
    now == null || before == null || before === 0 ? null : (now - before) / Math.abs(before)

  if (!withData.length) {
    return (
      <div className="cd-nodata cd-nodata-wide">
        <strong>{fn.noAnnual}</strong>
        <p>{fn.noAnnualNote}</p>
      </div>
    )
  }

  const rows: [string, number | null, number | null][] = [
    [fin.template === 'bank' ? fn.operatingIncome : fn.revenue,
      latestY ? rev(latestY) : null, prevY ? rev(prevY) : null],
    [fn.netProfit, latestY ? at('net_income', latestY) : null, prevY ? at('net_income', prevY) : null],
    [fn.totalAssets,
      latestY ? fin.facts.get(`balance:total_assets:${latestY}:ANNUAL`)?.v ?? null : null,
      prevY ? fin.facts.get(`balance:total_assets:${prevY}:ANNUAL`)?.v ?? null : null],
    [fn.totalEquity,
      latestY ? fin.facts.get(`balance:total_equity:${latestY}:ANNUAL`)?.v ?? null : null,
      prevY ? fin.facts.get(`balance:total_equity:${prevY}:ANNUAL`)?.v ?? null : null],
  ]

  return (
    <section className="fn-overview" aria-label={fn.overviewLabel}>
      <div className="fn-panel fn-spine">
        <div className="fn-table-head">
          <h2>{fin.template === 'bank' ? fn.incomeBank : fn.incomeCorp}</h2>
          <span className="fn-unit">{fn.valuesIn}<b>{unitLabel(unit, locale)}</b></span>
        </div>
        <TrendChart series={withData} unit={unit} />
      </div>

      <div className="fn-panel fn-headline">
        <div className="fn-table-head">
          <h2>{fn.latestYear}</h2>
          <span className="fn-unit"><bdi>{latestY}</bdi></span>
        </div>
        <dl className="fn-headline-rows">
          {rows.map(([label, now, before]) => {
            const d = yoy(now, before)
            return (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{now == null ? <span className="mv-dash">—</span> : <bdi>{fmtUnit(now, unit)}</bdi>}</dd>
                <dd className="fn-headline-chg">
                  {d == null ? <span className="mv-dash" title={fn.noPriorYear}>—</span>
                    : <bdi className={d > 0 ? 'positive' : d < 0 ? 'negative' : ''}>
                        {d > 0 ? '+' : ''}{(d * 100).toFixed(1)}%
                      </bdi>}
                </dd>
              </div>
            )
          })}
        </dl>
        <p className="fn-fine">
          {fn.yoyNote(name)}
        </p>
      </div>
    </section>
  )
}

function TrendChart({ series, unit }: {
  series: { y: number; rev: number | null; ni: number | null }[]
  unit: Unit
}) {
  const { t: T, locale, href: L } = useLocale()
  const fn = T.financials
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...series.flatMap(s => [Math.abs(s.rev ?? 0), Math.abs(s.ni ?? 0)]))
  const anyNegative = series.some(s => (s.ni ?? 0) < 0)

  return (
    <figure className="fn-trend">
      <div className="fn-trend-plot" onPointerLeave={() => setHover(null)}>
        {series.map((s, i) => (
          <div key={s.y} className={`fn-trend-col ${hover === i ? 'is-on' : ''}`}
            onPointerEnter={() => setHover(i)}>
            {hover === i ? (
              <div className="fn-trend-tip">
                <b><bdi>{s.y}</bdi></b>
                <span><em>{fn.revenue}</em><bdi>{fmtUnit(s.rev, unit)}</bdi></span>
                <span><em>{fn.netProfit}</em><bdi>{fmtUnit(s.ni, unit)}</bdi></span>
              </div>
            ) : null}
            <div className="fn-trend-bars">
              <i className="rev" style={{ blockSize: `${(Math.abs(s.rev ?? 0) / max) * 100}%` }} />
              <i className={`ni ${(s.ni ?? 0) < 0 ? 'neg' : ''}`}
                style={{ blockSize: `${(Math.abs(s.ni ?? 0) / max) * 100}%` }} />
            </div>
            <span className="fn-trend-year"><bdi>{s.y}</bdi></span>
          </div>
        ))}
      </div>
      <figcaption className="fn-trend-legend">
        <span><i className="rev" aria-hidden="true" />{fn.revenue}</span>
        <span><i className="ni" aria-hidden="true" />{fn.netProfit}</span>
        {anyNegative ? <span className="fn-trend-neg">{fn.redBarsAreLosses}</span> : null}
      </figcaption>
    </figure>
  )
}

/* ── One statement ────────────────────────────────────────────────────────── */
function Statement({ fin, statement, cols, hoverCol, setHoverCol }: {
  fin: Financials; statement: StatementId; cols: ColMeta[]
  hoverCol: string | null; setHoverCol: (c: string | null) => void
}) {
  const { t: T, locale, href: L } = useLocale()
  const fn = T.financials
  const def = TEMPLATES[fin.template][statement]!
  const isPct = statement === 'metrics'

  const lines = def.lines.filter(l =>
    cols.some(c => fin.facts.get(`${statement}:${l.key}:${c.col.y}:${c.col.p}`)?.v != null))

  const unit = useMemo(() => {
    const vals: number[] = []
    for (const l of lines) for (const c of cols) {
      const v = fin.facts.get(`${statement}:${l.key}:${c.col.y}:${c.col.p}`)?.v
      if (v != null) vals.push(v)
    }
    return pickUnit(vals)
  }, [fin, statement, lines, cols])

  if (!lines.length) {
    return (
      <div className="cd-nodata cd-nodata-wide">
        <strong>{fn.notPublished}</strong>
        <p>
          {fn.statementMissing(stmtLabel(def, locale))}
          {fn.othersNormal}
        </p>
      </div>
    )
  }

  return (
    <section className="fn-panel fn-statement" aria-label={stmtLabel(def, locale)}>
      <div className="fn-table-head">
        <h2>{stmtLabel(def, locale)}</h2>
        {/* The unit, stated once, where it governs. Not repeated per cell. */}
        <span className="fn-unit">
          {isPct ? fn.valuesArePct : <>{fn.valuesIn}<b>{unitLabel(unit, locale)}</b></>}
        </span>
      </div>

      <div className="fn-scroll">
        <table className="fn-table">
          <caption className="sr-only">
            {fn.spanLabel(stmtLabel(def, locale), colLabel(cols[cols.length - 1].col, locale), colLabel(cols[0].col, locale))}
          </caption>
          <thead>
            <tr>
              <th scope="col" className="fn-col-item">{fn.item}</th>
              {cols.map(c => {
                const id = colKey(c.col)
                return (
                  <th key={id} scope="col" className="fn-col-num"
                    data-hover={hoverCol === id || undefined}
                    onPointerEnter={() => setHoverCol(id)} onPointerLeave={() => setHoverCol(null)}>
                    <bdi>{colLabel(c.col, locale)}</bdi>
                    {/* Provenance on the column it belongs to: the filing, and
                        the unit that filing declared. */}
                    {c.pdfUrl ? (
                      <a className="fn-col-src" href={c.pdfUrl} target="_blank" rel="noopener noreferrer"
                        aria-label={fn.reportLink(colLabel(c.col, locale))}>
                        PDF
                      </a>
                    ) : null}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {lines.map(l => {
              const src = fin.sourceLabels.get(l.key)
              return (
                <tr key={l.key} data-depth={l.depth}
                  data-kind={l.total ? 'total' : l.subtotal ? 'subtotal' : undefined}>
                  {/* The normalised name is the primary label; the filing's own
                      wording stays one hover away. */}
                  <th scope="row" className="fn-col-item">
                    <span className="fn-line-name">
                      {locale === 'ar' ? l.ar : l.en}
                      {src && src !== l.ar ? (
                        <i className="fn-src" tabIndex={0} role="note"
                          aria-label={fn.sourceLabel(src)}
                          data-help={fn.sourceLabel(src)}>ⓘ</i>
                      ) : null}
                    </span>
                  </th>
                  {cols.map(c => {
                    const id = colKey(c.col)
                    const cell = fin.facts.get(`${statement}:${l.key}:${c.col.y}:${c.col.p}`)
                    const v = cell?.v ?? null
                    return (
                      <td key={id} className="fn-col-num" data-hover={hoverCol === id || undefined}
                        onPointerEnter={() => setHoverCol(id)} onPointerLeave={() => setHoverCol(null)}>
                        {v == null ? (
                          <span className="mv-dash"
                            title={cell?.conflict
                              ? fn.conflictingValues
                              : fn.notInReport}>—</span>
                        ) : (
                          <bdi className={v < 0 ? 'negative' : ''}>
                            {isPct ? `${v.toFixed(1)}%` : fmtUnit(v, unit)}
                          </bdi>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="fn-legend">
        <span><span className="mv-dash">—</span> {fn.notInReport}</span>
        <span>{fn.asDisclosed}</span>
      </p>
    </section>
  )
}

/* ── Ratios ───────────────────────────────────────────────────────────────
   A matrix, not twenty cards: ratio down, year across. «ROE 14%» says little;
   «ROE 21 → 17 → 14» says the thing you came for. */
function Ratios({ fin }: { fin: Financials }) {
  const { t: T, locale, href: L } = useLocale()
  const fn = T.financials
  const years = [...fin.years].reverse().slice(0, 6)
  const groups = RATIO_GROUPS
    .map(g => ({ ...g, keys: g.keys.filter(k => years.some(y => fin.ratios.get(`${k}:${y}`) != null)) }))
    .filter(g => g.keys.length)

  if (!groups.length) {
    return (
      <div className="cd-nodata cd-nodata-wide">
        <strong>{fn.noRatios}</strong>
        <p>{fn.noRatiosNote}</p>
      </div>
    )
  }

  return (
    <section className="fn-panel fn-statement" aria-label={fn.ratiosLabel}>
      <div className="fn-table-head">
        <h2>{fn.ratios}</h2>
        <span className="fn-unit">{fn.fromAnnual}</span>
      </div>
      <div className="fn-scroll">
        <table className="fn-table fn-ratios">
          <thead>
            <tr>
              <th scope="col" className="fn-col-item">{fn.ratio}</th>
              {years.map(y => <th key={y} scope="col" className="fn-col-num"><bdi>{y}</bdi></th>)}
              <th scope="col" className="fn-col-trend">{fn.trend}</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(g => (
              <Fragment key={g.ar}>
                <tr className="fn-group-row">
                  <th scope="colgroup" colSpan={years.length + 2}>{g[locale]}</th>
                </tr>
                {g.keys.map(k => {
                  const def = RATIOS[k]
                  const vals = years.map(y => fin.ratios.get(`${k}:${y}`) ?? null)
                  return (
                    <tr key={k}>
                      <th scope="row" className="fn-col-item">
                        <span>{def[locale]}</span>
                        <i className="fn-help" tabIndex={0} role="note" aria-label={locale === 'ar' ? def.help : def.helpEn} data-help={locale === 'ar' ? def.help : def.helpEn}>{locale === 'ar' ? '؟' : '?'}</i>
                      </th>
                      {vals.map((v, i) => (
                        <td key={years[i]} className="fn-col-num">
                          {v == null ? <span className="mv-dash">—</span>
                            : <bdi className={def.unit === '%' && v < 0 ? 'negative' : ''}>{fmtRatio(v, def.unit)}</bdi>}
                        </td>
                      ))}
                      <td className="fn-col-trend"><Spark values={[...vals].reverse()} /></td>
                    </tr>
                  )
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/** Shape only — the numbers are already in the row beside it. */
function Spark({ values }: { values: (number | null)[] }) {
  const pts = values.filter((v): v is number => v != null)
  if (pts.length < 2) return <span className="mv-dash">—</span>
  const min = Math.min(...pts), max = Math.max(...pts), span = max - min || 1
  const d = values
    .map((v, i) => (v == null ? null : [(i / (values.length - 1)) * 52, 16 - ((v - min) / span) * 14]))
    .filter(Boolean) as [number, number][]
  const path = d.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const rising = pts[pts.length - 1] >= pts[0]
  return (
    <svg viewBox="0 0 52 18" className="fn-spark" aria-hidden="true">
      <path d={path} fill="none" strokeWidth="1.5"
        stroke={rising ? 'var(--mv-up)' : 'var(--mv-down)'} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function Provenance({ fin }: { fin: Financials }) {
  const { t: T, locale, href: L } = useLocale()
  const fn = T.financials
  const units = fin.reportedUnits.map(u => reportedUnitLabel(u, locale))
  return (
    <footer className="fn-provenance">
      <dl>
        <div><dt>{fn.source}</dt><dd>{fn.sourceValue}</dd></div>
        <div>
          <dt>{fn.latestDisclosed}</dt>
          <dd>{fin.latest ? <bdi>{colLabel(fin.latest.col)}</bdi> : <span className="mv-dash">—</span>}</dd>
        </div>
        <div><dt>{fn.periodsShown}</dt><dd><bdi>{fin.annualCols.length + fin.quarterCols.length}</bdi></dd></div>
        <div>
          <dt>{fn.reportedUnit}</dt>
          <dd>{units.length ? units.join(' · ') : <span className="mv-dash">—</span>}</dd>
        </div>
        <div><dt>{fn.currency}</dt><dd>{fn.currencyValue}</dd></div>
      </dl>
      <p>
        {fn.footnote1}
        {fin.conflicts > 0 ? (
          <>{fn.conflicts(String(fin.conflicts))}</>
        ) : null}
        {fn.footnote2}
      </p>
    </footer>
  )
}

/* The approved unavailable state, used for a ticker on the data-quality list.
   It says what is unavailable and why in the reader's terms — the extracted
   figures, not the company's own filings — and it keeps the filings reachable,
   because those documents are correct and are the thing a reader actually
   wants when the table cannot be shown. */
function ValuesWithheld({ fin, name, sym }: { fin: Financials; name: string; sym: string }) {
  const { t: T, locale, href: L } = useLocale()
  const fn = T.financials
  const cols = [...fin.annualCols, ...fin.quarterCols]
  return (
    <>
      <div className="cd-nodata cd-nodata-wide fn-empty">
        <strong>{fn.withheldTitle}</strong>
        <p>
          {fn.withheldBody(name)}
        </p>
        <div className="cd-nodata-still">
          <span className="cd-cell-label">{fn.stillAvailable}</span>
          <p>
            {fn.withheldStill}
          </p>
        </div>
        <Link className="fn-empty-link" href={L(`/c/${sym.toLowerCase()}`)}>{fn.backToCompany} <i className="dir-go" aria-hidden="true">←</i></Link>
      </div>

      {cols.some(c => c.pdfUrl) ? (
        <section className="fn-panel" aria-label={fn.originalReportsLabel}>
          <div className="fn-table-head">
            <h2>{fn.originalReports}</h2>
            <span className="fn-unit">{fn.asPublished}</span>
          </div>
          <ul className="fn-filings">
            {cols.filter(c => c.pdfUrl).map(c => (
              <li key={colKey(c.col)}>
                <a href={c.pdfUrl as string} target="_blank" rel="noopener noreferrer"
                  aria-label={fn.reportLink(colLabel(c.col, locale))}>
                  <i aria-hidden="true">PDF</i>
                  <bdi>{colLabel(c.col, locale)}</bdi>
                  {c.reportedUnit ? <small>{fn.reportedUnitIs(reportedUnitLabel(c.reportedUnit, locale))}</small> : null}
                  <span className="fn-filings-go" aria-hidden="true">↗</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  )
}

function NoFinancials({ name, sym }: { name: string; sym: string }) {
  const { t: T, locale, href: L } = useLocale()
  const fn = T.financials
  return (
    <div className="cd-nodata cd-nodata-wide fn-empty">
      <strong>{fn.noneTitle}</strong>
      <p>
        {fn.noneBody(name)}
      </p>
      <div className="cd-nodata-still">
        <span className="cd-cell-label">{fn.stillAvailable}</span>
        <p>{fn.noneNote}</p>
      </div>
      <Link className="fn-empty-link" href={L(`/c/${sym.toLowerCase()}`)}>{fn.backToCompany} <i className="dir-go" aria-hidden="true">←</i></Link>
    </div>
  )
}

const Skeleton = ({ lines }: { lines: number }) => (
  <div className="fn-skel" aria-hidden="true">
    {Array.from({ length: lines }).map((_, i) => <i key={i} />)}
  </div>
)
