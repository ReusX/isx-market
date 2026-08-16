'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { fetchLive, fetchCompanyMeta, mergeCompanies } from '@/lib/market'
import { fetchSparklines } from '@/lib/sparks'
import IndexChart from '@/components/design/IndexChart'
import { Sparkline } from '@/components/design/Sparkline'
import { CompanyLogo } from '@/components/CompanyLogo'
import { useOverlay } from '@/components/system/Overlay'
import { Skeleton, ModuleError, Freshness, Unavailable } from '@/components/system/DataStates'
import {
  computeBreadth, computeFlow, computeSectors, sessionFreshness, arSession,
  type Breadth, type Flow, type IndexRow, type SectorMove,
} from '@/lib/homeData'
import { BreadthCard, ActivityCard, FlowCard, SectorsCard } from './HomeModules'
import type { Company } from '@/types'

const nf = new Intl.NumberFormat('en-US')
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
const price = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

type SortKey = 'value' | 'volume' | 'change'

/**
 * The homepage.
 *
 * Every module is fed from `lib/homeData.ts` against ONE resolved session, and
 * every figure traces to `docs/HOMEPAGE_DATA_MAP.md`. Nothing here invents a
 * metric, and nothing labels a window it cannot name.
 *
 * ══ PARTIAL FAILURE ═══════════════════════════════════════════════════════
 * The page has three independent sources. A module whose source failed shows
 * its own error and the rest of the page carries on — escalating one failed
 * panel to a full-route error throws away everything that DID load, which is
 * the most common way an error state makes things worse than the error.
 */
export default function HomeClient() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [series, setSeries] = useState<IndexRow[]>([])
  const [flowRows, setFlowRows] = useState<{ date: string; side: string; value: number | null }[]>([])
  const [sparks, setSparks] = useState<Record<string, number[]>>({})

  const [pricesLoading, setPricesLoading] = useState(true)
  const [pricesFailed, setPricesFailed] = useState(false)
  const [indexFailed, setIndexFailed] = useState(false)
  const [flowFailed, setFlowFailed] = useState(false)

  const [sort, setSort] = useState<SortKey>('value')
  const [expanded, setExpanded] = useState(false)

  // ── prices + company meta ──────────────────────────────────────────────
  const loadPrices = useCallback(() => {
    setPricesFailed(false)
    setPricesLoading(true)
    Promise.all([fetchLive(), fetchCompanyMeta()])
      .then(([live, meta]) => setCompanies(mergeCompanies(meta, live.stocks)))
      .catch(() => setPricesFailed(true))
      .finally(() => setPricesLoading(false))
  }, [])

  useEffect(() => { loadPrices() }, [loadPrices])

  // ── index series + foreign flow + sparklines ───────────────────────────
  useEffect(() => {
    ;(async () => {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      const since = new Date(Date.now() - 400 * 86400_000).toISOString().slice(0, 10)

      // Independent, so one failing does not take the other.
      await Promise.allSettled([
        sb.from('daily_index')
          .select('date,isx60,total_value,total_volume,total_trades,traded_companies,listed_companies')
          .not('isx60', 'is', null).gte('date', since).order('date')
          .then(({ data, error }) => {
            if (error || !data?.length) { setIndexFailed(true); return }
            setSeries(data as IndexRow[])
          }),
        sb.from('foreign_flow_company_daily')
          .select('date,side,value').order('date', { ascending: false }).limit(400)
          .then(({ data, error }) => {
            if (error) { setFlowFailed(true); return }
            setFlowRows(data ?? [])
          }),
      ])

      try { setSparks(await fetchSparklines()) } catch { /* the 7D column degrades to nothing */ }
    })()
  }, [])

  // ── derived ────────────────────────────────────────────────────────────
  const latest = series.length ? series[series.length - 1] : null
  const prev = series.length > 1 ? series[series.length - 2] : null
  const isxAbs = latest && prev ? latest.isx60 - prev.isx60 : null
  const isxPct = latest && prev && prev.isx60 ? ((latest.isx60 - prev.isx60) / prev.isx60) * 100 : null

  /** The one canonical session every module is labelled with. */
  const session = latest?.date ?? null
  const fresh = sessionFreshness(session)

  const traded = useMemo(() => companies.filter((c) => c.close > 0 && !c.stale), [companies])
  const breadth = useMemo<Breadth | null>(
    () => (traded.length ? computeBreadth(traded, latest) : null), [traded, latest])
  const sectors = useMemo<SectorMove[]>(() => computeSectors(traded), [traded])

  /* Foreign flow uses ITS OWN latest date, and the page states when that
     differs from the index session rather than pretending they match. */
  const flowSession = flowRows.length ? flowRows[0].date : null
  const flow = useMemo<Flow | null>(
    () => (flowSession ? computeFlow(flowRows, flowSession) : null), [flowRows, flowSession])
  const flowBehind = Boolean(session && flowSession && flowSession !== session)

  const top = useMemo(() => {
    const list = [...traded]
    if (sort === 'value') list.sort((a, b) => (b.vol ?? 0) - (a.vol ?? 0))
    else if (sort === 'volume') list.sort((a, b) => (b.shares_traded ?? 0) - (a.shares_traded ?? 0))
    else list.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    return list.slice(0, 25)
  }, [traded, sort])

  const closeExpanded = useCallback(() => setExpanded(false), [])
  const expandedRef = useOverlay(expanded, closeExpanded)

  return (
    <main className="iq-page hm">
      <header className="hm-intro">
        <p className="ty-label">بورصة العراق</p>
        <h1 className="ty-page-title">نظرة على السوق</h1>
        {session ? (
          <Freshness tone={fresh.tone} label={fresh.label} stamp={arSession(session)} />
        ) : null}
      </header>

      <div className="hm-grid">
        {/* ── ISX60 hero ───────────────────────────────────────────────── */}
        <article className="hm-card hm-hero" aria-labelledby="hm-isx-t">
          <header className="hm-card-head">
            <div>
              <span className="ty-label">مؤشر السوق العراقي</span>
              <h2 id="hm-isx-t" className="ty-section-title"><bdi>ISX60</bdi></h2>
            </div>
            <button type="button" className="hm-expand" onClick={() => setExpanded(true)}>
              تكبير المخطط <span aria-hidden="true">⤢</span>
            </button>
          </header>

          {indexFailed ? (
            <ModuleError what="مؤشر ISX60" />
          ) : !latest ? (
            <Skeleton shape="chart" rows={1} />
          ) : (
            <>
              <div className="hm-hero-value">
                <strong className="ty-metric"><bdi>{latest.isx60.toFixed(2)}</bdi></strong>
                {isxAbs != null && isxPct != null ? (
                  <span className={isxAbs > 0 ? 'ds-up' : isxAbs < 0 ? 'ds-down' : 'ds-flat'}>
                    <bdi className="ty-num">
                      {isxAbs > 0 ? '+' : isxAbs < 0 ? '−' : ''}{Math.abs(isxAbs).toFixed(2)}
                    </bdi>
                    {' · '}
                    <bdi className="ty-num">
                      {isxPct > 0 ? '+' : isxPct < 0 ? '−' : ''}{Math.abs(isxPct).toFixed(2)}%
                    </bdi>
                  </span>
                ) : <Unavailable why="لا توجد جلسة سابقة للمقارنة" />}
                <small className="ty-meta">مقارنةً بالجلسة السابقة{prev ? ` · ${arSession(prev.date)}` : ''}</small>
              </div>
              <div className="hm-hero-chart">
                <IndexChart rows={series} />
              </div>
            </>
          )}
        </article>

        {/* ── foreign flow ─────────────────────────────────────────────── */}
        {flowFailed ? (
          <article className="hm-card"><ModuleError what="تدفق المستثمر الأجنبي" /></article>
        ) : (
          <div className="hm-flow-wrap">
            <FlowCard flow={flow} sessionLabel={arSession(flowSession)} />
            {flowBehind ? (
              <p className="ty-meta hm-note">
                بيانات التدفق الأجنبي لجلسة <bdi>{arSession(flowSession)}</bdi>، وهي أقدم من جلسة المؤشر.
              </p>
            ) : null}
          </div>
        )}

        {/* ── breadth ──────────────────────────────────────────────────── */}
        {pricesFailed ? (
          <article className="hm-card"><ModuleError what="اتساع السوق" onRetry={loadPrices} /></article>
        ) : pricesLoading ? (
          <article className="hm-card"><Skeleton shape="rows" rows={4} /></article>
        ) : (
          <BreadthCard b={breadth} />
        )}

        {/* ── activity ─────────────────────────────────────────────────── */}
        {indexFailed ? null : (
          <ActivityCard
            value={latest?.total_value ?? null}
            volume={latest?.total_volume ?? null}
            trades={latest?.total_trades ?? null}
            tradedCompanies={latest?.traded_companies ?? null}
          />
        )}

        {/* ── sectors ──────────────────────────────────────────────────── */}
        {pricesFailed ? null : pricesLoading ? (
          <article className="hm-card"><Skeleton shape="rows" rows={5} /></article>
        ) : (
          <SectorsCard sectors={sectors} />
        )}
      </div>

      {/* ── top active companies ───────────────────────────────────────── */}
      <section className="hm-card hm-table-card" aria-labelledby="hm-top-t">
        <header className="hm-card-head">
          <div>
            <span className="ty-label">لوحة السوق</span>
            <h2 id="hm-top-t" className="ty-section-title">الشركات الأكثر حركة</h2>
          </div>
          <div className="hm-table-actions">
            <div className="mv-segmented" role="group" aria-label="ترتيب حسب">
              {([['value', 'القيمة'], ['volume', 'الحجم'], ['change', 'التغير']] as const).map(([k, l]) => (
                <button key={k} type="button" aria-pressed={sort === k} onClick={() => setSort(k)}>{l}</button>
              ))}
            </div>
            <Link className="hm-more" href="/market">جميع الشركات <span aria-hidden="true">↗</span></Link>
          </div>
        </header>

        {pricesFailed ? (
          <ModuleError what="أسعار الشركات" onRetry={loadPrices} />
        ) : pricesLoading ? (
          <Skeleton shape="table" rows={10} />
        ) : (
          <div className="hm-table-scroll">
            <table className="hm-table">
              <caption className="sr-only">
                أكثر {top.length} شركة حركة في جلسة {arSession(session)}
              </caption>
              <thead>
                <tr>
                  <th scope="col">الشركة</th>
                  <th scope="col">آخر سعر</th>
                  <th scope="col">التغير</th>
                  <th scope="col">الحجم</th>
                  <th scope="col">القيمة</th>
                  <th scope="col"><span className="sr-only">اتجاه 7 جلسات</span><span aria-hidden="true">7 جلسات</span></th>
                </tr>
              </thead>
              <tbody>
                {top.map((c) => (
                  <tr key={c.sym}>
                    <td>
                      <Link href={`/c/${c.sym}`} className="hm-co">
                        <CompanyLogo sym={c.sym} logo={c.logo} color={c.color} />
                        <span>
                          <strong>{c.ar}</strong>
                          <small><bdi dir="ltr">{c.sym}</bdi></small>
                        </span>
                      </Link>
                    </td>
                    <td className="hm-num"><bdi className="ty-num">{price.format(c.close)}</bdi></td>
                    <td className="hm-num">
                      {c.noPrior ? <Unavailable why="لا يوجد إغلاق سابق" /> : (
                        <bdi className={`ty-num ${c.pct > 0 ? 'ds-up' : c.pct < 0 ? 'ds-down' : 'ds-flat'}`}>
                          {c.pct > 0 ? '+' : c.pct < 0 ? '−' : ''}{Math.abs(c.pct).toFixed(2)}%
                        </bdi>
                      )}
                    </td>
                    <td className="hm-num"><bdi className="ty-num">{nf.format(c.shares_traded ?? 0)}</bdi></td>
                    <td className="hm-num"><bdi className="ty-num">{compact.format(c.vol ?? 0)}</bdi></td>
                    <td className="hm-spark">
                      {sparks[c.sym]?.length
                        ? <Sparkline values={sparks[c.sym]} positive={c.pct >= 0} compact />
                        : <Unavailable why="لا يتوفر تاريخ كافٍ" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── expanded ISX60 ───────────────────────────────────────────────
          A full-screen host held in component state, NOT a route. The
          standalone /charts destination is removed from the product and this
          must not quietly recreate it. */}
      {expanded ? (
        <div className="ov-scrim hm-expand-scrim" onMouseDown={closeExpanded}>
          <div ref={expandedRef} className="hm-expand-host" role="dialog" aria-modal="true"
            aria-label="مخطط ISX60 الموسّع" tabIndex={-1} onMouseDown={(e) => e.stopPropagation()}>
            <header>
              <h2 className="ty-section-title"><bdi>ISX60</bdi> · مخطط موسّع</h2>
              <button type="button" className="mv-btn is-compact" onClick={closeExpanded} data-autofocus>
                إغلاق
              </button>
            </header>
            <div className="hm-expand-body"><IndexChart rows={series} /></div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
