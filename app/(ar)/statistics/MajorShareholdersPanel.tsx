'use client'

import { useEffect, useMemo, useState } from 'react'
import { arMonth, PreviewCard } from './_ui'

export interface ShareRow {
  year?: number; month?: number
  company_name_ar: string; rank: number
  name_ar: string | null; nationality: string | null
  curr_shares?: number | null; curr_pct: number | null
  prev_pct?: number | null; change_pct: number | null
}

type Nat = 'all' | 'Foreign' | 'Iraqi'

// ── Shared data hook ───────────────────────────────────────────────────────────
function useShareholders() {
  const [rows, setRows] = useState<ShareRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const db = createClient()
        const { data } = await db.from('major_shareholders')
          .select('year,month,company_name_ar,rank,name_ar,nationality,curr_shares,curr_pct,prev_pct,change_pct')
          .order('year', { ascending: false }).order('month', { ascending: false }).limit(1000)
        setRows((data as ShareRow[]) ?? [])
      } catch { /* keep empty */ }
      setLoading(false)
    })()
  }, [])

  // newest-first; keep latest record per company+holder
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

  const month = useMemo(() => {
    const m = rows.reduce((best, r) => {
      if (r.year == null || r.month == null) return best
      const v = r.year * 12 + r.month
      return v > best ? v : best
    }, 0)
    return m ? `${arMonth[((m - 1) % 12) + 1]} ${Math.floor((m - 1) / 12)}` : null
  }, [rows])

  const stats = useMemo(() => ({
    holders: uniq.length,
    foreign: uniq.filter(r => r.nationality === 'Foreign').length,
    companies: new Set(uniq.map(r => r.company_name_ar)).size,
  }), [uniq])

  return { loading, uniq, month, stats }
}

// ── Compact preview ────────────────────────────────────────────────────────────
export function ShareholdersPreview() {
  const { loading, uniq, month, stats } = useShareholders()
  const top = useMemo(() => [...uniq].sort((a, b) => (b.curr_pct ?? 0) - (a.curr_pct ?? 0)).slice(0, 3), [uniq])

  return (
    <PreviewCard
      title="كبار المساهمين" subtitle={month ? `أكبر الحصص · ${month}` : 'أكبر الحصص'}
      badge="شهري" href="/statistics/shareholders" loading={loading}
    >
      {!uniq.length ? (
        <div style={{ fontSize: 12, color: 'var(--ink4)', textAlign: 'center', padding: '20px 0' }}>غير متاح.</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <Tile value={stats.holders.toLocaleString('en-US')} label="مساهم كبير" />
            <Tile value={String(stats.companies)} label="شركة" />
            <Tile value={String(stats.foreign)} label="أجنبي" accent="var(--gold)" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {top.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10.5, color: 'var(--ink4)', fontFamily: 'var(--font-mono)' }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: 11.5, color: 'var(--ink2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name_ar}</span>
                <span style={{ fontSize: 12, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{r.curr_pct?.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </PreviewCard>
  )
}

// ── Full detail ────────────────────────────────────────────────────────────────
export function ShareholdersFull() {
  const { loading, uniq, stats } = useShareholders()
  const [q, setQ] = useState('')
  const [nat, setNat] = useState<Nat>('all')

  const filtered = useMemo(() => {
    let arr = uniq
    if (nat !== 'all') arr = arr.filter(r => (nat === 'Foreign' ? r.nationality === 'Foreign' : r.nationality !== 'Foreign'))
    if (q.trim()) arr = arr.filter(r => r.company_name_ar.includes(q.trim()) || (r.name_ar ?? '').includes(q.trim()))
    return [...arr].sort((a, b) => (b.curr_pct ?? 0) - (a.curr_pct ?? 0))
  }, [uniq, nat, q])

  if (loading) return <div className="skeleton" style={{ height: 400, borderRadius: 16 }} />
  if (!uniq.length) return <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink4)' }}>لا توجد بيانات مساهمين.</div>

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <Tile value={stats.holders.toLocaleString('en-US')} label="مساهم كبير" big />
        <Tile value={String(stats.companies)} label="شركة" big />
        <Tile value={String(stats.foreign)} label="مساهم أجنبي" accent="var(--gold)" big />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث عن شركة أو مساهم…" style={{
          flex: '1 1 200px', height: 38, borderRadius: 9, background: 'var(--surf3)', border: '1px solid var(--line2)',
          color: 'var(--ink)', fontSize: 13, padding: '0 12px', outline: 'none',
        }} />
        <div style={{ display: 'inline-flex', background: 'var(--surf2)', borderRadius: 7, padding: 2, gap: 2 }}>
          {([['all', 'الكل'], ['Iraqi', 'عراقي'], ['Foreign', 'أجنبي']] as [Nat, string][]).map(([v, l]) => (
            <button key={v} onClick={() => setNat(v)} style={{
              border: 'none', borderRadius: 5, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              background: nat === v ? 'var(--brand)' : 'transparent', color: nat === v ? '#fff' : 'var(--ink3)',
            }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 6 }}>{filtered.length} نتيجة</div>
      <div>
        {filtered.map((r, i) => {
          const up = (r.change_pct ?? 0) > 0, dn = (r.change_pct ?? 0) < 0
          const foreign = r.nationality === 'Foreign'
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '22px 1fr auto auto', gap: 10, alignItems: 'center', padding: '9px 4px', borderBottom: '1px solid var(--line)' }}>
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
        {!filtered.length && <div style={{ fontSize: 12, color: 'var(--ink4)', padding: 16, textAlign: 'center' }}>لا نتائج مطابقة.</div>}
      </div>
    </div>
  )
}

function Tile({ value, label, accent, big }: { value: string; label: string; accent?: string; big?: boolean }) {
  return (
    <div style={{ flex: '1 1 90px', background: 'var(--surf2)', borderRadius: 10, padding: big ? '10px 12px' : '8px 10px' }}>
      <div style={{ fontSize: big ? 18 : 15, fontWeight: 800, fontFamily: 'var(--font-mono)', color: accent ?? 'var(--ink)' }}>{value}</div>
      <div style={{ fontSize: big ? 10 : 9, color: 'var(--ink4)', marginTop: 2 }}>{label}</div>
    </div>
  )
}
