'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { FlowChart, bucketTitle, type FlowMode } from './FlowChart'
import {
  PERIODS, iqd, iqdFull, nf0, arFull, arShortY, arMonth,
  type PeriodId,
} from '@/lib/statistics'
import {
  foldSessions, flowWindow, flowTotals, flowBuckets, flowGrainFor, FLOW_GRAIN_LABEL,
  companyFlows, rankCompanies, sectorFlows, COMPANY_VIEWS, isNetView, viewValue,
  type FlowRow, type OracleRow, type FlowSession, type CompanyFlow, type CompanyView,
  type SectorFlow, type Roster,
} from '@/lib/foreignFlow'
import { fetchCompanyMeta, matchCompanyName, companyName, SECTORS } from '@/lib/market'
import type { CompanyMeta } from '@/types'
import './foreign-flow.css'

/**
 * تدفق المستثمر الأجنبي — the deep foreign-capital surface.
 *
 * ── The three surfaces, and why this one is different ─────────────────────
 *   HOMEPAGE      one session, one number, one balance bar. A signal.
 *   الإحصائيات    the period's net flow in market context. An overview.
 *   THIS PAGE     where the capital went, how persistent it was, which
 *                 companies and sectors absorbed it, and — separately — what
 *                 foreigners actually OWN.
 *
 * Nothing here is an enlargement of the homepage card.
 *
 * ── The two separations the page is built on ──────────────────────────────
 * 1. SESSION vs PERIOD. The hero prints both, side by side, each under its own
 *    heading with its own dates. A one-session result and a multi-year
 *    cumulative result never share a number.
 * 2. FLOW vs OWNERSHIP. Trading and holding are different quantities from
 *    different tables on different cadences. Separate panels, and the
 *    ownership panel says so in words rather than trusting its heading.
 *
 * ── Where a line is allowed ───────────────────────────────────────────────
 * Net flow per bucket is discrete: bars, never joined. The cumulative balance
 * is continuous: a line, and the only line on the page.
 *
 * ── The loading strategy ──────────────────────────────────────────────────
 * `foreign_flow_company_daily` is 28,381 rows / 2.28 MB / 29 requests. The
 * page fetches the SELECTED window and extends backwards only when a longer
 * period is chosen; narrowing refetches nothing. See the data map §14.
 */

const OWN_MIN_SHARE = 0 // every company with any foreign holding is eligible

type Loaded = { from: string; rows: FlowRow[]; oracle: OracleRow[]; calendar: string[] }

type Ownership = {
  month: string
  iraqi: number
  foreign: number
  pct: number | null
  foreignHolders: number
  withForeign: number
  universe: number
  top: { name: string; pct: number }[]
}

const SECTOR_LABEL = new Map(SECTORS.filter((s) => s.id !== 'all').map((s) => [s.id, s.arFull]))

export function ForeignFlowClient() {
  const [period, setPeriod] = useState<PeriodId>('1M')
  const [mode, setMode] = useState<FlowMode>('net')
  const [view, setView] = useState<CompanyView>('netIn')
  const [sector, setSector] = useState<string | null>(null)
  const [row, setRow] = useState<string | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [roster, setRoster] = useState<Roster>(new Map())
  const [own, setOwn] = useState<Ownership | null>(null)
  const [ownFailed, setOwnFailed] = useState(false)

  /* The theme is read, never owned — app/layout.tsx sets `data-theme` on
     <html> pre-paint and the header toggle owns it. The canvas cannot inherit
     a CSS variable, so it needs the value as a string. */
  useEffect(() => {
    const read = () =>
      setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light')
    read()
    const mo = new MutationObserver(read)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => mo.disconnect()
  }, [])

  // ── the window's data, fetched lazily and extended, never refetched ──────
  const load = useCallback(async (want: PeriodId) => {
    setLoading(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      const n = PERIODS.find((p) => p.id === want)!.sessions

      /* The window calendar is the market's own trading sessions, so a gap in
         the flow table shows up as a gap instead of vanishing. */
      let cal: string[] = []
      if (Number.isFinite(n)) {
        const { data } = await sb.from('daily_index').select('date')
          .order('date', { ascending: false }).limit(n as number)
        cal = ((data as { date: string }[]) ?? []).map((r) => r.date).reverse()
      } else {
        cal = await pageAll<{ date: string }>(sb, 'daily_index', 'date').then((r) => r.map((x) => x.date))
      }
      if (!cal.length) { setFailed(true); setLoading(false); return }
      const from = cal[0]

      const [rows, oracle] = await Promise.all([
        pageAll<FlowRow>(sb, 'foreign_flow_company_daily', 'date,ticker,side,value,trades', from),
        pageAll<OracleRow>(sb, 'foreign_flow_daily', 'date,side,value,companies', from),
      ])
      if (!rows.length) { setFailed(true); setLoading(false); return }
      setFailed(false)
      setLoaded({ from, rows, oracle, calendar: cal })
    } catch {
      setFailed(true)
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load('1M') }, [load])

  /* Widening refetches; narrowing does not, because the wider window already
     holds every row the narrower one needs. */
  useEffect(() => {
    if (!loaded) return
    const n = PERIODS.find((p) => p.id === period)!.sessions
    const have = loaded.calendar.length
    if (!Number.isFinite(n) ? have >= 3000 : (n as number) <= have) return
    void load(period)
  }, [period, loaded, load])

  useEffect(() => {
    ;(async () => {
      try {
        const meta = await fetchCompanyMeta()
        /* 20 of the 104 curated rows carry an empty `ar`; `companyName` falls
           back to the English name before it falls back to the ticker, which
           is what the market board and the screener already do. */
        setRoster(new Map(meta.map((m) => [m.sym, { name: companyName(m, m.sym), sec: m.sec, logo: m.logo }])))
      } catch { /* the ranking falls back to tickers */ }
    })()
  }, [])

  // ── ownership · its own table, its own month, its own failure ────────────
  useEffect(() => {
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const { data: latest } = await sb.from('ownership_monthly')
          .select('year,month').order('year', { ascending: false })
          .order('month', { ascending: false }).limit(1)
        const y = latest?.[0]?.year as number | undefined
        const m = latest?.[0]?.month as number | undefined
        if (!y || !m) { setOwnFailed(true); return }
        const [{ data }, meta] = await Promise.all([
          sb.from('ownership_monthly')
            .select('name_ar,iraqi_shares,foreign_shares,foreign_count')
            .eq('year', y).eq('month', m),
          fetchCompanyMeta().catch(() => [] as CompanyMeta[]),
        ])
        const rows = (data as OwnRow[]) ?? []
        if (!rows.length) { setOwnFailed(true); return }
        setOwn(summariseOwnership(rows, `${y}-${String(m).padStart(2, '0')}`, meta))
      } catch { setOwnFailed(true) }
    })()
  }, [])

  // ── derived ──────────────────────────────────────────────────────────────
  const sessions = useMemo<FlowSession[]>(
    () => (loaded ? foldSessions(loaded.rows, loaded.calendar, loaded.oracle) : []),
    [loaded])

  const win = useMemo(() => flowWindow(sessions, period), [sessions, period])
  const t = useMemo(() => flowTotals(win), [win])
  const grain = flowGrainFor(period)
  const buckets = useMemo(() => flowBuckets(win, grain), [win, grain])

  const latest = useMemo(() => {
    for (let i = sessions.length - 1; i >= 0; i--) if (sessions[i].kind === 'observed') return sessions[i]
    return null
  }, [sessions])

  const companies = useMemo(
    () => (loaded && t ? companyFlows(loaded.rows, t.from, t.to, roster) : []),
    [loaded, t, roster])
  const ranked = useMemo(() => rankCompanies(companies, view), [companies, view])
  const sectors = useMemo(() => sectorFlows(companies, SECTOR_LABEL), [companies])
  const sectorMax = Math.max(...sectors.map((s) => s.buy + s.sell), 1)
  const top10 = ranked.slice(0, 10)
  const rowMax = Math.max(...top10.map((c) => Math.abs(viewValue(c, view))), 1)

  const periodLabel = PERIODS.find((p) => p.id === period)!.ar

  return (
    /* `iq-page` is how a route opts into the Phase 0 token layer — the
       `--mv-*` variables are scoped to it, exactly as /statistics and the
       homepage do it. Without it every panel here paints transparent. */
    <main className="iq-page ffw-page">
      <Link className="ffw-back" href="/statistics">
        <span aria-hidden="true">›</span> الإحصائيات
      </Link>

      <header className="ffw-st-head ffw-head">
        <div className="ffw-st-title">
          <h1>تدفق المستثمر الأجنبي</h1>
          <p>
            شراء وبيع غير العراقيين لكل شركة، من نشرة التداول اليومية
            {t ? <> · <bdi>{nf0.format(t.sessions)}</bdi> جلسة في الفترة</> : null}
            {latest ? <> · آخر جلسة برصد {arFull(latest.date)}</> : null}
          </p>
        </div>
        <div className="ffw-st-period" role="group" aria-label="الفترة">
          {PERIODS.map((p) => (
            <button key={p.id} type="button" className={period === p.id ? 'active' : ''}
              aria-pressed={period === p.id} onClick={() => setPeriod(p.id)}>{p.ar}</button>
          ))}
        </div>
      </header>

      {failed ? (
        <div className="ffw-cd-nodata ffw-cd-nodata-wide">
          <strong>تعذّر تحميل بيانات التدفق الأجنبي</strong>
          <p>
            تُنشر أرقام التدفق الأجنبي مع نشرة التداول اليومية. حاول تحديث الصفحة،
            أو عد إلى <Link href="/statistics">الإحصائيات</Link>.
          </p>
        </div>
      ) : (
        <>
          {/* ── Hero · the session and the period, never mixed ──────────── */}
          <section className="ffw-hero" aria-label="ملخص التدفق">
            <article className="ffw-hero-card">
              <span className="ffw-st-chip ffw-st-chip-session">آخر جلسة برصد</span>
              <span className="ffw-cd-cell-label">{latest ? arFull(latest.date) : '—'}</span>
              {loading || !latest ? <Skel h={104} /> : (
                <>
                  <strong className={cls(latest.net)}>
                    <bdi>{sign(latest.net)}{iqd(Math.abs(latest.net))}</bdi>
                    <em>د.ع</em>
                  </strong>
                  <p>{latest.net > 0 ? 'صافي شراء أجنبي' : latest.net < 0 ? 'صافي بيع أجنبي' : 'تدفق متوازن'}</p>
                  <Balance buy={latest.buy} sell={latest.sell} />
                  <dl className="ffw-hero-figs">
                    <div><dt>صفقات أجنبية</dt><dd><bdi>{nf0.format(latest.trades)}</bdi></dd></div>
                    <div><dt>شركات بنشاط أجنبي</dt><dd><bdi>{latest.companies}</bdi></dd></div>
                  </dl>
                </>
              )}
            </article>

            <article className="ffw-hero-card is-period">
              <span className="ffw-st-chip ffw-st-chip-period">الفترة المحددة · {periodLabel}</span>
              <span className="ffw-cd-cell-label">
                {t ? <>{arShortY(t.from)} — {arShortY(t.to)}</> : '—'}
              </span>
              {loading || !t ? <Skel h={104} /> : (
                <>
                  <strong className={cls(t.net)}>
                    <bdi>{sign(t.net)}{iqd(Math.abs(t.net))}</bdi>
                    <em>د.ع</em>
                  </strong>
                  {/* Persistence, not a sentiment score: two counts and the
                      arithmetic that produced them. */}
                  <p>
                    صافي {t.net >= 0 ? 'شراء' : 'بيع'} تراكمي على مدى <bdi>{nf0.format(t.counted)}</bdi> جلسة
                    برصد · <bdi>{t.buySessions}</bdi> جلسة شراء مقابل <bdi>{t.sellSessions}</bdi> جلسة بيع
                    {t.missing > 0 ? <> · <bdi>{t.missing}</bdi> جلسة بلا بيانات لم تُحتسب</> : null}
                  </p>
                  <Balance buy={t.buy} sell={t.sell} />
                  <dl className="ffw-hero-figs">
                    <div>
                      <dt>
                        استمرارية الشراء
                        <i className="ffw-fn-help" tabIndex={0} role="note"
                          data-help="عدد الجلسات التي كان صافي التدفق فيها موجباً، مقسوماً على عدد الجلسات التي رُصد فيها التدفق فعلاً — لا على جلسات الفترة كلها. النسبة والعددان معروضان معاً."
                          aria-label="جلسات الشراء مقسومة على الجلسات المرصودة">؟</i>
                      </dt>
                      <dd>
                        <bdi>{t.counted ? `${((t.buySessions / t.counted) * 100).toFixed(0)}%` : '—'}</bdi>
                        <small>{t.buySessions}/{t.counted}</small>
                      </dd>
                    </div>
                    <div>
                      <dt>
                        إجمالي النشاط
                        <i className="ffw-fn-help" tabIndex={0} role="note"
                          data-help="مجموع الشراء والبيع الأجنبي في الفترة — الإجمالي وليس الصافي. نشاط كبير بصافٍ صغير يعني تبادلاً بين المستثمرين الأجانب أنفسهم."
                          aria-label="مجموع الشراء والبيع الأجنبي في الفترة">؟</i>
                      </dt>
                      <dd><bdi>{iqd(t.gross)}</bdi><small>د.ع</small></dd>
                    </div>
                  </dl>
                </>
              )}
            </article>
          </section>

          {/* ── Net flow / cumulative balance ───────────────────────────── */}
          <section className="ffw-cd-panel ffw-chart-panel">
            <div className="ffw-cd-panel-head">
              <h2>{mode === 'net' ? 'صافي التدفق عبر الفترات' : 'الرصيد التراكمي خلال الفترة'}</h2>
              <span className="ffw-cd-panel-note">{FLOW_GRAIN_LABEL[grain]}</span>
              <div className="ffw-st-switch" role="group" aria-label="نوع العرض">
                <button type="button" className={mode === 'net' ? 'active' : ''}
                  aria-pressed={mode === 'net'} onClick={() => setMode('net')}>صافي كل فترة</button>
                <button type="button" className={mode === 'cum' ? 'active' : ''}
                  aria-pressed={mode === 'cum'} onClick={() => setMode('cum')}>التراكمي</button>
              </div>
            </div>
            {loading || !t ? <Skel h={236} /> : (
              <>
                <FlowChart key={`${period}-${mode}`} buckets={buckets} mode={mode}
                  grain={grain} theme={theme} height={236} />
                <p className="ffw-st-foot">
                  {mode === 'net'
                    ? 'أعمدة منفصلة من خط صفر مشترك — كل عمود هو ما حدث خلال تلك الفترة وحدها. لا يُوصَل بينها بخط، لأن الخط يفترض قيماً بين الفترات لم تُرصد.'
                    : 'خط متصل لأن الرصيد التراكمي كمية مستمرة: صافي التدفق مجموعاً من بداية الفترة المحددة — لا من بداية السجل.'}
                  {' '}المصدر: foreign_flow_company_daily · {arShortY(t.from)} — {arShortY(t.to)}.
                  {' '}الجلسات التي لا يوجد لها رصد لا تُرسم ولا تُحتسب صفراً.
                </p>
              </>
            )}
          </section>

          <div className="ffw-st-grid-2 ffw-grid">
            {/* ── Company activity ───────────────────────────────────── */}
            <section className="ffw-cd-panel ffw-companies">
              <div className="ffw-cd-panel-head">
                <h2>نشاط الشركات</h2>
                <span className="ffw-st-chip ffw-st-chip-period">الفترة المحددة</span>
                <div className="ffw-st-switch" role="group" aria-label="ترتيب الشركات">
                  {COMPANY_VIEWS.map((v) => (
                    <button key={v.id} type="button" className={view === v.id ? 'active' : ''}
                      aria-pressed={view === v.id} onClick={() => setView(v.id)}>{v.label}</button>
                  ))}
                </div>
              </div>
              {loading ? <Skel h={300} /> : !ranked.length ? (
                <div className="ffw-cd-nodata">
                  <strong>لا توجد شركات بنشاط أجنبي على هذا الجانب</strong>
                  <p>جرّب جانباً آخر أو فترة أطول.</p>
                </div>
              ) : (
                <>
                  <div className="ffw-pl-readout" aria-live="polite">
                    {row ? <CompanyRead c={ranked.find((x) => x.ticker === row)} />
                      : <span className="ffw-pl-readout-hint">مرّر على شركة لقراءة أرقامها · النقر يفتح صفحتها</span>}
                  </div>
                  <ul className="ffw-rows">
                    {top10.map((c, i) => (
                      <CompanyRow key={c.ticker} c={c} i={i} view={view} max={rowMax}
                        on={row === c.ticker}
                        onEnter={() => setRow(c.ticker)} onLeave={() => setRow(null)} />
                    ))}
                  </ul>
                  <p className="ffw-st-foot">
                    <bdi>{ranked.length}</bdi> شركة على هذا الجانب، من أصل
                    {' '}<bdi>{companies.length}</bdi> شركة بنشاط أجنبي في الفترة.
                    الشركات التي لا نشاط لها على هذا الجانب غائبة عن الترتيب ولا تظهر بصفر.
                    مجموع صفوف الشركات يساوي إجمالي الفترة أعلاه بالدينار — الصفوف والإجمالي
                    من الجدول نفسه. هذا نشاط تداول ولا يعني تغيّراً في الملكية.
                  </p>
                </>
              )}
            </section>

            {/* ── Sector allocation ──────────────────────────────────── */}
            <section className={`ffw-cd-panel ffw-sectors-panel ${sector ? 'has-sel' : ''}`}>
              <div className="ffw-cd-panel-head">
                <h2>توزيع رأس المال الأجنبي</h2>
                <span className="ffw-st-chip ffw-st-chip-period">الفترة المحددة</span>
                <span className="ffw-cd-panel-note">حسب القطاع</span>
              </div>
              {loading ? <Skel h={300} /> : !sectors.length ? (
                <div className="ffw-cd-nodata">
                  <strong>لا نشاط أجنبي في الفترة</strong>
                  <p>جرّب فترة أطول.</p>
                </div>
              ) : (
                <>
                  <div className="ffw-pl-readout" aria-live="polite">
                    {sector ? <SectorRead s={sectors.find((x) => x.id === sector)} />
                      : <span className="ffw-pl-readout-hint">مرّر أو انقر على قطاع لعرض أرقامه</span>}
                  </div>
                  <ul className="ffw-sectors">
                    {sectors.map((s) => (
                      <SectorRow key={s.id} s={s} max={sectorMax} on={sector === s.id}
                        onEnter={() => setSector(s.id)} onLeave={() => setSector(null)} />
                    ))}
                  </ul>
                  <p className="ffw-st-foot">
                    الشريط يقيس إجمالي النشاط (شراء + بيع)، والرقم الملوّن هو الصافي.
                    قطاع بنشاط كبير وصافٍ قريب من الصفر يعني تبادلاً بين المستثمرين الأجانب
                    أنفسهم، لا دخولاً أو خروجاً. القطاعات مجمّعة من صفوف الشركات نفسها،
                    لا من الجدول الشهري.
                  </p>
                </>
              )}
            </section>
          </div>

          {/* ── OWNERSHIP · a different quantity ────────────────────────── */}
          <section className="ffw-cd-panel ffw-own-panel">
            <div className="ffw-cd-panel-head">
              <h2>الملكية الأجنبية</h2>
              {own ? <span className="ffw-st-chip ffw-st-chip-snap">لقطة شهرية · {arMonth(own.month)}</span> : null}
              <Link className="ffw-st-link" href="/statistics/ownership">هيكل الملكية الكامل ←</Link>
              <Link className="ffw-st-link" href="/statistics/shareholders">كبار المساهمين ←</Link>
            </div>
            {ownFailed ? (
              <div className="ffw-mv-error" role="alert">
                <span className="ffw-mv-error-mark" aria-hidden="true">!</span>
                <div>
                  <strong>تعذّر تحميل بيانات الملكية</strong>
                  <p>أرقام التدفق والنشاط أعلاه محدّثة وكاملة — الملكية جدول شهري منفصل.</p>
                </div>
              </div>
            ) : !own ? <Skel h={200} /> : (
              <>
                {/* The sentence that keeps the page honest. */}
                <p className="ffw-own-note">
                  الملكية ليست تدفقاً. الأرقام أعلاه تقيس ما تداوله الأجانب خلال الفترة،
                  وهذه الأرقام تقيس ما يملكونه فعلاً من الأسهم المودعة في تاريخ واحد.
                  شهرٌ من الشراء الكثيف قد لا يحرّك الملكية إذا جرى بين الأجانب أنفسهم.
                </p>
                <div className="ffw-own">
                  <div className="ffw-own-lead">
                    <span className="ffw-cd-cell-label">حصة الأجانب من الأسهم المودعة</span>
                    <strong><bdi>{own.pct == null ? '—' : `${own.pct.toFixed(1)}%`}</bdi></strong>
                    <div className="ffw-own-track" role="img"
                      aria-label={own.pct == null ? 'الحصة غير متاحة' : `${own.pct.toFixed(1)} بالمئة ملكية أجنبية`}>
                      <i style={{ inlineSize: `${own.pct ?? 0}%` }} />
                    </div>
                    <p>
                      <bdi>{iqd(own.foreign)}</bdi> سهماً أجنبياً مقابل
                      {' '}<bdi>{iqd(own.iraqi)}</bdi> سهماً عراقياً
                    </p>
                  </div>
                  <dl className="ffw-own-figs">
                    <div>
                      <dt>شركات بملكية أجنبية</dt>
                      <dd><bdi>{own.withForeign}</bdi><small>من {own.universe} في تقرير الشهر</small></dd>
                    </div>
                    <div>
                      <dt>حاملون أجانب</dt>
                      <dd><bdi>{nf0.format(own.foreignHolders)}</bdi></dd>
                    </div>
                    <div>
                      <dt>أعلى نسبة ملكية أجنبية</dt>
                      <dd>
                        <bdi>{own.top.length ? `${own.top[0].pct.toFixed(1)}%` : '—'}</bdi>
                        <small>{own.top[0]?.name ?? ''}</small>
                      </dd>
                    </div>
                  </dl>
                </div>
                <ul className="ffw-own-rows">
                  {own.top.map((c) => (
                    <li key={c.name}>
                      <span className="ffw-own-row">
                        <span className="ffw-own-name" title={c.name}>{c.name}</span>
                        <span className="ffw-own-bar" aria-hidden="true">
                          <i style={{ inlineSize: `${(c.pct / (own.top[0].pct || 1)) * 100}%` }} />
                        </span>
                        <bdi className="ffw-own-pct">{c.pct.toFixed(1)}%</bdi>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="ffw-st-foot">
                  المصدر: ownership_monthly · {arMonth(own.month)}. تُحدَّث شهرياً مع التقرير
                  الرسمي، ولذلك لا تتبع الفترة المحددة أعلى الصفحة. النسبة = الأسهم الأجنبية
                  ÷ (الأسهم الأجنبية + العراقية) مجموعةً على شركات الشهر.
                  {' '}أسماء الشركات في هذا الجدول مستخرجة من تقرير ممسوح ضوئياً وتُطابَق
                  بالسجل المعتمد عند العرض.
                </p>
              </>
            )}
          </section>
        </>
      )}
    </main>
  )
}

/* ── Bits ─────────────────────────────────────────────────────────────────── */

/** Buy / sell proportional bar. Green buy, red sell, exact values, the
 *  percentage relationship, and the net stated separately. */
function Balance({ buy, sell }: { buy: number; sell: number }) {
  const total = buy + sell
  const [on, setOn] = useState<'buy' | 'sell' | null>(null)
  if (!total) {
    return (
      <div className="ffw-balance">
        <div className="ffw-balance-labels">
          <span className="sell"><small>بيع</small><strong><bdi>0</bdi></strong></span>
          <span className="buy"><small>شراء</small><strong><bdi>0</bdi></strong></span>
        </div>
        <div className="ffw-balance-track" />
        <p>لا نشاط أجنبي — شراء وبيع كلاهما صفر، وليس غياب بيانات.</p>
      </div>
    )
  }
  const bs = (buy / total) * 100, ss = (sell / total) * 100
  return (
    <div className={`ffw-balance${on ? ` is-${on}` : ''}`}>
      <div className="ffw-balance-labels">
        <span className="sell"><small>بيع</small><strong><bdi>{iqd(sell)}</bdi></strong></span>
        <span className="buy"><small>شراء</small><strong><bdi>{iqd(buy)}</bdi></strong></span>
      </div>
      <div className="ffw-balance-track">
        <button type="button" className="sell" style={{ inlineSize: `${ss}%` }}
          aria-label={`بيع ${iqdFull(sell)} دينار، ${ss.toFixed(1)} بالمئة`}
          onPointerEnter={() => setOn('sell')} onPointerLeave={() => setOn(null)}
          onFocus={() => setOn('sell')} onBlur={() => setOn(null)} />
        <button type="button" className="buy" style={{ inlineSize: `${bs}%` }}
          aria-label={`شراء ${iqdFull(buy)} دينار، ${bs.toFixed(1)} بالمئة`}
          onPointerEnter={() => setOn('buy')} onPointerLeave={() => setOn(null)}
          onFocus={() => setOn('buy')} onBlur={() => setOn(null)} />
      </div>
      <p aria-live="polite">
        {on === 'buy' ? <><bdi>{iqdFull(buy)}</bdi> شراء · <bdi>{bs.toFixed(1)}%</bdi> من النشاط</>
          : on === 'sell' ? <><bdi>{iqdFull(sell)}</bdi> بيع · <bdi>{ss.toFixed(1)}%</bdi> من النشاط</>
            : <><bdi>{bs.toFixed(1)}%</bdi> شراء · <bdi>{ss.toFixed(1)}%</bdi> بيع</>}
      </p>
    </div>
  )
}

function CompanyRead({ c }: { c?: CompanyFlow }) {
  if (!c) return <span className="ffw-pl-readout-hint">—</span>
  return (
    <>
      <span className="ffw-pl-readout-name">{c.name}</span>
      <bdi className="ffw-cd-ticker">{c.ticker}</bdi>
      <span className="ffw-pl-read"><em>شراء</em><bdi className="positive">{iqdFull(c.buy)}</bdi></span>
      <span className="ffw-pl-read"><em>بيع</em><bdi className="negative">{iqdFull(c.sell)}</bdi></span>
      <span className="ffw-pl-read"><em>الصافي</em>
        <bdi className={cls(c.net)}>{sign(c.net)}{iqdFull(Math.abs(c.net))}</bdi>
      </span>
      <span className="ffw-pl-read"><em>من النشاط الأجنبي</em><bdi>{(c.share * 100).toFixed(1)}%</bdi></span>
      <span className="ffw-pl-read"><em>صفقات</em><bdi>{nf0.format(c.trades)}</bdi></span>
    </>
  )
}

function SectorRead({ s }: { s?: SectorFlow }) {
  if (!s) return <span className="ffw-pl-readout-hint">—</span>
  return (
    <>
      <span className="ffw-pl-readout-name">{s.label}</span>
      <span className="ffw-pl-read"><em>شراء</em><bdi className="positive">{iqdFull(s.buy)}</bdi></span>
      <span className="ffw-pl-read"><em>بيع</em><bdi className="negative">{iqdFull(s.sell)}</bdi></span>
      <span className="ffw-pl-read"><em>الصافي</em>
        <bdi className={cls(s.net)}>{sign(s.net)}{iqd(Math.abs(s.net))}</bdi>
      </span>
      <span className="ffw-pl-read"><em>من النشاط</em><bdi>{(s.share * 100).toFixed(1)}%</bdi></span>
      <span className="ffw-pl-read"><em>شركات</em><bdi>{s.companies}</bdi></span>
    </>
  )
}

function CompanyRow({ c, i, view, max, on, onEnter, onLeave }: {
  c: CompanyFlow; i: number; view: CompanyView; max: number
  on: boolean; onEnter: () => void; onLeave: () => void
}) {
  const v = viewValue(c, view)
  const pct = Math.min(100, (Math.abs(v) / max) * 100)
  const signed = isNetView(view)
  return (
    <li className={on ? 'is-on' : ''} onPointerEnter={onEnter} onPointerLeave={onLeave}>
      <Link href={`/c/${c.ticker}`} onFocus={onEnter} onBlur={onLeave}
        aria-label={`${c.name}: شراء ${iqdFull(c.buy)}، بيع ${iqdFull(c.sell)}، الصافي ${iqdFull(c.net)}`}>
        <span className="ffw-rank"><bdi>{i + 1}</bdi></span>
        <span className="ffw-name">
          <strong title={c.name}>{c.name}</strong>
          <bdi className="ffw-cd-ticker">{c.ticker}</bdi>
        </span>
        {signed ? (
          /* A signed bar needs a centre, not a start edge: net buying grows one
             way from the zero rail and net selling the other. */
          <span className="ffw-bar-signed" aria-hidden="true">
            <span className="ffw-bar-half down">{v < 0 ? <i style={{ inlineSize: `${pct}%` }} /> : null}</span>
            <span className="ffw-bar-rail" />
            <span className="ffw-bar-half up">{v > 0 ? <i style={{ inlineSize: `${pct}%` }} /> : null}</span>
          </span>
        ) : (
          <span className={`ffw-bar ${view}`} aria-hidden="true">
            <i style={{ inlineSize: `${pct}%` }} />
          </span>
        )}
        <bdi className={`ffw-val ${signed ? cls(v) : view === 'buy' ? 'positive' : 'negative'}`}>
          {signed ? sign(v) : ''}{iqd(Math.abs(v))}
        </bdi>
        <span className="ffw-go" aria-hidden="true">‹</span>
      </Link>
    </li>
  )
}

function SectorRow({ s, max, on, onEnter, onLeave }: {
  s: SectorFlow; max: number; on: boolean; onEnter: () => void; onLeave: () => void
}) {
  const gross = s.buy + s.sell
  return (
    <li className={on ? 'is-on' : ''} onPointerEnter={onEnter} onPointerLeave={onLeave}>
      <button type="button" onFocus={onEnter} onBlur={onLeave}
        aria-label={`${s.label}: نشاط ${iqdFull(gross)}، الصافي ${iqdFull(s.net)}`}>
        <span className="ffw-sec-name">{s.label}</span>
        {/* Gross activity split into its buy and sell parts — the shape of the
            bar shows whether a sector was accumulated or churned. */}
        <span className="ffw-sec-track" aria-hidden="true">
          <i className="buy" style={{ inlineSize: `${(s.buy / max) * 100}%` }} />
          <i className="sell" style={{ inlineSize: `${(s.sell / max) * 100}%` }} />
        </span>
        <bdi className={`ffw-sec-net ${cls(s.net)}`}>{sign(s.net)}{iqd(Math.abs(s.net))}</bdi>
        <bdi className="ffw-sec-share">{pctLabel(s.share)}</bdi>
      </button>
    </li>
  )
}

const Skel = ({ h }: { h: number }) =>
  <span className="ffw-pl-skel" style={{ inlineSize: '100%', blockSize: `${h}px`, borderRadius: '12px' }} aria-hidden="true" />

/* `0` is a measured balance, so it takes neither a sign nor a colour. */
const sign = (v: number) => (v > 0 ? '+' : v < 0 ? '−' : '')
const cls = (v: number) => (v > 0 ? 'positive' : v < 0 ? 'negative' : '')

/* A share that rounds to zero but is not zero must not print «0%» — that is
   the same defect as printing 0 for an unknown, one step down. */
function pctLabel(share: number): string {
  const p = share * 100
  if (p === 0) return '0%'
  if (p < 0.5) return '<1%'
  return `${p.toFixed(0)}%`
}

/* ── Fetching ─────────────────────────────────────────────────────────────── */

type Sb = Awaited<ReturnType<typeof import('@/lib/supabase/client')['createClient']>>

/** PostgREST caps a response at 1,000 rows; walk the range until it is short. */
async function pageAll<T>(sb: Sb, table: string, select: string, from?: string): Promise<T[]> {
  const out: T[] = []
  for (let off = 0; off < 40_000; off += 1000) {
    let q = sb.from(table).select(select).order('date', { ascending: true }).range(off, off + 999)
    if (from) q = q.gte('date', from)
    const { data, error } = await q
    if (error) throw error
    const rows = (data ?? []) as unknown as T[]
    out.push(...rows)
    if (rows.length < 1000) break
  }
  return out
}

/* ── Ownership ────────────────────────────────────────────────────────────── */

type OwnRow = {
  name_ar: string
  iraqi_shares: number | null
  foreign_shares: number | null
  foreign_count: number | null
}

function summariseOwnership(rows: OwnRow[], month: string, meta: CompanyMeta[]): Ownership {
  let iraqi = 0, foreign = 0, holders = 0, withForeign = 0
  const top: { name: string; pct: number }[] = []
  for (const r of rows) {
    const i = r.iraqi_shares ?? 0
    const f = r.foreign_shares ?? 0
    iraqi += i; foreign += f
    holders += r.foreign_count ?? 0
    if (f > OWN_MIN_SHARE && i + f > 0) {
      withForeign++
      top.push({
        // The parse mangles Arabic; recover the curated spelling where one
        // clearly matches, exactly as /statistics/ownership already does.
        name: meta.length ? matchCompanyName(r.name_ar, meta) : r.name_ar,
        pct: (f / (i + f)) * 100,
      })
    }
  }
  const total = iraqi + foreign
  top.sort((a, b) => b.pct - a.pct)
  return {
    month, iraqi, foreign,
    pct: total > 0 ? (foreign / total) * 100 : null,
    foreignHolders: holders, withForeign, universe: rows.length,
    top: top.slice(0, 5),
  }
}
