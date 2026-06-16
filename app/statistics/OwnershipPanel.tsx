'use client'

import { useMemo, useState } from 'react'

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

interface Enriched extends OwnRow {
  total: number; fpct: number
}

export default function OwnershipPanel({ rows, month }: { rows: OwnRow[]; month: string | null }) {
  const [expanded, setExpanded] = useState(false)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<Sort>('fpct')

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

  const fPct = (totals.foreign / totals.tot) * 100

  const ranked = useMemo(() => {
    let arr = clean.filter(r => (r.foreign_shares ?? 0) > 0)
    if (q.trim()) arr = arr.filter(r => r.name_ar.includes(q.trim()))
    arr = [...arr].sort((a, b) =>
      sort === 'fpct' ? b.fpct - a.fpct
      : sort === 'fshares' ? (b.foreign_shares ?? 0) - (a.foreign_shares ?? 0)
      : (b.foreign_count ?? 0) - (a.foreign_count ?? 0))
    return arr
  }, [clean, q, sort])

  const shown = expanded ? ranked : ranked.slice(0, 6)

  // donut geometry
  const R = 46, C = 2 * Math.PI * R, fLen = (fPct / 100) * C

  if (!clean.length) {
    return (
      <Shell month={month}>
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink4)', fontSize: 12.5 }}>
          بيانات الملكية غير متاحة لهذا الشهر.
        </div>
      </Shell>
    )
  }

  return (
    <Shell month={month}>
      <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* donut + market totals */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, minWidth: 150 }}>
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={R} fill="none" stroke="var(--brand)" strokeWidth="15" />
            <circle cx="60" cy="60" r={R} fill="none" stroke="var(--gold)" strokeWidth="15"
              strokeDasharray={`${fLen} ${C - fLen}`} strokeDashoffset={C / 4} transform="rotate(-90 60 60)" />
            <text x="60" y="56" textAnchor="middle" fontSize="20" fontWeight="800" fill="var(--ink)" fontFamily="var(--font-mono)">{fPct.toFixed(1)}%</text>
            <text x="60" y="73" textAnchor="middle" fontSize="9.5" fill="var(--ink4)">ملكية أجنبية</text>
          </svg>
          <div style={{ fontSize: 10.5, display: 'flex', gap: 12 }}>
            <span style={{ color: 'var(--brand)' }}>■ عراقي {(100 - fPct).toFixed(1)}%</span>
            <span style={{ color: 'var(--gold)' }}>■ أجنبي</span>
          </div>
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <MiniStat label="حملة أسهم أجانب" value={totals.fHolders.toLocaleString('en-US')} />
            <MiniStat label="شركات بملكية أجنبية" value={String(totals.withForeign)} />
          </div>
        </div>

        {/* ranked list */}
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink2)' }}>أعلى ملكية أجنبية حسب الشركة</div>
            {expanded && (
              <div style={{ display: 'inline-flex', background: 'var(--surf2)', borderRadius: 7, padding: 2, gap: 2 }}>
                {([['fpct', 'النسبة'], ['fshares', 'الأسهم'], ['holders', 'الحملة']] as [Sort, string][]).map(([v, l]) => (
                  <button key={v} onClick={() => setSort(v)} style={{
                    border: 'none', borderRadius: 5, padding: '4px 9px', fontSize: 10.5, fontWeight: 700, cursor: 'pointer',
                    background: sort === v ? 'var(--brand)' : 'transparent', color: sort === v ? '#fff' : 'var(--ink3)',
                  }}>{l}</button>
                ))}
              </div>
            )}
          </div>

          {expanded && (
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث عن شركة…" style={{
              width: '100%', height: 36, borderRadius: 9, background: 'var(--surf3)', border: '1px solid var(--line2)',
              color: 'var(--ink)', fontSize: 13, padding: '0 12px', outline: 'none', marginBottom: 10,
            }} />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {shown.map((r, i) => (
              <div key={r.name_ar + i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 10, alignItems: 'center', padding: '7px 4px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name_ar}</div>
                  <div style={{ height: 6, background: 'var(--surf2)', borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
                    <div style={{ width: `${Math.min(r.fpct, 100)}%`, height: '100%', background: 'var(--gold)', borderRadius: 3 }} />
                  </div>
                  <div style={{ fontSize: 9.5, color: 'var(--ink4)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                    {fmt(r.foreign_shares ?? 0)} سهم · {r.foreign_count ?? 0} حامل
                  </div>
                </div>
                <div style={{ textAlign: 'end', fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--gold)' }}>
                  {r.fpct.toFixed(1)}%
                </div>
              </div>
            ))}
            {!shown.length && <div style={{ fontSize: 12, color: 'var(--ink4)', padding: 12, textAlign: 'center' }}>لا نتائج.</div>}
          </div>

          {ranked.length > 6 && (
            <button onClick={() => { setExpanded(e => !e); setQ('') }} style={{
              width: '100%', marginTop: 10, padding: '8px 0', borderRadius: 9, background: 'var(--surf2)',
              border: '1px solid var(--line)', color: 'var(--ink2)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>
              {expanded ? 'عرض أقل' : `عرض كل الشركات (${ranked.length})`}
            </button>
          )}
        </div>
      </div>
    </Shell>
  )
}

function Shell({ month, children }: { month: string | null; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 14, padding: '16px 18px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 8 }}>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--ink)' }}>هيكل الملكية — عراقي مقابل أجنبي</div>
          <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 2 }}>توزيع رأس المال المودع بين المستثمرين العراقيين والأجانب</div>
        </div>
        {month && <span style={{ fontSize: 10.5, color: 'var(--ink3)', whiteSpace: 'nowrap', background: 'var(--surf2)', padding: '4px 9px', borderRadius: 7 }}>{month}</span>}
      </div>
      {children}
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, background: 'var(--surf2)', borderRadius: 9, padding: '8px 10px', textAlign: 'center' }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{value}</div>
      <div style={{ fontSize: 9, color: 'var(--ink4)', marginTop: 2, lineHeight: 1.3 }}>{label}</div>
    </div>
  )
}
