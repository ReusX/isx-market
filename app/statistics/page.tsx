'use client'

import { useEffect, useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────
type FlowRow   = { year: number; month: number; side: 'buy' | 'sell'; value: number | null }
type SectorRow = { year: number; month: number; sector: string; side: string; value: number | null }
type ShareRow  = { company_name_ar: string; rank: number; name_ar: string | null; nationality: string | null; curr_pct: number | null; change_pct: number | null }
type OwnRow    = { name_ar: string; sector: string | null; iraqi_shares: number | null; foreign_shares: number | null }

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
function ForeignFlowChart({ rows }: { rows: FlowRow[] }) {
  const byMonth = new Map<string, { buy: number; sell: number; y: number; m: number }>()
  for (const r of rows) {
    const k = monthKey(r.year, r.month)
    const e = byMonth.get(k) ?? { buy: 0, sell: 0, y: r.year, m: r.month }
    e[r.side] += r.value ?? 0
    byMonth.set(k, e)
  }
  const series = Array.from(byMonth.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([k, v]) => ({ k, net: v.buy - v.sell, y: v.y, m: v.m }))

  if (!series.length) return <Soon note="لا توجد بيانات تدفق." />

  const maxAbs = Math.max(...series.map(s => Math.abs(s.net)), 1)
  const W = 100 / series.length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'stretch', height: 200, gap: 2, position: 'relative' }}>
        {/* zero line */}
        <div style={{ position: 'absolute', insetInline: 0, top: '50%', height: 1, background: 'var(--line)' }} />
        {series.map(s => {
          const up = s.net >= 0
          const h = (Math.abs(s.net) / maxAbs) * 48  // % of half-height
          return (
            <div key={s.k} title={`${arMonth[s.m]} ${s.y}: ${fmtIQD(s.net)}`}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', minWidth: 0 }}>
              <div style={{ height: '50%', display: 'flex', alignItems: 'flex-end' }}>
                {up && <div style={{ width: '70%', margin: '0 auto', height: `${h * 2}%`, background: 'var(--up)', borderRadius: '3px 3px 0 0' }} />}
              </div>
              <div style={{ height: '50%', display: 'flex', alignItems: 'flex-start' }}>
                {!up && <div style={{ width: '70%', margin: '0 auto', height: `${h * 2}%`, background: 'var(--dn)', borderRadius: '0 0 3px 3px' }} />}
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 2, marginTop: 6 }}>
        {series.map(s => (
          <div key={s.k} style={{ flex: 1, textAlign: 'center', fontSize: 8, color: 'var(--ink4)', minWidth: 0 }}>
            {s.m}/{String(s.y).slice(2)}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 11 }}>
        <span style={{ color: 'var(--up)' }}>■ صافي شراء أجنبي</span>
        <span style={{ color: 'var(--dn)' }}>■ صافي بيع أجنبي</span>
      </div>
    </div>
  )
}

// ── 2. Sector rotation — horizontal bars ──────────────────────────────────────
function SectorRotation({ rows }: { rows: SectorRow[] }) {
  // latest month with known-sector buy data
  const months = Array.from(new Set(rows.map(r => monthKey(r.year, r.month)))).sort()
  let pick: SectorRow[] = []
  for (const mk of months.reverse()) {
    const [y, m] = mk.split('-').map(Number)
    const sub = rows.filter(r => r.year === y && r.month === m && r.side === 'buy' && KNOWN_SECTORS.has(r.sector))
    if (sub.length >= 2) { pick = sub; break }
  }
  if (!pick.length) return <Soon note="لا توجد بيانات قطاعية نظيفة." />

  const agg = new Map<string, number>()
  for (const r of pick) agg.set(r.sector, (agg.get(r.sector) ?? 0) + (r.value ?? 0))
  const data = Array.from(agg.entries()).sort((a, b) => b[1] - a[1])
  const max = Math.max(...data.map(d => d[1]), 1)
  const my = pick[0]

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 10 }}>
        شراء الأجانب حسب القطاع — {arMonth[my.month]} {my.year}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map(([sec, val]) => (
          <div key={sec} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 70, fontSize: 11, color: 'var(--ink2)', textAlign: 'start', flexShrink: 0 }}>
              {SECTOR_AR[sec] ?? sec}
            </div>
            <div style={{ flex: 1, height: 18, background: 'var(--surf2)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${(val / max) * 100}%`, height: '100%', background: 'var(--brand)', borderRadius: 4 }} />
            </div>
            <div style={{ width: 56, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink2)', textAlign: 'end', flexShrink: 0 }}>
              {fmtIQD(val)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 3. Ownership Iraqi vs Foreign — donut + list ──────────────────────────────
function Ownership({ rows }: { rows: OwnRow[] }) {
  const clean = rows.filter(r => (r.iraqi_shares ?? 0) > 0 || (r.foreign_shares ?? 0) > 0)
  if (!clean.length) return <Soon note="بيانات الملكية تحتاج إعادة معالجة (انزياح أعمدة)." />

  const totIraqi   = clean.reduce((s, r) => s + (r.iraqi_shares ?? 0), 0)
  const totForeign = clean.reduce((s, r) => s + (r.foreign_shares ?? 0), 0)
  const tot = totIraqi + totForeign || 1
  const fPct = (totForeign / tot) * 100

  const topForeign = clean
    .map(r => ({ name: r.name_ar, pct: ((r.foreign_shares ?? 0) / ((r.iraqi_shares ?? 0) + (r.foreign_shares ?? 0) || 1)) * 100 }))
    .filter(r => r.pct > 0)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 6)

  const R = 42, C = 2 * Math.PI * R
  const fLen = (fPct / 100) * C

  return (
    <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <svg width="110" height="110" viewBox="0 0 110 110">
          <circle cx="55" cy="55" r={R} fill="none" stroke="var(--brand)" strokeWidth="14" />
          <circle cx="55" cy="55" r={R} fill="none" stroke="var(--gold)" strokeWidth="14"
            strokeDasharray={`${fLen} ${C - fLen}`} strokeDashoffset={C / 4} transform="rotate(-90 55 55)" />
          <text x="55" y="52" textAnchor="middle" fontSize="18" fontWeight="800" fill="var(--ink)" fontFamily="var(--font-mono)">{fPct.toFixed(1)}%</text>
          <text x="55" y="68" textAnchor="middle" fontSize="9" fill="var(--ink4)">أجنبي</text>
        </svg>
        <div style={{ fontSize: 10, display: 'flex', gap: 10 }}>
          <span style={{ color: 'var(--brand)' }}>■ عراقي</span>
          <span style={{ color: 'var(--gold)' }}>■ أجنبي</span>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 6 }}>أعلى ملكية أجنبية</div>
        {topForeign.map(r => (
          <div key={r.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0', borderBottom: '1px solid var(--line)' }}>
            <span style={{ color: 'var(--ink2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{r.name}</span>
            <span style={{ color: 'var(--gold)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{r.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 4. Major shareholders — table ─────────────────────────────────────────────
function MajorShareholders({ rows }: { rows: ShareRow[] }) {
  // rows arrive newest-first; keep first (latest) occurrence per company+holder
  const seen = new Set<string>()
  const uniq: ShareRow[] = []
  for (const r of rows) {
    if (r.curr_pct == null || !r.name_ar) continue
    const k = `${r.company_name_ar}|${r.name_ar}`
    if (seen.has(k)) continue
    seen.add(k)
    uniq.push(r)
  }
  const top = uniq.sort((a, b) => (b.curr_pct ?? 0) - (a.curr_pct ?? 0)).slice(0, 10)
  if (!top.length) return <Soon note="لا توجد بيانات مساهمين." />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {top.map((r, i) => {
        const up = (r.change_pct ?? 0) > 0, dn = (r.change_pct ?? 0) < 0
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--line)' }}>
            <span style={{ width: 18, fontSize: 11, color: 'var(--ink4)', fontFamily: 'var(--font-mono)' }}>{i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name_ar}</div>
              <div style={{ fontSize: 10, color: 'var(--ink4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.company_name_ar}</div>
            </div>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
              background: r.nationality === 'Foreign' ? 'var(--gold-s, rgba(224,169,59,0.15))' : 'var(--brand-soft)',
              color: r.nationality === 'Foreign' ? 'var(--gold)' : 'var(--brand)',
            }}>{r.nationality === 'Foreign' ? 'أجنبي' : 'عراقي'}</span>
            <span style={{ width: 48, textAlign: 'end', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
              {r.curr_pct?.toFixed(1)}%
            </span>
            <span style={{ width: 42, textAlign: 'end', fontSize: 10, fontFamily: 'var(--font-mono)', color: up ? 'var(--up)' : dn ? 'var(--dn)' : 'var(--ink4)' }}>
              {up ? '+' : ''}{(r.change_pct ?? 0).toFixed(1)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function StatisticsPage() {
  const [flow,    setFlow]    = useState<FlowRow[]>([])
  const [sector,  setSector]  = useState<SectorRow[]>([])
  const [shares,  setShares]  = useState<ShareRow[]>([])
  const [own,     setOwn]     = useState<OwnRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const db = createClient()
        const [f, s, sh, ownRes] = await Promise.all([
          db.from('foreign_flow_daily').select('year,month,side,value'),
          db.from('foreign_flow_sector').select('year,month,sector,side,value'),
          db.from('major_shareholders').select('company_name_ar,rank,name_ar,nationality,curr_pct,change_pct')
            .order('year', { ascending: false }).order('month', { ascending: false }).limit(400),
          // 2026-04 is the last clean ownership month (column-shift corrupts 2026-05)
          db.from('ownership_monthly').select('name_ar,sector,iraqi_shares,foreign_shares')
            .eq('year', 2026).eq('month', 4),
        ])
        setFlow((f.data as FlowRow[]) ?? [])
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

  return (
    <div style={{ padding: '20px 24px 60px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', margin: 0 }}>الإحصائيات</h1>
        <p style={{ fontSize: 12, color: 'var(--ink4)', marginTop: 4 }}>
          بيانات حصرية مستخرجة من التقارير الشهرية لسوق العراق للأوراق المالية
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16, alignItems: 'start' }}>
        <Panel title="تدفق المستثمر الأجنبي" subtitle="صافي الشراء/البيع شهرياً" badge="حصري">
          <ForeignFlowChart rows={flow} />
        </Panel>

        <Panel title="دوران القطاعات" subtitle="أين يتدفق المال الأجنبي" badge="حصري">
          <SectorRotation rows={sector} />
        </Panel>

        <Panel title="هيكل الملكية" subtitle="عراقي مقابل أجنبي" badge="حصري">
          <Ownership rows={own} />
        </Panel>

        <Panel title="كبار المساهمين" subtitle="من يملك ماذا + الجنسية" badge="حصري">
          <MajorShareholders rows={shares} />
        </Panel>

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
