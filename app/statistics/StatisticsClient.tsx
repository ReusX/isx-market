'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import { fetchCompanyMeta, SECTORS } from '@/lib/market'
import { StatChart } from './StatChart'
import { DitherArt } from '@/components/design/DitherArt'
import {
  PERIODS, METRICS, GRAIN_LABEL, REBASE,
  windowFor, grainFor, bucketize, totalsFor, metricOf, median,
  normalizeSectors, SECTOR_LABELS, capSnapshot, capShare, usableName,
  arFull, arMonth, iqd, nf0, nf1, iqdFull,
  type Session, type PeriodId, type MetricId, type SectorMonthRow,
  type SectorActivity, type SectorReconciliation, type CapSnapshot, type CapInput, type CapRow,
} from '@/lib/statistics'
import { foldSessions, flowWindow, flowTotals, flowBuckets, type FlowRow, type FlowSession, type FlowTotals, type FlowBucket } from '@/lib/foreignFlow'
import './statistics.css'

/* ═══════════════════════════════════════════════════════════════════════════
   الإحصائيات — a VISUAL RE-PORT of the approved reference workspace.

   Reference: `/Users/amed/iqwealth-design/app/statistics/Statistics.tsx` and
   the `.stw-*` block of its globals.css, already ported to
   `app/statistics/statistics.css` in commit fb76898.

   head → one overview rail → sticky tab bar → ONE mode at a time. Six modes,
   each composed differently, so the page reads as a workspace rather than
   eight stacked panels of equal weight.

   ── The rule this page exists to keep ─────────────────────────────────────
   FOUR genuinely different cadences live here and are never merged into one
   timestamp:

     activity   a long daily series, floored at the 2015-03-05 rebase
     foreign    its own window, with its own latest session
     sectors    ONE calendar month, currently two sessions behind the daily data
     structure  a current snapshot over the listed roster
     companies  · valuation — the same snapshot

   Every mode prints the window it actually covers. `docs/STATISTICS_DATA_MAP.md`
   is the audit behind every figure.
   ═══════════════════════════════════════════════════════════════════════════ */

type Mode = 'activity' | 'structure' | 'sectors' | 'companies' | 'valuation' | 'foreign'

const MODES: { id: Mode; ar: string; en: string; scope: 'period' | 'snapshot' | 'month' | 'own' }[] = [
  { id: 'activity', ar: 'النشاط', en: 'Activity', scope: 'period' },
  { id: 'structure', ar: 'بنية السوق', en: 'Structure', scope: 'snapshot' },
  { id: 'sectors', ar: 'القطاعات', en: 'Sectors', scope: 'month' },
  { id: 'companies', ar: 'الشركات', en: 'Companies', scope: 'snapshot' },
  { id: 'valuation', ar: 'التقييم', en: 'Valuation', scope: 'snapshot' },
  { id: 'foreign', ar: 'التدفق الأجنبي', en: 'Foreign flow', scope: 'own' },
]

const sectorCodeLabel = (code: string, ar: boolean) => {
  const s = SECTORS.find((x) => x.id === code)
  return s ? (ar ? s.arFull : s.enFull) : code
}



export default function StatisticsClient() {
  const { lang, theme } = useApp()
  const ar = lang === 'ar'

  const [sessions, setSessions] = useState<Session[]>([])
  const [sectorRows, setSectorRows] = useState<SectorMonthRow[]>([])
  const [cap, setCap] = useState<CapSnapshot | null>(null)
  const [pe, setPe] = useState<{ sym: string; name: string; pe: number }[]>([])
  const [flowRows, setFlowRows] = useState<FlowRow[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  /* A partial failure never blanks the page: each of these is a module that
     could not load while the rest stayed correct. */
  const [flowFailed, setFlowFailed] = useState(false)
  const [sectorFailed, setSectorFailed] = useState(false)

  const [mode, setMode] = useState<Mode>('activity')
  const [period, setPeriod] = useState<PeriodId>('1Y')
  const [metric, setMetric] = useState<MetricId>('value')
  const [pickedSector, setPickedSector] = useState<string | null>(null)
  const [sectorMetric, setSectorMetric] = useState<SectorMetricId>('marketCap')
  const [showAll, setShowAll] = useState(false)
  const [ranking, setRanking] = useState<RankingId>('mcap')
  const [dir, setDir] = useState<'desc' | 'asc'>('desc')

  const load = useCallback(() => {
    setFailed(false); setLoading(true)
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()

        /* The daily series, floored at the rebase. PostgREST caps a response at
           1,000 rows and the window is ~2,640, so it is paged rather than
           silently truncated to the most recent thousand. */
        const all: Session[] = []
        for (let from = 0; from < 6000; from += 1000) {
          const { data, error } = await sb.from('daily_index')
            .select('date,isx60,total_value,total_volume,total_trades,traded_companies,listed_companies')
            .gte('date', REBASE).order('date').range(from, from + 999)
          if (error) throw error
          const page = (data ?? []) as Record<string, number | string | null>[]
          for (const r of page) {
            all.push({
              date: r.date as string,
              isx60: r.isx60 as number | null,
              value: r.total_value as number | null,
              volume: r.total_volume as number | null,
              trades: r.total_trades as number | null,
              traded: r.traded_companies as number | null,
              listed: r.listed_companies as number | null,
            })
          }
          if (page.length < 1000) break
        }
        setSessions(all)
        const officialListed = all.length ? all[all.length - 1].listed : null

        // ── the market-cap snapshot over the LISTED roster ──────────────────
        const [meta, metricsRes] = await Promise.all([
          fetchCompanyMeta().catch(() => []),
          sb.from('company_metrics').select('ticker,last_close,last_date,days_since_trade,name_ar,name_en'),
        ])
        const byTicker = new Map<string, Record<string, unknown>>(
          ((metricsRes.data ?? []) as Record<string, unknown>[]).map((r) => [r.ticker as string, r] as [string, Record<string, unknown>]))
        const roster: CapInput[] = meta.map((m) => {
          const r = byTicker.get(m.sym)
          return {
            sym: m.sym,
            sector: m.sec,
            close: (r?.last_close as number) ?? 0,
            daysSinceTrade: (r?.days_since_trade as number) ?? 0,
            closeDate: (r?.last_date as string) ?? null,
            nameAr: (r?.name_ar as string) ?? null,
            nameEn: (r?.name_en as string) ?? null,
          }
        })
        setCap(capSnapshot(
          roster,
          new Map<string, number>(meta.map((m) => [m.sym, m.shares ?? 0] as [string, number])),
          new Map<string, { ar?: string; en?: string }>(meta.map((m) => [m.sym, { ar: m.ar, en: m.en }] as [string, { ar?: string; en?: string }])),
          all.length ? all[all.length - 1].date : null,
          officialListed, ar, sectorCodeLabel,
        ))

        // ── P/E · a second, failure-tolerant request ────────────────────────
        try {
          const { fetchTtmPe } = await import('@/lib/fundamentals')
          const prices: Record<string, number> = {}
          for (const c of roster) if (c.close > 0) prices[c.sym] = c.close
          const res = await fetchTtmPe(sb, prices)
          const nameOf = new Map<string, string>(meta.map((m) => [m.sym, (ar ? m.ar : m.en) ?? ''] as [string, string]))
          setPe(Object.entries(res).map(([sym, v]) => ({
            sym,
            name: [nameOf.get(sym)].find(usableName) ?? sym,
            pe: v.pe,
          })))
        } catch { /* valuation degrades to a stated-unavailable module */ }
      } catch { setFailed(true) } finally { setLoading(false) }
    })()
  }, [ar])

  useEffect(load, [load])

  // ── sector month and foreign flow · independent, each may fail alone ─────
  useEffect(() => {
    ;(async () => {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      await Promise.allSettled([
        sb.from('sector_monthly')
          .select('year,month,sector,volume,value,trades,traded_companies,listed_companies')
          .order('year', { ascending: false }).order('month', { ascending: false }).limit(40)
          .then(({ data, error }) => {
            if (error || !data?.length) { setSectorFailed(true); return }
            const rows = data as SectorMonthRow[]
            const y = rows[0].year, m = rows[0].month
            setSectorRows(rows.filter((r) => r.year === y && r.month === m))
          }),
        sb.from('foreign_flow_company_daily')
          .select('date,ticker,side,value,trades').order('date', { ascending: false }).limit(3000)
          .then(({ data, error }) => {
            if (error || !data?.length) { setFlowFailed(true); return }
            setFlowRows(data as FlowRow[])
          }),
      ])
    })()
  }, [])

  // ── derived ──────────────────────────────────────────────────────────────
  const rows = useMemo(() => windowFor(sessions, period), [sessions, period])
  const grain = grainFor(period)
  const buckets = useMemo(() => bucketize(rows, grain, metric), [rows, grain, metric])
  const t = useMemo(() => totalsFor(rows, metric), [rows, metric])
  const tValue = useMemo(() => totalsFor(rows, 'value'), [rows])

  /** The equal-length window immediately before this one. Null when the stored
   *  history does not reach back far enough — the honest answer, rather than a
   *  shorter window silently compared against a longer one. */
  const prior = useMemo(() => {
    const n = PERIODS.find((p) => p.id === period)!.sessions
    if (!Number.isFinite(n)) return null
    const end = sessions.length - n
    if (end < n) return null
    return totalsFor(sessions.slice(end - n, end), 'value')
  }, [sessions, period])

  const { sectors, recon } = useMemo(() => normalizeSectors(sectorRows), [sectorRows])
  const sectorTotal = recon.totals.value
  const picked = sectors.find((s) => s.key === pickedSector) ?? null

  /* §4 of the Phase 5 brief: one foreign-flow model. This folds through the
     SAME `lib/foreignFlow` functions the detail route uses, over the same
     trading-session calendar, so «التدفق الأجنبي» here and there cannot mean
     two different things. The fetch stays bounded — 28k rows is not a payload
     a summary module pulls — so the calendar is clipped to the fetched span
     and the covered window is stated rather than implied. */
  const flowSessions = useMemo<FlowSession[]>(() => {
    if (!flowRows.length) return []
    let earliest = flowRows[0].date
    for (const r of flowRows) if (r.date < earliest) earliest = r.date
    const calendar = sessions.map((s) => s.date).filter((d) => d >= earliest)
    return foldSessions(flowRows, calendar)
  }, [flowRows, sessions])

  const flowWin = useMemo(() => flowWindow(flowSessions, period), [flowSessions, period])
  const flowT = useMemo<FlowTotals | null>(() => flowTotals(flowWin), [flowWin])
  /* The summary strip is monthly whatever the period is — the same buckets
     the detail page builds, from the same sessions. */
  const flowMonths = useMemo(() => flowBuckets(flowWin, 'month'), [flowWin])

  /* Only POSITIVE multiples. A P/E of zero or below is not a multiple anyone
     screens for — it is a company with no earnings to divide by — and letting
     one into the set drags the minimum to «0×» and misstates the centre. The
     excluded companies are counted in the coverage line, never as zero. */
  const pePositive = useMemo(() => pe.filter((x) => x.pe > 0), [pe])
  const peSorted = useMemo(() => [...pePositive].sort((a, b) => a.pe - b.pe), [pePositive])
  const peMedian = useMemo(() => median(pePositive.map((p) => p.pe)), [pePositive])

  const scope = MODES.find((m) => m.id === mode)!.scope
  const metricDef = METRICS.find((m) => m.id === metric)!
  const unit = ar ? metricDef.unitAr : metricDef.unitEn
  const L = (o: { ar: string; en: string }) => (ar ? o.ar : o.en)

  const scopeLine =
    scope === 'period' && t ? (ar
      ? <>الأرقام في هذا القسم تتبع الفترة المحددة · <bdi>{t.from}</bdi> — <bdi>{t.to}</bdi> · <bdi>{nf0.format(t.sessions)}</bdi> جلسة</>
      : <>This section follows the selected period · <bdi>{t.from}</bdi> — <bdi>{t.to}</bdi> · <bdi>{nf0.format(t.sessions)}</bdi> sessions</>)
    : scope === 'own' ? (ar
      ? <>نافذة خاصة بهذا القسم — لا تتبع الفترة المحددة{flowT ? <> · <bdi>{flowT.from}</bdi> — <bdi>{flowT.to}</bdi></> : null}</>
      : <>This section has its own window — it does not follow the selected period{flowT ? <> · <bdi>{flowT.from}</bdi> — <bdi>{flowT.to}</bdi></> : null}</>)
    : scope === 'month' ? (ar
      ? <>شهر واحد — لا يتبع الفترة المحددة · <bdi>{arMonth(recon.month)}</bdi></>
      : <>One calendar month — does not follow the selected period · <bdi>{recon.month}</bdi></>)
    : (ar
      ? <>لقطة حالية — لا تتبع الفترة المحددة · آخر إغلاق <bdi>{arFull(cap?.session ?? null)}</bdi></>
      : <>Current snapshot — does not follow the selected period · last close <bdi>{cap?.session ?? '—'}</bdi></>)

  return (
    <main className="iq-page stw">
      <header className="stw-head">
        {/* The page's ONE decorative element, and a faint one: the approved
            design allows a single 1-bit accent for identity and forbids an
            illustration. Data is still the product here. */}
        <div className="stw-head-art" aria-hidden="true">
          <DitherArt scene="stats" theme={theme === 'dark' ? 'dark' : 'light'} />
        </div>
        <div className="stw-title">
          <h1>{ar ? 'إحصاءات السوق' : 'Market statistics'}</h1>
          <p>
            {ar
              ? <>حجم السوق ونشاطه وتركّزه وتقييمه — السلسلة المخزّنة من <bdi>{REBASE}</bdi> حتى <bdi>{sessions.length ? sessions[sessions.length - 1].date : '—'}</bdi>.</>
              : <>Market size, activity, concentration and valuation — the stored series runs from <bdi>{REBASE}</bdi> to <bdi>{sessions.length ? sessions[sessions.length - 1].date : '—'}</bdi>.</>}
          </p>
        </div>
      </header>

      {/* ═══ Overview rail — one strip, not five cards ═══════════════════ */}
      <section className="stw-rail" aria-label={ar ? 'ملخص الفترة' : 'Period summary'}>
        {loading ? (
          <p className="stw-rail-empty">{ar ? 'جاري تحميل السلسلة…' : 'Loading the series…'}</p>
        ) : !tValue ? (
          <p className="stw-rail-empty">{ar ? 'لا توجد جلسات في هذه الفترة.' : 'No sessions in this period.'}</p>
        ) : (
          <>
            <div className="stw-rail-lead">
              <span>{ar ? 'قيمة التداول · الفترة المحددة' : 'Traded value · selected period'}</span>
              <strong><bdi>{iqd(tValue.sum)}</bdi> <small>{ar ? 'د.ع' : 'IQD'}</small></strong>
              {prior && prior.sum > 0 ? (
                <em className={tValue.sum >= prior.sum ? 'is-up' : 'is-down'}>
                  <bdi>
                    {tValue.sum >= prior.sum ? '+' : '−'}
                    {Math.abs(((tValue.sum - prior.sum) / prior.sum) * 100).toFixed(1)}%
                  </bdi>{' '}
                  {ar ? 'عن الفترة السابقة' : 'vs the prior period'}
                </em>
              ) : (
                <em className="is-muted">{ar ? 'لا توجد فترة سابقة بالطول نفسه' : 'No prior period of equal length'}</em>
              )}
            </div>
            <dl className="stw-rail-figs">
              <div><dt>{ar ? 'متوسط الجلسة' : 'Mean session'}</dt><dd><bdi>{iqd(tValue.mean)}</bdi></dd></div>
              <div><dt>{ar ? 'وسيط الجلسة' : 'Median session'}</dt><dd><bdi>{tValue.median == null ? '—' : iqd(tValue.median)}</bdi></dd></div>
              <div><dt>{ar ? 'متوسط الشركات المتداولة' : 'Mean traded'}</dt><dd><bdi>{tValue.meanTraded == null ? '—' : Math.round(tValue.meanTraded)}</bdi></dd></div>
              <div><dt>{ar ? 'عدد الجلسات' : 'Sessions'}</dt><dd><bdi>{nf0.format(tValue.sessions)}</bdi></dd></div>
            </dl>
          </>
        )}
      </section>

      {/* ═══ Sticky workspace bar ════════════════════════════════════════ */}
      <div className="stw-bar">
        <nav className="stw-tabs" aria-label={ar ? 'أقسام الإحصاءات' : 'Statistics sections'}>
          {MODES.map((m) => (
            <button key={m.id} type="button" className={mode === m.id ? 'is-on' : ''}
              aria-current={mode === m.id ? 'page' : undefined}
              onClick={() => { setMode(m.id); setPickedSector(null); setShowAll(false) }}>
              {L(m)}
            </button>
          ))}
        </nav>
        <div className="stw-periods" role="group" aria-label={ar ? 'الفترة' : 'Period'}>
          {PERIODS.map((p) => (
            <button key={p.id} type="button" className={period === p.id ? 'is-on' : ''}
              aria-pressed={period === p.id} onClick={() => setPeriod(p.id)}>
              {L(p)}
            </button>
          ))}
        </div>
      </div>

      <p className="stw-scope">{scopeLine}</p>

      <div className="stw-work">
        {failed ? (
          <div className="stw-empty" role="alert">
            <strong>{ar ? 'تعذّر تحميل بيانات الإحصاءات' : 'Could not load statistics data'}</strong>
            <span>{ar ? 'لم نتمكن من الوصول إلى السلسلة المخزّنة.' : 'We could not reach the stored series.'}</span>
            <button type="button" className="stw-retry" onClick={load}>{ar ? 'إعادة المحاولة' : 'Try again'}</button>
          </div>
        ) : loading ? (
          <div className="stw-skel" aria-hidden="true">
            <div className="stw-skel-work" />
          </div>
        ) : (
          <>
            {/* ═══ النشاط ══════════════════════════════════════════════ */}
            {mode === 'activity' ? (
              <section className="stw-mode" aria-label={ar ? 'نشاط السوق' : 'Market activity'}>
                <div className="stw-mode-head">
                  <div>
                    <h2>{ar ? 'نشاط السوق' : 'Market activity'}</h2>
                    <p>{ar ? GRAIN_LABEL[grain].ar : GRAIN_LABEL[grain].en} · {L(PERIODS.find((p) => p.id === period)!)}</p>
                  </div>
                  <div className="stw-seg" role="group" aria-label={ar ? 'المقياس' : 'Metric'}>
                    {METRICS.map((m) => (
                      <button key={m.id} type="button" className={metric === m.id ? 'is-on' : ''}
                        aria-pressed={metric === m.id} onClick={() => setMetric(m.id)}>
                        {L(m)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="stw-chart">
                  <StatChart buckets={buckets} metric={metric} grain={grain}
                    theme={theme === 'dark' ? 'dark' : 'light'} unit={unit} ar={ar} height={320} />
                </div>

                {t ? (
                  <dl className="stw-under">
                    <div>
                      <dt>{ar ? 'مجموع الفترة' : 'Period total'}</dt>
                      <dd><bdi>{metric === 'value' ? iqd(t.sum) : nf0.format(t.sum)}</bdi> <small>{unit}</small></dd>
                    </div>
                    <div>
                      <dt>{ar ? 'متوسط الجلسة' : 'Mean session'}</dt>
                      <dd><bdi>{metric === 'value' ? iqd(t.mean) : nf0.format(Math.round(t.mean))}</bdi></dd>
                    </div>
                    <div>
                      <dt>{ar ? 'الشركات المتداولة' : 'Traded companies'}</dt>
                      <dd>
                        <bdi>{t.meanTraded == null ? '—' : Math.round(t.meanTraded)}</bdi>
                        {t.listed != null ? <small>{ar ? `من ${t.listed}` : `of ${t.listed}`}</small> : null}
                      </dd>
                    </div>
                    <div>
                      <dt>{ar ? 'التغطية' : 'Coverage'}</dt>
                      <dd>
                        <bdi>{nf0.format(t.coverage)}</bdi>
                        <small>{ar ? `من ${nf0.format(t.sessions)} جلسة` : `of ${nf0.format(t.sessions)} sessions`}</small>
                      </dd>
                    </div>
                  </dl>
                ) : null}

                <p className="stw-note">
                  {ar
                    ? <>المتوسط لكل جلسة تداول لا لكل يوم تقويمي — السوق يعمل خمسة أيام من سبعة، والقسمة على أيام التقويم تخفض كل متوسط بنحو <bdi>29%</bdi>.{t && t.coverage < t.sessions ? <> · <bdi>{t.sessions - t.coverage}</bdi> جلسة بلا قياس لهذا المقياس، وتظهر فجوات في الرسم لا أصفاراً.</> : null}</>
                    : <>The mean is per trading session, not per calendar day — the exchange trades five days in seven, and dividing by calendar days understates every average by about <bdi>29%</bdi>.{t && t.coverage < t.sessions ? <> · <bdi>{t.sessions - t.coverage}</bdi> sessions carry no observation for this metric and appear as gaps, never zeros.</> : null}</>}
                </p>
              </section>
            ) : null}

            {/* ═══ بنية السوق ══════════════════════════════════════════ */}
            {mode === 'structure' ? (
              <StructureMode cap={cap} ar={ar} />
            ) : null}

            {/* ═══ القطاعات ════════════════════════════════════════════ */}
            {mode === 'sectors' ? (
              <SectorsMode
                sectors={sectors} recon={recon} total={sectorTotal} failed={sectorFailed}
                cap={cap} picked={picked} onPick={setPickedSector}
                metric={sectorMetric} onMetric={setSectorMetric} ar={ar} />
            ) : null}

            {/* ═══ الشركات ═════════════════════════════════════════════ */}
            {mode === 'companies' ? (
              <CompaniesMode cap={cap} pe={pe} ar={ar} showAll={showAll} onShowAll={setShowAll}
                ranking={ranking} onRanking={setRanking} dir={dir} onDir={setDir} />
            ) : null}

            {/* ═══ التقييم ═════════════════════════════════════════════ */}
            {mode === 'valuation' ? (
              <ValuationMode rows={peSorted} med={peMedian} universe={cap?.included ?? 0} ar={ar} />
            ) : null}

            {/* ═══ التدفق الأجنبي ══════════════════════════════════════ */}
            {mode === 'foreign' ? (
              <ForeignMode t={flowT} buckets={flowMonths} failed={flowFailed} ar={ar} />
            ) : null}
          </>
        )}
      </div>
    </main>
  )
}

/* ── بنية السوق ────────────────────────────────────────────────────────────
   The approved composition: the ten largest companies on the left, the
   concentration argument on the right, one baseline, one rule between them —
   not two disconnected cards.

   The market-cap snapshot is taken over the LISTED roster. Neither
   `sector_monthly.market_cap` nor `company_caps_monthly` is consulted; see
   lib/statistics.ts §3 for why both were discarded. */
function StructureMode({ cap, ar }: { cap: CapSnapshot | null; ar: boolean }) {
  if (!cap || !cap.rows.length) {
    return <div className="stw-empty"><strong>{ar ? 'لا تتوفر بيانات القيمة السوقية' : 'No market-cap data available'}</strong></div>
  }
  const top = cap.rows[0]
  const ten = cap.rows.slice(0, 10)
  return (
    <section className="stw-mode stw-structure" aria-label={ar ? 'بنية السوق' : 'Market structure'}>
      <div className="stw-primary">
        <div className="stw-mode-head">
          <div>
            <h2>{ar ? 'القيمة السوقية' : 'Market capitalisation'}</h2>
            <p>
              {ar
                ? <>أكبر عشر شركات من إجمالي <bdi>{iqd(cap.total)}</bdi> د.ع</>
                : <>The ten largest of <bdi>{iqd(cap.total)}</bdi> IQD in total</>}
            </p>
          </div>
        </div>
        <ol className="stw-rank">
          {ten.map((r, i) => {
            const share = r.marketCap / cap.total
            return (
              <li key={r.sym}>
                <Link href={`/c/${r.sym}`}>
                  <span className="stw-rank-n"><bdi>{i + 1}</bdi></span>
                  <bdi className="stw-rank-sym">{r.sym}</bdi>
                  <span className="stw-rank-name" title={r.name}>{r.name}</span>
                  <span className="stw-rank-bar" aria-hidden="true">
                    <i style={{ inlineSize: `${(r.marketCap / ten[0].marketCap) * 100}%` }} />
                  </span>
                  <bdi className="stw-rank-v">{iqd(r.marketCap)}</bdi>
                  <bdi className="stw-rank-p">{(share * 100).toFixed(1)}%</bdi>
                </Link>
              </li>
            )
          })}
        </ol>
      </div>

      <aside className="stw-side">
        <h3>{ar ? 'التركّز' : 'Concentration'}</h3>
        <p className="stw-side-lede">
          {ar
            ? 'أين تجلس قيمة السوق — سؤال مختلف عن أين يجلس نشاطه.'
            : 'Where the market’s value sits — a different question from where its activity sits.'}
        </p>
        <dl className="stw-conc">
          <div>
            <dt>{ar ? 'أكبر شركة' : 'Largest company'}</dt>
            <dd><bdi>{((top.marketCap / cap.total) * 100).toFixed(1)}%</bdi></dd>
          </div>
          <div>
            <dt>{ar ? 'أكبر 5 · من القيمة السوقية' : 'Top 5 · of market cap'}</dt>
            <dd><bdi>{((capShare(cap, 5) ?? 0) * 100).toFixed(1)}%</bdi></dd>
          </div>
          <div>
            <dt>{ar ? 'أكبر 10 · من القيمة السوقية' : 'Top 10 · of market cap'}</dt>
            <dd><bdi>{((capShare(cap, 10) ?? 0) * 100).toFixed(1)}%</bdi></dd>
          </div>
          {/* The donor's fourth pair is the top-5/top-10 share of SESSION TRADED
              VALUE. This product stores no per-company traded value, so the two
              rows are absent rather than filled with a number computed from a
              different quantity. The `is-split` divider the donor draws between
              the cap block and the liquidity block goes with them. */}
        </dl>

        {/* Stale-price coverage is surfaced, never hidden, and a stale close is
            never described as a current price. */}
        <p className="stw-note stw-cov">
          {ar
            ? <>القيمة السوقية = آخر إغلاق منشور × الأسهم المصدرة · <bdi>{cap.included}</bdi> من <bdi>{cap.universe}</bdi> شركة في السجل الحالي{cap.officialListed != null ? <> (العدد الرسمي <bdi>{cap.officialListed}</bdi>)</> : null}{cap.excluded > 0 ? <> · استُبعدت <bdi>{cap.excluded}</bdi> لعدم توفر عدد الأسهم</> : null}.</>
            : <>Market cap = last published close × issued shares · <bdi>{cap.included}</bdi> of <bdi>{cap.universe}</bdi> in the current roster{cap.officialListed != null ? <> (official count <bdi>{cap.officialListed}</bdi>)</> : null}{cap.excluded > 0 ? <> · <bdi>{cap.excluded}</bdi> excluded for a missing share count</> : null}.</>}
        </p>
        {cap.stalePriced > 0 ? (
          <p className="stw-note stw-stale">
            {ar
              ? <><bdi>{cap.stalePriced}</bdi> شركة مُسعّرة بإغلاق أقدم من 60 يوماً — إغلاق منشور فعلي، وليس سعراً حالياً — وتمثّل <bdi>{(cap.staleShare * 100).toFixed(1)}%</bdi> من الإجمالي.</>
              : <><bdi>{cap.stalePriced}</bdi> companies are priced on a close older than 60 days — a real published price, not a current one — and account for <bdi>{(cap.staleShare * 100).toFixed(1)}%</bdi> of the total.</>}
          </p>
        ) : null}
        <p className="stw-note stw-warn">
          <i aria-hidden="true">△</i>
          {ar
            ? ' حصة القيمة السوقية ليست وزناً في مؤشر ISX60 — أوزان المؤشر غير منشورة ولا يخزّنها المنتج.'
            : ' A market-cap share is not an ISX60 index weight — the index weights are unpublished and this product does not store them.'}
        </p>
      </aside>
    </section>
  )
}

/* ── القطاعات ──────────────────────────────────────────────────────────────
   The approved composition: one ranked visual with a metric switch, and an
   inspector that appears on SELECTION rather than printing every secondary
   statistic for every sector at once.

   Two different sources, and the switch says which is on screen:
     · القيمة السوقية  the roster snapshot, summed by sector (`cap.bySector`)
     · النشاط          ONE calendar month from `sector_monthly`
   `sector_monthly.market_cap` is never read — the only per-sector cap column
   double-counts across alias rows, which is why the cap metric comes off the
   roster instead. */
type SectorMetricId = 'marketCap' | 'value' | 'volume' | 'trades' | 'companies'

function SectorsMode({ sectors, recon, total, failed, cap, picked, onPick, metric, onMetric, ar }: {
  sectors: SectorActivity[]; recon: SectorReconciliation; total: number
  failed: boolean; cap: CapSnapshot | null; picked: SectorActivity | null
  onPick: (k: string | null) => void
  metric: SectorMetricId; onMetric: (m: SectorMetricId) => void; ar: boolean
}) {
  const METRICS_S: { id: SectorMetricId; ar: string; en: string }[] = [
    { id: 'marketCap', ar: 'القيمة السوقية', en: 'Market cap' },
    { id: 'value', ar: 'قيمة التداول', en: 'Traded value' },
    { id: 'trades', ar: 'الصفقات', en: 'Trades' },
    { id: 'companies', ar: 'الشركات المتداولة', en: 'Traded companies' },
  ]
  const capBy = new Map((cap?.bySector ?? []).map((b) => [b.key, b]))

  /* One list, two possible sources. When the metric is market cap the rows
     come from the roster snapshot; otherwise from the monthly activity. */
  type Row = { key: string; label: string; v: number; act: SectorActivity | null }
  const rows: Row[] = metric === 'marketCap'
    ? (cap?.bySector ?? []).map((b) => ({
        key: b.key, label: b.label, v: b.total,
        act: sectors.find((x) => x.key === b.key) ?? null,
      }))
    : sectors.map((sct) => ({
        key: sct.key,
        label: ar ? SECTOR_LABELS[sct.key].ar : SECTOR_LABELS[sct.key].en,
        v: metric === 'value' ? sct.value : metric === 'volume' ? sct.volume
          : metric === 'trades' ? sct.trades : sct.tradedCompanies,
        act: sct,
      }))
  const sorted = [...rows].sort((a, b) => b.v - a.v)
  const max = Math.max(...sorted.map((r) => r.v), 1)
  const sum = sorted.reduce((a, r) => a + r.v, 0)
  const isCount = metric === 'companies' || metric === 'trades'

  if ((failed || !sectors.length) && metric !== 'marketCap') {
    return (
      <section className="stw-mode stw-sectors" aria-label={ar ? 'القطاعات' : 'Sectors'}>
        <div className="stw-mode-head">
          <div><h2>{ar ? 'القطاعات' : 'Sectors'}</h2></div>
          <SectorSwitch metric={metric} onMetric={onMetric} items={METRICS_S} ar={ar} />
        </div>
        <div className="stw-empty">
          <strong>{ar ? 'لا تتوفر بيانات نشاط القطاعات' : 'No sector activity available'}</strong>
          <span>{ar ? 'تعذّر تحميل الجدول الشهري للقطاعات. القيمة السوقية لا تزال متاحة.' : 'The monthly sector table could not be loaded. Market cap is still available.'}</span>
        </div>
      </section>
    )
  }
  if (!sorted.length) {
    return <div className="stw-empty"><strong>{ar ? 'لا تتوفر بيانات القطاعات' : 'No sector data available'}</strong></div>
  }

  return (
    <section className="stw-mode stw-sectors" aria-label={ar ? 'إحصاءات القطاعات' : 'Sector statistics'}>
      <div className="stw-mode-head">
        <div>
          <h2>{ar ? 'القطاعات' : 'Sectors'}</h2>
          <p>
            {metric === 'marketCap'
              ? (ar
                ? <><bdi>{sorted.length}</bdi> قطاعاً · لقطة القيمة السوقية · إجمالي <bdi>{iqd(sum)}</bdi> د.ع</>
                : <><bdi>{sorted.length}</bdi> sectors · market-cap snapshot · total <bdi>{iqd(sum)}</bdi> IQD</>)
              : (ar
                ? <>شهر <bdi>{arMonth(recon.month)}</bdi> · <bdi>{sorted.length}</bdi> قطاعاً · إجمالي <bdi>{isCount ? nf0.format(sum) : iqd(sum)}</bdi></>
                : <><bdi>{recon.month}</bdi> · <bdi>{sorted.length}</bdi> sectors · total <bdi>{isCount ? nf0.format(sum) : iqd(sum)}</bdi></>)}
          </p>
        </div>
        <SectorSwitch metric={metric} onMetric={onMetric} items={METRICS_S} ar={ar} />
      </div>

      <div className="stw-sec-body">
        <ul className="stw-secs">
          {sorted.map((r, i) => {
            const on = picked?.key === r.key
            return (
              /* Top five carry full contrast, the tail steps back — not every
                 row equally loud. */
              <li key={r.key} className={`${i < 5 ? 'is-top' : ''} ${on ? 'is-on' : ''}`.trim()}>
                <button type="button" aria-pressed={on}
                  onClick={() => onPick(on ? null : r.key)}>
                  <span className="stw-sec-name">{r.label}</span>
                  <span className="stw-sec-track" aria-hidden="true">
                    <i style={{ inlineSize: `${(r.v / max) * 100}%` }} />
                  </span>
                  <bdi className="stw-sec-v">{isCount ? nf0.format(r.v) : iqd(r.v)}</bdi>
                  <bdi className="stw-sec-p">{sum ? ((r.v / sum) * 100).toFixed(1) : '0.0'}%</bdi>
                </button>
              </li>
            )
          })}
        </ul>

        <aside className={picked ? 'stw-inspect is-on' : 'stw-inspect'}>
          {picked ? (
            <>
              <header>
                <h3>{ar ? SECTOR_LABELS[picked.key].ar : SECTOR_LABELS[picked.key].en}</h3>
                <button type="button" onClick={() => onPick(null)} aria-label={ar ? 'إغلاق' : 'Close'}>✕</button>
              </header>
              <dl>
                {capBy.has(picked.key) ? (
                  <>
                    <div>
                      <dt>{ar ? 'القيمة السوقية' : 'Market cap'}</dt>
                      <dd><bdi>{iqd(capBy.get(picked.key)!.total)}</bdi></dd>
                    </div>
                    <div>
                      <dt>{ar ? 'حصة القيمة السوقية' : 'Share of market cap'}</dt>
                      <dd><bdi>{cap && cap.total ? ((capBy.get(picked.key)!.total / cap.total) * 100).toFixed(1) : '—'}%</bdi></dd>
                    </div>
                    <div>
                      <dt>{ar ? 'الشركات' : 'Companies'}</dt>
                      <dd><bdi>{capBy.get(picked.key)!.count}</bdi></dd>
                    </div>
                  </>
                ) : null}
                <div><dt>{ar ? 'قيمة التداول · الشهر' : 'Traded value · month'}</dt><dd><bdi>{iqd(picked.value)}</bdi></dd></div>
                <div><dt>{ar ? 'الحجم' : 'Volume'}</dt><dd><bdi>{iqd(picked.volume)}</bdi></dd></div>
                <div><dt>{ar ? 'الصفقات' : 'Trades'}</dt><dd><bdi>{nf0.format(picked.trades)}</bdi></dd></div>
                <div><dt>{ar ? 'شركات تداولت' : 'Traded companies'}</dt><dd><bdi>{picked.tradedCompanies}</bdi></dd></div>
                {/* Null in every current row — `—`, never fabricated. */}
                <div><dt>{ar ? 'شركات مدرجة' : 'Listed companies'}</dt><dd><bdi>{picked.listedCompanies ?? '—'}</bdi></dd></div>
              </dl>
              <p className="stw-note">
                {ar
                  ? 'القيمة السوقية لقطة حالية من سجل الشركات؛ أرقام النشاط لشهر تقويمي واحد. الرقمان لا يغطيان النافذة نفسها.'
                  : 'Market cap is a current snapshot from the roster; the activity figures cover one calendar month. The two do not share a window.'}
              </p>
            </>
          ) : (
            <p className="stw-inspect-hint">{ar ? 'اختر قطاعاً لعرض تفاصيله.' : 'Pick a sector to see its detail.'}</p>
          )}
        </aside>
      </div>

      <p className="stw-note stw-cov">
        {ar
          ? <>القيمة السوقية للقطاع مجموعة من سجل الشركات (آخر إغلاق × الأسهم المصدرة) لا من العمود الشهري، لأن ذلك العمود يحتسب الشركات مرتين عبر صفوف الأسماء القديمة. عدد الشركات المدرجة غير متوفر في المصدر الشهري ويظهر <bdi>—</bdi>.</>
          : <>Sector market cap is summed from the company roster (last close × issued shares), not from the monthly column, which double-counts companies across historical-name rows. The listed-company count is absent from the monthly source and shows as <bdi>—</bdi>.</>}
      </p>
      {recon.droppedDuplicates > 0 ? (
        <p className="stw-note">
          {ar
            ? <>من <bdi>{recon.rawRows}</bdi> صفاً في المصدر استُبعد <bdi>{recon.droppedDuplicates}</bdi> صف مكرر بلا نشاط، ووحّدت الأسماء التاريخية — دون فقدان أي نشاط.</>
            : <>Of <bdi>{recon.rawRows}</bdi> source rows, <bdi>{recon.droppedDuplicates}</bdi> inert duplicate was excluded and historical names merged — with no activity lost.</>}
        </p>
      ) : null}
    </section>
  )
}

function SectorSwitch({ metric, onMetric, items, ar }: {
  metric: SectorMetricId; onMetric: (m: SectorMetricId) => void
  items: { id: SectorMetricId; ar: string; en: string }[]; ar: boolean
}) {
  return (
    <div className="stw-seg" role="group" aria-label={ar ? 'مقياس القطاع' : 'Sector metric'}>
      {items.map((m) => (
        <button key={m.id} type="button" className={metric === m.id ? 'is-on' : ''}
          aria-pressed={metric === m.id} onClick={() => onMetric(m.id)}>
          {ar ? m.ar : m.en}
        </button>
      ))}
    </div>
  )
}

/* ── الشركات ───────────────────────────────────────────────────────────────
   The approved quiet table: the shared board grammar (`.mv-table`), one
   sortable measure column and a share column, with a ranking switch above it.

   A company WITHOUT a value for the chosen measure is excluded from the
   ranking and counted in the coverage line — it is never ranked as zero. */
type RankingId = 'mcap' | 'close' | 'pe'

function CompaniesMode({ cap, pe, ar, showAll, onShowAll, ranking, onRanking, dir, onDir }: {
  cap: CapSnapshot | null; pe: { sym: string; name: string; pe: number }[]
  ar: boolean; showAll: boolean; onShowAll: (v: boolean) => void
  ranking: RankingId; onRanking: (r: RankingId) => void
  dir: 'desc' | 'asc'; onDir: (d: 'desc' | 'asc') => void
}) {
  if (!cap || !cap.rows.length) {
    return <div className="stw-empty"><strong>{ar ? 'لا تتوفر بيانات الشركات' : 'No company data'}</strong></div>
  }
  const RANKINGS: { id: RankingId; ar: string; en: string; kind: 'iqd' | 'ratio' | 'price' }[] = [
    { id: 'mcap', ar: 'القيمة السوقية', en: 'Market cap', kind: 'iqd' },
    { id: 'close', ar: 'آخر إغلاق', en: 'Last close', kind: 'price' },
    { id: 'pe', ar: 'مكرر الربحية', en: 'P/E', kind: 'ratio' },
  ]
  const unitDef = RANKINGS.find((r) => r.id === ranking)!
  const peBy = new Map(pe.map((x) => [x.sym, x.pe]))
  const valueOf = (r: CapRow): number | null =>
    ranking === 'mcap' ? r.marketCap
      : ranking === 'close' ? (r.close > 0 ? r.close : null)
        : (peBy.get(r.sym) ?? null)

  const list = cap.rows.filter((r) => {
    const v = valueOf(r)
    return v != null && (ranking !== 'pe' || v > 0)
  })
  // P/E ascends by default: the cheapest multiple is the interesting end, and
  // "largest P/E first" is a ranking of nothing anyone screens for.
  const d = ranking === 'pe' ? (dir === 'desc' ? 'asc' : 'desc') : dir
  const sorted = [...list].sort((a, b) => {
    const av = valueOf(a) ?? 0, bv = valueOf(b) ?? 0
    return d === 'desc' ? bv - av : av - bv
  })
  const shown = showAll ? sorted : sorted.slice(0, 12)

  return (
    <section className="stw-mode" aria-label={ar ? 'ترتيب الشركات' : 'Company ranking'}>
      <div className="stw-mode-head">
        <div>
          <h2>{ar ? 'ترتيب الشركات' : 'Company ranking'}</h2>
          <p>
            {ar
              ? <><bdi>{sorted.length}</bdi> من <bdi>{cap.rows.length}</bdi> شركة لها قيمة لهذا المقياس</>
              : <><bdi>{sorted.length}</bdi> of <bdi>{cap.rows.length}</bdi> companies have a value for this measure</>}
            <button type="button" className="stw-info"
              title={ar
                ? 'الشركات التي لا تملك قيمة لهذا المقياس مستبعدة من الترتيب، ولا تُحسب صفراً.'
                : 'Companies with no value for this measure are excluded from the ranking, never counted as zero.'}>؟</button>
          </p>
        </div>
        <div className="stw-seg" role="group" aria-label={ar ? 'مقياس الترتيب' : 'Ranking measure'}>
          {RANKINGS.map((r) => (
            <button key={r.id} type="button" className={ranking === r.id ? 'is-on' : ''}
              aria-pressed={ranking === r.id}
              onClick={() => { onRanking(r.id); onShowAll(false) }}>
              {ar ? r.ar : r.en}
            </button>
          ))}
        </div>
      </div>

      <div className="mv-board-scroll stw-scroll">
        <table className="mv-table stw-table">
          <caption className="sr-only">
            {ar ? `الشركات مرتبة حسب ${unitDef.ar}` : `Companies ranked by ${unitDef.en}`}
          </caption>
          <thead>
            <tr>
              <th scope="col" className="stw-col-n">#</th>
              <th scope="col" className="mv-col-company stw-col-co">{ar ? 'الشركة' : 'Company'}</th>
              <th scope="col" className="mv-col-num" aria-sort={d === 'desc' ? 'descending' : 'ascending'}>
                <button type="button" className="stw-sort"
                  onClick={() => onDir(dir === 'desc' ? 'asc' : 'desc')}>
                  {ar ? unitDef.ar : unitDef.en}
                  <i aria-hidden="true">{d === 'desc' ? '▾' : '▴'}</i>
                </button>
              </th>
              <th scope="col" className="mv-col-num stw-col-share">{ar ? 'الحصة' : 'Share'}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => {
              const v = valueOf(r)
              /* A share only exists where the measure has a total to be a share
                 OF. A P/E has none, and a price has none — those print `—`
                 rather than a ratio of unlike quantities. */
              const denom = ranking === 'mcap' ? cap.total : null
              return (
                <tr key={r.sym} className="stw-row">
                  <td className="stw-col-n"><bdi>{i + 1}</bdi></td>
                  <td className="mv-col-company stw-col-co">
                    <Link href={`/c/${r.sym}`}>
                      <bdi className="stw-sym">{r.sym}</bdi>
                      <strong title={r.name}>{r.name}</strong>
                    </Link>
                  </td>
                  <td className="mv-col-num stw-v">
                    <bdi>
                      {v == null ? '—'
                        : unitDef.kind === 'iqd' ? iqd(v)
                          : unitDef.kind === 'ratio' ? `${nf1.format(v)}×`
                            : v.toFixed(2)}
                    </bdi>
                    {/* A stale close is labelled as what it is, never as current. */}
                    {ranking === 'close' && r.stalePrice
                      ? <small className="stw-stale-tag" title={r.closeDate ?? undefined}>{ar ? 'إغلاق قديم' : 'old close'}</small>
                      : null}
                  </td>
                  <td className="mv-col-num stw-col-share">
                    <bdi>{denom && v != null ? `${((v / denom) * 100).toFixed(2)}%` : '—'}</bdi>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {sorted.length > 12 ? (
        <button type="button" className="stw-more" onClick={() => onShowAll(!showAll)}>
          {showAll
            ? (ar ? 'عرض أول 12 فقط' : 'Show the first 12 only')
            : (ar ? `عرض جميع الـ ${sorted.length}` : `Show all ${sorted.length}`)}
        </button>
      ) : null}
    </section>
  )
}

/* ── التقييم ───────────────────────────────────────────────────────────────
   The approved composition: median-led, spread beside it, the distribution as
   discrete bands in the rail, and one honest line about the statistic the
   product cannot yet publish.

   Median first, because a handful of 60× multiples drag the mean somewhere no
   company actually sits — and coverage is printed beside it, because a median
   over 30 of 99 is a useful number and a dishonest one if that ratio is hidden. */
function ValuationMode({ rows, med, universe, ar }: {
  rows: { sym: string; name: string; pe: number }[]; med: number | null
  universe: number; ar: boolean
}) {
  if (!rows.length) {
    return (
      <div className="stw-empty">
        <strong>{ar ? 'لا تتوفر مكررات ربحية' : 'No P/E ratios available'}</strong>
        <span>{ar
          ? 'تُحتسب من البيانات المالية المنشورة، وهي غير متوفرة لهذه الجلسة.'
          : 'These are computed from published financials, which are unavailable.'}</span>
      </div>
    )
  }
  const vals = rows.map((r) => r.pe)
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  /* `nf1` rounds anything under 0.05 to «0», which prints a POSITIVE multiple
     as zero — the one value this set is filtered to exclude. Small ratios keep
     enough significant figures to stay non-zero. */
  const ratio = (v: number) => (v > 0 && v < 1 ? v.toPrecision(2) : nf1.format(v))
  const bands = [
    { lo: 0, hi: 5, ar: 'أقل من 5', en: 'under 5' },
    { lo: 5, hi: 10, ar: '5 — 10', en: '5 — 10' },
    { lo: 10, hi: 20, ar: '10 — 20', en: '10 — 20' },
    { lo: 20, hi: 40, ar: '20 — 40', en: '20 — 40' },
    { lo: 40, hi: Infinity, ar: 'أكثر من 40', en: 'over 40' },
  ].map((b) => ({ ...b, n: rows.filter((r) => r.pe >= b.lo && r.pe < b.hi).length }))
  const bandMax = Math.max(...bands.map((b) => b.n), 1)

  return (
    <section className="stw-mode stw-valuation" aria-label={ar ? 'التقييم' : 'Valuation'}>
      <div className="stw-primary">
        <div className="stw-mode-head">
          <div>
            <h2>{ar ? 'مكرر الربحية' : 'Price / earnings'}</h2>
            <p>
              {ar
                ? <><bdi>{rows.length}</bdi> من <bdi>{universe}</bdi> شركة · تغطية <bdi>{((rows.length / Math.max(universe, 1)) * 100).toFixed(0)}%</bdi></>
                : <><bdi>{rows.length}</bdi> of <bdi>{universe}</bdi> companies · coverage <bdi>{((rows.length / Math.max(universe, 1)) * 100).toFixed(0)}%</bdi></>}
              <button type="button" className="stw-info"
                title={ar
                  ? 'يُحسب المكرر للشركات ذات الأرباح الموجبة فقط؛ الشركات الخاسرة أو التي لا تتوفر أرباحها مستبعدة ولا تُحسب صفراً.'
                  : 'The ratio is computed only for companies with positive earnings; loss-making companies and those without published earnings are excluded, never counted as zero.'}>؟</button>
            </p>
          </div>
        </div>

        <div className="stw-val-lead">
          <span>{ar ? 'الوسيط' : 'Median'}</span>
          <strong>
            <bdi>{med == null ? '—' : ratio(med)}</bdi><small>×</small>
          </strong>
        </div>

        <dl className="stw-val-figs">
          <div><dt>{ar ? 'المتوسط' : 'Mean'}</dt><dd><bdi>{ratio(mean)}</bdi>×</dd></div>
          <div><dt>{ar ? 'الأدنى' : 'Lowest'}</dt><dd><bdi>{ratio(min)}</bdi>×</dd></div>
          <div><dt>{ar ? 'الأعلى' : 'Highest'}</dt><dd><bdi>{ratio(max)}</bdi>×</dd></div>
        </dl>

        <p className="stw-note">
          {ar
            ? 'الوسيط أولاً: حفنة من المكررات المرتفعة تسحب المتوسط إلى مستوى لا تتداول عنده أي شركة. الفارق بين الرقمين هو انحراف التوزيع نفسه، لا خطأ فيه.'
            : 'Median first: a handful of high multiples pulls the mean to a level no company trades at. The gap between the two numbers is the skew of the distribution itself, not an error in it.'}
        </p>
        {max > 1000 ? (
          /* The upper tail is real and it is enormous: a company whose stored
             earnings are near zero divides into a multiple in the millions.
             The figure is printed rather than trimmed, and it is explained,
             because a silently capped maximum is a different statistic. */
          <p className="stw-note stw-warn">
            <i aria-hidden="true">△</i>
            {ar
              ? <> الحد الأعلى مكرر شركة أرباحها المخزّنة قريبة من الصفر، فيخرج الرقم بالملايين. هو ناتج القسمة فعلاً، لا خطأ في العرض — ولهذا يقود الوسيط لا المتوسط.</>
              : <> The maximum belongs to a company whose stored earnings are near zero, so the quotient runs into the millions. It is the real division, not a display error — which is why the median leads here, not the mean.</>}
          </p>
        ) : null}
      </div>

      <aside className="stw-side">
        <h3>{ar ? 'التوزيع' : 'Distribution'}</h3>
        <ul className="stw-hist">
          {bands.map((b) => (
            <li key={b.en}>
              <span className="stw-hist-l">{ar ? b.ar : b.en}</span>
              <span className="stw-hist-track" aria-hidden="true">
                <i style={{ inlineSize: `${(b.n / bandMax) * 100}%` }} />
              </span>
              <bdi className="stw-hist-n">{b.n}</bdi>
            </li>
          ))}
        </ul>
        <p className="stw-note">
          {ar
            ? <>فئات منفصلة لا منحنى: بـ<bdi>{rows.length}</bdi> مشاهدة، أي تنعيم يرسم شكلاً لا تملكه البيانات.</>
            : <>Discrete bands, not a curve: with <bdi>{rows.length}</bdi> observations, any smoothing draws a shape the data does not have.</>}
        </p>

        {/* Honest, and small. An unavailable statistic does not earn a surface. */}
        <p className="stw-off">
          <span>{ar ? 'عائد التوزيعات' : 'Dividend yield'}</span>
          <em>{ar ? 'غير متاح' : 'unavailable'}</em>
          <button type="button" className="stw-info"
            title={ar
              ? 'عوائد التوزيعات موجودة في المنتج كمفتاح نسبة داخل financial_ratios، لكن استخراج البيانات المالية لم يُشغَّل لأغلب الشركات، فالتغطية قريبة من الصفر. عرضها الآن سيوحي بشمولٍ غير موجود.'
              : 'Dividend yield exists in the product as a ratio key inside financial_ratios, but the financial extraction has not run for most companies, so coverage is near zero. Showing it now would imply a completeness that does not exist.'}>
            {ar ? 'لماذا؟' : 'why?'}
          </button>
        </p>
      </aside>
    </section>
  )
}

/* ── التدفق الأجنبي ────────────────────────────────────────────────────────
   The approved composition: a summary, not a second dashboard. One dominant
   net figure paired with its own label, three supporting figures on one
   baseline beside it, and a small diverging strip that shows the SHAPE of the
   series — not a copy of the detail page's chart system.

   It reads through the same `lib/foreignFlow` functions the detail route uses,
   over the same trading-session calendar, so «التدفق الأجنبي» here and there
   cannot mean two different things. */
function ForeignMode({ t, buckets, failed, ar }: {
  t: FlowTotals | null; buckets: FlowBucket[]; failed: boolean; ar: boolean
}) {
  if (failed || !t) {
    return (
      <div className="stw-empty">
        <strong>{ar ? 'لا تتوفر بيانات التدفق الأجنبي' : 'No foreign-flow data'}</strong>
        <Link className="stw-link" href="/statistics/foreign-flow">{ar ? 'التفاصيل' : 'Details'} ↗</Link>
      </div>
    )
  }
  /* Buckets with NO observation are holes. They are excluded from the
     up-month count and drawn as nothing — never as a zero-height bar, which
     would read as «the month netted flat». */
  const observed = buckets.filter((b) => b.net != null)
  const upMonths = observed.filter((b) => (b.net as number) > 0).length
  const max = Math.max(...observed.map((b) => Math.abs(b.net as number)), 1)

  return (
    <section className="stw-mode" aria-label={ar ? 'التدفق الأجنبي' : 'Foreign flow'}>
      <div className="stw-mode-head">
        <div>
          <h2>{ar ? 'التدفق الأجنبي' : 'Foreign flow'}</h2>
          {/* Its OWN window — never the page's. */}
          <p>{ar
            ? <>نافذة هذا القسم · <bdi>{t.from}</bdi> — <bdi>{t.to}</bdi> · <bdi>{nf0.format(t.sessions)}</bdi> جلسة</>
            : <>This section’s own window · <bdi>{t.from}</bdi> — <bdi>{t.to}</bdi> · <bdi>{nf0.format(t.sessions)}</bdi> sessions</>}</p>
        </div>
        <Link className="stw-cta" href="/statistics/foreign-flow">
          {ar ? 'الصفحة الكاملة' : 'Full page'} <i aria-hidden="true">←</i>
        </Link>
      </div>

      <div className="stw-flow">
        <div className="stw-flow-lead">
          <span>{ar ? 'الصافي التراكمي' : 'Cumulative net'}</span>
          <strong className={t.net > 0 ? 'is-up' : t.net < 0 ? 'is-down' : ''}>
            <bdi>{t.net > 0 ? '+' : t.net < 0 ? '−' : ''}{iqd(Math.abs(t.net))}</bdi>
            <small>{ar ? 'د.ع' : 'IQD'}</small>
          </strong>
          <em>
            {ar
              ? <><bdi>{upMonths}</bdi> من <bdi>{observed.length}</bdi> شهراً بصافي شراء</>
              : <><bdi>{upMonths}</bdi> of <bdi>{observed.length}</bdi> months net buying</>}
          </em>
        </div>
        <dl className="stw-flow-figs">
          <div><dt>{ar ? 'إجمالي الشراء' : 'Total buying'}</dt><dd className="is-up"><bdi>{iqd(t.buy)}</bdi></dd></div>
          <div><dt>{ar ? 'إجمالي البيع' : 'Total selling'}</dt><dd className="is-down"><bdi>{iqd(t.sell)}</bdi></dd></div>
          <div><dt>{ar ? 'الأشهر' : 'Months'}</dt><dd><bdi>{observed.length}</bdi></dd></div>
        </dl>
      </div>

      {/* One small diverging strip — the shape of the series. */}
      <div className="stw-netwrap">
        <ul className="stw-netbars" aria-label={ar ? 'صافي التدفق الشهري' : 'Monthly net flow'}>
          {observed.map((b) => {
            const net = b.net as number
            return (
              <li key={b.key} className={net >= 0 ? 'is-up' : 'is-down'}
                title={`${arMonth(b.key)} · ${net >= 0 ? '+' : '−'}${iqdFull(Math.abs(net))} ${ar ? 'د.ع' : 'IQD'}`}>
                <i style={{ blockSize: `${(Math.abs(net) / max) * 100}%` }} />
              </li>
            )
          })}
        </ul>
      </div>

      <p className="stw-note">
        {ar
          ? <>شهري ومجمَّع من السلسلة نفسها التي تستخدمها صفحة التدفق الكاملة، فالرقمان لا يختلفان · <bdi>{nf0.format(t.counted)}</bdi> جلسة برصد فعلي{t.missing > 0 ? <> و<bdi>{t.missing}</bdi> جلسة بلا بيانات لم تُحتسب</> : null}. التفصيل حسب الشركة والقطاع في <Link className="stw-link" href="/statistics/foreign-flow">الصفحة الكاملة</Link>.</>
          : <>Monthly, aggregated from the same series the full flow page uses, so the two cannot disagree · <bdi>{nf0.format(t.counted)}</bdi> sessions observed{t.missing > 0 ? <>, <bdi>{t.missing}</bdi> with no data and not counted</> : null}. Company and sector detail is on the <Link className="stw-link" href="/statistics/foreign-flow">full page</Link>.</>}
      </p>
    </section>
  )
}
