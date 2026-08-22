'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CompanyLogo } from '@/components/CompanyLogo'
import { companyName, SECTORS } from '@/lib/market'
import { usableName } from '@/lib/statistics'
import {
  TEMPLATES, RATIOS, RATIO_GROUPS, buildFinancials, pickUnit, fmtUnit, fmtRatio,
  colLabel, colKey, UNIT_AR,
  type StatementId, type PeriodMode, type ColMeta, type Financials,
  type FactRow, type RatioRow, type ReportRow,
} from '@/lib/financials'
import companiesData from '@/public/data/companies.json'
import type { CompanyMeta } from '@/types'
import '@/styles/panels.css'
import '../company.css'
import './financials.css'

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

export function FinancialsClient({ sym }: { sym: string }) {
  const [rows, setRows] = useState<{ facts: FactRow[]; ratios: RatioRow[]; reports: ReportRow[] } | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [tab, setTab] = useState<Tab>('overview')
  const [mode, setMode] = useState<PeriodMode>('ANNUAL')
  const [hoverCol, setHoverCol] = useState<string | null>(null)

  const meta = companiesData as CompanyMeta[]
  const known = meta.find(m => m.sym === sym) ?? null
  const name = known
    ? companyName({ ar: usableName(known.ar) ? known.ar : null, en: usableName(known.en) ? known.en : null }, sym)
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
  const sectorAr = known
    ? SECTORS.find(s => s.id === known.sec)?.arFull ?? String(known.sec)
    : ''

  return (
    <main className="fn-page iq-page">
      <nav className="cd-crumbs" aria-label="مسار التصفح">
        <ol>
          <li><Link href="/companies">الشركات</Link></li>
          <li><Link href={`/c/${sym.toLowerCase()}`}>{name}</Link></li>
          <li aria-current="page">البيانات المالية</li>
        </ol>
      </nav>

      {/* Compact by instruction: enough to know whose statements these are,
          and no more. Not a second masthead. */}
      <header className="fn-strip">
        <Link className="fn-back" href={`/c/${sym.toLowerCase()}`} aria-label="العودة إلى نظرة عامة">
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
            {sectorAr}
            {fin ? (
              <>
                <span className="cd-sep" aria-hidden="true">·</span>
                {fin.template === 'bank' ? 'نموذج مصرفي' : 'نموذج صناعي/خدمي'}
              </>
            ) : null}
          </p>
        </div>
        <Link className="fn-overview-link" href={`/c/${sym.toLowerCase()}`}>نظرة عامة</Link>
      </header>

      {state === 'error' ? (
        <div className="mv-error" role="alert">
          <span className="mv-error-mark" aria-hidden="true">!</span>
          <div>
            <strong>تعذّر تحميل القوائم المالية</strong>
            <p>يمكن إعادة المحاولة، أو العودة إلى صفحة الشركة.</p>
          </div>
          <button type="button" onClick={() => window.location.reload()}>إعادة المحاولة</button>
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
            <div className="fn-tabs" role="tablist" aria-label="أقسام البيانات المالية">
              <button type="button" role="tab" aria-selected={activeTab === 'overview'}
                className={activeTab === 'overview' ? 'active' : ''}
                onClick={() => setTab('overview')}>نظرة عامة</button>
              {statements.map(s => (
                <button key={s} type="button" role="tab" aria-selected={activeTab === s}
                  className={activeTab === s ? 'active' : ''}
                  onClick={() => setTab(s)}>{TEMPLATES[fin.template][s]!.label}</button>
              ))}
              <button type="button" role="tab" aria-selected={activeTab === 'ratios'}
                className={activeTab === 'ratios' ? 'active' : ''}
                onClick={() => setTab('ratios')}>النسب المالية</button>
            </div>

            {/* Ratios and the overview are annual by construction, so the
                period control is hidden rather than shown doing nothing. */}
            {activeTab !== 'ratios' && activeTab !== 'overview' && fin.quarterCols.length ? (
              <div className="fn-period" role="group" aria-label="فترة التقرير">
                <button type="button" className={mode === 'ANNUAL' ? 'active' : ''}
                  aria-pressed={mode === 'ANNUAL'} onClick={() => setMode('ANNUAL')}>سنوي</button>
                <button type="button" className={mode === 'QUARTER' ? 'active' : ''}
                  aria-pressed={mode === 'QUARTER'} onClick={() => setMode('QUARTER')}>ربعي</button>
              </div>
            ) : null}
          </div>

          {/* The one thing the reader must know before reading a quarterly
              column, and the only thing the source actually supports saying. */}
          {mode === 'QUARTER' && activeTab !== 'ratios' && activeTab !== 'overview' ? (
            <p className="mv-note fn-note">
              تُعرض الفترات كما وردت في الإفصاح، برمز الفترة وسنتها. لا تحدّد البيانات المتاحة
              المدة التي يغطيها كل تقرير ربعي، ولذلك لا تُجمع الأعمدة الربعية ولا تُقارن بالسنوي.
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
        <strong>لا تتوفر قوائم سنوية لهذه الشركة</strong>
        <p>الفترات المستخرجة لهذه الشركة ربعية فقط. اختر «ربعي» داخل أي قائمة لعرضها.</p>
      </div>
    )
  }

  const rows: [string, number | null, number | null][] = [
    [fin.template === 'bank' ? 'الدخل التشغيلي' : 'الإيرادات',
      latestY ? rev(latestY) : null, prevY ? rev(prevY) : null],
    ['صافي الربح', latestY ? at('net_income', latestY) : null, prevY ? at('net_income', prevY) : null],
    ['إجمالي الأصول',
      latestY ? fin.facts.get(`balance:total_assets:${latestY}:ANNUAL`)?.v ?? null : null,
      prevY ? fin.facts.get(`balance:total_assets:${prevY}:ANNUAL`)?.v ?? null : null],
    ['حقوق الملكية',
      latestY ? fin.facts.get(`balance:total_equity:${latestY}:ANNUAL`)?.v ?? null : null,
      prevY ? fin.facts.get(`balance:total_equity:${prevY}:ANNUAL`)?.v ?? null : null],
  ]

  return (
    <section className="fn-overview" aria-label="نظرة عامة على الأداء المالي">
      <div className="fn-panel fn-spine">
        <div className="fn-table-head">
          <h2>{fin.template === 'bank' ? 'الدخل التشغيلي والأرباح' : 'الإيرادات والأرباح'}</h2>
          <span className="fn-unit">القيم بـ<b>{unit.label}</b></span>
        </div>
        <TrendChart series={withData} unit={unit} />
      </div>

      <div className="fn-panel fn-headline">
        <div className="fn-table-head">
          <h2>آخر سنة مالية</h2>
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
                  {d == null ? <span className="mv-dash" title="لا توجد سنة سابقة للمقارنة">—</span>
                    : <bdi className={d > 0 ? 'positive' : d < 0 ? 'negative' : ''}>
                        {d > 0 ? '+' : ''}{(d * 100).toFixed(1)}%
                      </bdi>}
                </dd>
              </div>
            )
          })}
        </dl>
        <p className="fn-fine">
          مقارنة سنوية بين آخر سنتين ماليتين مُفصح عنهما لشركة {name}.
        </p>
      </div>
    </section>
  )
}

function TrendChart({ series, unit }: {
  series: { y: number; rev: number | null; ni: number | null }[]
  unit: { div: number; label: string }
}) {
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
                <span><em>الإيرادات</em><bdi>{fmtUnit(s.rev, unit)}</bdi></span>
                <span><em>صافي الربح</em><bdi>{fmtUnit(s.ni, unit)}</bdi></span>
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
        <span><i className="rev" aria-hidden="true" />الإيرادات</span>
        <span><i className="ni" aria-hidden="true" />صافي الربح</span>
        {anyNegative ? <span className="fn-trend-neg">الأعمدة الحمراء خسائر</span> : null}
      </figcaption>
    </figure>
  )
}

/* ── One statement ────────────────────────────────────────────────────────── */
function Statement({ fin, statement, cols, hoverCol, setHoverCol }: {
  fin: Financials; statement: StatementId; cols: ColMeta[]
  hoverCol: string | null; setHoverCol: (c: string | null) => void
}) {
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
        <strong>لم تُنشر هذه القائمة لهذه الشركة</strong>
        <p>
          لا تتضمّن التقارير المستخرجة لهذه الشركة {def.label} في أي من الفترات المتاحة.
          باقي القوائم والنسب معروضة كالمعتاد.
        </p>
      </div>
    )
  }

  return (
    <section className="fn-panel fn-statement" aria-label={def.label}>
      <div className="fn-table-head">
        <h2>{def.label}</h2>
        {/* The unit, stated once, where it governs. Not repeated per cell. */}
        <span className="fn-unit">
          {isPct ? 'القيم بالنسبة المئوية' : <>القيم بـ<b>{unit.label}</b></>}
        </span>
      </div>

      <div className="fn-scroll">
        <table className="fn-table">
          <caption className="sr-only">
            {def.label} — {colLabel(cols[cols.length - 1].col)} إلى {colLabel(cols[0].col)}
          </caption>
          <thead>
            <tr>
              <th scope="col" className="fn-col-item">البند</th>
              {cols.map(c => {
                const id = colKey(c.col)
                return (
                  <th key={id} scope="col" className="fn-col-num"
                    data-hover={hoverCol === id || undefined}
                    onPointerEnter={() => setHoverCol(id)} onPointerLeave={() => setHoverCol(null)}>
                    <bdi>{colLabel(c.col)}</bdi>
                    {/* Provenance on the column it belongs to: the filing, and
                        the unit that filing declared. */}
                    {c.pdfUrl ? (
                      <a className="fn-col-src" href={c.pdfUrl} target="_blank" rel="noopener noreferrer"
                        aria-label={`تقرير ${colLabel(c.col)} — يفتح ملف PDF على موقع هيئة الأوراق المالية`}>
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
                      {l.ar}
                      {src && src !== l.ar ? (
                        <i className="fn-src" tabIndex={0} role="note"
                          aria-label={`المسمى في المصدر: ${src}`}
                          data-help={`المسمى في المصدر: ${src}`}>ⓘ</i>
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
                              ? 'وردت قيمتان مختلفتان لهذا البند في الاستخراج، ولم يمكن ترجيح إحداهما'
                              : 'غير متوفر في التقرير'}>—</span>
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
        <span><span className="mv-dash">—</span> غير متوفر في التقرير</span>
        <span>كل عمود فترة مُفصح عنها كما وردت، دون احتساب أو اشتقاق.</span>
      </p>
    </section>
  )
}

/* ── Ratios ───────────────────────────────────────────────────────────────
   A matrix, not twenty cards: ratio down, year across. «ROE 14%» says little;
   «ROE 21 → 17 → 14» says the thing you came for. */
function Ratios({ fin }: { fin: Financials }) {
  const years = [...fin.years].reverse().slice(0, 6)
  const groups = RATIO_GROUPS
    .map(g => ({ ...g, keys: g.keys.filter(k => years.some(y => fin.ratios.get(`${k}:${y}`) != null)) }))
    .filter(g => g.keys.length)

  if (!groups.length) {
    return (
      <div className="cd-nodata cd-nodata-wide">
        <strong>لا تتوفر نسب مالية محتسبة لهذه الشركة</strong>
        <p>تُحتسب النسب من القوائم المستخرجة، ولم تتوفر بنود كافية لاحتسابها.</p>
      </div>
    )
  }

  return (
    <section className="fn-panel fn-statement" aria-label="النسب المالية">
      <div className="fn-table-head">
        <h2>النسب المالية</h2>
        <span className="fn-unit">محتسبة من القوائم السنوية</span>
      </div>
      <div className="fn-scroll">
        <table className="fn-table fn-ratios">
          <thead>
            <tr>
              <th scope="col" className="fn-col-item">النسبة</th>
              {years.map(y => <th key={y} scope="col" className="fn-col-num"><bdi>{y}</bdi></th>)}
              <th scope="col" className="fn-col-trend">الاتجاه</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(g => (
              <Fragment key={g.ar}>
                <tr className="fn-group-row">
                  <th scope="colgroup" colSpan={years.length + 2}>{g.ar}</th>
                </tr>
                {g.keys.map(k => {
                  const def = RATIOS[k]
                  const vals = years.map(y => fin.ratios.get(`${k}:${y}`) ?? null)
                  return (
                    <tr key={k}>
                      <th scope="row" className="fn-col-item">
                        <span>{def.ar}</span>
                        <i className="fn-help" tabIndex={0} role="note" aria-label={def.help} data-help={def.help}>؟</i>
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
  const units = fin.reportedUnits.map(u => UNIT_AR[u] ?? u)
  return (
    <footer className="fn-provenance">
      <dl>
        <div><dt>المصدر</dt><dd>التقارير المنشورة · هيئة الأوراق المالية العراقية</dd></div>
        <div>
          <dt>آخر فترة مُفصح عنها</dt>
          <dd>{fin.latest ? <bdi>{colLabel(fin.latest.col)}</bdi> : <span className="mv-dash">—</span>}</dd>
        </div>
        <div><dt>الفترات المعروضة</dt><dd><bdi>{fin.annualCols.length + fin.quarterCols.length}</bdi></dd></div>
        <div>
          <dt>الوحدة في التقرير</dt>
          <dd>{units.length ? units.join(' · ') : <span className="mv-dash">—</span>}</dd>
        </div>
        <div><dt>العملة</dt><dd>الدينار العراقي (IQD)</dd></div>
      </dl>
      <p>
        القيم معروضة بالدينار بعد توحيد وحدة التقرير، والوحدة كما وردت في كل إفصاح مذكورة أعلاه.
        تُعرض كل فترة كما وردت في إفصاحها، ولا تُشتق فترات غير منشورة ولا تُجمع الأعمدة الربعية.
        قد تختلف تسمية البنود عن التقرير الأصلي — التسمية الأصلية متاحة على البند حيث توفرت.
        {fin.conflicts > 0 ? (
          <> وردت <bdi>{fin.conflicts}</bdi> قيمة متعارضة في الاستخراج لهذه الشركة، وتظهر خاناتها فارغة.</>
        ) : null}
        {' '}الأرقام لأغراض معلوماتية ولا تُغني عن التقرير الأصلي.
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
  const cols = [...fin.annualCols, ...fin.quarterCols]
  return (
    <>
      <div className="cd-nodata cd-nodata-wide fn-empty">
        <strong>القوائم المالية لهذه الشركة غير معروضة حالياً</strong>
        <p>
          تُعرض القوائم بعد توحيد وحدة القياس الواردة في كل إفصاح. لم يكتمل توحيد الوحدة
          في البيانات المستخرجة لشركة {name}، ولذلك لا تُعرض الأرقام بدل عرض قيم قد تكون
          غير صحيحة بمقدار ألف ضعف. لا يتعلق ذلك بالتقارير التي نشرتها الشركة — وهي متاحة
          أدناه كما هي.
        </p>
        <div className="cd-nodata-still">
          <span className="cd-cell-label">ما يزال متوفراً</span>
          <p>
            التقارير الأصلية المنشورة، والسعر التاريخي وبيانات الجلسة والقيمة السوقية
            والأداء مقابل المؤشر في صفحة الشركة.
          </p>
        </div>
        <Link className="fn-empty-link" href={`/c/${sym.toLowerCase()}`}>العودة إلى صفحة الشركة ←</Link>
      </div>

      {cols.some(c => c.pdfUrl) ? (
        <section className="fn-panel" aria-label="التقارير الأصلية">
          <div className="fn-table-head">
            <h2>التقارير الأصلية</h2>
            <span className="fn-unit">كما نُشرت لدى هيئة الأوراق المالية</span>
          </div>
          <ul className="fn-filings">
            {cols.filter(c => c.pdfUrl).map(c => (
              <li key={colKey(c.col)}>
                <a href={c.pdfUrl as string} target="_blank" rel="noopener noreferrer"
                  aria-label={`تقرير ${colLabel(c.col)} — يفتح ملف PDF على موقع هيئة الأوراق المالية`}>
                  <i aria-hidden="true">PDF</i>
                  <bdi>{colLabel(c.col)}</bdi>
                  {c.reportedUnit ? <small>الوحدة في التقرير: {UNIT_AR[c.reportedUnit] ?? c.reportedUnit}</small> : null}
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
  return (
    <div className="cd-nodata cd-nodata-wide fn-empty">
      <strong>لم تُنشر بيانات مالية لهذه الشركة بعد</strong>
      <p>
        تُستخرج القوائم المالية من التقارير المنشورة لدى هيئة الأوراق المالية العراقية.
        لم يُنشر لشركة {name} تقرير قابل للاستخراج حتى الآن.
      </p>
      <div className="cd-nodata-still">
        <span className="cd-cell-label">ما يزال متوفراً</span>
        <p>السعر التاريخي، بيانات الجلسة، القيمة السوقية، والأداء مقابل المؤشر في صفحة الشركة.</p>
      </div>
      <Link className="fn-empty-link" href={`/c/${sym.toLowerCase()}`}>العودة إلى صفحة الشركة ←</Link>
    </div>
  )
}

const Skeleton = ({ lines }: { lines: number }) => (
  <div className="fn-skel" aria-hidden="true">
    {Array.from({ length: lines }).map((_, i) => <i key={i} />)}
  </div>
)
