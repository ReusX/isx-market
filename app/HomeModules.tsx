'use client'

import { type PointerEvent, type KeyboardEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Sparkline } from '@/components/design/Sparkline'
import { loadFullHistory } from '@/components/design/IndexChart'
import { Unavailable, Freshness } from '@/components/system/DataStates'
import type { Breadth, Flow, IndexRow, SectorMove } from '@/lib/homeData'
import { arSession, signed } from '@/lib/homeData'

/* ═══════════════════════════════════════════════════════════════════════════
   Homepage modules — a VISUAL RE-PORT of the approved reference app.
   ═══════════════════════════════════════════════════════════════════════════

   Every composition below is the reference's, element for element:

     hero      /Users/amed/iqwealth-design/app/page.tsx  `.home-v2-index-card`
     flow      …                                          `.home-flow-card`
     breadth   …                                          `.home-breadth-card`
     activity  …                                          `.home-activity-card`
     sectors   …                                          `.home-sectors-card`

   and the geometry, colour and type live in `app/home.css`, measured off the
   running reference rather than remembered. What is NOT the reference's is the
   DATA: every figure here is real, comes from `lib/homeData.ts` against one
   resolved session, and keeps the four-state breadth, the `noPrior` truth and
   the `—` versus `0` discipline that the previous pass established.

   Where a reference decision cannot survive contact with real data it is
   marked ⚠ REAL-DATA and explained. There are four, and no others.
   ═══════════════════════════════════════════════════════════════════════════ */

const nf = new Intl.NumberFormat('en-US')
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
const px2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Traded value in IQD, compact. `—` when we have no figure at all. */
export function IQD({ v }: { v: number | null | undefined }) {
  if (v == null) return <Unavailable />
  return <bdi className="ty-num">{compact.format(v)} IQD</bdi>
}

/* ═══════════════════════════════════════════════════════════════════════════
   ISX60 hero — `.home-v2-index-card`
   ═══════════════════════════════════════════════════════════════════════════

   771×520 in the reference at 1440; 520px tall and spanning 8 of 12 columns
   here, which is the same card. The 98px index number, the range group, the
   «المخطط الكامل» door beside it, the 250px plot, the crosshair and the
   three-slot metadata footer are all the reference's.

   ⚠ REAL-DATA · the range set. The reference offers `1D 1W 1M 1Y 5Y الكل`.
   `daily_index` carries ONE row per trading session — there is no intraday
   feed — so a 1D view would be a single point, and drawing it would be the
   page's only invented number. The control keeps its exact geometry and its
   six positions; 1D becomes 3M. Recorded in the completion report.
   ═══════════════════════════════════════════════════════════════════════════ */

const RANGES = [
  { id: '1W', label: '1W', days: 7 },
  { id: '1M', label: '1M', days: 31 },
  { id: '3M', label: '3M', days: 92 },
  { id: '1Y', label: '1Y', days: 365 },
  { id: '5Y', label: '5Y', days: 1826 },
  { id: 'ALL', label: 'الكل', days: Number.POSITIVE_INFINITY },
] as const

type RangeId = (typeof RANGES)[number]['id']

/* The reference plot's viewBox, verbatim: 760 × 250, with the trace living
   between y=35 and y=208 and the area closing on y=250. Reproducing the box
   is what makes the curve sit at the reference's weight inside the card. */
const VB_W = 760
const VB_H = 250
const TOP = 35
const BOT = 208
const GRID = [45, 90, 135, 180, 225]

type Pt = { x: number; y: number; value: string; time: string }

export function HeroCard({
  rows,
  session,
  onExpand,
}: {
  rows: IndexRow[]
  session: string | null
  onExpand: () => void
}) {
  const [range, setRange] = useState<RangeId>('1Y')
  const [full, setFull] = useState<{ date: string; isx60: number }[] | null>(null)
  const [fullLoading, setFullLoading] = useState(false)
  const [active, setActive] = useState<Pt | null>(null)

  const days = RANGES.find((r) => r.id === range)!.days
  // The page ships ~400 sessions. 5Y and الكل pull the archive on demand.
  const needsFull = days > 400

  useEffect(() => {
    if (!needsFull || full || fullLoading) return
    setFullLoading(true)
    loadFullHistory().then(setFull).catch(() => {}).finally(() => setFullLoading(false))
  }, [needsFull, full, fullLoading])

  const source = needsFull && full ? full : rows

  const visible = useMemo(() => {
    if (!source.length) return []
    if (!Number.isFinite(days)) return source
    const last = source[source.length - 1].date
    const cut = new Date(`${last}T00:00:00Z`)
    cut.setUTCDate(cut.getUTCDate() - days)
    const iso = cut.toISOString().slice(0, 10)
    const slice = source.filter((r) => r.date >= iso)
    return slice.length >= 2 ? slice : source.slice(-2)
  }, [source, days])

  const geo = useMemo(() => {
    if (visible.length < 2) return null
    const vals = visible.map((r) => r.isx60)
    const lo = Math.min(...vals)
    const hi = Math.max(...vals)
    const span = hi - lo || 1
    const pts: Pt[] = vals.map((v, i) => ({
      x: Math.round((i / (vals.length - 1)) * VB_W),
      y: Math.round(TOP + (1 - (v - lo) / span) * (BOT - TOP)),
      value: px2.format(v),
      time: arSession(visible[i].date),
    }))
    const trace = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
    const first = vals[0]
    const last = vals[vals.length - 1]
    return {
      pts,
      trace,
      area: `${trace} L${VB_W},${VB_H} L0,${VB_H} Z`,
      lo: px2.format(lo),
      hi: px2.format(hi),
      last: px2.format(last),
      abs: last - first,
      pct: first ? ((last - first) / first) * 100 : 0,
    }
  }, [visible])

  /* The headline number is the LATEST CLOSE against the PRIOR SESSION — the
     one comparison the page is labelled with — and does not change when the
     reader walks the range control. The range moves the plot and the footer,
     which is what the reference's control does too. */
  const latest = rows.length ? rows[rows.length - 1] : null
  const prev = rows.length > 1 ? rows[rows.length - 2] : null
  const abs = latest && prev ? latest.isx60 - prev.isx60 : null
  const pct = latest && prev && prev.isx60 ? ((latest.isx60 - prev.isx60) / prev.isx60) * 100 : null
  const up = (abs ?? 0) >= 0

  function move(event: PointerEvent<HTMLDivElement>) {
    if (!geo) return
    const rect = event.currentTarget.getBoundingClientRect()
    // The plot is drawn LTR inside an RTL page and is not mirrored.
    const x = Math.max(0, Math.min(VB_W, ((event.clientX - rect.left) / rect.width) * VB_W))
    setActive(geo.pts.reduce((best, p) => (Math.abs(p.x - x) < Math.abs(best.x - x) ? p : best)))
  }

  /* Hover cannot be the only way to read a point — the arrows walk the series.
     RTL: ArrowLeft moves FORWARD in time, because the plot is drawn LTR. */
  function key(event: KeyboardEvent<HTMLDivElement>) {
    if (!geo) return
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const i = active ? geo.pts.indexOf(active) : geo.pts.length - 1
    const next = Math.max(0, Math.min(geo.pts.length - 1, i + (event.key === 'ArrowLeft' ? 1 : -1)))
    setActive(geo.pts[next])
  }

  return (
    <article className={`hm-hero${up ? '' : ' is-down'}`} aria-labelledby="hm-isx-t">
      <header>
        <div>
          <span>مؤشر السوق العراقي</span>
          <h2 id="hm-isx-t"><bdi>ISX60</bdi></h2>
        </div>
        <div className="hm-hero-actions">
          <button type="button" className="hm-fullchart" onClick={onExpand}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M6 2H2v4M10 14h4v-4" fill="none" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            المخطط الكامل
          </button>
          <div className="hm-periods" role="group" aria-label="الفترة الزمنية">
            {RANGES.map((r) => (
              <button key={r.id} type="button" className={range === r.id ? 'active' : ''}
                aria-pressed={range === r.id}
                onClick={() => { setRange(r.id); setActive(null) }}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="hm-index-value">
        <strong><bdi>{latest ? px2.format(latest.isx60) : '—'}</bdi></strong>
        {abs != null && pct != null ? (
          <span className={signed(pct).tone === 'down' ? 'negative' : 'positive'}>
            <bdi>{abs > 0 ? '+' : abs < 0 ? '−' : ''}{px2.format(Math.abs(abs))}</bdi>
            {' · '}
            <bdi>{signed(pct).text}</bdi>
            {' '}{up ? '↗' : '↘'}
          </span>
        ) : (
          <span className="hm-noprior"><Unavailable why="لا توجد جلسة سابقة للمقارنة" /></span>
        )}
      </div>

      <div className="hm-index-chart" tabIndex={0} role="application" onKeyDown={key}
        onPointerMove={move} onPointerDown={move} onPointerLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
        aria-label={`رسم مؤشر ISX60 · ${range} · استخدم الأسهم لقراءة النقاط`}>
        {geo ? (
          <>
            <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none" role="img">
              <defs>
                <linearGradient id="hmIndexFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="currentColor" stopOpacity=".22" />
                  <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
              </defs>
              {GRID.map((y) => <line key={y} x1="0" x2={VB_W} y1={y} y2={y} />)}
              <path className="area" d={geo.area} />
              <path className="trace-shadow" d={geo.trace} />
              <path className="trace" d={geo.trace} />
              <circle cx={geo.pts[geo.pts.length - 1].x} cy={geo.pts[geo.pts.length - 1].y} r="5" />
              {active ? (
                <g className="hm-crosshair">
                  <line x1={active.x} x2={active.x} y1="0" y2={VB_H} />
                  <circle cx={active.x} cy={active.y} r="4" />
                </g>
              ) : null}
            </svg>
            {active ? (
              <div className="hm-chart-tip" style={{
                insetInlineStart: `${Math.min(84, Math.max(8, active.x / (VB_W / 100)))}%`,
                insetBlockStart: `${Math.min(72, Math.max(8, active.y / (VB_H / 100)))}%`,
              }}>
                <bdi>{active.value}</bdi><small>{active.time}</small>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      {/* The reference's three-slot footer. ⚠ REAL-DATA · its middle slot reads
          «آخر تحديث 14:00», an intraday stamp this product does not have; the
          slot carries the canonical session date instead. Same geometry. */}
      <footer>
        <span>أدنى الفترة <bdi>{geo ? geo.lo : '—'}</bdi></span>
        {/* NOT in a `bdi`. `arSession` returns «16 أغسطس 2026», which is Arabic
            text carrying numerals; isolating it as LTR reorders it to
            «أغسطس 16 2026». Only the pure figures beside it are isolated. */}
        <span className="hm-hero-session">آخر جلسة {arSession(session)}</span>
        <span>أعلى الفترة <bdi>{geo ? geo.hi : '—'}</bdi></span>
      </footer>
    </article>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Foreign flow — `.home-flow-card`
   ═══════════════════════════════════════════════════════════════════════════

   The navy card. `linear-gradient(150deg, #173758, #102b47 72%, #0d2540)` is
   the single strongest brand moment on the page and the previous pass painted
   it grey. Composition, net scale, bottom-anchored balance bar, watermark,
   footer legend and the «التفاصيل» pill are all the reference's; the buy/sell
   figures are the real reconciled ones.
   ═══════════════════════════════════════════════════════════════════════════ */

export function FlowCard({
  flow,
  behind,
}: {
  flow: Flow | null
  behind: boolean
}) {
  const [focus, setFocus] = useState<'buy' | 'sell' | null>(null)

  const total = flow ? flow.buy + flow.sell : 0
  const net = flow?.net ?? 0
  // A ±3% imbalance is noise at this scale, not a direction.
  const neutral = !flow || (total > 0 && Math.abs(net) / total < 0.03)
  const buying = net > 0
  const tone = neutral ? 'neutral' : buying ? 'buying' : 'selling'

  return (
    <article className="hm-flow" aria-labelledby="hm-flow-t">
      <span className="hm-flow-mark" aria-hidden="true">iraqsm.com</span>

      <header>
        <div>
          <span id="hm-flow-t">تدفق المستثمر الأجنبي</span>
          <small>السيولة الدولية</small>
        </div>
        <div className="hm-flow-head-end">
          <time dateTime={flow?.date ?? undefined}>{arSession(flow?.date ?? null)}</time>
          <Link className="hm-flow-cta" href="/statistics/foreign-flow">
            التفاصيل <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>

      {!flow ? (
        <div className="hm-flow-result neutral">
          <strong><bdi>—</bdi></strong>
          <p>لا تتوفر بيانات تدفق أجنبي لهذه الجلسة.</p>
        </div>
      ) : (
        <>
          <div className={`hm-flow-result ${tone}`}>
            <strong>
              <bdi>{net > 0 ? '+' : net < 0 ? '−' : ''}{compact.format(Math.abs(net))}</bdi>
              <small>IQD</small>
            </strong>
            <p>{neutral ? 'تدفق أجنبي متوازن' : buying ? 'صافي شراء أجنبي' : 'صافي بيع أجنبي'}</p>
          </div>

          {/* The one thing the reference has no slot for: this session is not
              always the index session, and the page states that rather than
              letting two dates read as one. */}
          {behind ? (
            <p className="hm-flow-note">بيانات التدفق أقدم من جلسة المؤشر.</p>
          ) : null}

          {/* The balance bar is bottom-anchored (`margin-block-start: auto`) in
              the reference, and each side is a real control: focusing one mutes
              the other and the sentence below swaps to that side's figures. */}
          <div className={`hm-balance${focus ? ` is-focus-${focus}` : ''}`}
            aria-label={`شراء أجنبي ${compact.format(flow.buy)} دينار، بيع أجنبي ${compact.format(flow.sell)} دينار`}>
            <div className="hm-balance-labels">
              <span className="sell"><small>بيع</small><strong><bdi>{compact.format(flow.sell)}</bdi></strong></span>
              <span className="buy"><small>شراء</small><strong><bdi>{compact.format(flow.buy)}</bdi></strong></span>
            </div>
            <div className="hm-balance-track" role="group"
              aria-label={`${flow.buyShare.toFixed(1)} بالمئة شراء و${flow.sellShare.toFixed(1)} بالمئة بيع`}>
              <button type="button" className="sell" style={{ inlineSize: `${flow.sellShare}%` }}
                aria-label={`بيع أجنبي ${compact.format(flow.sell)} دينار، ${flow.sellShare.toFixed(1)} بالمئة`}
                onPointerEnter={() => setFocus('sell')} onPointerLeave={() => setFocus(null)}
                onFocus={() => setFocus('sell')} onBlur={() => setFocus(null)} />
              <button type="button" className="buy" style={{ inlineSize: `${flow.buyShare}%` }}
                aria-label={`شراء أجنبي ${compact.format(flow.buy)} دينار، ${flow.buyShare.toFixed(1)} بالمئة`}
                onPointerEnter={() => setFocus('buy')} onPointerLeave={() => setFocus(null)}
                onFocus={() => setFocus('buy')} onBlur={() => setFocus(null)} />
            </div>
            <p aria-live="polite">
              {focus === 'buy'
                ? <><strong><bdi>{compact.format(flow.buy)}</bdi></strong> شراء أجنبي · <bdi>{flow.buyShare.toFixed(1)}%</bdi> من التداول الأجنبي</>
                : focus === 'sell'
                ? <><strong><bdi>{compact.format(flow.sell)}</bdi></strong> بيع أجنبي · <bdi>{flow.sellShare.toFixed(1)}%</bdi> من التداول الأجنبي</>
                : neutral ? 'التداول الأجنبي متقارب بين الشراء والبيع'
                : <><strong><bdi>{Math.max(flow.buyShare, flow.sellShare).toFixed(1)}%</bdi></strong> من التداول الأجنبي {buying ? 'شراء' : 'بيع'}</>}
            </p>
          </div>
        </>
      )}

      <footer>
        <span><i className="buy" /> شراء</span>
        <span><i className="sell" /> بيع</span>
        <small>جلسة {arSession(flow?.date ?? null)}</small>
      </footer>
    </article>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Market breadth — `.home-breadth-card`
   ═══════════════════════════════════════════════════════════════════════════

   The approved donut, restored. The previous pass replaced it with a stacked
   bar; this is the reference ring, its conic stops, its 9px inner border and
   its centre readout.

   ⚠ REAL-DATA · the fourth category. The reference ring has three arcs. A
   company with no valid prior close has an UNKNOWN change, and counting it as
   «ثابت» asserts something that is not in the data — the correction commit
   `b61f96a` exists for exactly this. So the ring carries a FOURTH arc, adapted
   minimally as §10 asks: it is `transparent` in the conic, which lets a hatched
   neutral underlay show through. Hatched, not tinted, so it can never read as a
   fourth DIRECTION. The three directional arcs keep the approved palette.
   ═══════════════════════════════════════════════════════════════════════════ */

type BKey = 'up' | 'flat' | 'down' | 'na'

export function BreadthCard({ b }: { b: Breadth | null }) {
  const [focus, setFocus] = useState<BKey | null>(null)
  if (!b) return null

  const keys: { k: BKey; label: string; n: number }[] = [
    { k: 'up', label: 'رابح', n: b.advancing },
    { k: 'flat', label: 'ثابت', n: b.unchanged },
    { k: 'down', label: 'خاسر', n: b.declining },
    { k: 'na', label: 'دون إغلاق سابق', n: b.unavailable },
  ]

  const total = b.traded || 1
  const pc = (n: number) => (n / total) * 100
  // Cumulative stops, in the reference's arc order: up · flat · down · unknown.
  const s1 = pc(b.advancing)
  const s2 = s1 + pc(b.unchanged)
  const s3 = s2 + pc(b.declining)

  /* The headline excludes the unknowns from BOTH sides of the ratio. «64%
     إيجابي» over a denominator that includes companies whose change nobody
     knows would be a share of a set the number does not describe. */
  const known = b.advancing + b.declining + b.unchanged
  const headline = known ? Math.round((b.advancing / known) * 100) : null

  return (
    <article className="hm-breadth" aria-labelledby="hm-breadth-t">
      <header>
        <span id="hm-breadth-t">اتساع السوق</span>
        <Link href="/pulse">التفاصيل ↗</Link>
      </header>

      <div className="hm-ring" data-hi={focus ?? undefined}
        style={{ ['--s1' as string]: `${s1}%`, ['--s2' as string]: `${s2}%`, ['--s3' as string]: `${s3}%` }}
        role="img"
        aria-label={`${b.advancing} رابح، ${b.unchanged} ثابت، ${b.declining} خاسر، ${b.unavailable} دون إغلاق سابق، من ${b.traded} شركة متداولة`}>
        <span>
          <strong><bdi>{focus ? keys.find((x) => x.k === focus)!.n : headline == null ? '—' : `${headline}%`}</bdi></strong>
          <small>{focus ? keys.find((x) => x.k === focus)!.label : 'إيجابي'}</small>
        </span>
      </div>

      <div className="hm-breadth-legend">
        {keys.map(({ k, label, n }) => (
          <button key={k} type="button" className={focus === k ? `is-${k} is-on` : `is-${k}`}
            aria-pressed={focus === k}
            onPointerEnter={() => setFocus(k)} onPointerLeave={() => setFocus(null)}
            onFocus={() => setFocus(k)} onBlur={() => setFocus(null)}
            onClick={() => setFocus((c) => (c === k ? null : k))}>
            <i aria-hidden="true" />
            <span>{label}</span>
            <bdi>{n}</bdi>
          </button>
        ))}
      </div>

      {/* The honest denominator: 14 advancing is 14 of the 49 that TRADED, not
          of the 103 listed. The reference has no slot for this; the card has
          room for it and the previous pass was right to add it. */}
      <p className="hm-breadth-denom">
        <bdi>{b.traded}</bdi> شركة متداولة
        {b.listed != null ? <> من <bdi>{b.listed}</bdi> مدرجة</> : null}
      </p>
    </article>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Market activity — `.home-activity-card`
   ═══════════════════════════════════════════════════════════════════════════

   The reference composition: a 1.2fr/1fr grid whose first column is one tall
   Electric-Blue FEATURE tile and whose second is two small light tiles, each
   with a label, a value, a unit, a signed change and a sparkline bled to the
   tile's bottom edge. The previous pass rendered a neutral 2×2 with dead
   vertical space; this is the approved block.

   ⚠ REAL-DATA · three tiles, not four. The reference has exactly three and the
   grid geometry is built on that. «شركات متداولة» — the previous pass's fourth
   — is not dropped: it is the breadth card's denominator line, where it says
   more. The change and the trend on each tile are real, computed against the
   prior sessions of `daily_index`.
   ═══════════════════════════════════════════════════════════════════════════ */

type Metric = { label: string; unit: string; pick: (r: IndexRow) => number | null; fmt: (n: number) => string }

const METRICS: Metric[] = [
  { label: 'قيمة التداول', unit: 'IQD', pick: (r) => r.total_value, fmt: (n) => compact.format(n) },
  { label: 'حجم التداول', unit: 'سهم', pick: (r) => r.total_volume, fmt: (n) => compact.format(n) },
  { label: 'الصفقات', unit: 'صفقة', pick: (r) => r.total_trades, fmt: (n) => nf.format(n) },
]

export function ActivityCard({ rows }: { rows: IndexRow[] }) {
  const items = useMemo(() => METRICS.map((m) => {
    const series = rows.map(m.pick).filter((v): v is number => v != null)
    const trend = series.slice(-7)
    const now = rows.length ? m.pick(rows[rows.length - 1]) : null
    const before = rows.length > 1 ? m.pick(rows[rows.length - 2]) : null
    const change = now != null && before ? ((now - before) / before) * 100 : null
    return { ...m, now, change, trend }
  }), [rows])

  return (
    <section className="hm-activity" aria-labelledby="hm-act-t">
      <header>
        <span>جلسة السوق</span>
        <h2 id="hm-act-t">نشاط السوق</h2>
      </header>
      {items.map((it, i) => (
        <article className={i === 0 ? 'feature' : ''} key={it.label}>
          <span>{it.label}</span>
          <strong>
            {it.now == null ? <Unavailable /> : <bdi>{it.fmt(it.now)}</bdi>}
            <small>{it.unit}</small>
          </strong>
          {it.change == null ? (
            <em className="hm-na"><Unavailable why="لا توجد جلسة سابقة للمقارنة" /></em>
          ) : (
            <em className={signed(it.change, 1).tone === 'up' ? 'positive' : signed(it.change, 1).tone === 'down' ? 'negative' : ''}>
              <bdi>{signed(it.change, 1).text}</bdi>
            </em>
          )}
          {it.trend.length > 1
            ? <Sparkline values={it.trend} positive={(it.change ?? 0) >= 0} compact label={`اتجاه ${it.label}`} />
            : null}
        </article>
      ))}
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Sector performance — `.home-sectors-card`
   ═══════════════════════════════════════════════════════════════════════════

   The reference rows, verbatim: a 130px name column, a 4px track, a 62px
   signed figure, one per line, sorted by change descending, each row a link
   into the heatmap filtered on that sector, with the un-hovered rows stepping
   back rather than the hovered one lighting up.

   Two notes:

   · The reference's track renders INVISIBLE in the running app. Its CSS says
     `.sector-bars > div > div { block-size: 4px; … background: #e1e3e0 }`, and
     the interactivity pass changed each row from `<div>` to `<a>` without
     restating it — so the selector stopped matching and the bars silently
     went to zero height. The declaration is the approved intent and it is
     ported here; a sector-performance module with no bars is the bug, not the
     design. Flagged in the completion report.

   · The bar's full scale is the reference's: |change| against 2.5%, floored at
     9% so a flat sector still reads as a row. Real ISX sector moves sit in the
     same band, so the mapping carries across unchanged.
   ═══════════════════════════════════════════════════════════════════════════ */

export function SectorsCard({ sectors }: { sectors: SectorMove[] }) {
  const [focus, setFocus] = useState<string | null>(null)
  if (!sectors.length) return null
  const ranked = [...sectors].sort((a, b) => b.pct - a.pct)

  return (
    <section className="hm-sectors" aria-labelledby="hm-sec-t">
      <header>
        <div>
          <span>أداء القطاعات</span>
          <h2 id="hm-sec-t">حركة السوق حسب القطاع</h2>
        </div>
        <Link href="/heatmap">الخريطة الكاملة ↗</Link>
      </header>
      <div className={`hm-sector-bars${focus ? ' is-focused' : ''}`}>
        {ranked.map((s) => (
          <Link key={s.id} href={`/heatmap?sector=${encodeURIComponent(s.id)}`}
            className={focus === s.id ? 'is-on' : ''}
            onPointerEnter={() => setFocus(s.id)} onPointerLeave={() => setFocus(null)}
            onFocus={() => setFocus(s.id)} onBlur={() => setFocus(null)}
            aria-label={`${s.label}، ${s.pct >= 0 ? 'ارتفاع' : 'انخفاض'} ${Math.abs(s.pct).toFixed(2)} بالمئة`}>
            <span>{s.label}</span>
            <div>
              <i className={signed(s.pct).tone === 'down' ? 'negative' : ''}
                style={{ inlineSize: `${Math.min(100, Math.max(9, (Math.abs(s.pct) / 2.5) * 100))}%` }} />
            </div>
            <bdi className={signed(s.pct).tone === 'up' ? 'positive' : signed(s.pct).tone === 'down' ? 'negative' : ''}>
              {signed(s.pct).text}
            </bdi>
          </Link>
        ))}
      </div>
    </section>
  )
}

export { Freshness }
