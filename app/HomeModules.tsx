'use client'

import Link from 'next/link'
import type { Breadth, Flow, SectorMove } from '@/lib/homeData'
import { Unavailable, Freshness } from '@/components/system/DataStates'

const nf = new Intl.NumberFormat('en-US')
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })

/** Traded value in IQD, compact. `—` when we have no figure at all. */
export function IQD({ v }: { v: number | null | undefined }) {
  if (v == null) return <Unavailable />
  return <bdi className="ty-num">{compact.format(v)} IQD</bdi>
}

/* ── Market breadth · FOUR categories ──────────────────────────────────────
   The fourth is the point. A company with no valid prior close has an unknown
   change; counting it as «ثابت» asserts something about the market that is not
   in the data. The denominator is stated too — 14 advancing means 14 of the 49
   that traded, not of the 103 listed. */
export function BreadthCard({ b }: { b: Breadth | null }) {
  if (!b) return null
  const rows: { key: string; label: string; n: number; cls: string }[] = [
    { key: 'up', label: 'رابح', n: b.advancing, cls: 'is-up' },
    { key: 'dn', label: 'خاسر', n: b.declining, cls: 'is-down' },
    { key: 'fl', label: 'ثابت', n: b.unchanged, cls: 'is-flat' },
    { key: 'na', label: 'دون إغلاق سابق', n: b.unavailable, cls: 'is-na' },
  ]
  const total = b.traded || 1

  return (
    <article className="hm-card hm-breadth" aria-labelledby="hm-breadth-t">
      <header className="hm-card-head">
        <span className="ty-label">اتساع السوق</span>
        <h2 id="hm-breadth-t" className="ty-section-title">الرابحون والخاسرون</h2>
      </header>

      {/* A stacked bar, not a ring: four categories read more clearly as
          proportions of one line than as arcs, and it degrades to a list. */}
      <div className="hm-breadth-bar" role="img"
        aria-label={`${b.advancing} رابح، ${b.declining} خاسر، ${b.unchanged} ثابت، ${b.unavailable} دون إغلاق سابق، من ${b.traded} شركة متداولة`}>
        {rows.filter((r) => r.n > 0).map((r) => (
          <i key={r.key} className={r.cls} style={{ inlineSize: `${(r.n / total) * 100}%` }} />
        ))}
      </div>

      <dl className="hm-breadth-legend">
        {rows.map((r) => (
          <div key={r.key} className={r.cls}>
            <dt><i aria-hidden="true" />{r.label}</dt>
            <dd><bdi className="ty-num">{r.n}</bdi></dd>
          </div>
        ))}
      </dl>

      <p className="hm-breadth-denom ty-meta">
        <bdi>{b.traded}</bdi> شركة متداولة
        {b.listed != null ? <> من <bdi>{b.listed}</bdi> مدرجة</> : null}
      </p>
    </article>
  )
}

/* ── Market activity ───────────────────────────────────────────────────────
   Only metrics the source actually carries. A missing metric renders `—`; it
   is never backfilled with 0, because 0 is a measurement. */
export function ActivityCard({
  value, volume, trades, tradedCompanies,
}: {
  value: number | null
  volume: number | null
  trades: number | null
  tradedCompanies: number | null
}) {
  const items = [
    { label: 'قيمة التداول', node: <IQD v={value} /> },
    { label: 'حجم التداول', node: volume == null ? <Unavailable /> : <bdi className="ty-num">{compact.format(volume)} سهم</bdi> },
    { label: 'الصفقات', node: trades == null ? <Unavailable /> : <bdi className="ty-num">{nf.format(trades)}</bdi> },
    { label: 'شركات متداولة', node: tradedCompanies == null ? <Unavailable /> : <bdi className="ty-num">{tradedCompanies}</bdi> },
  ]
  return (
    <article className="hm-card hm-activity" aria-labelledby="hm-act-t">
      <header className="hm-card-head">
        <span className="ty-label">الجلسة</span>
        <h2 id="hm-act-t" className="ty-section-title">نشاط السوق</h2>
      </header>
      <dl className="hm-act-grid">
        {items.map((i) => (
          <div key={i.label}>
            <dt className="ty-meta">{i.label}</dt>
            <dd>{i.node}</dd>
          </div>
        ))}
      </dl>
    </article>
  )
}

/* ── Foreign flow ──────────────────────────────────────────────────────────
   Real, reconciled values. The proportional bar shows buy against sell for the
   same session, and the CTA is an explicit link with its own hit area — the
   card is NOT wholly clickable, so there is no nested-click conflict. */
export function FlowCard({ flow, sessionLabel }: { flow: Flow | null; sessionLabel: string }) {
  return (
    <article className="hm-card hm-flow" aria-labelledby="hm-flow-t">
      <span className="hm-flow-mark" aria-hidden="true">iraqsm.com</span>

      <header className="hm-card-head">
        <div>
          <span className="ty-label">جلسة {sessionLabel}</span>
          <h2 id="hm-flow-t" className="ty-section-title">تدفق المستثمر الأجنبي</h2>
        </div>
        <Link className="hm-flow-cta" href="/statistics/foreign-flow">
          التفاصيل <span aria-hidden="true">↗</span>
        </Link>
      </header>

      {!flow ? (
        <p className="ty-body">لا تتوفر بيانات تدفق لهذه الجلسة.</p>
      ) : (
        <>
          <div className="hm-flow-net">
            <span className="ty-meta">صافي التدفق</span>
            <strong className={`ty-metric ${flow.net > 0 ? 'ds-up' : flow.net < 0 ? 'ds-down' : ''}`}>
              <bdi>{flow.net > 0 ? '+' : flow.net < 0 ? '−' : ''}{compact.format(Math.abs(flow.net))} IQD</bdi>
            </strong>
          </div>

          <div className="hm-flow-bar"
            role="img"
            aria-label={`شراء ${flow.buyShare.toFixed(1)} بالمئة، بيع ${flow.sellShare.toFixed(1)} بالمئة`}>
            <i className="is-buy" style={{ inlineSize: `${flow.buyShare}%` }} />
            <i className="is-sell" style={{ inlineSize: `${flow.sellShare}%` }} />
          </div>

          <dl className="hm-flow-legend">
            <div className="is-buy">
              <dt><i aria-hidden="true" />شراء أجنبي</dt>
              <dd><IQD v={flow.buy} /> <small className="ty-meta"><bdi>{flow.buyShare.toFixed(1)}%</bdi></small></dd>
            </div>
            <div className="is-sell">
              <dt><i aria-hidden="true" />بيع أجنبي</dt>
              <dd><IQD v={flow.sell} /> <small className="ty-meta"><bdi>{flow.sellShare.toFixed(1)}%</bdi></small></dd>
            </div>
          </dl>
        </>
      )}
    </article>
  )
}

/* ── Sector movement ───────────────────────────────────────────────────────
   Market-cap-weighted change per sector, from real prices. No composite score,
   no invented index. */
export function SectorsCard({ sectors }: { sectors: SectorMove[] }) {
  if (!sectors.length) return null
  const max = Math.max(...sectors.map((s) => Math.abs(s.pct)), 0.01)
  return (
    <article className="hm-card hm-sectors" aria-labelledby="hm-sec-t">
      <header className="hm-card-head">
        <div>
          <span className="ty-label">أداء القطاعات</span>
          <h2 id="hm-sec-t" className="ty-section-title">حركة السوق حسب القطاع</h2>
        </div>
        <Link className="hm-more" href="/heatmap">الخريطة الكاملة <span aria-hidden="true">↗</span></Link>
      </header>
      <ul className="hm-sec-list">
        {sectors.map((s) => (
          <li key={s.id}>
            <span className="hm-sec-name">{s.label}</span>
            <span className="hm-sec-track" aria-hidden="true">
              <i className={s.pct >= 0 ? 'is-up' : 'is-down'}
                style={{ inlineSize: `${(Math.abs(s.pct) / max) * 100}%` }} />
            </span>
            <bdi className={`ty-num ${s.pct > 0 ? 'ds-up' : s.pct < 0 ? 'ds-down' : 'ds-flat'}`}>
              {s.pct > 0 ? '+' : s.pct < 0 ? '−' : ''}{Math.abs(s.pct).toFixed(2)}%
            </bdi>
          </li>
        ))}
      </ul>
    </article>
  )
}

export { Freshness }
