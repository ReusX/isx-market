'use client'

import { useState } from 'react'
import { GRAIN_LABEL, iqd, nf0, shortAxis, type Bucket, type Grain, type MetricId } from '@/lib/statistics'

/**
 * The activity chart — columns, SVG, no library.
 *
 * §14 asks for the reference's chart type and geometry and forbids a
 * heavyweight library unless one is necessary. One is not: this is a column
 * series with a value axis, and ~120 rects of SVG do it at a fraction of the
 * bundle a charting package costs.
 *
 * ── The one rule that shaped it ───────────────────────────────────────────
 * A bucket with no observation is a GAP, never a zero column. `daily_index`
 * has 59 sessions since the rebase with a null `total_trades`, and drawing
 * those as zero would invent 59 days on which the exchange recorded no
 * transactions. A null bucket draws nothing and is announced in the footer;
 * a bucket that is only PARTLY covered still draws, and its tooltip says how
 * many of its sessions were missing.
 */

const W = 900
const H = 320
/* The value axis sits on the RIGHT, matching the reference: on an RTL page the
   eye starts there, and the reference's own plot puts its gutter on that side.
   The time axis still runs oldest-left to newest-right, because the series is
   drawn in an unmirrored SVG coordinate space. */
const PAD = { top: 14, right: 62, bottom: 26, left: 8 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

/** Round the axis top to 1/2/5 × 10ⁿ so the labels read in human numbers. */
function niceMax(v: number): number {
  if (v <= 0) return 1
  const mag = 10 ** Math.floor(Math.log10(v))
  const n = v / mag
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag
}

export function StatChart({
  buckets, metric, grain, ar, label,
}: {
  buckets: Bucket[]
  metric: MetricId
  grain: Grain
  ar: boolean
  label: string
}) {
  const [hover, setHover] = useState<number | null>(null)

  const vals = buckets.map((b) => b[metric])
  const observed = vals.filter((v): v is number => v != null)
  const max = niceMax(Math.max(...observed, 0))
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max)

  const n = buckets.length || 1
  const slot = PLOT_W / n
  const barW = Math.max(1, Math.min(slot * 0.72, 26))
  const fmt = (v: number) => (metric === 'value' ? iqd(v) : nf0.format(v))

  // Six axis labels at most; more than that and they collide at any width.
  const step = Math.max(1, Math.ceil(n / 6))
  const gaps = buckets.filter((b) => b[metric] == null).length
  const partial = buckets.filter((b) => b[metric] != null && b.missing > 0).length

  const active = hover != null ? buckets[hover] : null
  const activeVal = active ? active[metric] : null

  return (
    <figure className="stw-plot">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img"
        aria-label={`${label} · ${ar ? GRAIN_LABEL[grain].ar : GRAIN_LABEL[grain].en}`}
        onPointerLeave={() => setHover(null)}>
        {ticks.map((t, i) => {
          const y = PAD.top + PLOT_H - (t / max) * PLOT_H
          return <line className="stw-grid" key={i} x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} />
        })}

        {buckets.map((b, i) => {
          const v = b[metric]
          // A null bucket renders NOTHING — the gap is the statement.
          if (v == null) return null
          const h = Math.max(1, (v / max) * PLOT_H)
          const x = PAD.left + i * slot + (slot - barW) / 2
          return (
            <rect key={b.key}
              className={`stw-col${hover === i ? ' is-on' : ''}${b.missing > 0 ? ' is-partial' : ''}`}
              x={x} y={PAD.top + PLOT_H - h} width={barW} height={h} rx={barW > 6 ? 2 : 0}
              onPointerEnter={() => setHover(i)} />
          )
        })}

        <line className="stw-base" x1={PAD.left} x2={W - PAD.right}
          y1={PAD.top + PLOT_H} y2={PAD.top + PLOT_H} />
      </svg>

      {/* Labels live in HTML, not SVG. The plot stretches with
          `preserveAspectRatio: none` so an explicit height survives a 375px
          screen, and any text drawn inside the viewBox would stretch with it. */}
      <div className="stw-axis-y" aria-hidden="true">
        {ticks.map((t, i) => (
          <span key={i} style={{ top: `${((PAD.top + PLOT_H - (t / max) * PLOT_H) / H) * 100}%` }}>
            {fmt(t)}
          </span>
        ))}
      </div>
      <div className="stw-axis-x" aria-hidden="true">
        {buckets.map((b, i) => i % step === 0 ? (
          <span key={b.key} style={{ left: `${((PAD.left + i * slot + slot / 2) / W) * 100}%` }}>
            {shortAxis(b.key, grain)}
          </span>
        ) : null)}
      </div>

      {active ? (
        <div className="stw-tip" style={{
          left: `${((PAD.left + (hover! + 0.5) * slot) / W) * 100}%`,
        }}>
          <strong><bdi>{activeVal == null ? '—' : fmt(activeVal)}</bdi></strong>
          <span>{active.from === active.to ? active.from : `${active.from} → ${active.to}`}</span>
          {active.missing > 0 ? (
            <em>{ar
              ? `${active.missing} من ${active.n} جلسة بلا قياس`
              : `${active.missing} of ${active.n} sessions unmeasured`}</em>
          ) : null}
        </div>
      ) : null}

      <figcaption className="stw-plot-foot">
        <span>{ar ? GRAIN_LABEL[grain].ar : GRAIN_LABEL[grain].en}</span>
        {gaps > 0 || partial > 0 ? (
          <span className="stw-plot-gaps">
            {ar
              ? `${gaps > 0 ? `${gaps} فترة بلا قياس · ` : ''}${partial > 0 ? `${partial} فترة ناقصة` : ''}`
              : `${gaps > 0 ? `${gaps} with no observation · ` : ''}${partial > 0 ? `${partial} partly covered` : ''}`}
          </span>
        ) : null}
      </figcaption>
    </figure>
  )
}
