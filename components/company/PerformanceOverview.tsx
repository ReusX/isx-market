'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/context/AppContext'
import { arDate } from '@/lib/date'

type Pt = { t: number; v: number }
const DAY = 86400_000
const ISX60_REBASE = '2015-03-05' // ISX60 rebased here; earlier values are off-scale

type Returns = { asOf: number; ytd: number | null; y1: number | null; y3: number | null; y5: number | null }

// Trailing price returns: latest close ÷ close at/just-before the window start − 1.
function buildReturns(series: Pt[]): Returns | null {
  if (series.length < 2) return null
  const last = series[series.length - 1]
  const at = (target: number): number | null => {
    let r: number | null = null
    for (const p of series) { if (p.t <= target) r = p.v; else break }
    return r
  }
  const ret = (base: number | null) => (base && base > 0 ? last.v / base - 1 : null)
  const y = new Date(last.t).getUTCFullYear()
  return {
    asOf: last.t,
    ytd: ret(at(Date.UTC(y, 0, 1))),       // last close of previous year
    y1:  ret(at(last.t - 365 * DAY)),
    y3:  ret(at(last.t - 3 * 365 * DAY)),
    y5:  ret(at(last.t - 5 * 365 * DAY)),
  }
}

export default function PerformanceOverview({ sym }: { sym: string }) {
  const { lang } = useApp()
  const ar = lang === 'ar'
  const [co, setCo]   = useState<Returns | null>(null)
  const [bm, setBm]   = useState<Returns | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const sb = createClient()
      // Company price history (cached server route) + ISX60 benchmark
      const [coRes, idxRows] = await Promise.all([
        fetch(`/api/chart/${sym}`).then(r => r.json()).catch(() => []),
        (async () => {
          const rows: { date: string; isx60: number }[] = []
          const PAGE = 1000
          let from = 0
          while (true) {
            const { data } = await sb
              .from('daily_index').select('date,isx60')
              .not('isx60', 'is', null).gte('date', ISX60_REBASE)
              .order('date').range(from, from + PAGE - 1)
            if (!data?.length) break
            rows.push(...(data as any))
            if (data.length < PAGE) break
            from += PAGE
          }
          return rows
        })(),
      ])
      if (cancelled) return
      const coSeries: Pt[] = (Array.isArray(coRes) ? coRes : [])
        .filter((r: any) => r.close != null && r.close > 0)
        .map((r: any) => ({ t: Date.parse(r.date + 'T00:00:00Z'), v: r.close }))
      const bmSeries: Pt[] = idxRows.map(r => ({ t: Date.parse(r.date + 'T00:00:00Z'), v: r.isx60 }))
      setCo(buildReturns(coSeries))
      setBm(buildReturns(bmSeries))
      setReady(true)
    })()
    return () => { cancelled = true }
  }, [sym])

  if (!ready || !co) return null

  // ar-IQ renders Arabic-Indic digits and Iraqi month names; the design
  // writes 23 يوليو 2026 in Latin digits like the rest of the site.
  const asOf = ar
    ? arDate(new Date(co.asOf).toISOString().slice(0, 10))
    : new Date(co.asOf).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const cards: { label: string; co: number | null; bm: number | null }[] = [
    { label: ar ? 'عائد هذا العام' : 'YTD Return',    co: co.ytd, bm: bm?.ytd ?? null },
    { label: ar ? 'عائد سنة'       : '1-Year Return', co: co.y1,  bm: bm?.y1 ?? null },
    { label: ar ? 'عائد 3 سنوات'   : '3-Year Return', co: co.y3,  bm: bm?.y3 ?? null },
    { label: ar ? 'عائد 5 سنوات'   : '5-Year Return', co: co.y5,  bm: bm?.y5 ?? null },
  ]

  const Pct = ({ v }: { v: number | null }) => {
    if (v == null) return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 17, fontWeight: 800, color: 'var(--ink4)' }}>·</span>
    const up = v >= 0
    return (
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 17, fontWeight: 800, color: up ? 'var(--up)' : 'var(--dn)' }}>
        {up ? '+ ' : '− '}{Math.abs(v * 100).toFixed(2)}%
      </span>
    )
  }

  return (
    <section dir={ar ? 'rtl' : 'ltr'} style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px', color: 'var(--ink)' }}>
        {ar ? 'نظرة عامة على الأداء' : 'Performance Overview'}
      </h2>
      <p style={{ fontSize: 13, color: 'var(--ink4)', margin: '0 0 16px', lineHeight: 1.6 }}>
        {ar
          ? <>إجمالي العوائد السعرية حتى {asOf}. المؤشر المرجعي هو <span style={{ color: 'var(--brand)', fontWeight: 700 }}>مؤشر ISX60</span>.</>
          : <>Trailing price returns as of {asOf}. Benchmark is <span style={{ color: 'var(--brand)', fontWeight: 700 }}>ISX60 Index</span>.</>}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        {cards.map(c => (
          <div key={c.label} style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', marginBottom: 14 }}>{c.label}</div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--ink4)', fontWeight: 600, marginBottom: 4 }}>{sym.toUpperCase()}</div>
                <Pct v={c.co} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--ink4)', fontWeight: 600, marginBottom: 4 }}>{ar ? 'مؤشر ISX60' : 'ISX60'}</div>
                <Pct v={c.bm} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
