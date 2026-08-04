'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { fetchLive, fetchCompanyMeta, mergeCompanies, liveMcap, lastTradeNote, isSuspended, SECTORS } from '@/lib/market'
import IndexChart from '@/components/design/IndexChart'
import { ForeignFlowGauge } from '@/components/design/ForeignFlowGauge'
import { Sparkline } from '@/components/design/Sparkline'
import { SkeletonTableRows, SkeletonMoverRows } from '@/components/design/Placeholders'
import { CompanyLogo } from '@/components/CompanyLogo'
import { fetchSparklines } from '@/lib/sparks'
import { SectorPerformanceChipRow } from '@/components/design/SectorPerformanceChipRow'
import type { SectorDatum } from '@/components/design/magnitude'
import type { Company } from '@/types'

type SortKey = 'mcap' | 'price' | 'change' | 'volume' | 'value'

type IndexRow = {
  date: string
  isx60: number
  total_value: number | null
  total_volume: number | null
  total_trades: number | null
}

const nf = new Intl.NumberFormat('en-US')
const money = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
const priceFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

const SECTOR_AR = new Map(SECTORS.filter(s => s.id !== 'all').map(s => [s.id, s.ar]))

function StatIcon({ type }: { type: string }) {
  return <span className={`stat-icon ${type}`} aria-hidden="true" />
}

export default function HomeClient() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [series, setSeries] = useState<IndexRow[]>([])
  const [flow, setFlow] = useState<{ buy: number; sell: number; date: string } | null>(null)
  const [sparks, setSparks] = useState<Record<string, number[]>>({})
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('mcap') // company listings default to market cap, desc
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // ── prices + company meta ────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([fetchLive(), fetchCompanyMeta()])
      .then(([live, meta]) => setCompanies(mergeCompanies(meta, live.stocks)))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }, [])

  // ── index series, foreign flow, 7-session sparklines ─────────────────────
  useEffect(() => {
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        // 400 days covers the chart's default 1Y view without a second round
        // trip; 5Y/ALL pull the archive on demand inside IndexChart.
        const since = new Date(Date.now() - 400 * 86400_000).toISOString().slice(0, 10)

        const [{ data: idx }, { data: ff }] = await Promise.all([
          sb.from('daily_index')
            .select('date,isx60,total_value,total_volume,total_trades')
            .not('isx60', 'is', null).gte('date', since).order('date'),
          sb.from('foreign_flow_company_daily')
            .select('date,side,value').order('date', { ascending: false }).limit(400),
        ])

        const rows = (idx ?? []) as IndexRow[]
        if (rows.length) setSeries(rows)

        if (ff?.length) {
          const latest = (ff as { date: string }[])[0].date
          const today = (ff as { date: string; side: string; value: number }[]).filter(r => r.date === latest)
          setFlow({
            buy: today.filter(r => r.side === 'buy').reduce((s, r) => s + (r.value ?? 0), 0),
            sell: today.filter(r => r.side === 'sell').reduce((s, r) => s + (r.value ?? 0), 0),
            date: latest,
          })
        }

        // 7-session close history per ticker for the table's 7D column.
        setSparks(await fetchSparklines())
      } catch {
        /* index/flow are enhancements — the page still works without them */
      }
    })()
  }, [])

  const latest = series.length ? series[series.length - 1] : null
  const prev = series.length > 1 ? series[series.length - 2] : null
  const isxChange = latest && prev ? latest.isx60 - prev.isx60 : 0
  const isxPct = latest && prev && prev.isx60 ? (isxChange / prev.isx60) * 100 : 0
  const hasTradingData = Boolean(latest)

  // Only companies that actually traded in the latest session drive "today" widgets.
  const active = useMemo(() => companies.filter(c => c.close > 0), [companies])
  const traded = useMemo(() => active.filter(c => !c.stale), [active])

  const stats = useMemo(() => {
    if (!latest) return []
    const trend = (key: keyof IndexRow) =>
      series.slice(-7).map(r => Number(r[key] ?? 0)).filter(n => Number.isFinite(n))
    const pct = (key: keyof IndexRow) => {
      const now = Number(latest[key] ?? 0), before = Number(prev?.[key] ?? 0)
      return before ? ((now - before) / before) * 100 : 0
    }
    const fmtPct = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`
    return [
      { label: 'قيمة التداول', value: money.format(latest.total_value ?? 0), unit: 'IQD', change: fmtPct(pct('total_value')), icon: 'coin', trend: trend('total_value') },
      { label: 'حجم التداول', value: money.format(latest.total_volume ?? 0), unit: 'سهم', change: fmtPct(pct('total_volume')), icon: 'bars', trend: trend('total_volume') },
      { label: 'الصفقات', value: nf.format(latest.total_trades ?? 0), unit: 'صفقة', change: fmtPct(pct('total_trades')), icon: 'swap', trend: trend('total_trades') },
    ]
  }, [latest, prev, series])

  // Sector performance: value-weighted average change across today's traded names.
  const sectorData = useMemo<SectorDatum[]>(() => {
    const acc = new Map<string, { wsum: number; w: number; value: number }>()
    for (const c of traded) {
      const ar = SECTOR_AR.get(c.sec)
      if (!ar) continue
      const weight = liveMcap(c) || 1
      const e = acc.get(ar) ?? { wsum: 0, w: 0, value: 0 }
      e.wsum += c.pct * weight
      e.w += weight
      e.value += (c.vol ?? 0)
      acc.set(ar, e)
    }
    return Array.from(acc.entries())
      .map(([name, e]) => ({ name, change: e.w ? e.wsum / e.w : 0, value: e.value }))
      .filter(s => Number.isFinite(s.change))
  }, [traded])

  const topMovers = useMemo(() => ([
    { title: 'أعلى الرابحين', items: [...traded].filter(c => c.pct > 0).sort((a, b) => b.pct - a.pct).slice(0, 3), metric: 'change' as const },
    { title: 'أعلى الخاسرين', items: [...traded].filter(c => c.pct < 0).sort((a, b) => a.pct - b.pct).slice(0, 3), metric: 'change' as const },
    // Activity on ISX is read in dinars traded, so this one stays on `vol` —
    // it just has to say so rather than pass as a share count.
    { title: 'الأنشط', items: [...traded].sort((a, b) => (b.vol ?? 0) - (a.vol ?? 0)).slice(0, 3), metric: 'value' as const },
  ]), [traded])

  const sortedCompanies = useMemo(() => {
    const val = (c: Company) =>
      sortKey === 'price' ? c.close
      : sortKey === 'change' ? c.pct
      // `vol` is the traded VALUE in dinars despite the name; `shares_traded`
      // is the share count the الحجم column actually claims to show.
      : sortKey === 'volume' ? (c.shares_traded ?? 0)
      : sortKey === 'value' ? (c.vol ?? 0)
      : liveMcap(c)
    // Suspended listings are excluded outright rather than offered behind a
    // toggle like /market: this is a 25-row summary of the market, and a bank
    // whose last print was in 2024 was taking a slot in it on the strength of a
    // market cap computed from that dead price.
    return [...active].filter(c => !isSuspended(c))
      .sort((a, b) => (sortDir === 'asc' ? val(a) - val(b) : val(b) - val(a))).slice(0, 25)
  }, [active, sortKey, sortDir])

  function sortBy(key: SortKey) {
    if (key === sortKey) { setSortDir(d => (d === 'asc' ? 'desc' : 'asc')); return }
    setSortKey(key); setSortDir('desc')
  }

  return (
    <main className="terminal-shell">
      {/* ── Hero: ISX60 + foreign flow ───────────────────────────────────── */}
      <section className="hero-grid" aria-labelledby="isx60-title">
        <div className="index-panel">
          <div className="section-kicker">مؤشر السوق العراقي</div>
          <div className="index-head">
            <div>
              <h1 id="isx60-title">
                <bdi>ISX60</bdi>
                <span>مؤشر السوق العراقي</span>
              </h1>
              <p>مؤشر بورصة العراق للأوراق المالية بحسب نشرات التداول اليومية الرسمية.</p>
            </div>
            {loading && !hasTradingData ? (
              <div className="index-value skeleton-block" aria-label="جاري تحميل المؤشر" />
            ) : failed ? (
              <div className="empty-state">
                <strong>تعذّر تحميل البيانات</strong>
                <span>يرجى تحديث الصفحة.</span>
              </div>
            ) : hasTradingData ? (
              <div className="index-value">
                <bdi className="num-roll">{latest!.isx60.toFixed(2)}</bdi>
                <span className={isxChange >= 0 ? 'gain' : 'loss'} dir="ltr">
                  <bdi className="num-roll">{isxChange >= 0 ? '+' : ''}{isxChange.toFixed(2)}</bdi>
                  {' / '}
                  <bdi className="num-roll">{isxPct >= 0 ? '+' : ''}{isxPct.toFixed(2)}%</bdi>
                </span>
              </div>
            ) : (
              <div className="empty-state">
                <strong>لم يبدأ التداول اليوم</strong>
                <span>سيظهر مؤشر <bdi>ISX60</bdi> عند افتتاح الجلسة.</span>
              </div>
            )}
          </div>

          {/* Full-featured index chart: timeframes, crosshair, copy/download. */}
          <IndexChart rows={series} loading={loading} failed={failed} />

        </div>

        {/* Gauge drills through to the foreign-flow detail page. */}
        <Link href="/statistics/foreign-flow" aria-label="تفاصيل حركة المستثمرين الأجانب" className="flow-gauge-link">
          <ForeignFlowGauge
            foreignBuy={flow?.buy ?? 0}
            foreignSell={flow?.sell ?? 0}
            netFlow={(flow?.buy ?? 0) - (flow?.sell ?? 0)}
            insightText={
              flow
                ? `صافي ${((flow.buy - flow.sell) >= 0 ? 'شراء' : 'بيع')} أجنبي في جلسة ${flow.date}.`
                : 'لا تتوفر بيانات تدفق أجنبي للجلسة الأخيرة.'
            }
            sessionDate={flow?.date ?? ''}
            isLoading={loading && !flow}
          />
        </Link>
      </section>

      {/* ── Session activity ─────────────────────────────────────────────── */}
      <section className="stats-strip" aria-labelledby="market-activity">
        <div className="stats-title">
          <div className="section-kicker">جلسة اليوم</div>
          <h2 id="market-activity">نشاط السوق اليوم</h2>
        </div>
        {stats.length ? stats.map(({ label, value, unit, change, icon, trend }) => (
          <article key={label} className="stat-card">
            <span className="stat-label"><StatIcon type={icon} />{label}</span>
            <strong><bdi className="num-roll">{value}</bdi> <span>{unit}</span></strong>
            <em className={change.startsWith('-') ? 'loss' : 'gain'}><bdi className="num-roll">{change}</bdi></em>
            {trend.length > 1 ? <Sparkline values={trend} positive={!change.startsWith('-')} compact /> : null}
          </article>
        )) : (
          <div className="empty-state">
            <strong>لا توجد بيانات جلسة</strong>
            <span>تظهر أرقام النشاط بعد نشر نشرة التداول.</span>
          </div>
        )}
      </section>

      <SectorPerformanceChipRow sectors={sectorData} />

      {/* ── Companies ────────────────────────────────────────────────────── */}
      <section className="companies-section" aria-labelledby="companies-title">
        <div className="section-heading">
          <div>
            <div className="section-kicker">لوحة الشركات</div>
            <h2 id="companies-title">الشركات المدرجة</h2>
          </div>
          <Link className="text-link" href="/market">عرض كل الشركات ←</Link>
        </div>

        <div className="movers-widget" aria-label="الأكثر حركة">
          <div className="section-kicker">الأكثر حركة</div>
          <div className="movers-grid">
            {topMovers.map(group => (
              <article key={group.title}>
                <h3>{group.title}</h3>
                {group.items.length ? group.items.map(company => (
                  <Link className="mover-row" href={`/c/${company.sym}`} key={`${group.title}-${company.sym}`}>
                    <span>
                      {company.ar || company.en || company.sym}
                      <small><bdi>{company.sym}</bdi></small>
                    </span>
                    <bdi className={`${company.pct >= 0 ? 'gain' : 'loss'} num-roll`}>
                      {group.metric === 'value'
                        ? `${compact.format(company.vol ?? 0)} IQD`
                        : `${company.pct > 0 ? '+' : ''}${company.pct.toFixed(2)}%`}
                    </bdi>
                  </Link>
                )) : loading
                  ? <SkeletonMoverRows rows={3} />
                  : <p className="mover-empty">لا توجد حركة في الجلسة.</p>}
              </article>
            ))}
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th><button type="button" onClick={() => sortBy('mcap')}>#</button></th>
                <th>الشركة</th>
                <th><button type="button" onClick={() => sortBy('price')}>آخر سعر</button></th>
                <th><button type="button" onClick={() => sortBy('change')}>التغير</button></th>
                <th><button type="button" onClick={() => sortBy('volume')}>الحجم</button></th>
                <th><button type="button" onClick={() => sortBy('mcap')}>القيمة السوقية</button></th>
                <th><bdi>7D</bdi></th>
              </tr>
            </thead>
            <tbody>
              {sortedCompanies.map((company, i) => (
                <tr key={company.sym} className="row-link">
                  <td data-label="#"><bdi className="num-roll">{i + 1}</bdi></td>
                  <td data-label="الشركة">
                    <Link className="company-cell" href={`/c/${company.sym}`}>
                      <CompanyLogo className="logo-chip" sym={company.sym} logo={company.logo} />
                      <span>
                        <strong>{company.ar || company.en || company.sym}</strong>
                        <small>{SECTOR_AR.get(company.sec) ?? company.sec} · <bdi>{company.sym}</bdi></small>
                      </span>
                    </Link>
                  </td>
                  <td data-label="آخر سعر" title={lastTradeNote(company, true)}>
                    <bdi className="num-roll">{priceFormat.format(company.close)} IQD</bdi>
                  </td>
                  {/* A name that has not traded — sometimes for years — has no
                      change and no volume to report for this session. */}
                  <td data-label="التغير" className={company.stale ? '' : company.pct >= 0 ? 'gain' : 'loss'}>
                    {company.stale
                      ? <span className="stale-flag" title={lastTradeNote(company, true)}>—</span>
                      : <bdi className="num-roll">{company.pct > 0 ? '+' : ''}{company.pct.toFixed(2)}%</bdi>}
                  </td>
                  <td data-label="الحجم">
                    {company.stale
                      ? <span className="stale-flag" title={lastTradeNote(company, true)}>·</span>
                      : <bdi className="num-roll">{compact.format(company.shares_traded ?? 0)}</bdi>}
                  </td>
                  <td data-label="القيمة السوقية">{liveMcap(company) > 0
                      ? <bdi className="num-roll">{compact.format(liveMcap(company))} IQD</bdi>
                      : <bdi className="num-roll">·</bdi>}</td>
                  <td data-label="7D">
                    {sparks[company.sym]?.length > 1
                      ? <Sparkline values={sparks[company.sym]} positive={company.pct >= 0} />
                      : <span className="spark-empty" aria-label="لا يوجد سجل كافٍ">·</span>}
                  </td>
                </tr>
              ))}
              {loading && !sortedCompanies.length ? (
                <SkeletonTableRows
                  rows={25}
                  columns={7}
                  labels={['#', 'الشركة', 'آخر سعر', 'التغير', 'الحجم', 'القيمة السوقية', '7D']}
                />
              ) : null}
              {!sortedCompanies.length && !loading ? (
                <tr><td colSpan={7}>
                  <div className="empty-state">
                    <strong>لا توجد شركات لعرضها</strong>
                    <span>تظهر الشركات بعد توفر أسعار الجلسة.</span>
                  </div>
                </td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

    </main>
  )
}
