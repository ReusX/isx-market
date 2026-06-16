'use client'

import { useEffect, useMemo, useState } from 'react'
import { arMonth, PreviewCard } from './_ui'

export interface OwnRow {
  name_ar: string; sector: string | null
  capital: number | null; deposited_capital: number | null; deposit_ratio: number | null
  iraqi_shares: number | null; foreign_shares: number | null
  iraqi_count: number | null; foreign_count: number | null
}

function fmt(v: number): string {
  const a = Math.abs(v)
  if (a >= 1e12) return (v / 1e12).toFixed(2) + 'T'
  if (a >= 1e9)  return (v / 1e9).toFixed(2) + 'B'
  if (a >= 1e6)  return (v / 1e6).toFixed(1) + 'M'
  if (a >= 1e3)  return (v / 1e3).toFixed(0) + 'K'
  return v.toFixed(0)
}

type Sort = 'fpct' | 'fshares' | 'holders'
interface Enriched extends OwnRow { total: number; fpct: number }

// ── Shared data hook ───────────────────────────────────────────────────────────
function useOwnership() {
  const [rows, setRows] = useState<OwnRow[]>([])
  const [month, setMonth] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const db = createClient()
        const { data: latest } = await db.from('ownership_monthly')
          .select('year,month').order('year', { ascending: false })
          .order('month', { ascending: false }).limit(1)
        const oy = latest?.[0]?.year, om = latest?.[0]?.month
        if (oy && om) {
          setMonth(`${arMonth[om]} ${oy}`)
          const { data } = await db.from('ownership_monthly')
            .select('name_ar,sector,capital,deposited_capital,deposit_ratio,iraqi_shares,foreign_shares,iraqi_count,foreign_count')
            .eq('year', oy).eq('month', om)
          setRows((data as OwnRow[]) ?? [])
        }
      } catch { /* keep empty */ }
      setLoading(false)
    })()
  }, [])

  const clean = useMemo<Enriched[]>(() => rows
    .filter(r => (r.iraqi_shares ?? 0) > 0 || (r.foreign_shares ?? 0) > 0)
    .map(r => {
      const total = (r.iraqi_shares ?? 0) + (r.foreign_shares ?? 0)
      return { ...r, total, fpct: total ? ((r.foreign_shares ?? 0) / total) * 100 : 0 }
    }), [rows])

  const totals = useMemo(() => {
    const iraqi = clean.reduce((s, r) => s + (r.iraqi_shares ?? 0), 0)
    const foreign = clean.reduce((s, r) => s + (r.foreign_shares ?? 0), 0)
    const fHolders = clean.reduce((s, r) => s + (r.foreign_count ?? 0), 0)
    const withForeign = clean.filter(r => (r.foreign_shares ?? 0) > 0).length
    return { iraqi, foreign, tot: iraqi + foreign || 1, fHolders, withForeign }
  }, [clean])

  return { loading, month, clean, totals, fPct: (totals.foreign / totals.tot) * 100 }
}

function Donut({ fPct, size = 110 }: { fPct: number; size?: number }) {
  const R = size * 0.38, C = 2 * Math.PI * R, fLen = (fPct / 100) * C
  const c = size / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={c} cy={c} r={R} fill="none" stroke="var(--brand)" strokeWidth={size * 0.13} />
      <circle cx={c} cy={c} r={R} fill="none" stroke="var(--gold)" strokeWidth={size * 0.13}
        strokeDasharray={`${fLen} ${C - fLen}`} strokeDashoffset={C / 4} transform={`rotate(-90 ${c} ${c})`} />
      <text x={c} y={c - 2} textAnchor="middle" fontSize={size * 0.17} fontWeight="800" fill="var(--ink)" fontFamily="var(--font-mono)">{fPct.toFixed(1)}%</text>
      <text x={c} y={c + size * 0.14} textAnchor="middle" fontSize={size * 0.085} fill="var(--ink4)">ملكية أجنبية</text>
    </svg>
  )
}

// ── Compact preview ────────────────────────────────────────────────────────────
export function OwnershipPreview() {
  const { loading, month, clean, totals, fPct } = useOwnership()
  return (
    <PreviewCard
      title="هيكل الملكية" subtitle={month ? `عراقي مقابل أجنبي · ${month}` : 'عراقي مقابل أجنبي'}
      badge="شهري" href="/statistics/ownership" loading={loading}
    >
      {!clean.length ? (
        <div style={{ fontSize: 12, color: 'var(--ink4)', textAlign: 'center', padding: '20px 0' }}>غير متاح.</div>
      ) : (
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <Donut fPct={fPct} size={96} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 10.5, display: 'flex', gap: 12 }}>
              <span style={{ color: 'var(--brand)' }}>■ عراقي {(100 - fPct).toFixed(1)}%</span>
              <span style={{ color: 'var(--gold)' }}>■ أجنبي</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Mini value={totals.fHolders.toLocaleString('en-US')} label="حملة أجانب" />
              <Mini value={String(totals.withForeign)} label="شركات بملكية أجنبية" />
            </div>
          </div>
        </div>
      )}
    </PreviewCard>
  )
}

// ── Full detail ────────────────────────────────────────────────────────────────
export function OwnershipFull() {
  const { loading, clean, totals, fPct } = useOwnership()
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<Sort>('fpct')

  const ranked = useMemo(() => {
    let arr = clean.filter(r => (r.foreign_shares ?? 0) > 0)
    if (q.trim()) arr = arr.filter(r => r.name_ar.includes(q.trim()))
    return [...arr].sort((a, b) =>
      sort === 'fpct' ? b.fpct - a.fpct
      : sort === 'fshares' ? (b.foreign_shares ?? 0) - (a.foreign_shares ?? 0)
      : (b.foreign_count ?? 0) - (a.foreign_count ?? 0))
  }, [clean, q, sort])

  if (loading) return <div className="skeleton" style={{ height: 400, borderRadius: 16 }} />
  if (!clean.length) return <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink4)' }}>بيانات الملكية غير متاحة.</div>

  return (
    <div>
      <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20, padding: 16, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 14 }}>
        <Donut fPct={fPct} size={130} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 11.5, display: 'flex', gap: 14 }}>
            <span style={{ color: 'var(--brand)' }}>■ عراقي {(100 - fPct).toFixed(1)}%</span>
            <span style={{ color: 'var(--gold)' }}>■ أجنبي {fPct.toFixed(1)}%</span>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Mini value={totals.fHolders.toLocaleString('en-US')} label="حملة أسهم أجانب" big />
            <Mini value={String(totals.withForeign)} label="شركات بملكية أجنبية" big />
            <Mini value={fmt(totals.foreign)} label="أسهم مملوكة لأجانب" big />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink2)' }}>الشركات حسب الملكية الأجنبية ({ranked.length})</div>
        <div style={{ display: 'inline-flex', background: 'var(--surf2)', borderRadius: 7, padding: 2, gap: 2 }}>
          {([['fpct', 'النسبة'], ['fshares', 'الأسهم'], ['holders', 'الحملة']] as [Sort, string][]).map(([v, l]) => (
            <button key={v} onClick={() => setSort(v)} style={{
              border: 'none', borderRadius: 5, padding: '5px 11px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              background: sort === v ? 'var(--brand)' : 'transparent', color: sort === v ? '#fff' : 'var(--ink3)',
            }}>{l}</button>
          ))}
        </div>
      </div>

      <input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث عن شركة…" style={{
        width: '100%', height: 38, borderRadius: 9, background: 'var(--surf3)', border: '1px solid var(--line2)',
        color: 'var(--ink)', fontSize: 13, padding: '0 12px', outline: 'none', marginBottom: 12,
      }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {ranked.map((r, i) => (
          <div key={r.name_ar + i} style={{ display: 'grid', gridTemplateColumns: '22px 1fr 90px', gap: 10, alignItems: 'center', padding: '8px 4px', borderBottom: '1px solid var(--line)' }}>
            <span style={{ fontSize: 11, color: 'var(--ink4)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>{i + 1}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name_ar}</div>
              <div style={{ height: 6, background: 'var(--surf2)', borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
                <div style={{ width: `${Math.min(r.fpct, 100)}%`, height: '100%', background: 'var(--gold)', borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--ink4)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                {fmt(r.foreign_shares ?? 0)} سهم · {r.foreign_count ?? 0} حامل
              </div>
            </div>
            <div style={{ textAlign: 'end', fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--gold)' }}>{r.fpct.toFixed(1)}%</div>
          </div>
        ))}
        {!ranked.length && <div style={{ fontSize: 12, color: 'var(--ink4)', padding: 16, textAlign: 'center' }}>لا نتائج.</div>}
      </div>
    </div>
  )
}

function Mini({ value, label, big }: { value: string; label: string; big?: boolean }) {
  return (
    <div style={{ flex: 1, minWidth: big ? 110 : 0, background: 'var(--surf2)', borderRadius: 9, padding: big ? '10px 12px' : '8px 10px', textAlign: 'center' }}>
      <div style={{ fontSize: big ? 17 : 14, fontWeight: 800, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{value}</div>
      <div style={{ fontSize: 9, color: 'var(--ink4)', marginTop: 2, lineHeight: 1.3 }}>{label}</div>
    </div>
  )
}
