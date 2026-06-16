'use client'

import { useMemo, useState } from 'react'

export interface ShareRow {
  year?: number; month?: number
  company_name_ar: string; rank: number
  name_ar: string | null; nationality: string | null
  curr_shares?: number | null; curr_pct: number | null
  prev_pct?: number | null; change_pct: number | null
}

type Nat = 'all' | 'Foreign' | 'Iraqi'

export default function MajorShareholdersPanel({ rows, month }: { rows: ShareRow[]; month: string | null }) {
  const [expanded, setExpanded] = useState(false)
  const [q, setQ] = useState('')
  const [nat, setNat] = useState<Nat>('all')

  // rows arrive newest-first; keep the latest record per company+holder
  const uniq = useMemo(() => {
    const seen = new Set<string>()
    const out: ShareRow[] = []
    for (const r of rows) {
      if (r.curr_pct == null || !r.name_ar) continue
      const k = `${r.company_name_ar}|${r.name_ar}`
      if (seen.has(k)) continue
      seen.add(k)
      out.push(r)
    }
    return out
  }, [rows])

  const stats = useMemo(() => {
    const foreign = uniq.filter(r => r.nationality === 'Foreign').length
    const companies = new Set(uniq.map(r => r.company_name_ar)).size
    return { holders: uniq.length, foreign, companies }
  }, [uniq])

  const filtered = useMemo(() => {
    let arr = uniq
    if (nat !== 'all') arr = arr.filter(r => (nat === 'Foreign' ? r.nationality === 'Foreign' : r.nationality !== 'Foreign'))
    if (q.trim()) arr = arr.filter(r => r.company_name_ar.includes(q.trim()) || (r.name_ar ?? '').includes(q.trim()))
    return [...arr].sort((a, b) => (b.curr_pct ?? 0) - (a.curr_pct ?? 0))
  }, [uniq, nat, q])

  const shown = expanded ? filtered : filtered.slice(0, 8)

  return (
    <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 14, padding: '16px 18px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--ink)' }}>كبار المساهمين</div>
          <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 2 }}>أكبر الحصص في الشركات المدرجة · النسبة والتغيّر عن الشهر السابق</div>
        </div>
        {month && <span style={{ fontSize: 10.5, color: 'var(--ink3)', whiteSpace: 'nowrap', background: 'var(--surf2)', padding: '4px 9px', borderRadius: 7 }}>{month}</span>}
      </div>

      {/* summary tiles */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <Tile label="مساهم كبير" value={stats.holders.toLocaleString('en-US')} />
        <Tile label="شركة" value={String(stats.companies)} />
        <Tile label="مساهم أجنبي" value={String(stats.foreign)} accent="var(--gold)" />
      </div>

      {/* controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث عن شركة أو مساهم…" style={{
          flex: '1 1 200px', height: 36, borderRadius: 9, background: 'var(--surf3)', border: '1px solid var(--line2)',
          color: 'var(--ink)', fontSize: 13, padding: '0 12px', outline: 'none',
        }} />
        <div style={{ display: 'inline-flex', background: 'var(--surf2)', borderRadius: 7, padding: 2, gap: 2 }}>
          {([['all', 'الكل'], ['Iraqi', 'عراقي'], ['Foreign', 'أجنبي']] as [Nat, string][]).map(([v, l]) => (
            <button key={v} onClick={() => setNat(v)} style={{
              border: 'none', borderRadius: 5, padding: '5px 11px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              background: nat === v ? 'var(--brand)' : 'transparent', color: nat === v ? '#fff' : 'var(--ink3)',
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* list */}
      <div>
        {shown.map((r, i) => {
          const up = (r.change_pct ?? 0) > 0, dn = (r.change_pct ?? 0) < 0
          const foreign = r.nationality === 'Foreign'
          return (
            <div key={r.company_name_ar + r.name_ar + i} style={{
              display: 'grid', gridTemplateColumns: '22px 1fr auto auto', gap: 10, alignItems: 'center',
              padding: '9px 4px', borderBottom: '1px solid var(--line)',
            }}>
              <span style={{ fontSize: 11, color: 'var(--ink4)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>{i + 1}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name_ar}</div>
                <div style={{ fontSize: 10, color: 'var(--ink4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.company_name_ar}</div>
              </div>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap',
                background: foreign ? 'rgba(224,169,59,0.15)' : 'var(--brand-soft, rgba(48,138,224,0.12))',
                color: foreign ? 'var(--gold)' : 'var(--brand)',
              }}>{foreign ? 'أجنبي' : 'عراقي'}</span>
              <div style={{ textAlign: 'end', minWidth: 64 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{r.curr_pct?.toFixed(2)}%</div>
                {(up || dn) && (
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: up ? 'var(--up)' : 'var(--dn)' }}>
                    {up ? '▲' : '▼'} {Math.abs(r.change_pct ?? 0).toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {!shown.length && <div style={{ fontSize: 12, color: 'var(--ink4)', padding: 16, textAlign: 'center' }}>لا نتائج مطابقة.</div>}
      </div>

      {filtered.length > 8 && (
        <button onClick={() => setExpanded(e => !e)} style={{
          width: '100%', marginTop: 10, padding: '8px 0', borderRadius: 9, background: 'var(--surf2)',
          border: '1px solid var(--line)', color: 'var(--ink2)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
        }}>
          {expanded ? 'عرض أقل' : `عرض القائمة الكاملة (${filtered.length})`}
        </button>
      )}
    </div>
  )
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ flex: '1 1 90px', background: 'var(--surf2)', borderRadius: 10, padding: '9px 12px' }}>
      <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-mono)', color: accent ?? 'var(--ink)' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 2 }}>{label}</div>
    </div>
  )
}
