'use client'

import { useEffect, useMemo, useState } from 'react'
import DailyForeignFlow from './DailyForeignFlow'
import OwnershipPanel, { type OwnRow } from './OwnershipPanel'
import MajorShareholdersPanel, { type ShareRow } from './MajorShareholdersPanel'

// ── Types ─────────────────────────────────────────────────────────────────────
type FlowRow   = { year: number; month: number; side: 'buy' | 'sell'; value: number | null }
type SectorRow = { year: number; month: number; sector: string; side: string; value: number | null }

// ── Helpers ───────────────────────────────────────────────────────────────────
const monthKey = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`
const arMonth  = ['', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

function fmtIQD(v: number): string {
  const a = Math.abs(v)
  if (a >= 1e12) return (v / 1e12).toFixed(2) + 'T'
  if (a >= 1e9)  return (v / 1e9).toFixed(2) + 'B'
  if (a >= 1e6)  return (v / 1e6).toFixed(1) + 'M'
  if (a >= 1e3)  return (v / 1e3).toFixed(0) + 'K'
  return v.toFixed(0)
}

const SECTOR_AR: Record<string, string> = {
  Banks: 'المصارف', Banking: 'المصارف', Industry: 'الصناعة', Services: 'الخدمات',
  Hotels: 'الفنادق', 'Hotels and Tourism': 'السياحة والفنادق', Telecommunication: 'الاتصالات',
  Agriculture: 'الزراعة', Insurance: 'التأمين', Investment: 'الاستثمار',
}
const KNOWN_SECTORS = new Set(Object.keys(SECTOR_AR))

// ── Panel shell ───────────────────────────────────────────────────────────────
function Panel({ title, subtitle, badge, children }: {
  title: string; subtitle?: string; badge?: string; children: React.ReactNode
}) {
  return (
    <div style={{
      background: 'var(--surf)', border: '1px solid var(--line)',
      borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column',
      minHeight: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 2 }}>{subtitle}</div>}
        </div>
        {badge && (
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
            background: 'var(--badge, #266EC3)', color: '#fff', whiteSpace: 'nowrap',
          }}>{badge}</span>
        )}
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  )
}

function Soon({ note }: { note: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', minHeight: 160, gap: 8, textAlign: 'center',
      border: '1px dashed var(--line2)', borderRadius: 10, padding: 20,
    }}>
      <div style={{ fontSize: 22, opacity: 0.4 }}>⏳</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink3)' }}>قيد المعالجة</div>
      <div style={{ fontSize: 11, color: 'var(--ink4)', maxWidth: 260, lineHeight: 1.6 }}>{note}</div>
    </div>
  )
}

// ── 1. Foreign flow — monthly net bars ────────────────────────────────────────
// Small segmented control used by the interactive panels
function Seg<T extends string | number>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: [T, string][]
}) {
  return (
    <div style={{ display: 'inline-flex', background: 'var(--surf2)', borderRadius: 7, padding: 2, gap: 2 }}>
      {options.map(([v, label]) => {
        const on = v === value
        return (
          <button key={String(v)} onClick={() => onChange(v)} style={{
            border: 'none', borderRadius: 5, padding: '4px 10px', fontSize: 11, fontWeight: 700,
            cursor: 'pointer', whiteSpace: 'nowrap',
            background: on ? 'var(--brand)' : 'transparent',
            color: on ? '#fff' : 'var(--ink3)',
          }}>{label}</button>
        )
      })}
    </div>
  )
}

function ForeignFlowChart({ rows }: { rows: FlowRow[] }) {
  const [range, setRange] = useState<number>(12)
  const [mode,  setMode]  = useState<'net' | 'split'>('net')
  const [hover, setHover] = useState<number | null>(null)

  const all = useMemo(() => {
    const byMonth = new Map<string, { buy: number; sell: number; y: number; m: number }>()
    for (const r of rows) {
      const k = monthKey(r.year, r.month)
      const e = byMonth.get(k) ?? { buy: 0, sell: 0, y: r.year, m: r.month }
      e[r.side] += r.value ?? 0
      byMonth.set(k, e)
    }
    return Array.from(byMonth.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => ({ k, buy: v.buy, sell: v.sell, net: v.buy - v.sell, y: v.y, m: v.m }))
  }, [rows])

  if (!all.length) return <Soon note="لا توجد بيانات تدفق." />

  const series  = range >= 999 ? all : all.slice(-range)
  const maxAbs  = Math.max(...series.map(s => mode === 'net' ? Math.abs(s.net) : Math.max(s.buy, s.sell)), 1)
  const totNet  = series.reduce((a, s) => a + s.net, 0)
  const hv      = hover != null ? series[hover] : null
  const gap     = series.length > 24 ? 1 : series.length > 14 ? 2 : 4
  const labelEvery = Math.ceil(series.length / 12)

  return (
    <div>
      {/* controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <Seg value={mode}  onChange={setMode}  options={[['net', 'صافي'], ['split', 'شراء/بيع']]} />
        <Seg value={range} onChange={setRange} options={[[12, 'سنة'], [24, 'سنتان'], [999, 'الكل']]} />
      </div>

      {/* period summary / live readout */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10, minHeight: 34 }}>
        {hv ? (
          <>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>{arMonth[hv.m]} {hv.y}</span>
            <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-mono)', color: hv.net >= 0 ? 'var(--up)' : 'var(--dn)' }}>
              {hv.net >= 0 ? '+' : '−'}{fmtIQD(Math.abs(hv.net))}
            </span>
            <span style={{ fontSize: 11, color: 'var(--ink4)', fontFamily: 'var(--font-mono)' }}>
              شراء {fmtIQD(hv.buy)} · بيع {fmtIQD(hv.sell)}
            </span>
          </>
        ) : (
          <>
            <span style={{ fontSize: 11, color: 'var(--ink4)' }}>صافي التدفق للفترة</span>
            <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-mono)', color: totNet >= 0 ? 'var(--up)' : 'var(--dn)' }}>
              {totNet >= 0 ? '+' : '−'}{fmtIQD(Math.abs(totNet))}
            </span>
            <span style={{ fontSize: 10, color: 'var(--ink4)' }}>دينار</span>
          </>
        )}
      </div>

      {/* chart */}
      <div style={{ position: 'relative', height: 190, display: 'flex', alignItems: 'stretch', gap }}
        onMouseLeave={() => setHover(null)}>
        <div style={{ position: 'absolute', insetInline: 0, top: '50%', height: 1, background: 'var(--line2)' }} />
        {series.map((s, i) => {
          const active = hover === i
          if (mode === 'net') {
            const up = s.net >= 0
            const h = (Math.abs(s.net) / maxAbs) * 100
            const col = up ? 'var(--up)' : 'var(--dn)'
            return (
              <div key={s.k} onMouseEnter={() => setHover(i)}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, cursor: 'pointer',
                  background: active ? 'var(--surf2)' : 'transparent', borderRadius: 4 }}>
                <div style={{ height: '50%', display: 'flex', alignItems: 'flex-end' }}>
                  {up && <div style={{ width: '72%', margin: '0 auto', height: `${h}%`, background: col, borderRadius: '3px 3px 0 0', opacity: active ? 1 : 0.85 }} />}
                </div>
                <div style={{ height: '50%', display: 'flex', alignItems: 'flex-start' }}>
                  {!up && <div style={{ width: '72%', margin: '0 auto', height: `${h}%`, background: col, borderRadius: '0 0 3px 3px', opacity: active ? 1 : 0.85 }} />}
                </div>
              </div>
            )
          }
          // split: buy up (green), sell down (red) — tug of war
          const bh = (s.buy  / maxAbs) * 100
          const sh = (s.sell / maxAbs) * 100
          return (
            <div key={s.k} onMouseEnter={() => setHover(i)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, cursor: 'pointer',
                background: active ? 'var(--surf2)' : 'transparent', borderRadius: 4 }}>
              <div style={{ height: '50%', display: 'flex', alignItems: 'flex-end' }}>
                <div style={{ width: '72%', margin: '0 auto', height: `${bh}%`, background: 'var(--up)', borderRadius: '3px 3px 0 0', opacity: active ? 1 : 0.8 }} />
              </div>
              <div style={{ height: '50%', display: 'flex', alignItems: 'flex-start' }}>
                <div style={{ width: '72%', margin: '0 auto', height: `${sh}%`, background: 'var(--dn)', borderRadius: '0 0 3px 3px', opacity: active ? 1 : 0.8 }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* x labels */}
      <div style={{ display: 'flex', gap, marginTop: 6 }}>
        {series.map((s, i) => (
          <div key={s.k} style={{ flex: 1, textAlign: 'center', fontSize: 8, color: hover === i ? 'var(--ink2)' : 'var(--ink4)', minWidth: 0, fontFamily: 'var(--font-mono)' }}>
            {i % labelEvery === 0 ? `${s.m}/${String(s.y).slice(2)}` : ''}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 11 }}>
        <span style={{ color: 'var(--up)' }}>■ {mode === 'net' ? 'صافي شراء أجنبي' : 'شراء أجنبي'}</span>
        <span style={{ color: 'var(--dn)' }}>■ {mode === 'net' ? 'صافي بيع أجنبي' : 'بيع أجنبي'}</span>
      </div>
    </div>
  )
}

// ── 2. Sector rotation — horizontal bars ──────────────────────────────────────
function SectorRotation({ rows }: { rows: SectorRow[] }) {
  const [side,  setSide]  = useState<'buy' | 'sell'>('buy')
  const [mk,    setMk]    = useState<string | null>(null)
  const [hover, setHover] = useState<string | null>(null)

  // per-month sector aggregates for the selected side (known sectors only)
  const byMonth = useMemo(() => {
    const map = new Map<string, Map<string, number>>()
    for (const r of rows) {
      if (r.side !== side || !KNOWN_SECTORS.has(r.sector)) continue
      const k = monthKey(r.year, r.month)
      const sm = map.get(k) ?? new Map<string, number>()
      sm.set(r.sector, (sm.get(r.sector) ?? 0) + (r.value ?? 0))
      map.set(k, sm)
    }
    return map
  }, [rows, side])

  const months = useMemo(() => Array.from(byMonth.keys()).sort(), [byMonth])
  if (!months.length) return <Soon note="لا توجد بيانات قطاعية نظيفة." />

  const cur = (mk && byMonth.has(mk)) ? mk : months[months.length - 1]
  const idx = months.indexOf(cur)
  const [y, m] = cur.split('-').map(Number)
  const data  = Array.from(byMonth.get(cur)!.entries()).sort((a, b) => b[1] - a[1])
  const max   = Math.max(...data.map(d => d[1]), 1)
  const total = data.reduce((s, d) => s + d[1], 0)
  const col   = side === 'buy' ? 'var(--up)' : 'var(--dn)'

  const step = (d: number) => { const n = idx + d; if (n >= 0 && n < months.length) setMk(months[n]) }
  const arrow = (label: string, d: number, disabled: boolean) => (
    <button onClick={() => step(d)} disabled={disabled} style={{
      border: 'none', background: 'var(--surf2)', color: disabled ? 'var(--ink5)' : 'var(--ink2)',
      borderRadius: 6, width: 24, height: 22, fontSize: 13, cursor: disabled ? 'default' : 'pointer',
    }}>{label}</button>
  )

  return (
    <div>
      {/* controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <Seg value={side} onChange={(v) => { setSide(v); setMk(null) }} options={[['buy', 'شراء'], ['sell', 'بيع']]} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {arrow('›', -1, idx <= 0)}
          <span style={{ fontSize: 11, color: 'var(--ink2)', minWidth: 78, textAlign: 'center' }}>{arMonth[m]} {y}</span>
          {arrow('‹', +1, idx >= months.length - 1)}
        </div>
      </div>

      {/* total for the month */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: 'var(--ink4)' }}>إجمالي {side === 'buy' ? 'شراء' : 'بيع'} الأجانب</span>
        <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-mono)', color: col }}>{fmtIQD(total)}</span>
      </div>

      {/* bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }} onMouseLeave={() => setHover(null)}>
        {data.map(([sec, val]) => {
          const active = hover === sec
          return (
            <div key={sec} onMouseEnter={() => setHover(sec)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'default',
                background: active ? 'var(--surf2)' : 'transparent', borderRadius: 5, padding: '2px 4px', margin: '0 -4px' }}>
              <div style={{ width: 70, fontSize: 11, color: active ? 'var(--ink)' : 'var(--ink2)', textAlign: 'start', flexShrink: 0 }}>
                {SECTOR_AR[sec] ?? sec}
              </div>
              <div style={{ flex: 1, height: 16, background: 'var(--surf2)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${(val / max) * 100}%`, height: '100%', background: col, borderRadius: 4, opacity: active ? 1 : 0.85, transition: 'width .2s' }} />
              </div>
              <div style={{ width: 64, fontSize: 11, fontFamily: 'var(--font-mono)', color: active ? 'var(--ink)' : 'var(--ink2)', textAlign: 'end', flexShrink: 0 }}>
                {active ? `${((val / total) * 100).toFixed(0)}%` : fmtIQD(val)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}


// ── Page ──────────────────────────────────────────────────────────────────────
export default function StatisticsPage() {
  const [flow,    setFlow]    = useState<FlowRow[]>([])
  const [sector,  setSector]  = useState<SectorRow[]>([])
  const [shares,  setShares]  = useState<ShareRow[]>([])
  const [own,     setOwn]     = useState<OwnRow[]>([])
  const [ownMonth, setOwnMonth] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const db = createClient()

        // foreign_flow_daily exceeds the 1000-row API cap (~1.4k rows), which
        // silently dropped the most recent months — page through it fully.
        const fetchAllFlow = async (): Promise<FlowRow[]> => {
          const out: FlowRow[] = []
          for (let from = 0; ; from += 1000) {
            const { data } = await db
              .from('foreign_flow_daily').select('year,month,side,value')
              .order('year').order('month').range(from, from + 999)
            if (!data?.length) break
            out.push(...(data as FlowRow[]))
            if (data.length < 1000) break
          }
          return out
        }

        // latest month for which ownership has been parsed (no longer pinned)
        const { data: ownLatest } = await db.from('ownership_monthly')
          .select('year,month').order('year', { ascending: false })
          .order('month', { ascending: false }).limit(1)
        const oy = ownLatest?.[0]?.year, om = ownLatest?.[0]?.month

        const [f, s, sh, ownRes] = await Promise.all([
          fetchAllFlow(),
          db.from('foreign_flow_sector').select('year,month,sector,side,value'),
          db.from('major_shareholders').select('year,month,company_name_ar,rank,name_ar,nationality,curr_shares,curr_pct,prev_pct,change_pct')
            .order('year', { ascending: false }).order('month', { ascending: false }).limit(1000),
          oy
            ? db.from('ownership_monthly')
                .select('name_ar,sector,capital,deposited_capital,deposit_ratio,iraqi_shares,foreign_shares,iraqi_count,foreign_count')
                .eq('year', oy).eq('month', om)
            : Promise.resolve({ data: [] as OwnRow[] }),
        ])
        if (oy && om) setOwnMonth(`${arMonth[om]} ${oy}`)
        setFlow(f)
        setSector((s.data as SectorRow[]) ?? [])
        setShares((sh.data as ShareRow[]) ?? [])
        setOwn((ownRes.data as OwnRow[]) ?? [])
      } catch { /* keep empty */ }
      setLoading(false)
    })()
  }, [])

  if (loading) {
    return (
      <div style={{ padding: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 280, borderRadius: 12 }} />
        ))}
      </div>
    )
  }

  // newest month present in the shareholders rows (they arrive newest-first)
  const shM = shares.reduce((best, r) => {
    if (r.year == null || r.month == null) return best
    const v = r.year * 12 + r.month
    return v > best ? v : best
  }, 0)
  const shareMonth = shM ? `${arMonth[((shM - 1) % 12) + 1]} ${Math.floor((shM - 1) / 12)}` : null

  return (
    <div style={{ padding: '20px 24px 60px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', margin: 0 }}>الإحصائيات</h1>
        <p style={{ fontSize: 12, color: 'var(--ink4)', marginTop: 4 }}>
          بيانات حصرية مستخرجة من تقارير سوق العراق للأوراق المالية — تدفق الأجانب اليومي حيّ، والبيانات الشهرية تُحدَّث مع كل تقرير
        </p>
      </div>

      {/* ── Live daily foreign flow — headline ── */}
      <DailyForeignFlow />

      {/* ── Monthly foreign flow + sector rotation ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16, alignItems: 'start', marginBottom: 16 }}>
        <Panel title="تدفق المستثمر الأجنبي" subtitle={ownMonth ? `صافي الشراء/البيع شهرياً · حتى ${ownMonth}` : 'صافي الشراء/البيع شهرياً'} badge="شهري">
          <ForeignFlowChart rows={flow} />
        </Panel>

        <Panel title="دوران القطاعات" subtitle="أين يتدفق المال الأجنبي شهرياً" badge="شهري">
          <SectorRotation rows={sector} />
        </Panel>
      </div>

      {/* ── Ownership structure (full width, expandable) ── */}
      <OwnershipPanel rows={own} month={ownMonth} />

      {/* ── Major shareholders (full width, searchable, expandable) ── */}
      <MajorShareholdersPanel rows={shares} month={shareMonth} />

      {/* ── Still-to-come data sources ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16, alignItems: 'start' }}>
        <Panel title="عدد المودعين لكل شركة" subtitle="كم شخص يملك هذا السهم">
          <Soon note="عدّاد المودعين غير مستخرج بعد من التقارير — يحتاج تحديث المُحلِّل (Table 26)." />
        </Panel>

        <Panel title="سوق السندات" subtitle="متابعة السندات الحكومية والشركات">
          <Soon note="لا يوجد مصدر بيانات للسندات بعد — يحتاج إضافة مصدر." />
        </Panel>

        <Panel title="أحداث رأس المال" subtitle="زيادات رأس المال، الرهون، الإرث">
          <Soon note="جدول الأحداث فارغ — يحتاج استخراج الجداول 28/34 من التقارير." />
        </Panel>
      </div>
    </div>
  )
}
