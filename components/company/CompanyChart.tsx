'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { useApp } from '@/context/AppContext'
import { ChartEngine } from '@/components/design/ChartEngine'
import { toBars, hasFullOhlc, hasAnyVolume, type ChartRow } from '@/lib/chartData'
import '@/styles/chart-engine.css'

/**
 * The company price chart — the approved ChartEngine on real history.
 *
 * The engine takes its theme as a prop rather than reading the DOM, so it is
 * wired to the app's single theme system through `useApp()`. It repaints on
 * the prop change, which is what makes a light/dark switch work without a
 * reload.
 *
 * The history is still fetched lazily and still code-split: a full series is
 * up to ~3,000 rows and the chart sits below the fold. What changed is the
 * fallback shape — the placeholder reserves the engine's own height so the
 * page does not jump when the series lands.
 */

const SKELETON_H = 420

function Skeleton() {
  return <div className="cd-chart-skeleton" style={{ blockSize: SKELETON_H }} aria-hidden="true"><i /></div>
}

export function CompanyChart({ sym, name, compact = true }: { sym: string; name?: string; compact?: boolean }) {
  const { t: T } = useLocale()
  const ce = T.chart.index
  const { theme } = useApp()
  const hostRef = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)
  const [rows, setRows] = useState<ChartRow[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (near || !hostRef.current) return
    const io = new IntersectionObserver(
      es => { if (es.some(e => e.isIntersecting)) { setNear(true); io.disconnect() } },
      { rootMargin: '400px' },
    )
    io.observe(hostRef.current)
    return () => io.disconnect()
  }, [near])

  useEffect(() => {
    if (!near) return
    let alive = true
    setRows(null); setFailed(false)
    ;(async () => {
      try {
        const res = await fetch(`/api/chart/${sym}`)
        if (!res.ok) throw new Error(String(res.status))
        const data = (await res.json()) as ChartRow[]
        if (alive) setRows(Array.isArray(data) ? data : [])
      } catch {
        if (alive) setFailed(true)
      }
    })()
    return () => { alive = false }
  }, [near, sym])

  const bars = useMemo(() => (rows ? toBars(rows) : []), [rows])
  const ohlc = useMemo(() => (rows ? hasFullOhlc(rows) : true), [rows])
  const vol = useMemo(() => (rows ? hasAnyVolume(rows) : true), [rows])

  return (
    <div ref={hostRef}>
      {failed ? (
        <div className="cd-chart-fail" role="alert">
          <span className="mv-error-mark" aria-hidden="true">!</span>
          <div>
            <strong>{ce.chartLoadFailed}</strong>
            <p>{ce.chartLoadFailedNote}</p>
          </div>
          <button type="button" onClick={() => { setNear(false); setTimeout(() => setNear(true), 0) }}>
            {ce.retry}
          </button>
        </div>
      ) : !rows ? (
        <Skeleton />
      ) : bars.length > 2 ? (
        <>
          <ChartEngine
            bars={bars}
            symbol={sym}
            name={name ?? sym}
            theme={theme === 'dark' ? 'dark' : 'light'}
            hasOhlc={ohlc}
            hasVolume={vol}
            compactMode={compact}
          />
          {/* Screen readers are not asked to interpret canvas pixels. */}
          <p className="sr-only">
            {ce.srDescription(
              name ?? sym, sym,
              bars[0] ? new Date(bars[0].t).toISOString().slice(0, 10) : '',
              bars[bars.length - 1] ? new Date(bars[bars.length - 1].t).toISOString().slice(0, 10) : '',
              String(bars.length), String(bars[bars.length - 1]?.c ?? ''),
            )}
          </p>
        </>
      ) : (
        <div className="cd-chart-empty">
          <strong>{ce.notEnoughTitle}</strong>
          <p>{ce.notEnoughNote}</p>
        </div>
      )}
    </div>
  )
}
