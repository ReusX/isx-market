'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  TIMEFRAMES, verdict, adRatio, netBreadth, upShare, upVolumeShare, participation,
  comparable, concentration, valueShare, sectorRatio, countLive, pctVsPrev,
  iqd, nf0,
  type Session, type TimeframeId, type SectorBreadth, type ValueRow, type PriceRow,
} from '@/lib/pulse'
import { arFull, arShort } from '@/lib/statistics'
import { sectorLabel } from '@/lib/screener'
import { companyName, fetchCompanyMeta } from '@/lib/market'
import type { CompanyMeta } from '@/types'
import '@/styles/panels.css'
import './pulse.css'

/**
 * نبض السوق — what is happening underneath the index.
 *
 * A direct port of `/Users/amed/iqwealth-design/app/pulse/Pulse.tsx`. The
 * composition, the module order, the two inspection shapes and every threshold
 * are the approved reference's. Three things are this application's:
 *
 *   · REAL DATA, through lib/pulse.ts. The reference reads a mock board.
 *   · FOUR-STATE BREADTH for the current session. The reference has three
 *     because its mock data contains no company that traded today and not
 *     yesterday; the real session has seven. See the header of lib/pulse.ts.
 *   · NO THEME TOGGLE AND NO STATE PICKER. Those are design-app furniture;
 *     this app has one theme system in app/layout.tsx and real states.
 *
 * The reference's own two rules are kept verbatim, because they are the point
 * of the page: every module is TWO NUMBERS COMPARED rather than one number
 * displayed, and there is no index-contribution module anywhere — the product
 * holds no ISX60 constituent weights, so that number cannot be computed and is
 * not implied.
 */

type BreadthRow = {
  date: string
  advancers: number; decliners: number; unchanged: number
  up_volume: number; down_volume: number
  new_highs: number | null; new_lows: number | null; traded: number
}
type IdxRow = {
  date: string
  total_volume: number | null; total_value: number | null; total_trades: number | null
  traded_companies: number | null; listed_companies: number | null
}
type PriceDayRow = PriceRow & { date: string }
type MetricRow = { ticker: string; sector: string | null; name_ar: string | null; name_en: string | null }

type Model = {
  live: Session
  prev: Session | null
  history: Session[]
  sectors: SectorBreadth[]
  byValue: ValueRow[]
  /** daily_index said this many companies traded; daily_prices carried this
   *  many rows. Surfaced only when they disagree. */
  tradedGap: { index: number; rows: number } | null
}

export function PulseClient() {
  const [model, setModel] = useState<Model | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [tf, setTf] = useState<TimeframeId>('3M')
  const [rule, setRule] = useState(false)
  const [sector, setSector] = useState<string | null>(null)
  const [sectorPin, setSectorPin] = useState<string | null>(null)
  const [conc, setConc] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()

        // The canonical session is `daily_index`'s newest row — the same
        // session the homepage, /market and /heatmap resolve.
        const { data: idxData } = await sb
          .from('daily_index')
          .select('date,total_volume,total_value,total_trades,traded_companies,listed_companies')
          .order('date', { ascending: false }).limit(260)
        const idx = (idxData ?? []) as IdxRow[]
        if (!idx.length) { if (alive) setState('empty'); return }

        const latestDate = idx[0].date
        const prevDate = idx[1]?.date ?? null

        const [bRes, pRes, mRes, meta] = await Promise.all([
          sb.from('breadth_daily')
            .select('date,advancers,decliners,unchanged,up_volume,down_volume,new_highs,new_lows,traded')
            .order('date', { ascending: false }).limit(260),
          sb.from('daily_prices')
            .select('date,ticker,close,volume,value')
            .in('date', prevDate ? [latestDate, prevDate] : [latestDate]).limit(2000),
          sb.from('company_metrics').select('ticker,sector,name_ar,name_en').limit(2000),
          fetchCompanyMeta().catch(() => [] as CompanyMeta[]),
        ])
        if (!alive) return

        const breadth = (bRes.data ?? []) as BreadthRow[]
        const prices = (pRes.data ?? []) as PriceDayRow[]
        const metrics = (mRes.data ?? []) as MetricRow[]
        const metaMap = new Map((meta as CompanyMeta[]).map(x => [x.sym, x]))

        const todayRows = prices.filter(r => r.date === latestDate)
        if (!todayRows.length) { setState('empty'); return }

        const prevCloses = new Map<string, number>()
        for (const r of prices) {
          if (r.date === prevDate && r.close != null && r.close > 0) prevCloses.set(r.ticker, r.close)
        }

        const counted = countLive(todayRows, prevCloses)
        const bByDate = new Map(breadth.map(r => [r.date, r]))
        const idxByDate = new Map(idx.map(r => [r.date, r]))
        const bToday = bByDate.get(latestDate) ?? null

        const live: Session = {
          date: latestDate,
          advancers: counted.advancers,
          decliners: counted.decliners,
          unchanged: counted.unchanged,
          noPrior: counted.noPrior,
          upVolume: counted.upVolume,
          downVolume: counted.downVolume,
          // The official bulletin's own figures. Not derivable from two
          // sessions of prices, so absent rather than guessed.
          newHighs: bToday?.new_highs ?? null,
          newLows: bToday?.new_lows ?? null,
          traded: todayRows.length,
          listed: idx[0].listed_companies,
          totalValue: idx[0].total_value,
          totalVolume: idx[0].total_volume,
          totalTrades: idx[0].total_trades,
        }

        // History keeps `breadth_daily`: it is the only source reaching back to
        // 2010, and its three-state definition is labelled where it is read.
        const history: Session[] = breadth
          .slice().reverse()
          .map(r => {
            const i = idxByDate.get(r.date)
            return {
              date: r.date,
              advancers: r.advancers, decliners: r.decliners, unchanged: r.unchanged,
              noPrior: null,
              upVolume: r.up_volume, downVolume: r.down_volume,
              newHighs: r.new_highs, newLows: r.new_lows,
              traded: r.traded,
              listed: i?.listed_companies ?? null,
              totalValue: i?.total_value ?? null,
              totalVolume: i?.total_volume ?? null,
              totalTrades: i?.total_trades ?? null,
            }
          })

        const prevIdx = prevDate ? idxByDate.get(prevDate) : null
        const prevB = prevDate ? bByDate.get(prevDate) : null
        const prev: Session | null = prevDate && prevIdx ? {
          date: prevDate,
          advancers: prevB?.advancers ?? 0,
          decliners: prevB?.decliners ?? 0,
          unchanged: prevB?.unchanged ?? 0,
          noPrior: null,
          upVolume: prevB?.up_volume ?? 0,
          downVolume: prevB?.down_volume ?? 0,
          newHighs: prevB?.new_highs ?? null,
          newLows: prevB?.new_lows ?? null,
          traded: prevIdx.traded_companies ?? prevB?.traded ?? 0,
          listed: prevIdx.listed_companies,
          totalValue: prevIdx.total_value,
          totalVolume: prevIdx.total_volume,
          totalTrades: prevIdx.total_trades,
        } : null

        // Sector breadth, on the canonical sector mapping the screener and the
        // heatmap already use. A company whose sector is unknown is left out
        // of the sector view rather than filed under a guess.
        const secOf = new Map(metrics.map(m => [m.ticker, m.sector]))
        const buckets = new Map<string, SectorBreadth>()
        for (const r of todayRows) {
          const key = secOf.get(r.ticker)
          if (!key) continue
          let b = buckets.get(key)
          if (!b) {
            b = { id: key, label: sectorLabel(key, 'ar'), up: 0, down: 0, flat: 0, noPrior: 0, measured: 0, traded: 0 }
            buckets.set(key, b)
          }
          b.traded++
          const d = counted.dir.get(r.ticker)
          if (d === 'up') { b.up++; b.measured++ }
          else if (d === 'down') { b.down++; b.measured++ }
          else if (d === 'flat') { b.flat++; b.measured++ }
          else b.noPrior++
        }
        const sectors = Array.from(buckets.values()).sort((a, b) => b.traded - a.traded || a.label.localeCompare(b.label, 'ar'))

        const nameOf = (t: string) => {
          const m = metrics.find(x => x.ticker === t)
          const mt = metaMap.get(t)
          return companyName({ ar: mt?.ar, en: mt?.en, name_ar: m?.name_ar, name_en: m?.name_en }, t)
        }
        const byValue: ValueRow[] = todayRows
          .filter(r => (r.value ?? 0) > 0)
          .map(r => ({
            symbol: r.ticker,
            name: nameOf(r.ticker),
            value: r.value as number,
            pct: pctVsPrev(r.close, prevCloses.get(r.ticker)),
          }))
          .sort((a, b) => b.value - a.value)

        const idxTraded = idx[0].traded_companies
        setModel({
          live, prev, history, sectors, byValue,
          tradedGap: idxTraded != null && idxTraded !== todayRows.length
            ? { index: idxTraded, rows: todayRows.length } : null,
        })
        setState('ready')
      } catch {
        if (alive) setState('error')
      }
    })()
    return () => { alive = false }
  }, [])

  const n = TIMEFRAMES.find(t => t.id === tf)!.n
  const history = useMemo(() => (model ? model.history.slice(-n) : []), [model, n])

  const loading = state === 'loading'
  const live = model?.live ?? null
  const v = live ? verdict(live) : null

  const shownSector = sector ?? sectorPin
  const secRow = model?.sectors.find(s => s.id === shownSector) ?? null
  const concRow = model?.byValue.find(s => s.symbol === conc) ?? null

  return (
    <main className="pl-page iq-page">
      <header className="pl-head">
        <div className="pl-title">
          <h1>نبض السوق</h1>
          <p>
            اتساع السوق والمشاركة تحت مستوى المؤشر
            {live ? <> · جلسة {arFull(live.date)}</> : null}
          </p>
        </div>
        <div className="pl-head-actions">
          <Link className="pl-head-link" href="/market">كل الأسهم ←</Link>
        </div>
      </header>

      {state === 'empty' ? (
        <div className="cd-nodata cd-nodata-wide">
          <strong>لم تُنشر بيانات جلسة بعد</strong>
          <p>تُحتسب مؤشرات الاتساع من النشرة الرسمية بعد إغلاق الجلسة.</p>
        </div>
      ) : state === 'error' ? (
        <div className="mv-error" role="alert">
          <span className="mv-error-mark" aria-hidden="true">!</span>
          <div>
            <strong>تعذّر تحميل بيانات الجلسة</strong>
            <p>يمكن إعادة المحاولة، أو العودة إلى صفحة السوق.</p>
          </div>
          <button type="button" onClick={() => window.location.reload()}>إعادة المحاولة</button>
        </div>
      ) : (
        <>
          {/* ── The verdict ─────────────────────────────────────────────────
              A sentence with its rule one click away. Not a score, not a
              gauge — the reader can disagree with the threshold, which is only
              possible because the threshold is printed. */}
          <section className={`pl-verdict ${v?.tone ?? ''}`} aria-label="خلاصة الجلسة">
            {loading || !v || !live ? <SkelLine w="46%" h={20} /> : (
              <>
                <p className="pl-verdict-main">
                  <span className="pl-verdict-dot" aria-hidden="true" />
                  <span className="pl-verdict-say">
                    <strong>{v.headline}</strong>
                    <span className="pl-verdict-qual">، {v.qualifier}</span>
                  </span>
                  <button type="button" className="pl-why" aria-expanded={rule}
                    onClick={() => setRule(r => !r)}
                    aria-label={rule ? 'إخفاء قاعدة التصنيف' : 'عرض قاعدة التصنيف'}>
                    <i aria-hidden="true">ⓘ</i>
                    <span>القاعدة</span>
                  </button>
                </p>
                <dl className="pl-verdict-figs">
                  <div>
                    <dt>صاعد من العدد</dt>
                    <dd>
                      <bdi>{(upShare(live) * 100).toFixed(0)}%</bdi>
                      <small><bdi>{live.advancers}</bdi> من <bdi>{comparable(live)}</bdi> قابلة للقياس</small>
                    </dd>
                  </div>
                  <div>
                    <dt>صاعد من الحجم</dt>
                    <dd>
                      <bdi>{(upVolumeShare(live) * 100).toFixed(0)}%</bdi>
                      <small><bdi>{iqd(live.upVolume)}</bdi> سهم</small>
                    </dd>
                  </div>
                </dl>
                {rule ? <p className="pl-verdict-rule" role="note">{v.rule}</p> : null}
              </>
            )}
          </section>

          {/* ── Breadth: counts against volume ───────────────────────────── */}
          <section className="pl-grid-main">
            <div className="cd-panel pl-breadth">
              <div className="cd-panel-head">
                <h2>الاتساع مقابل السيولة</h2>
                <span className="cd-panel-note">
                  {live && adRatio(live) != null
                    ? <>نسبة الصاعد للهابط <b><bdi>{adRatio(live)!.toFixed(2)} : 1</bdi></b></>
                    : <>
                        نسبة الصاعد للهابط <b><bdi>—</bdi></b>
                        <i className="fn-help" tabIndex={0} role="note"
                          data-help="لا يمكن حساب النسبة لعدم وجود شركات خاسرة في الجلسة."
                          aria-label="لا يمكن حساب النسبة لعدم وجود شركات خاسرة">؟</i>
                      </>}
                </span>
              </div>
              {loading || !live ? <SkelBlock h={150} /> : (
                <>
                  <BreadthField
                    label="عدد الشركات المتداولة" unit="شركة"
                    total={live.traded} totalLabel="متداولة"
                    parts={[
                      { k: 'up', name: 'رابح', v: live.advancers, txt: `${live.advancers} رابح`, fig: String(live.advancers) },
                      { k: 'flat', name: 'ثابت', v: live.unchanged, txt: `${live.unchanged} ثابت`, fig: String(live.unchanged) },
                      { k: 'down', name: 'خاسر', v: live.decliners, txt: `${live.decliners} خاسر`, fig: String(live.decliners) },
                      { k: 'na', name: 'بلا مقارنة', v: live.noPrior ?? 0, txt: `${live.noPrior ?? 0} بلا إغلاق سابق`, fig: String(live.noPrior ?? 0) },
                    ]}
                  />
                  <BreadthField
                    label="حجم التداول الاتجاهي" unit="سهم"
                    total={live.upVolume + live.downVolume} totalLabel="حجم اتجاهي"
                    parts={[
                      { k: 'up', name: 'على الصاعدة', v: live.upVolume, txt: `${iqd(live.upVolume)} سهم`, fig: nf0.format(live.upVolume) },
                      { k: 'down', name: 'على الهابطة', v: live.downVolume, txt: `${iqd(live.downVolume)} سهم`, fig: nf0.format(live.downVolume) },
                    ]}
                  />
                  {/* The gap between the two fields IS the finding, so it is
                      written out rather than left to be eyeballed. */}
                  <p className="pl-gap-note">
                    {(() => {
                      const gap = (upVolumeShare(live) - upShare(live)) * 100
                      if (Math.abs(gap) < 4) return 'حصة الأسهم الصاعدة من الحجم تقارب حصتها من العدد — حركة متسقة.'
                      return gap > 0
                        ? `الأسهم الصاعدة تستحوذ على حصة من الحجم تفوق حصتها من العدد بـ${Math.abs(gap).toFixed(0)} نقطة مئوية — السيولة مع الاتجاه.`
                        : `الأسهم الصاعدة تستحوذ على حصة من الحجم تقل عن حصتها من العدد بـ${Math.abs(gap).toFixed(0)} نقطة مئوية — الارتفاع أوسع مما هو مدعوم.`
                    })()}
                  </p>
                  {live.noPrior ? (
                    <p className="pl-na-note">
                      <bdi>{live.noPrior}</bdi> {live.noPrior > 2 && live.noPrior < 11 ? 'شركات' : 'شركة'} تداولت في هذه الجلسة دون إغلاق سابق قابل للمقارنة، فلا اتجاه لها.
                      هي معروضة منفصلة ولم تُحتسب ثابتة، ولا تدخل في حصص العدد أعلاه.
                    </p>
                  ) : null}
                </>
              )}
            </div>

            <div className="cd-panel pl-participation">
              <div className="cd-panel-head"><h2>المشاركة</h2></div>
              {loading || !live ? <SkelBlock h={150} /> : (
                <>
                  <div className="pl-part-main">
                    <strong><bdi>{live.traded}</bdi></strong>
                    <span>
                      شركة تداولت{live.listed != null ? <> من أصل <bdi>{live.listed}</bdi> مدرجة</> : null}
                    </span>
                  </div>
                  <ParticipationTrack live={live} prev={model?.prev ?? null} />
                  {model?.prev ? (
                    <Delta label="مقابل الجلسة السابقة" now={live.traded} prev={model.prev.traded} suffix=" شركة" />
                  ) : null}
                  <dl className="pl-part-rows">
                    <div>
                      <dt>القيمة المتداولة</dt>
                      <dd>{live.totalValue != null ? <><bdi>{iqd(live.totalValue)}</bdi> <small>IQD</small></> : <bdi>—</bdi>}</dd>
                    </div>
                    <div>
                      <dt>عدد الصفقات</dt>
                      <dd><bdi>{live.totalTrades != null ? nf0.format(live.totalTrades) : '—'}</bdi></dd>
                    </div>
                    <div>
                      <dt>قمم / قيعان 52 أسبوعاً</dt>
                      <dd>
                        <bdi className="positive">{live.newHighs ?? '—'}</bdi>
                        <span className="pl-sep">/</span>
                        <bdi className="negative">{live.newLows ?? '—'}</bdi>
                      </dd>
                    </div>
                  </dl>
                  {model?.tradedGap ? (
                    <p className="pl-na-note">
                      نشرة الجلسة تذكر <bdi>{model.tradedGap.index}</bdi> شركة متداولة، وسجل الأسعار يحمل{' '}
                      <bdi>{model.tradedGap.rows}</bdi> صفاً. الأرقام أعلاه محسوبة من سجل الأسعار.
                    </p>
                  ) : null}
                </>
              )}
            </div>
          </section>

          {/* ── Historical breadth ───────────────────────────────────────── */}
          <section className="cd-panel pl-history">
            <div className="cd-panel-head">
              <h2>صافي الاتساع عبر الجلسات</h2>
              <span className="cd-panel-note pl-def">
                الصاعدة ناقص الهابطة
                <i className="fn-help" tabIndex={0} role="note"
                  data-help="صافي الاتساع = عدد الشركات المرتفعة ناقص عدد المنخفضة في الجلسة. سجل الجلسات السابقة يقارن كل شركة بآخر إغلاق تداولت فيه، لا بإغلاق الجلسة السابقة، ولذلك لا يفصل الشركات التي لا إغلاق سابق لها."
                  aria-label="صافي الاتساع = عدد الشركات المرتفعة ناقص عدد المنخفضة">؟</i>
              </span>
              <div className="pl-tf" role="group" aria-label="المدة">
                {TIMEFRAMES.map(t => (
                  <button key={t.id} type="button" className={tf === t.id ? 'active' : ''}
                    aria-pressed={tf === t.id} onClick={() => setTf(t.id)}>{t.label}</button>
                ))}
              </div>
            </div>
            {loading || history.length === 0 ? <SkelBlock h={190} /> : (
              /* `key` remounts on a timeframe change, which is what makes the
                 dataset swap legible — a 180ms fade, no travelling bars. */
              <NetBreadthChart key={tf} rows={history} sessions={n} />
            )}
          </section>

          {/* ── Sector breadth + concentration ───────────────────────────── */}
          <section className="pl-grid-main">
            <div className={`cd-panel pl-sec-panel ${shownSector ? 'has-sel' : ''}`}>
              <div className="cd-panel-head">
                <h2>اتساع القطاعات</h2>
                <span className="cd-panel-note">توزيع الشركات داخل كل قطاع، لا عائد القطاع</span>
              </div>
              {loading || !model ? <SkelBlock h={200} /> : (
                <>
                  {/* Readout, not a floating card: a tooltip here would cover
                      the very rows the reader is comparing this sector to. */}
                  <div className="pl-readout" aria-live="polite">
                    {secRow ? (
                      <>
                        <span className="pl-readout-name">{secRow.label}</span>
                        <span className="pl-read"><em>رابح</em><bdi className="positive">{secRow.up}</bdi></span>
                        <span className="pl-read"><em>ثابت</em><bdi>{secRow.flat}</bdi></span>
                        <span className="pl-read"><em>خاسر</em><bdi className="negative">{secRow.down}</bdi></span>
                        {secRow.noPrior ? <span className="pl-read"><em>بلا مقارنة</em><bdi>{secRow.noPrior}</bdi></span> : null}
                        <span className="pl-read"><em>متداولة</em><bdi>{secRow.traded}</bdi></span>
                        <span className="pl-read"><em>رابح : خاسر</em>
                          <bdi title={sectorRatio(secRow) == null ? 'لا يمكن حساب النسبة لعدم وجود شركات خاسرة' : undefined}>
                            {sectorRatio(secRow) != null ? `${sectorRatio(secRow)!.toFixed(2)} : 1` : '—'}
                          </bdi>
                        </span>
                      </>
                    ) : <span className="pl-readout-hint">مرّر أو انقر على قطاع لعرض توزيعه · النقر يثبّته</span>}
                  </div>
                  <ul className="pl-sectors">
                    {model.sectors.map(s => (
                      <SectorRow key={s.id} s={s}
                        on={shownSector === s.id} pinned={sectorPin === s.id}
                        onEnter={() => setSector(s.id)} onLeave={() => setSector(null)}
                        onPick={() => setSectorPin(p => (p === s.id ? null : s.id))} />
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="cd-panel">
              <div className="cd-panel-head">
                <h2>تركّز التداول</h2>
                <span className="cd-panel-note">من قيمة التداول، لا من حركة المؤشر</span>
              </div>
              {loading || !model || !live ? <SkelBlock h={200} /> : (
                <>
                  <div className="pl-conc">
                    {(() => {
                      const c = concentration(model.byValue, 5, live.totalValue)
                      return c == null
                        ? <><strong><bdi>—</bdi></strong><span>لا تتوفر قيمة تداول الجلسة لاحتساب التركّز</span></>
                        : <><strong><bdi>{(c * 100).toFixed(0)}%</bdi></strong>
                            <span>من قيمة تداول الجلسة جرت على <bdi>5</bdi> شركات فقط</span></>
                    })()}
                  </div>
                  <div className="pl-readout" aria-live="polite">
                    {concRow ? (
                      <>
                        <span className="pl-readout-name">{concRow.name}</span>
                        <bdi className="cd-ticker">{concRow.symbol}</bdi>
                        <span className="pl-read"><em>قيمة التداول</em><bdi>{nf0.format(concRow.value)}</bdi><em>IQD</em></span>
                        <span className="pl-read"><em>من قيمة الجلسة</em>
                          <bdi>{(() => { const s = valueShare(concRow.value, live.totalValue); return s == null ? '—' : `${(s * 100).toFixed(1)}%` })()}</bdi>
                        </span>
                        <span className="pl-read"><em>الحركة</em>
                          <bdi className={concRow.pct == null ? '' : concRow.pct > 0 ? 'positive' : concRow.pct < 0 ? 'negative' : ''}>
                            {concRow.pct == null ? '—' : `${concRow.pct > 0 ? '+' : ''}${concRow.pct.toFixed(2)}%`}
                          </bdi>
                        </span>
                      </>
                    ) : <span className="pl-readout-hint">مرّر على شركة لعرض حصتها · النقر يفتح صفحتها</span>}
                  </div>
                  {/* Not an index contribution. The product holds no ISX60
                      constituent weights, so that number cannot be computed
                      and is not implied. */}
                  <ul className="pl-contrib">
                    {model.byValue.slice(0, 5).map((s, i) => (
                      <li key={s.symbol} className={conc === s.symbol ? 'is-on' : ''}
                        onPointerEnter={() => setConc(s.symbol)} onPointerLeave={() => setConc(null)}>
                        <Link href={`/c/${s.symbol}`}
                          onFocus={() => setConc(s.symbol)} onBlur={() => setConc(null)}
                          aria-label={`${s.name} · قيمة التداول ${nf0.format(s.value)} دينار`}>
                          <span className="pl-contrib-rank"><bdi>{i + 1}</bdi></span>
                          <span className="pl-contrib-name">
                            <strong title={s.name}>{s.name}</strong>
                            <bdi className="cd-ticker">{s.symbol}</bdi>
                          </span>
                          <span className="pl-contrib-bar" aria-hidden="true">
                            <i style={{ inlineSize: `${(s.value / model.byValue[0].value) * 100}%` }} />
                          </span>
                          <bdi className="pl-contrib-val">{iqd(s.value)}</bdi>
                          <bdi className={`pl-contrib-pct ${s.pct == null ? '' : s.pct > 0 ? 'positive' : s.pct < 0 ? 'negative' : ''}`}>
                            {s.pct == null ? '—' : `${s.pct > 0 ? '+' : ''}${s.pct.toFixed(2)}%`}
                          </bdi>
                          <span className="pl-contrib-go" aria-hidden="true">‹</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <p className="pl-foot-note">
                    الترتيب حسب قيمة التداول في الجلسة. لا تتوفر أوزان مكوّنات مؤشر ISX60 في البيانات،
                    ولذلك لا تُعرض مساهمة الشركات في حركة المؤشر.
                  </p>
                </>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  )
}

/* ── Breadth field ─────────────────────────────────────────────────────────
   A proportional bar with its segments labelled in place. Two of these
   stacked — counts above, volume below — is the comparison the page is for,
   and it only works because both bars share the same meaning along the track.

   Each segment is a real button, so the exact figures are reachable by
   pointer, by tab AND by tap. The tooltip is anchored at the segment's own
   midpoint and sits above it, so the proportion it explains is never covered. */
type Part = { k: 'up' | 'flat' | 'down' | 'na'; name: string; v: number; txt: string; fig: string }

function BreadthField({ label, unit, parts, total, totalLabel }: {
  label: string; unit: string; parts: Part[]; total: number; totalLabel: string
}) {
  const [on, setOn] = useState<number | null>(null)
  const shown = parts.filter(p => p.v > 0)
  const sum = shown.reduce((a, p) => a + p.v, 0) || 1

  let run = 0
  const mids = shown.map(p => {
    const mid = run + p.v / sum / 2
    run += p.v / sum
    return mid * 100
  })
  const active = on != null ? shown[on] : null

  return (
    <div className="pl-field">
      <span className="cd-cell-label">{label}</span>
      <div className="pl-field-anchor">
        {active ? (
          <span className="pl-tip" role="tooltip"
            style={{ insetInlineStart: `${mids[on!]}%` }}
            data-edge={mids[on!] < 22 ? 'start' : mids[on!] > 78 ? 'end' : 'mid'}>
            <b className={active.k}>{active.name}</b>
            <bdi>{active.fig}</bdi>
            <em>{unit}</em>
            <span className="pl-tip-pct"><bdi>{((active.v / sum) * 100).toFixed(1)}%</bdi></span>
            <small>{totalLabel} <bdi>{unit === 'سهم' ? iqd(total) : total}</bdi></small>
          </span>
        ) : null}
        <div className="pl-field-track">
          {shown.map((p, i) => (
            <button key={p.k} type="button" className={`${p.k} ${on === i ? 'is-on' : ''}`}
              style={{ inlineSize: `${(p.v / sum) * 100}%` }}
              onPointerEnter={() => setOn(i)} onPointerLeave={() => setOn(null)}
              onClick={() => setOn(c => (c === i ? null : i))}
              onFocus={() => setOn(i)} onBlur={() => setOn(null)}
              aria-label={`${p.txt} · ${((p.v / sum) * 100).toFixed(1)} بالمئة`} />
          ))}
        </div>
      </div>
      <div className="pl-field-keys">
        {shown.map((p, i) => (
          <span key={p.k} className={`${p.k} ${on === i ? 'is-on' : ''}`}>
            <i aria-hidden="true" />
            <bdi>{((p.v / sum) * 100).toFixed(0)}%</bdi>
            <small>{p.txt}</small>
          </span>
        ))}
      </div>
    </div>
  )
}

/* ── Participation ─────────────────────────────────────────────────────────
   The previous-session comparison is real: `daily_index` stores
   traded_companies per session, so the delta is read, not invented. */
function ParticipationTrack({ live, prev }: { live: Session; prev: Session | null }) {
  const [on, setOn] = useState(false)
  const now = participation(live)
  const before = prev ? participation(prev) : null
  if (now == null) return null
  const d = before != null ? (now - before) * 100 : null

  return (
    <div className="pl-part-anchor">
      {on ? (
        <span className="pl-tip pl-tip-wide" role="tooltip">
          <b>المشاركة</b>
          <bdi>{(now * 100).toFixed(1)}%</bdi>
          <span className="pl-tip-rows">
            <span><em>تداولت</em><bdi>{live.traded}</bdi></span>
            <span><em>المدرجة</em><bdi>{live.listed ?? '—'}</bdi></span>
            <span><em>الجلسة السابقة</em><bdi>{before != null ? `${(before * 100).toFixed(1)}%` : '—'}</bdi></span>
            <span><em>الفرق</em>
              <bdi className={d == null ? '' : d > 0 ? 'positive' : d < 0 ? 'negative' : ''}>
                {d == null ? '—' : `${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d).toFixed(1)} نقطة`}
              </bdi>
            </span>
          </span>
        </span>
      ) : null}
      <button type="button" className={`pl-part-track ${on ? 'is-on' : ''}`}
        onPointerEnter={() => setOn(true)} onPointerLeave={() => setOn(false)}
        onClick={() => setOn(c => !c)} onFocus={() => setOn(true)} onBlur={() => setOn(false)}
        aria-label={`${(now * 100).toFixed(0)} بالمئة مشاركة · ${live.traded} من ${live.listed ?? '—'}`}>
        <i style={{ inlineSize: `${now * 100}%` }} />
      </button>
    </div>
  )
}

function Delta({ label, now, prev, suffix = '' }: { label: string; now: number; prev: number; suffix?: string }) {
  const d = now - prev
  return (
    <p className="pl-delta">
      <span>{label}</span>
      <bdi className={d > 0 ? 'positive' : d < 0 ? 'negative' : ''}>
        {d > 0 ? '+' : d < 0 ? '−' : ''}{Math.abs(d)}{suffix}
      </bdi>
    </p>
  )
}

/* ── Net breadth over time ─────────────────────────────────────────────────
   Columns from a shared zero, green above and red below. Not a line: net
   breadth is a per-session quantity with a sign, and a line implies a
   continuum between sessions that does not exist.

   With up to 260 columns, a floating tooltip would flicker between neighbours
   and cover the columns being compared. So the readout is a fixed line above
   the plot: it never moves, never occludes, and at 2px column widths it is the
   only shape that can carry six figures. */
function NetBreadthChart({ rows, sessions: nSessions }: { rows: Session[]; sessions: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const [pin, setPin] = useState<number | null>(null)
  const max = Math.max(6, ...rows.map(r => Math.abs(netBreadth(r))))
  const idx = hover ?? pin ?? rows.length - 1
  const active = rows[idx]
  const isLive = hover != null || pin != null
  const gap = rows.length > 90 ? 0 : rows.length > 45 ? 1 : 2
  const nb = netBreadth(active)

  return (
    <div className="pl-hist">
      <div className="pl-readout pl-hist-read" aria-live="polite">
        <span className="pl-readout-name">{arFull(active.date)}</span>
        <span className="pl-read"><em>صافي الاتساع</em>
          <bdi className={nb > 0 ? 'positive' : nb < 0 ? 'negative' : ''}>{nb > 0 ? '+' : ''}{nb}</bdi>
        </span>
        <span className="pl-read"><em>رابح</em><bdi className="positive">{active.advancers}</bdi></span>
        <span className="pl-read"><em>ثابت</em><bdi>{active.unchanged}</bdi></span>
        <span className="pl-read"><em>خاسر</em><bdi className="negative">{active.decliners}</bdi></span>
        <span className="pl-read"><em>متداولة</em><bdi>{active.traded}</bdi></span>
        <span className="pl-readout-hint">
          {isLive
            ? (pin != null && hover == null ? 'جلسة مثبّتة — انقر مرة أخرى للإلغاء' : '')
            : `آخر جلسة في السجل · ${nSessions} جلسة معروضة`}
        </span>
      </div>

      <div className="pl-hist-plot" onPointerLeave={() => setHover(null)}
        style={{ ['--pl-gap' as string]: `${gap}px` }}>
        <span className="pl-hist-zero" aria-hidden="true" />
        {rows.map((r, i) => {
          const b = netBreadth(r)
          const h = (Math.abs(b) / max) * 50
          return (
            <button key={r.date} type="button"
              className={`pl-hist-col ${b >= 0 ? 'up' : 'down'} ${idx === i && isLive ? 'is-on' : ''} ${pin === i ? 'is-pin' : ''}`}
              onPointerEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
              onClick={() => setPin(p => (p === i ? null : i))}
              aria-label={`${arFull(r.date)}: صافي الاتساع ${b}، ${r.advancers} رابح، ${r.decliners} خاسر`}>
              <i style={{ blockSize: `${h}%`, [b >= 0 ? 'insetBlockEnd' : 'insetBlockStart']: '50%' } as React.CSSProperties} />
            </button>
          )
        })}
      </div>
      <div className="pl-hist-axis">
        <span>{arShort(rows[0].date)}</span>
        <span>{arShort(rows[Math.floor(rows.length / 2)].date)}</span>
        <span>{arShort(rows[rows.length - 1].date)}</span>
      </div>
    </div>
  )
}

function SectorRow({ s, on, pinned, onEnter, onLeave, onPick }: {
  s: SectorBreadth; on: boolean; pinned: boolean
  onEnter: () => void; onLeave: () => void; onPick: () => void
}) {
  const net = s.up - s.down
  const d = s.traded || 1
  return (
    <li className={`${on ? 'is-on' : ''} ${pinned ? 'is-pin' : ''}`}
      onPointerEnter={onEnter} onPointerLeave={onLeave}>
      <button type="button" onFocus={onEnter} onBlur={onLeave} onClick={onPick}
        aria-pressed={pinned}
        aria-label={`${s.label}: ${s.up} رابح، ${s.flat} ثابت، ${s.down} خاسر، ${s.noPrior} بلا مقارنة، من ${s.traded} متداولة`}>
        <span className="pl-sec-name">{s.label}</span>
        <span className="pl-sec-track" aria-hidden="true">
          <i className="up" style={{ inlineSize: `${(s.up / d) * 100}%` }} />
          <i className="flat" style={{ inlineSize: `${(s.flat / d) * 100}%` }} />
          <i className="down" style={{ inlineSize: `${(s.down / d) * 100}%` }} />
          <i className="na" style={{ inlineSize: `${(s.noPrior / d) * 100}%` }} />
        </span>
        <span className="pl-sec-counts">
          <bdi className="positive">{s.up}</bdi>
          <span className="pl-sep">·</span>
          <bdi>{s.flat}</bdi>
          <span className="pl-sep">·</span>
          <bdi className="negative">{s.down}</bdi>
        </span>
        <bdi className={`pl-sec-net ${net > 0 ? 'positive' : net < 0 ? 'negative' : ''}`}>
          {net > 0 ? '+' : ''}{net}
        </bdi>
      </button>
    </li>
  )
}

const SkelLine = ({ w, h = 12 }: { w: string; h?: number }) =>
  <span className="pl-skel" style={{ inlineSize: w, blockSize: `${h}px` }} aria-hidden="true" />
const SkelBlock = ({ h }: { h: number }) =>
  <span className="pl-skel" style={{ inlineSize: '100%', blockSize: `${h}px`, borderRadius: '12px' }} aria-hidden="true" />
