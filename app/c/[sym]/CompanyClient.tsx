'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import { CompanyLogo } from '@/components/CompanyLogo'
import { CompanyChart } from '@/components/company/CompanyChart'
import {
  fetchLive, mergeCompanies, companyName, SECTORS, isSuspended,
} from '@/lib/market'
import {
  buildReturns, earningsSeries, latestAnnual, latestRatios, ownershipFor, holdersFor,
  ISX60_REBASE,
  type Returns, type EarnPeriod, type FactRow, type RatioRow,
  type OwnershipRow, type ShareholderRow, type Holder,
} from '@/lib/companyView'
import { usableName, iqd, nf0 } from '@/lib/statistics'
import { arFull } from '@/lib/statistics'
import companiesData from '@/public/data/companies.json'
import type { Company, CompanyMeta } from '@/types'
import '@/styles/panels.css'
import './company.css'

/**
 * صفحة الشركة — a direct port of the approved company page.
 *
 * The composition is the reference's and so is the order it asks its question
 * in: identity and price, then what the price has been doing, then what it did
 * this session, then whether the business earns anything, then who owns it,
 * then who it is. What differs is that every number is real, and that three
 * modules the reference could always render are conditional here because the
 * data behind them genuinely is.
 *
 * The rules that outrank the mock:
 *
 *   · `noPrior` is not zero. A company with no comparable prior close shows
 *     «—» and a reason, never «0.00%», and the flag comes from the shared
 *     market layer rather than being re-derived here.
 *   · A suspended listing is a different page, not a page with a banner. Its
 *     price is not a price and its market cap is not a valuation, so both are
 *     suppressed rather than printed in a lighter grey.
 *   · Nothing is filled in with a zero because a slot exists. A ratio the
 *     extraction never produced is absent with a reason on hover.
 *   · A derived quarter says so. Q4 is not filed — it is the annual less the
 *     first three quarters — and it carries «≈» wherever it is printed.
 *
 * Not ported: the design-mode company picker, state picker and theme toggle,
 * and the price-alert button. Alerts were removed from the product, and a
 * control that opens nothing is worse than no control.
 */

const SECTIONS = [
  { id: 'overview', label: 'نظرة عامة' },
  { id: 'chart', label: 'السعر' },
  { id: 'fundamentals', label: 'الأساسيات' },
  { id: 'ownership', label: 'الملكية' },
  { id: 'about', label: 'عن الشركة' },
] as const

const SECTOR_AR = new Map(SECTORS.filter(s => s.id !== 'all').map(s => [s.id, s.arFull]))

type Loaded = {
  co: Company
  metric: MetricRow | null
  returns: Returns | null
  bench: Returns | null
  facts: FactRow[]
  ratios: RatioRow[]
  ownership: OwnershipRow | null
  holders: Holder[]
  foreign: { buy: number; sell: number; net: number; sessions: number } | null
}
type MetricRow = {
  ticker: string; sector: string | null; name_ar: string | null; name_en: string | null
  last_close: number | null; prev_close: number | null
  high_52w: number | null; low_52w: number | null; days_since_trade: number | null
  last_date: string | null
}

export function CompanyClient({ sym }: { sym: string }) {
  const { theme, watchlist, toggleWatchlist } = useApp()
  const [data, setData] = useState<Loaded | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'notfound' | 'error'>('loading')
  const [mode, setMode] = useState<'annual' | 'quarterly'>('quarterly')
  const [section, setSection] = useState<string>('overview')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const meta = companiesData as CompanyMeta[]
        const known = meta.find(m => m.sym === sym)
        if (!known) { if (alive) setState('notfound'); return }

        const [live, mRes, fRes, rRes, oRes, hRes, ffRes, chart, idx] = await Promise.all([
          fetchLive(),
          sb.from('company_metrics')
            .select('ticker,sector,name_ar,name_en,last_close,prev_close,high_52w,low_52w,days_since_trade,last_date')
            .eq('ticker', sym).limit(1),
          sb.from('financial_facts_public')
            .select('fiscal_year,period,line_key,value_iqd')
            .eq('ticker', sym).eq('statement', 'income')
            .in('line_key', ['revenue', 'net_income', 'financing_income', 'revenue_and_commissions']),
          sb.from('financial_ratios_public').select('fiscal_year,period,ratio_key,value').eq('ticker', sym),
          sb.from('ownership_monthly').select('year,month,name_ar,capital,deposited_capital,deposit_ratio,iraqi_shares,foreign_shares,iraqi_count,foreign_count').limit(2000),
          sb.from('major_shareholders').select('year,month,company_name_ar,rank,name_ar,nationality,curr_shares,curr_pct,prev_pct,change_pct').limit(4000),
          // Long-form: one row per side per session, not a buy/sell column
          // pair. Same shape lib/foreignFlow.ts folds for /statistics.
          sb.from('foreign_flow_company_daily').select('date,side,value').eq('ticker', sym).order('date', { ascending: false }).limit(120),
          fetch(`/api/chart/${sym}`).then(r => r.json()).catch(() => []),
          loadIndex(sb),
        ])
        if (!alive) return

        const merged = mergeCompanies(meta, live.stocks)
        const co = merged.find(c => c.sym === sym)
        if (!co) { setState('notfound'); return }

        const series = Array.isArray(chart)
          ? (chart as { date: string; close: number | null }[])
              .filter(r => r.close != null && r.close > 0)
              .map(r => ({ t: Date.parse(r.date + 'T00:00:00Z'), v: r.close as number }))
          : []

        const ffAll = (ffRes.data ?? []) as { date: string; side: string; value: number | null }[]
        // The 30 most recent SESSIONS, not the 30 most recent rows — a session
        // with both a buy and a sell side is two rows.
        const days = Array.from(new Set(ffAll.map(r => r.date))).sort().slice(-30)
        const ff = ffAll.filter(r => days.includes(r.date))
        const buy = ff.filter(r => r.side === 'buy').reduce((a, r) => a + (r.value ?? 0), 0)
        const sell = ff.filter(r => r.side === 'sell').reduce((a, r) => a + (r.value ?? 0), 0)

        setData({
          co,
          metric: ((mRes.data ?? [])[0] as MetricRow) ?? null,
          returns: buildReturns(series),
          bench: buildReturns(idx),
          facts: (fRes.data ?? []) as FactRow[],
          ratios: (rRes.data ?? []) as RatioRow[],
          ownership: ownershipFor((oRes.data ?? []) as OwnershipRow[], sym, meta),
          holders: holdersFor((hRes.data ?? []) as ShareholderRow[], sym, meta),
          foreign: days.length ? { buy, sell, net: buy - sell, sessions: days.length } : null,
        })
        setState('ready')
      } catch {
        if (alive) setState('error')
      }
    })()
    return () => { alive = false }
  }, [sym])

  const loading = state === 'loading'
  const co = data?.co ?? null
  const suspended = co ? isSuspended(co) : false
  // Traded in the latest session? A carried-forward row is not this session's.
  const quiet = Boolean(co?.stale) && !suspended
  const noPrior = Boolean(co?.noPrior)

  const series = useMemo(() => (data ? earningsSeries(data.facts, mode) : []), [data, mode])
  const annualSeries = useMemo(() => (data ? earningsSeries(data.facts, 'annual') : []), [data])
  const ratios = useMemo(() => (data ? latestRatios(data.ratios) : { year: null, map: {} }), [data])
  const hasFin = (data?.facts.length ?? 0) > 0 || Object.keys(ratios.map).length > 0

  if (state === 'notfound') return <NotFound sym={sym} />
  if (state === 'error') return <PageError sym={sym} />

  const name = co ? companyName({ ar: usableName(co.ar) ? co.ar : null, en: usableName(co.en) ? co.en : null }, sym) : sym
  const nameEn = co && usableName(co.en) && /[A-Za-z]/.test(co.en) ? co.en : null
  const shares = co?.shares ?? null
  const mcap = co && shares && !suspended ? co.close * shares : null

  const annRev = latestAnnual(annualSeries, 'rev')
  const annNi = latestAnnual(annualSeries, 'ni')
  const isBank = co?.sec === 'BANK'
  const eps = ratios.map.eps ?? null
  const pe = eps && eps > 0 && co ? co.close / eps : null

  return (
    <main className="cd-page iq-page">
      <nav className="cd-crumbs" aria-label="مسار التصفح">
        <ol>
          <li><Link href="/market">السوق</Link></li>
          <li><Link href="/companies">الشركات</Link></li>
          <li aria-current="page">{name}</li>
        </ol>
      </nav>

      <header className="cd-identity">
        <div className="cd-id-main">
          <span className={`cd-mark ${co?.logo ? 'has-logo' : ''}`} aria-hidden="true">
            {co?.logo
              ? <CompanyLogo className="cd-mark-img" sym={sym} logo={co.logo} color={co.color} />
              : sym.slice(0, 2)}
          </span>
          <div className="cd-id-text">
            <h1 title={name}>{name}</h1>
            <p className="cd-id-meta">
              <bdi className="cd-ticker">{sym}</bdi>
              <span className="cd-sep" aria-hidden="true">·</span>
              {co ? <Link href={`/market?sector=${co.sec}`}>{SECTOR_AR.get(String(co.sec)) ?? String(co.sec)}</Link> : null}
              <span className="cd-sep" aria-hidden="true">·</span>
              <span>بورصة العراق</span>
            </p>
            {/* Supporting metadata, in its own LTR island. Rendered only when
                there genuinely is a Latin name. */}
            {nameEn ? <p className="cd-id-en" dir="ltr">{nameEn}</p> : null}
          </div>
        </div>

        <div className="cd-id-price">
          {loading || !co ? (
            <span className="cd-skel" aria-hidden="true">
              <i style={{ inlineSize: '132px', blockSize: '32px' }} />
              <i style={{ inlineSize: '104px' }} />
              <i style={{ inlineSize: '150px', blockSize: '9px' }} />
            </span>
          ) : suspended ? (
            <>
              <span className="cd-price-label">آخر صفقة فعلية</span>
              <strong className="cd-price cd-price-dead">
                <bdi>{nfPrice(co.close)}</bdi><small>IQD</small>
              </strong>
              <span className="cd-state cd-state-dead">
                موقوف عن التداول{co.lastTrade ? <> · {arFull(co.lastTrade)}</> : null}
              </span>
            </>
          ) : (
            <>
              <strong className="cd-price"><bdi>{nfPrice(co.close)}</bdi><small>IQD</small></strong>
              {quiet ? (
                <span className="cd-change cd-change-none">
                  <span className="mv-dash" aria-hidden="true">—</span>
                  لم يُتداول في هذه الجلسة
                </span>
              ) : noPrior ? (
                <span className="cd-change cd-change-none">
                  <span className="mv-dash" aria-hidden="true">—</span>
                  لا يوجد إغلاق سابق للمقارنة
                </span>
              ) : (
                <span className={`cd-change ${co.change > 0 ? 'positive' : co.change < 0 ? 'negative' : 'neutral'}`}>
                  <bdi>{signedPrice(co.change)}</bdi>
                  <bdi className="cd-change-pct">{signed(co.pct, 2)}%</bdi>
                </span>
              )}
              <span className="cd-state">
                <i aria-hidden="true" />
                {quiet && co.lastTrade
                  ? <>آخر تداول {arFull(co.lastTrade)}</>
                  : data?.metric?.last_date
                    ? <>إغلاق جلسة {arFull(data.metric.last_date)}</>
                    : <>آخر جلسة متاحة</>}
              </span>
            </>
          )}
        </div>

        <div className="cd-id-actions">
          <button type="button" className={`cd-action ${watchlist.includes(sym) ? 'is-on' : ''}`}
            aria-pressed={watchlist.includes(sym)} onClick={() => toggleWatchlist(sym)}>
            <i aria-hidden="true">★</i>
            {watchlist.includes(sym) ? 'في المتابعة' : 'متابعة'}
          </button>
          <Link className="cd-action" href={`/c/${sym.toLowerCase()}/financials`}>
            <i aria-hidden="true">▤</i>البيانات المالية
          </Link>
        </div>
      </header>

      <nav className="cd-anchors" aria-label="أقسام الصفحة">
        {SECTIONS.map(s => (
          <a key={s.id} href={`#${s.id}`}
            aria-current={section === s.id ? 'true' : undefined}
            onClick={() => setSection(s.id)}>{s.label}</a>
        ))}
        <Link className="cd-anchors-out" href={`/c/${sym.toLowerCase()}/financials`}>
          البيانات المالية <i aria-hidden="true">←</i>
        </Link>
      </nav>

      <section className="cd-market" id="chart" aria-label="السعر وبيانات الجلسة">
        <div className="cd-chart">
          <CompanyChart sym={sym} name={name} />
          {data?.metric?.low_52w != null && data.metric.high_52w != null && co ? (
            <div className="cd-plot-foot">
              <span className="cd-plot-band">
                {suspended ? 'مدى آخر 52 أسبوع تداول' : 'مدى 52 أسبوعاً'} <bdi>{nfPrice(data.metric.low_52w)}</bdi>
                <span className="cd-plot-track" role="img"
                  aria-label={`السعر عند ${bandPos(co.close, data.metric.low_52w, data.metric.high_52w).toFixed(0)}% من مدى 52 أسبوعاً`}>
                  <i style={{ insetInlineStart: `${bandPos(co.close, data.metric.low_52w, data.metric.high_52w)}%` }} />
                </span>
                <bdi>{nfPrice(data.metric.high_52w)}</bdi>
              </span>
            </div>
          ) : null}
        </div>

        <SessionRail
          co={co} loading={loading} suspended={suspended} quiet={quiet} noPrior={noPrior}
          prevClose={data?.metric?.prev_close ?? null} mcap={mcap} shares={shares} pe={pe} />
      </section>

      {/* Suppressed on a suspended listing: its price series ends on the day it
          stopped trading, so a five-year return against a live index would be
          the most confident-looking wrong answer this page could give. */}
      {suspended ? null : (
        <section className="cd-band-row" id="overview" aria-label="الأداء">
          <Performance sym={sym} co={data?.returns ?? null} bm={data?.bench ?? null} loading={loading} />
          {data?.foreign ? <ForeignPanel f={data.foreign} loading={loading} /> : null}
        </section>
      )}

      <section id="fundamentals" aria-label="الأساسيات">
        <SectionHead title="الأساسيات"
          note={hasFin && ratios.year ? `النسب محسوبة على آخر سنة مالية مكتملة (${ratios.year}) وآخر ربع مُعلن.` : undefined}
          link={{ href: `/c/${sym.toLowerCase()}/financials`, label: 'القوائم المالية الكاملة' }} />
        {loading ? <FundSkeleton /> : hasFin ? (
          <>
            <Fundamentals
              isBank={isBank} mcap={mcap} pe={pe} eps={eps} r={ratios.map}
              annRev={annRev} annNi={annNi} />
            {series.length ? <Earnings isBank={isBank} series={series} mode={mode} setMode={setMode} sym={sym} /> : null}
          </>
        ) : <NoFinancials name={name} hasOwnership={Boolean(data?.ownership)} />}
      </section>

      <section id="ownership" aria-label="الملكية والمساهمون">
        <SectionHead title="الملكية والمساهمون"
          note={data?.ownership ? `وفق إيداعات ${data.ownership.month}/${data.ownership.year} لدى مركز الإيداع.` : undefined} />
        {loading ? <OwnSkeleton /> : (data?.ownership || data?.holders.length)
          ? <Ownership o={data.ownership} holders={data.holders} />
          : <NoData
              title="لا تتوفر بيانات ملكية لهذه الشركة"
              body="لم تُنشر إيداعات مركز الإيداع لهذه الشركة في آخر تحديث شهري. تُضاف تلقائياً عند توفرها." />}
      </section>

      <p className="cd-footnote">
        الأسعار من النشرة الرسمية لبورصة العراق · القيمة السوقية = آخر سعر × الأسهم المصدرة ·
        البيانات المالية مستخرجة من التقارير المنشورة للشركة، وتُعرض كما وردت دون اشتقاق فترات غير مُفصح عنها.
      </p>
    </main>
  )
}

/* ── Session rail ─────────────────────────────────────────────────────────
   Not eight KPI cards. Four groups, hairline-separated, beside the chart
   because that is what you read them against. */
function SessionRail({ co, loading, suspended, quiet, noPrior, prevClose, mcap, shares, pe }: {
  co: Company | null; loading: boolean; suspended: boolean; quiet: boolean; noPrior: boolean
  prevClose: number | null; mcap: number | null; shares: number | null; pe: number | null
}) {
  if (loading || !co) return <RailSkeleton />

  if (suspended) {
    return (
      <aside className="cd-rail">
        <div className="cd-rail-dead">
          <strong>لا توجد بيانات جلسة</strong>
          <p>
            {co.lastTrade ? <>آخر صفقة فعلية على هذا السهم كانت بتاريخ {arFull(co.lastTrade)} بسعر{' '}</> : <>آخر سعر مسجّل هو{' '}</>}
            <bdi>{nfPrice(co.close)}</bdi> دينار. لا تُحتسب قيمة سوقية للسهم الموقوف،
            لأنها ستكون سعراً قديماً مضروباً بعدد أسهم حالي.
          </p>
        </div>
        {shares ? <RailRow label="الأسهم المصدرة" value={<bdi>{iqd(shares)}</bdi>} /> : null}
      </aside>
    )
  }

  return (
    <aside className="cd-rail" aria-label="بيانات الجلسة">
      <div className="cd-rail-group">
        <span className="cd-cell-label">نطاق الجلسة</span>
        {quiet ? (
          <p className="cd-rail-note">
            لم يُتداول السهم في هذه الجلسة. الأرقام أدناه من آخر جلسة تداول فعلية له.
          </p>
        ) : (
          <div className="cd-daybar">
            <div className="cd-daybar-track" role="img"
              aria-label={`أدنى ${co.low} وأعلى ${co.high} والإغلاق ${co.close}`}>
              <i style={{ insetInlineStart: `${bandPos(co.close, co.low, co.high)}%` }} />
            </div>
            <div className="cd-daybar-ends">
              <span><em>أدنى</em><bdi>{nfPrice(co.low || co.close)}</bdi></span>
              <span><em>أعلى</em><bdi>{nfPrice(co.high || co.close)}</bdi></span>
            </div>
          </div>
        )}
      </div>

      <div className="cd-rail-group">
        <RailRow label="الافتتاح" value={quiet || !co.open ? <Dash /> : <bdi>{nfPrice(co.open)}</bdi>} />
        <RailRow label="إغلاق سابق"
          value={noPrior || prevClose == null ? <Dash hint="لا يوجد إغلاق سابق قابل للمقارنة" /> : <bdi>{nfPrice(prevClose)}</bdi>} />
      </div>

      <div className="cd-rail-group">
        <RailRow label="قيمة التداول" strong value={quiet ? <Dash /> : <><bdi>{iqd(co.vol)}</bdi><small>IQD</small></>} />
        <RailRow label="الحجم" value={quiet ? <Dash /> : <><bdi>{nf0.format(co.shares_traded)}</bdi><small>سهم</small></>} />
        <RailRow label="الصفقات" value={quiet ? <Dash /> : <bdi>{nf0.format(co.deals)}</bdi>} />
      </div>

      <div className="cd-rail-group">
        <RailRow label="القيمة السوقية" strong
          value={mcap ? <><bdi>{iqd(mcap)}</bdi><small>IQD</small></> : <Dash />} />
        <RailRow label="الأسهم المصدرة" value={shares ? <bdi>{iqd(shares)}</bdi> : <Dash />} />
        <RailRow label="مكرر الربحية"
          value={pe ? <bdi>{pe.toFixed(1)}×</bdi> : <Dash hint="لم تُستخرج بيانات مالية كافية" />} />
      </div>
    </aside>
  )
}

function RailRow({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className={`cd-rail-row ${strong ? 'is-strong' : ''}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

/* ── Performance ──────────────────────────────────────────────────────────
   One aligned instrument rather than four cards: a shared zero, two bars per
   row, and the figures stated rather than left to be computed by eye. */
function Performance({ sym, co, bm, loading }: {
  sym: string; co: Returns | null; bm: Returns | null; loading: boolean
}) {
  const rows = [
    { label: 'منذ بداية العام', c: co?.ytd ?? null, b: bm?.ytd ?? null },
    { label: 'سنة', c: co?.y1 ?? null, b: bm?.y1 ?? null },
    { label: '3 سنوات', c: co?.y3 ?? null, b: bm?.y3 ?? null },
    { label: '5 سنوات', c: co?.y5 ?? null, b: bm?.y5 ?? null },
  ].map(r => ({ ...r, c: r.c == null ? null : r.c * 100, b: r.b == null ? null : r.b * 100 }))
  const max = Math.max(20, ...rows.flatMap(r => [Math.abs(r.c ?? 0), Math.abs(r.b ?? 0)]))

  return (
    <div className="cd-panel">
      <div className="cd-panel-head">
        <h2>الأداء مقابل المؤشر</h2>
        <span className="cd-panel-note">عوائد سعرية تراكمية · المؤشر المرجعي <b>ISX60</b></span>
      </div>
      {loading ? <div className="cd-lines" aria-hidden="true">{[0, 1, 2, 3].map(i => <i key={i} />)}</div> : (
        <div className="cd-perf">
          {rows.map(r => (
            <div className="cd-perf-row" key={r.label}>
              <span className="cd-perf-label">{r.label}</span>
              <div className="cd-perf-bars">
                <PerfBar value={r.c} max={max} kind="co" />
                <PerfBar value={r.b} max={max} kind="bm" />
              </div>
              <span className="cd-perf-values">
                <bdi className={tone(r.c ?? 0)}>{r.c == null ? '—' : `${signed(r.c, 1)}%`}</bdi>
                <bdi className="cd-perf-bm">{r.b == null ? '—' : `${signed(r.b, 1)}%`}</bdi>
              </span>
            </div>
          ))}
          <div className="cd-perf-legend">
            <span><i className="co" aria-hidden="true" />{sym}</span>
            <span><i className="bm" aria-hidden="true" />ISX60</span>
          </div>
        </div>
      )}
    </div>
  )
}

function PerfBar({ value, max, kind }: { value: number | null; max: number; kind: 'co' | 'bm' }) {
  if (value == null) return <span className={`cd-perf-bar ${kind} empty`} />
  const w = (Math.min(Math.abs(value), max) / max) * 50
  return (
    <span className={`cd-perf-bar ${kind} ${value < 0 ? 'neg' : 'pos'}`}>
      <i style={{ inlineSize: `${w}%`, [value < 0 ? 'insetInlineEnd' : 'insetInlineStart']: '50%' } as React.CSSProperties} />
    </span>
  )
}

function ForeignPanel({ f, loading }: {
  f: { buy: number; sell: number; net: number; sessions: number }; loading: boolean
}) {
  const total = f.buy + f.sell || 1
  return (
    <div className="cd-panel">
      <div className="cd-panel-head">
        <h2>تداول المستثمرين الأجانب</h2>
        <span className="cd-panel-note">آخر <bdi>{f.sessions}</bdi> جلسة مسجّلة</span>
      </div>
      {loading ? <div className="cd-lines" aria-hidden="true">{[0, 1, 2].map(i => <i key={i} />)}</div> : (
        <div className="cd-foreign">
          <div className="cd-foreign-net">
            <span className="cd-cell-label">صافي التدفق</span>
            <strong className={tone(f.net)}>
              <bdi>{f.net >= 0 ? '+' : '−'}{iqd(Math.abs(f.net))}</bdi><small>IQD</small>
            </strong>
            <span className="cd-foreign-sub">{f.net >= 0 ? 'شراء صافٍ' : 'بيع صافٍ'}</span>
          </div>
          <div className="cd-foreign-split">
            <div className="cd-foreign-bar" role="img" aria-label={`شراء ${iqd(f.buy)} وبيع ${iqd(f.sell)}`}>
              <i className="buy" style={{ inlineSize: `${(f.buy / total) * 100}%` }} />
              <i className="sell" style={{ inlineSize: `${(f.sell / total) * 100}%` }} />
            </div>
            <div className="cd-foreign-keys">
              <span className="buy"><em>شراء</em><bdi>{iqd(f.buy)}</bdi></span>
              <span className="sell"><em>بيع</em><bdi>{iqd(f.sell)}</bdi></span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Fundamentals ─────────────────────────────────────────────────────────
   Two columns of label/value pairs, not cards. Every row is a real ratio_key
   or a real fact; nothing is filled with a zero when the line was never
   reported. Banks get their own right-hand set. */
function Fundamentals({ isBank, mcap, pe, eps, r, annRev, annNi }: {
  isBank: boolean; mcap: number | null; pe: number | null; eps: number | null
  r: Record<string, number>
  annRev: { value: number | null; year: number | null }
  annNi: { value: number | null; year: number | null }
}) {
  // Margin on the SAME basis as the two lines above it, so the three
  // reconcile. Both are the last audited year, not a trailing twelve months —
  // see the note in lib/companyView.ts on why a TTM is not available here.
  const margin = !isBank && annRev.value && annNi.value != null ? annNi.value / annRev.value : null
  const yr = (y: number | null) => (y ? ` ${y}` : '')

  const valuation: [string, string | null][] = [
    ['القيمة السوقية', mcap ? `${iqd(mcap)} IQD` : null],
    ['مكرر الربحية', pe ? `${pe.toFixed(2)}×` : null],
    ['السعر / القيمة الدفترية', r.pb ? `${r.pb.toFixed(2)}×` : null],
    ['السعر / المبيعات', r.ps ? `${r.ps.toFixed(2)}×` : null],
    ['ربحية السهم', eps ? `${eps.toFixed(3)} IQD` : null],
    ['القيمة الدفترية للسهم', r.bvps ? `${r.bvps.toFixed(2)} IQD` : null],
    ['عائد التوزيعات', r.dividend_yield ? `${(r.dividend_yield * 100).toFixed(2)}%` : null],
  ]
  const performance: [string, string | null][] = isBank
    ? [
        [`الدخل التشغيلي${yr(annRev.year)}`, annRev.value ? `${iqd(annRev.value)} IQD` : null],
        [`صافي الربح${yr(annNi.year)}`, annNi.value != null ? `${iqd(annNi.value)} IQD` : null],
        ['العائد على الأصول', r.roa ? `${(r.roa * 100).toFixed(2)}%` : null],
        ['العائد على حقوق الملكية', r.roe ? `${(r.roe * 100).toFixed(2)}%` : null],
        ['كفاية رأس المال', r.capital_adequacy_ratio ? `${(r.capital_adequacy_ratio * 100).toFixed(1)}%` : null],
        ['القروض إلى الودائع', r.loan_to_deposit ? `${(r.loan_to_deposit * 100).toFixed(1)}%` : null],
      ]
    : [
        [`الإيرادات${yr(annRev.year)}`, annRev.value ? `${iqd(annRev.value)} IQD` : null],
        [`صافي الربح${yr(annNi.year)}`, annNi.value != null ? `${iqd(annNi.value)} IQD` : null],
        ['هامش صافي الربح', margin != null ? `${(margin * 100).toFixed(2)}%` : null],
        ['العائد على الأصول', r.roa ? `${(r.roa * 100).toFixed(2)}%` : null],
        ['العائد على حقوق الملكية', r.roe ? `${(r.roe * 100).toFixed(2)}%` : null],
        ['الدين إلى حقوق الملكية', r.debt_to_equity != null ? `${(r.debt_to_equity * 100).toFixed(1)}%` : null],
      ]

  return (
    <div className="cd-fund">
      <FundColumn title="التقييم" rows={valuation} />
      <FundColumn
        title={isBank ? 'الربحية والملاءة' : 'الربحية والمركز المالي'}
        rows={performance}
        note={isBank
          ? 'المصارف لا تُفصح عن سطر إيرادات واحد؛ يُحتسب الدخل التشغيلي كصافي دخل التمويل مضافاً إليه صافي العمولات، ولذلك لا يُعرض هامش صافي الربح.'
          : undefined} />
    </div>
  )
}

function FundColumn({ title, rows, note }: {
  title: string; rows: [string, string | null][]; note?: string
}) {
  return (
    <div className="cd-fund-col">
      <h3>{title}</h3>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label} className={value ? '' : 'is-absent'}>
            <dt>{label}</dt>
            <dd>{value ? <bdi>{value}</bdi> : <span className="mv-dash" title="غير متوفر في البيانات المنشورة">—</span>}</dd>
          </div>
        ))}
      </dl>
      {note ? <p className="cd-fund-note">{note}</p> : null}
    </div>
  )
}

function Earnings({ isBank, series, mode, setMode, sym }: {
  isBank: boolean; series: EarnPeriod[]; mode: 'annual' | 'quarterly'
  setMode: (m: 'annual' | 'quarterly') => void; sym: string
}) {
  const max = Math.max(1, ...series.flatMap(s => [Math.abs(s.rev ?? 0), Math.abs(s.ni ?? 0)]))
  const latest = series[series.length - 1]
  const margin = !isBank && latest?.rev && latest.ni != null ? latest.ni / latest.rev : null

  return (
    <div className="cd-panel cd-earn">
      <div className="cd-panel-head">
        <h2>{isBank ? 'الدخل التشغيلي والأرباح' : 'الإيرادات والأرباح'}</h2>
        <div className="cd-seg" role="group" aria-label="فترة التقرير">
          <button type="button" className={mode === 'quarterly' ? 'active' : ''}
            aria-pressed={mode === 'quarterly'} onClick={() => setMode('quarterly')}>ربعي</button>
          <button type="button" className={mode === 'annual' ? 'active' : ''}
            aria-pressed={mode === 'annual'} onClick={() => setMode('annual')}>سنوي</button>
        </div>
      </div>

      {latest ? (
        <p className="cd-earn-latest">
          <span>{latest.label}</span>
          <b>{isBank ? 'الدخل التشغيلي' : 'الإيرادات'}</b>
          <bdi>{latest.rev != null ? iqd(latest.rev) : '—'}</bdi>
          <b>صافي الربح</b>
          <bdi className={tone(latest.ni ?? 0)}>{latest.ni != null ? iqd(latest.ni) : '—'}</bdi>
          {margin != null ? <><b>الهامش</b><bdi className={tone(margin)}>{(margin * 100).toFixed(1)}%</bdi></> : null}
        </p>
      ) : null}

      <div className="cd-bars">
        {series.map(s => (
          <div className="cd-bar-col" key={`${s.year}-${s.period}`}>
            <div className="cd-bar-pair">
              <i className="rev" style={{ blockSize: `${(Math.abs(s.rev ?? 0) / max) * 100}%` }} />
              <i className={`ni ${(s.ni ?? 0) < 0 ? 'neg' : ''}`} style={{ blockSize: `${(Math.abs(s.ni ?? 0) / max) * 100}%` }} />
            </div>
            <span dir="ltr">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="cd-earn-legend">
        <span><i className="rev" aria-hidden="true" />{isBank ? 'الدخل التشغيلي' : 'الإيرادات'}</span>
        <span><i className="ni" aria-hidden="true" />صافي الربح</span>
        <Link href={`/c/${sym.toLowerCase()}/financials`}>القوائم المالية الكاملة ←</Link>
      </div>

      {/* Only filed periods are plotted. Nothing here is derived — the
          quarterly rows in this dataset do not reconcile with the annual
          filing in any company-year, so a computed quarter would be a number
          that agrees with nothing. */}
      <p className="cd-fund-note">
        تُعرض الفترات المُفصح عنها فقط، دون احتساب أي ربع غير منشور.
      </p>
    </div>
  )
}

function Ownership({ o, holders }: { o: OwnershipRow | null; holders: Holder[] }) {
  const iraqi = o?.iraqi_shares ?? 0, foreign = o?.foreign_shares ?? 0
  const tot = iraqi + foreign
  return (
    <div className="cd-own">
      {o && tot > 0 ? (
        <div className="cd-panel">
          <div className="cd-panel-head"><h2>تركيبة الملكية</h2></div>
          <div className="cd-own-split">
            <div className="cd-own-bar" role="img"
              aria-label={`عراقي ${((iraqi / tot) * 100).toFixed(1)}% وأجنبي ${((foreign / tot) * 100).toFixed(1)}%`}>
              <i className="iraqi" style={{ inlineSize: `${(iraqi / tot) * 100}%` }} />
              <i className="foreign" style={{ inlineSize: `${(foreign / tot) * 100}%` }} />
            </div>
            <div className="cd-own-keys">
              <span className="iraqi">
                <em>ملكية عراقية</em>
                <bdi>{((iraqi / tot) * 100).toFixed(1)}%</bdi>
                {o.iraqi_count != null ? <small><bdi>{nf0.format(o.iraqi_count)}</bdi> مساهم</small> : null}
              </span>
              <span className="foreign">
                <em>ملكية أجنبية</em>
                <bdi>{((foreign / tot) * 100).toFixed(1)}%</bdi>
                {o.foreign_count != null ? <small><bdi>{nf0.format(o.foreign_count)}</bdi> مساهم</small> : null}
              </span>
            </div>
          </div>
          <dl className="cd-own-facts">
            <div><dt>رأس المال المصرّح</dt><dd>{o.capital != null ? <bdi>{iqd(o.capital)}</bdi> : <Dash />}</dd></div>
            <div><dt>المودع لدى المركز</dt><dd>{o.deposited_capital != null ? <bdi>{iqd(o.deposited_capital)}</bdi> : <Dash />}</dd></div>
            <div><dt>نسبة الإيداع</dt><dd>{o.deposit_ratio != null ? <bdi>{o.deposit_ratio.toFixed(1)}%</bdi> : <Dash />}</dd></div>
          </dl>
        </div>
      ) : null}

      {holders.length ? (
        <div className="cd-panel">
          <div className="cd-panel-head">
            <h2>كبار المساهمين</h2>
            <span className="cd-panel-note">حسب آخر إفصاح شهري</span>
          </div>
          <ul className="cd-holders">
            {holders.map(h => (
              <li key={h.rank}>
                <span className="cd-holder-rank"><bdi>{h.rank}</bdi></span>
                <span className="cd-holder-name">
                  <strong title={h.name}>{h.name}</strong>
                  <small>{h.foreign ? 'أجنبي' : 'عراقي'}</small>
                </span>
                <span className="cd-holder-bar" aria-hidden="true">
                  <i style={{ inlineSize: `${Math.min(h.pct, 100)}%` }} data-foreign={h.foreign || undefined} />
                </span>
                <span className="cd-holder-pct"><bdi>{h.pct.toFixed(2)}%</bdi></span>
                {/* A change that was never filed is not a change of zero. */}
                <span className="cd-holder-chg">
                  {h.changePct == null
                    ? <span className="mv-dash" title="لا تتوفر مقارنة موثوقة بالإفصاح السابق">—</span>
                    : <bdi className={tone(h.changePct)}>{signed(h.changePct, 2)}</bdi>}
                </span>
              </li>
            ))}
          </ul>
          <p className="cd-fund-note">
            لا يتضمّن الإفصاح مقارنة موثوقة بالشهر السابق، ولذلك يظهر عمود التغيّر فارغاً بدل صفر.
          </p>
        </div>
      ) : (
        <NoData title="لم تُنشر قائمة كبار المساهمين"
          body="لا يتضمّن الإفصاح الشهري الأخير كبار مساهمي هذه الشركة." />
      )}
    </div>
  )
}

/* ── Shared bits ──────────────────────────────────────────────────────────── */

function SectionHead({ title, note, link }: {
  title: string; note?: string; link?: { href: string; label: string }
}) {
  return (
    <div className="cd-sec-head">
      <h2>{title}</h2>
      {note ? <p>{note}</p> : null}
      {link ? <Link href={link.href}>{link.label} <i aria-hidden="true">←</i></Link> : null}
    </div>
  )
}

function NoData({ title, body }: { title: string; body: string }) {
  return <div className="cd-nodata"><strong>{title}</strong><p>{body}</p></div>
}

function NoFinancials({ name, hasOwnership }: { name: string; hasOwnership: boolean }) {
  return (
    <div className="cd-nodata cd-nodata-wide">
      <strong>لم تُستخرج البيانات المالية لهذه الشركة بعد</strong>
      <p>
        تُستخرج القوائم المالية من التقارير المنشورة للشركات. لم يُنشر لشركة {name} تقرير قابل
        للاستخراج حتى الآن، ولذلك لا تُعرض نسب التقييم أو الربحية — ولا تُعرض أصفاراً بدلاً منها.
      </p>
      <div className="cd-nodata-still">
        <span className="cd-cell-label">ما يزال متوفراً</span>
        <p>السعر التاريخي، بيانات الجلسة، القيمة السوقية، الأداء مقابل المؤشر{hasOwnership ? '، وبيانات الملكية' : ''}.</p>
      </div>
    </div>
  )
}

function NotFound({ sym }: { sym: string }) {
  return (
    <main className="cd-page iq-page">
      <div className="cd-notfound">
        <span className="cd-notfound-mark" aria-hidden="true">؟</span>
        <h1>لا يوجد سهم بالرمز <bdi>{sym}</bdi></h1>
        <p>تحقّق من الرمز، أو تصفّح الشركات المدرجة في بورصة العراق.</p>
        <Link className="cd-action" href="/market">كل الشركات</Link>
      </div>
    </main>
  )
}

function PageError({ sym }: { sym: string }) {
  return (
    <main className="cd-page iq-page">
      <div className="mv-error" role="alert">
        <span className="mv-error-mark" aria-hidden="true">!</span>
        <div>
          <strong>تعذّر تحميل بيانات <bdi>{sym}</bdi></strong>
          <p>يمكن إعادة المحاولة، أو العودة إلى صفحة السوق.</p>
        </div>
        <button type="button" onClick={() => window.location.reload()}>إعادة المحاولة</button>
      </div>
    </main>
  )
}

const RailSkeleton = () => (
  <aside className="cd-rail" aria-hidden="true">
    {[0, 1, 2, 3].map(g => (
      <div className="cd-rail-group" key={g}>
        {[0, 1, 2].map(i => <span className="pl-skel" key={i} style={{ blockSize: 14, marginBlockEnd: 10 }} />)}
      </div>
    ))}
  </aside>
)
const FundSkeleton = () => (
  <div className="cd-fund" aria-hidden="true">
    {[0, 1].map(c => (
      <div className="cd-fund-col" key={c}>
        {[0, 1, 2, 3, 4].map(i => <span className="pl-skel" key={i} style={{ blockSize: 16, marginBlockEnd: 12 }} />)}
      </div>
    ))}
  </div>
)
const OwnSkeleton = () => (
  <div className="cd-own" aria-hidden="true">
    {[0, 1].map(i => <span className="pl-skel" key={i} style={{ blockSize: 180, borderRadius: 18 }} />)}
  </div>
)

const Dash = ({ hint }: { hint?: string }) =>
  <span className="mv-dash" title={hint} aria-label="لا تتوفر بيانات">—</span>
const tone = (v: number) => (v > 0 ? 'positive' : v < 0 ? 'negative' : 'neutral')
const signed = (v: number, d: number) => `${v > 0 ? '+' : ''}${v.toFixed(d)}`
const nfPriceFmt = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const nfPrice = (v: number) => nfPriceFmt.format(v)
const signedPrice = (v: number) => `${v > 0 ? '+' : ''}${nfPrice(v)}`

function bandPos(price: number, lo: number | null, hi: number | null) {
  const l = lo ?? price, h = hi ?? price
  if (h <= l) return 50
  return Math.max(0, Math.min(100, ((price - l) / (h - l)) * 100))
}

async function loadIndex(sb: { from: (t: string) => any }) {
  const rows: { t: number; v: number }[] = []
  const PAGE = 1000
  let from = 0
  for (;;) {
    const { data } = await sb.from('daily_index').select('date,isx60')
      .not('isx60', 'is', null).gte('date', ISX60_REBASE)
      .order('date').range(from, from + PAGE - 1)
    if (!data?.length) break
    for (const r of data as { date: string; isx60: number }[]) {
      rows.push({ t: Date.parse(r.date + 'T00:00:00Z'), v: r.isx60 })
    }
    if (data.length < PAGE) break
    from += PAGE
  }
  return rows
}
