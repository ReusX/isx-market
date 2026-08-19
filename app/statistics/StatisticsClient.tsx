'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import { fetchCompanyMeta, SECTORS } from '@/lib/market'
import { StatChart } from './StatChart'
import {
  PERIODS, METRICS, GRAIN_LABEL, REBASE,
  windowFor, grainFor, bucketize, totalsFor, metricOf, median,
  normalizeSectors, SECTOR_LABELS, capSnapshot, capShare, usableName,
  arFull, arMonth, iqd, nf0, nf1,
  type Session, type PeriodId, type MetricId, type SectorMonthRow,
  type SectorActivity, type SectorReconciliation, type CapSnapshot, type CapInput,
} from '@/lib/statistics'
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

type FlowDay = { date: string; buy: number; sell: number }

export default function StatisticsClient() {
  const { lang } = useApp()
  const ar = lang === 'ar'

  const [sessions, setSessions] = useState<Session[]>([])
  const [sectorRows, setSectorRows] = useState<SectorMonthRow[]>([])
  const [cap, setCap] = useState<CapSnapshot | null>(null)
  const [pe, setPe] = useState<{ sym: string; name: string; pe: number }[]>([])
  const [flow, setFlow] = useState<FlowDay[]>([])
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
  const [showAll, setShowAll] = useState(false)

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
          .select('date,side,value').order('date', { ascending: false }).limit(3000)
          .then(({ data, error }) => {
            if (error || !data?.length) { setFlowFailed(true); return }
            const byDate = new Map<string, FlowDay>()
            for (const r of data as { date: string; side: string; value: number | null }[]) {
              const d = byDate.get(r.date) ?? { date: r.date, buy: 0, sell: 0 }
              if (r.side === 'buy') d.buy += r.value ?? 0
              else d.sell += r.value ?? 0
              byDate.set(r.date, d)
            }
            setFlow(Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date)))
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

  const flowWindow = useMemo(() => {
    const n = PERIODS.find((p) => p.id === period)!.sessions
    return Number.isFinite(n) ? flow.slice(-n) : flow
  }, [flow, period])
  const flowBuy = flowWindow.reduce((a, f) => a + f.buy, 0)
  const flowSell = flowWindow.reduce((a, f) => a + f.sell, 0)

  const peSorted = useMemo(() => [...pe].sort((a, b) => a.pe - b.pe), [pe])
  const peMedian = useMemo(() => median(pe.map((p) => p.pe)), [pe])

  const scope = MODES.find((m) => m.id === mode)!.scope
  const metricDef = METRICS.find((m) => m.id === metric)!
  const unit = ar ? metricDef.unitAr : metricDef.unitEn
  const L = (o: { ar: string; en: string }) => (ar ? o.ar : o.en)

  const scopeLine =
    scope === 'period' && t ? (ar
      ? <>الأرقام في هذا القسم تتبع الفترة المحددة · <bdi>{t.from}</bdi> — <bdi>{t.to}</bdi> · <bdi>{nf0.format(t.sessions)}</bdi> جلسة</>
      : <>This section follows the selected period · <bdi>{t.from}</bdi> — <bdi>{t.to}</bdi> · <bdi>{nf0.format(t.sessions)}</bdi> sessions</>)
    : scope === 'own' ? (ar
      ? <>نافذة خاصة بهذا القسم — لا تتبع الفترة المحددة{flowWindow.length ? <> · <bdi>{flowWindow[0].date}</bdi> — <bdi>{flowWindow[flowWindow.length - 1].date}</bdi></> : null}</>
      : <>This section has its own window — it does not follow the selected period{flowWindow.length ? <> · <bdi>{flowWindow[0].date}</bdi> — <bdi>{flowWindow[flowWindow.length - 1].date}</bdi></> : null}</>)
    : scope === 'month' ? (ar
      ? <>شهر واحد — لا يتبع الفترة المحددة · <bdi>{arMonth(recon.month)}</bdi></>
      : <>One calendar month — does not follow the selected period · <bdi>{recon.month}</bdi></>)
    : (ar
      ? <>لقطة حالية — لا تتبع الفترة المحددة · آخر إغلاق <bdi>{arFull(cap?.session ?? null)}</bdi></>
      : <>Current snapshot — does not follow the selected period · last close <bdi>{cap?.session ?? '—'}</bdi></>)

  return (
    <main className="iq-page stw">
      <header className="stw-head">
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
                  <StatChart buckets={buckets} metric={metric} grain={grain} ar={ar} label={L(metricDef)} />
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
                picked={picked} onPick={setPickedSector} ar={ar} />
            ) : null}

            {/* ═══ الشركات ═════════════════════════════════════════════ */}
            {mode === 'companies' ? (
              <CompaniesMode cap={cap} ar={ar} showAll={showAll} onShowAll={() => setShowAll(true)} />
            ) : null}

            {/* ═══ التقييم ═════════════════════════════════════════════ */}
            {mode === 'valuation' ? (
              <ValuationMode rows={peSorted} med={peMedian} universe={cap?.included ?? 0} ar={ar} />
            ) : null}

            {/* ═══ التدفق الأجنبي ══════════════════════════════════════ */}
            {mode === 'foreign' ? (
              <ForeignMode window={flowWindow} buy={flowBuy} sell={flowSell}
                failed={flowFailed} ar={ar} />
            ) : null}
          </>
        )}
      </div>
    </main>
  )
}

/* ── بنية السوق ────────────────────────────────────────────────────────────
   The market-cap snapshot over the LISTED roster. Neither
   `sector_monthly.market_cap` nor `company_caps_monthly` is consulted — see
   lib/statistics.ts §3 for why both were discarded. */
function StructureMode({ cap, ar }: { cap: CapSnapshot | null; ar: boolean }) {
  if (!cap || !cap.rows.length) {
    return <div className="stw-empty"><strong>{ar ? 'لا تتوفر بيانات القيمة السوقية' : 'No market-cap data available'}</strong></div>
  }
  const top = cap.rows[0]
  return (
    <section className="stw-mode stw-structure" aria-label={ar ? 'بنية السوق' : 'Market structure'}>
      <div className="stw-primary">
        <div className="stw-mode-head">
          <div>
            <h2>{ar ? 'القيمة السوقية حسب القطاع' : 'Market cap by sector'}</h2>
            <p>
              {ar
                ? <>إجمالي <bdi>{iqd(cap.total)}</bdi> د.ع · <bdi>{cap.included}</bdi> من <bdi>{cap.universe}</bdi> شركة مدرجة</>
                : <>Total <bdi>{iqd(cap.total)}</bdi> IQD · <bdi>{cap.included}</bdi> of <bdi>{cap.universe}</bdi> listed</>}
            </p>
          </div>
        </div>

        <ol className="stw-rank">
          {cap.bySector.map((s) => (
            <li key={s.key}>
              <span className="stw-rank-name">{s.label}</span>
              <span className="stw-rank-bar" aria-hidden="true">
                <i style={{ inlineSize: `${(s.total / cap.bySector[0].total) * 100}%` }} />
              </span>
              <bdi className="stw-rank-v">{iqd(s.total)}</bdi>
              <bdi className="stw-rank-p">{((s.total / cap.total) * 100).toFixed(1)}%</bdi>
              <bdi className="stw-rank-n">{s.count}</bdi>
            </li>
          ))}
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
            <dt>{ar ? 'أكبر 5' : 'Top 5'}</dt>
            <dd><bdi>{((capShare(cap, 5) ?? 0) * 100).toFixed(1)}%</bdi></dd>
          </div>
          <div>
            <dt>{ar ? 'أكبر 10' : 'Top 10'}</dt>
            <dd><bdi>{((capShare(cap, 10) ?? 0) * 100).toFixed(1)}%</bdi></dd>
          </div>
        </dl>

        {/* §3 of the decision: stale-price coverage is surfaced, never hidden,
            and a stale close is never described as a current price. */}
        <p className="stw-note stw-cov">
          {ar
            ? <>القيمة السوقية = آخر إغلاق منشور × الأسهم المصدرة · <bdi>{cap.included}</bdi> من <bdi>{cap.universe}</bdi> شركة مدرجة{cap.officialListed != null ? <> (العدد الرسمي <bdi>{cap.officialListed}</bdi>)</> : null}{cap.excluded > 0 ? <> · استُبعدت <bdi>{cap.excluded}</bdi> لعدم توفر عدد الأسهم</> : null}.</>
            : <>Market cap = last published close × issued shares · <bdi>{cap.included}</bdi> of <bdi>{cap.universe}</bdi> listed{cap.officialListed != null ? <> (official count <bdi>{cap.officialListed}</bdi>)</> : null}{cap.excluded > 0 ? <> · <bdi>{cap.excluded}</bdi> excluded for a missing share count</> : null}.</>}
        </p>
        {cap.stalePriced > 0 ? (
          <p className="stw-note stw-stale">
            {ar
              ? <><bdi>{cap.stalePriced}</bdi> شركة مُسعّرة بإغلاق أقدم من 60 يوماً — إغلاق منشور فعلي، وليس سعراً حالياً — وتمثّل <bdi>{(cap.staleShare * 100).toFixed(1)}%</bdi> من الإجمالي.</>
              : <><bdi>{cap.stalePriced}</bdi> companies are priced on a close older than 60 days — a real published price, not a current one — and account for <bdi>{(cap.staleShare * 100).toFixed(1)}%</bdi> of the total.</>}
          </p>
        ) : null}
      </aside>
    </section>
  )
}

/* ── القطاعات ──────────────────────────────────────────────────────────────
   Activity only, for ONE calendar month. No market cap: the only per-sector
   source double-counts across alias rows. */
function SectorsMode({ sectors, recon, total, failed, picked, onPick, ar }: {
  sectors: SectorActivity[]; recon: SectorReconciliation; total: number
  failed: boolean; picked: SectorActivity | null
  onPick: (k: string | null) => void; ar: boolean
}) {
  if (failed || !sectors.length) {
    return (
      <div className="stw-empty">
        <strong>{ar ? 'لا تتوفر بيانات القطاعات' : 'No sector data available'}</strong>
        <span>{ar ? 'تعذّر تحميل الجدول الشهري للقطاعات.' : 'The monthly sector table could not be loaded.'}</span>
      </div>
    )
  }
  return (
    <section className="stw-mode stw-sectors" aria-label={ar ? 'القطاعات' : 'Sectors'}>
      <div className="stw-primary">
        <div className="stw-mode-head">
          <div>
            <h2>{ar ? 'نشاط القطاعات' : 'Sector activity'}</h2>
            <p>
              {ar
                ? <>شهر <bdi>{arMonth(recon.month)}</bdi> · <bdi>{recon.sectors}</bdi> قطاعات · إجمالي <bdi>{iqd(total)}</bdi> د.ع</>
                : <><bdi>{recon.month}</bdi> · <bdi>{recon.sectors}</bdi> sectors · total <bdi>{iqd(total)}</bdi> IQD</>}
            </p>
          </div>
        </div>
        <ol className="stw-rank">
          {sectors.map((s) => (
            <li key={s.key}>
              <button type="button" className="stw-sec-pick"
                aria-pressed={picked?.key === s.key}
                onClick={() => onPick(picked?.key === s.key ? null : s.key)}>
                <span className="stw-rank-name">{ar ? SECTOR_LABELS[s.key].ar : SECTOR_LABELS[s.key].en}</span>
                <span className="stw-rank-bar" aria-hidden="true">
                  <i style={{ inlineSize: `${(s.value / sectors[0].value) * 100}%` }} />
                </span>
                <bdi className="stw-rank-v">{iqd(s.value)}</bdi>
                <bdi className="stw-rank-p">{total ? ((s.value / total) * 100).toFixed(1) : '0.0'}%</bdi>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <aside className="stw-side">
        <h3>{picked ? (ar ? SECTOR_LABELS[picked.key].ar : SECTOR_LABELS[picked.key].en) : (ar ? 'الشهر' : 'The month')}</h3>
        {picked ? (
          <dl className="stw-conc">
            <div><dt>{ar ? 'قيمة التداول' : 'Traded value'}</dt><dd><bdi>{iqd(picked.value)}</bdi></dd></div>
            <div><dt>{ar ? 'الحجم' : 'Volume'}</dt><dd><bdi>{iqd(picked.volume)}</bdi></dd></div>
            <div><dt>{ar ? 'الصفقات' : 'Trades'}</dt><dd><bdi>{nf0.format(picked.trades)}</bdi></dd></div>
            <div><dt>{ar ? 'شركات متداولة' : 'Traded companies'}</dt><dd><bdi>{picked.tradedCompanies}</bdi></dd></div>
            {/* Null in every current row — `—`, never fabricated. */}
            <div><dt>{ar ? 'شركات مدرجة' : 'Listed companies'}</dt><dd><bdi>{picked.listedCompanies ?? '—'}</bdi></dd></div>
          </dl>
        ) : (
          <p className="stw-side-lede">
            {ar ? 'اختر قطاعاً لعرض تفاصيله.' : 'Pick a sector to see its detail.'}
          </p>
        )}
        <p className="stw-note stw-cov">
          {ar
            ? <>نشاط شهري فقط — لا تُعرض قيمة سوقية للقطاعات لأن المصدر الشهري الوحيد يحتسبها مرتين. عدد الشركات المدرجة غير متوفر في المصدر ويظهر <bdi>—</bdi>.</>
            : <>Monthly activity only — no sector market cap is shown, because the one monthly source double-counts it. The listed-company count is absent from the source and shows as <bdi>—</bdi>.</>}
        </p>
        {recon.droppedDuplicates > 0 ? (
          <p className="stw-note">
            {ar
              ? <>من <bdi>{recon.rawRows}</bdi> صفاً في المصدر استُبعد <bdi>{recon.droppedDuplicates}</bdi> صف مكرر بلا نشاط، ووحّدت الأسماء التاريخية — دون فقدان أي نشاط.</>
              : <>Of <bdi>{recon.rawRows}</bdi> source rows, <bdi>{recon.droppedDuplicates}</bdi> inert duplicate was excluded and historical names merged — with no activity lost.</>}
          </p>
        ) : null}
      </aside>
    </section>
  )
}

/* ── الشركات ───────────────────────────────────────────────────────────── */
function CompaniesMode({ cap, ar, showAll, onShowAll }: {
  cap: CapSnapshot | null; ar: boolean; showAll: boolean; onShowAll: () => void
}) {
  if (!cap || !cap.rows.length) {
    return <div className="stw-empty"><strong>{ar ? 'لا تتوفر بيانات الشركات' : 'No company data'}</strong></div>
  }
  const shown = showAll ? cap.rows : cap.rows.slice(0, 20)
  return (
    <section className="stw-mode" aria-label={ar ? 'الشركات' : 'Companies'}>
      <div className="stw-mode-head">
        <div>
          <h2>{ar ? 'أكبر الشركات بالقيمة السوقية' : 'Largest companies by market cap'}</h2>
          <p>{ar
            ? <>لقطة حالية · آخر إغلاق <bdi>{arFull(cap.session)}</bdi></>
            : <>Current snapshot · last close <bdi>{cap.session ?? '—'}</bdi></>}</p>
        </div>
      </div>

      <div className="stw-scroll">
        <table className="stw-table">
          <caption className="sr-only">{ar ? 'الشركات مرتبة بالقيمة السوقية' : 'Companies ranked by market cap'}</caption>
          <thead>
            <tr>
              <th scope="col" className="stw-col-n">#</th>
              <th scope="col" className="stw-col-co">{ar ? 'الشركة' : 'Company'}</th>
              <th scope="col" className="stw-col-num">{ar ? 'آخر إغلاق' : 'Last close'}</th>
              <th scope="col" className="stw-col-num">{ar ? 'القيمة السوقية' : 'Market cap'}</th>
              <th scope="col" className="stw-col-num">{ar ? 'الحصة' : 'Share'}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={r.sym}>
                <td className="stw-col-n"><bdi>{i + 1}</bdi></td>
                <td className="stw-col-co">
                  <Link href={`/c/${r.sym}`}>
                    <strong title={r.name}>{r.name}</strong>
                    <small><bdi>{r.sym}</bdi></small>
                  </Link>
                </td>
                <td className="stw-col-num">
                  <bdi>{r.close.toFixed(2)}</bdi>
                  {/* A stale close is labelled as what it is, never as current. */}
                  {r.stalePrice ? <small className="stw-stale-tag" title={r.closeDate ?? undefined}>{ar ? 'إغلاق قديم' : 'old close'}</small> : null}
                </td>
                <td className="stw-col-num"><bdi>{iqd(r.marketCap)}</bdi></td>
                <td className="stw-col-num"><bdi>{((r.marketCap / cap.total) * 100).toFixed(2)}%</bdi></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!showAll && cap.rows.length > 20 ? (
        <button type="button" className="stw-more" onClick={onShowAll}>
          {ar ? `عرض كل ${cap.rows.length} شركة` : `Show all ${cap.rows.length}`}
        </button>
      ) : null}
    </section>
  )
}

/* ── التقييم ───────────────────────────────────────────────────────────────
   Median-led, because a handful of 60× multiples drag the mean somewhere no
   company actually is — and coverage is printed beside it, because a median
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
  const bands = [
    { lo: 0, hi: 5, ar: 'أقل من 5', en: 'under 5' },
    { lo: 5, hi: 10, ar: '5 — 10', en: '5 — 10' },
    { lo: 10, hi: 20, ar: '10 — 20', en: '10 — 20' },
    { lo: 20, hi: 40, ar: '20 — 40', en: '20 — 40' },
    { lo: 40, hi: Infinity, ar: 'أكثر من 40', en: 'over 40' },
  ].map((b) => ({ ...b, n: rows.filter((r) => r.pe >= b.lo && r.pe < b.hi).length }))
  const max = Math.max(...bands.map((b) => b.n), 1)

  return (
    <section className="stw-mode stw-structure" aria-label={ar ? 'التقييم' : 'Valuation'}>
      <div className="stw-primary">
        <div className="stw-mode-head">
          <div>
            <h2>{ar ? 'توزيع مكرر الربحية' : 'P/E distribution'}</h2>
            <p>{ar
              ? <>آخر 12 شهراً · <bdi>{rows.length}</bdi> من <bdi>{universe}</bdi> شركة</>
              : <>Trailing twelve months · <bdi>{rows.length}</bdi> of <bdi>{universe}</bdi> companies</>}</p>
          </div>
        </div>
        <ol className="stw-rank">
          {bands.map((b) => (
            <li key={b.ar}>
              <span className="stw-rank-name">{ar ? b.ar : b.en}</span>
              <span className="stw-rank-bar" aria-hidden="true">
                <i style={{ inlineSize: `${(b.n / max) * 100}%` }} />
              </span>
              <bdi className="stw-rank-v">{b.n}</bdi>
            </li>
          ))}
        </ol>
      </div>

      <aside className="stw-side">
        <h3>{ar ? 'الوسيط' : 'Median'}</h3>
        <dl className="stw-conc">
          <div>
            <dt>{ar ? 'وسيط المكرر' : 'Median P/E'}</dt>
            <dd><bdi>{med == null ? '—' : nf1.format(med)}</bdi></dd>
          </div>
          <div>
            <dt>{ar ? 'التغطية' : 'Coverage'}</dt>
            <dd><bdi>{rows.length}</bdi><small>{ar ? `من ${universe}` : `of ${universe}`}</small></dd>
          </div>
        </dl>
        <p className="stw-note stw-cov">
          {ar
            ? <>الوسيط لا المتوسط — حفنة من المكررات فوق 60 تجرّ المتوسط إلى موضع لا تجلس فيه أي شركة. لا يظهر مكرر للشركات غير الرابحة أو التي لا تتوفر بياناتها المالية.</>
            : <>Median, not mean — a handful of multiples above 60 drags the mean somewhere no company actually sits. No ratio is shown for loss-making companies or those without published financials.</>}
        </p>
      </aside>
    </section>
  )
}

/* ── التدفق الأجنبي ────────────────────────────────────────────────────────
   A summary and an entry point. The reconciled model the homepage and the
   detail route already share — no second definition. */
function ForeignMode({ window: win, buy, sell, failed, ar }: {
  window: FlowDay[]; buy: number; sell: number; failed: boolean; ar: boolean
}) {
  if (failed || !win.length) {
    return (
      <div className="stw-empty">
        <strong>{ar ? 'لا تتوفر بيانات التدفق الأجنبي' : 'No foreign-flow data'}</strong>
        <Link className="stw-link" href="/statistics/foreign-flow">{ar ? 'التفاصيل' : 'Details'} ↗</Link>
      </div>
    )
  }
  const net = buy - sell
  const total = buy + sell
  const upDays = win.filter((f) => f.buy - f.sell > 0).length
  return (
    <section className="stw-mode stw-flow" aria-label={ar ? 'التدفق الأجنبي' : 'Foreign flow'}>
      <div className="stw-mode-head">
        <div>
          <h2>{ar ? 'التدفق الأجنبي' : 'Foreign flow'}</h2>
          {/* Its OWN window — never the page's. */}
          <p>{ar
            ? <>نافذة هذا القسم · <bdi>{win[0].date}</bdi> — <bdi>{win[win.length - 1].date}</bdi> · <bdi>{win.length}</bdi> جلسة</>
            : <>This section’s own window · <bdi>{win[0].date}</bdi> — <bdi>{win[win.length - 1].date}</bdi> · <bdi>{win.length}</bdi> sessions</>}</p>
        </div>
        <Link className="stw-cta" href="/statistics/foreign-flow">{ar ? 'التفاصيل' : 'Details'} ↗</Link>
      </div>

      <div className="stw-flow-lead">
        <span>{ar ? 'صافي التدفق' : 'Net flow'}</span>
        <strong className={net > 0 ? 'is-up' : net < 0 ? 'is-down' : ''}>
          <bdi>{net > 0 ? '+' : net < 0 ? '−' : ''}{iqd(Math.abs(net))}</bdi> <small>{ar ? 'د.ع' : 'IQD'}</small>
        </strong>
      </div>

      <div className="stw-netbars">
        <div className="stw-netwrap">
          <span>{ar ? 'شراء' : 'Buy'}</span>
          <i className="is-up" style={{ inlineSize: total ? `${(buy / total) * 100}%` : '0%' }} />
          <bdi>{iqd(buy)}</bdi>
        </div>
        <div className="stw-netwrap">
          <span>{ar ? 'بيع' : 'Sell'}</span>
          <i className="is-down" style={{ inlineSize: total ? `${(sell / total) * 100}%` : '0%' }} />
          <bdi>{iqd(sell)}</bdi>
        </div>
      </div>

      <dl className="stw-under">
        <div><dt>{ar ? 'جلسات صافي شراء' : 'Net-buy sessions'}</dt><dd><bdi>{upDays}</bdi><small>{ar ? `من ${win.length}` : `of ${win.length}`}</small></dd></div>
        <div><dt>{ar ? 'إجمالي التداول الأجنبي' : 'Total foreign turnover'}</dt><dd><bdi>{iqd(total)}</bdi></dd></div>
      </dl>

      {/* The flow fetch is bounded — 28,374 stored rows is not a payload a
          summary module should pull — so the window it covers is stated rather
          than implied to be the whole history. */}
      <p className="stw-note">
        {ar
          ? <>نافذة هذا القسم تتبع مصدرها الخاص وتختلف عن باقي أقسام الصفحة · تغطي آخر <bdi>{win.length}</bdi> جلسة تدفق مخزّنة. السجل الكامل في صفحة التفاصيل.</>
          : <>This section follows its own source and differs from the rest of the page · it covers the most recent <bdi>{win.length}</bdi> stored flow sessions. The full record is on the detail page.</>}
      </p>
    </section>
  )
}
