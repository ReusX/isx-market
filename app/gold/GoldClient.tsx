'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import type { GoldData, FxData } from '@/lib/rates'

const fmt = (n: number) => n.toLocaleString('en-US')
const KARAT_AR: Record<number, string> = { 24: 'عيار ٢٤', 22: 'عيار ٢٢', 21: 'عيار ٢١', 18: 'عيار ١٨', 14: 'عيار ١٤' }
const KARAT_LABEL: Record<number, string> = { 24: 'الأنقى', 22: 'مجوهرات', 21: 'الأكثر تداولاً', 18: 'مرصّع', 14: 'اقتصادي' }

// ── Tab bar (FX / Gold) ─────────────────────────────────────────────────────
function TabBar({ ar }: { ar: boolean }) {
  const base: React.CSSProperties = {
    flex: 1, padding: '9px 0', textAlign: 'center', fontSize: 13.5, fontWeight: 700,
    borderRadius: 9, textDecoration: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  }
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 22, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 12, padding: 4 }}>
      <Link href="/fx" style={{ ...base, color: 'var(--ink3)' }}>
        💵 {ar ? 'سعر الدولار' : 'USD Rate'}
      </Link>
      <div style={{ ...base, background: 'linear-gradient(135deg,#F5C451,#D4A22A)', color: '#3a2700' }}>
        🏅 {ar ? 'سعر الذهب' : 'Gold Price'}
      </div>
    </div>
  )
}

export default function GoldClient({ gold, fx }: { gold: GoldData | null; fx: FxData | null }) {
  const { lang } = useApp()
  const ar = lang === 'ar'

  const byKarat = useMemo(() => {
    const m = new Map<number, { iqd: number; usd: number }>()
    gold?.grams.forEach(g => m.set(g.karat, { iqd: g.iqd, usd: g.usd }))
    return m
  }, [gold])

  const k24 = byKarat.get(24)
  const others = [22, 21, 18, 14].filter(k => byKarat.has(k))

  // ── Calculator ──
  const [grams, setGrams] = useState('')
  const [karat, setKarat] = useState(21)
  const perGram = byKarat.get(karat)?.iqd ?? 0
  const total = (parseFloat(grams) || 0) * perGram

  if (!gold || !k24) {
    return (
      <div style={wrap}>
        <TabBar ar={ar} />
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink3)' }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>🏅</div>
          {ar ? 'تعذّر تحميل أسعار الذهب حالياً، حاول لاحقاً.' : 'Gold prices are unavailable right now.'}
        </div>
      </div>
    )
  }

  return (
    <div style={wrap}>
      <TabBar ar={ar} />

      {/* ── Hero: 24k gram ── */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        borderRadius: 18, padding: '22px 22px 24px',
        background: 'radial-gradient(120% 140% at 100% 0%, rgba(245,196,81,0.16), transparent 60%), var(--surf2)',
        border: '1px solid rgba(212,162,42,0.35)', marginBottom: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 38, height: 38, borderRadius: 11, fontSize: 20,
              background: 'linear-gradient(135deg,#F5C451,#D4A22A)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>🏅</span>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--ink)' }}>
                {ar ? 'الذهب عيار ٢٤' : 'Gold 24K'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink4)' }}>{ar ? 'سعر الجرام في العراق' : 'Per gram · Iraq'}</div>
            </div>
          </div>
          <LiveBadge ar={ar} />
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 40, fontWeight: 800, color: 'var(--gold)', lineHeight: 1 }}>
            {fmt(k24.iqd)}
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink3)' }}>{ar ? 'د.ع' : 'IQD'}</span>
          <span style={{ fontSize: 13, color: 'var(--ink4)', marginInlineStart: 6 }}>≈ ${fmt(k24.usd)}</span>
        </div>
        {gold.date && (
          <div style={{ fontSize: 11.5, color: 'var(--ink4)', marginTop: 10 }}>
            {ar ? 'آخر تحديث' : 'Updated'}: {gold.date}
          </div>
        )}
      </div>

      {/* ── Other karats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
        {others.map(k => {
          const d = byKarat.get(k)!
          return (
            <div key={k} style={{ background: 'var(--surf2)', border: '1px solid var(--line)', borderRadius: 14, padding: '13px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ink)' }}>{ar ? KARAT_AR[k] : `${k}K`}</span>
                <span style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--gold)', background: 'rgba(212,162,42,0.12)', padding: '2px 6px', borderRadius: 5 }}>
                  {ar ? KARAT_LABEL[k] : ''}
                </span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 21, fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>
                {fmt(d.iqd)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 4 }}>{ar ? 'د.ع/غرام' : 'IQD/g'} · ${fmt(d.usd)}</div>
            </div>
          )
        })}
      </div>

      {/* ── Ounce ── */}
      {(gold.ounceBuy || gold.ounceSell) && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
          {gold.ounceBuy && (
            <OunceCard ar={ar} label={ar ? 'أونصة — شراء' : 'Ounce — Buy'} d={gold.ounceBuy} up />
          )}
          {gold.ounceSell && (
            <OunceCard ar={ar} label={ar ? 'أونصة — بيع' : 'Ounce — Sell'} d={gold.ounceSell} />
          )}
        </div>
      )}

      {/* ── Calculator ── */}
      <div style={{ background: 'var(--surf2)', border: '1px solid var(--line)', borderRadius: 16, padding: 18, marginBottom: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
          🧮 {ar ? 'حاسبة قيمة الذهب' : 'Gold Value Calculator'}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ flex: '1 1 140px', minWidth: 0 }}>
            <span style={lbl}>{ar ? 'الوزن (غرام)' : 'Weight (grams)'}</span>
            <input value={grams} onChange={e => setGrams(e.target.value.replace(/[^\d.]/g, ''))}
              inputMode="decimal" placeholder="0" style={inp} />
          </label>
          <label style={{ flex: '1 1 140px', minWidth: 0 }}>
            <span style={lbl}>{ar ? 'العيار' : 'Karat'}</span>
            <select value={karat} onChange={e => setKarat(+e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
              {[24, 22, 21, 18, 14].filter(k => byKarat.has(k)).map(k => (
                <option key={k} value={k}>{ar ? KARAT_AR[k] : `${k}K`}</option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px dashed var(--line2)', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
          <span style={{ fontSize: 12.5, color: 'var(--ink3)' }}>{ar ? 'القيمة التقديرية' : 'Estimated value'}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 800, color: 'var(--gold)' }}>
            {fmt(Math.round(total))} <span style={{ fontSize: 13, color: 'var(--ink3)' }}>{ar ? 'د.ع' : 'IQD'}</span>
          </span>
        </div>
      </div>

      {/* ── Source ── */}
      <div style={{ fontSize: 11, color: 'var(--ink4)', textAlign: 'center', paddingBottom: 8 }}>
        {ar ? 'المصدر' : 'Source'}:{' '}
        <a href={gold.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" style={{ color: 'var(--brand)' }}>
          {gold.source}
        </a>
        {' '}· {ar ? 'يُحدَّث يومياً' : 'updated daily'}
      </div>
    </div>
  )
}

// ── Bits ────────────────────────────────────────────────────────────────────
function LiveBadge({ ar }: { ar: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700,
      color: 'var(--up)', background: 'var(--up-s)', border: '1px solid rgba(22,163,74,0.25)',
      padding: '3px 9px', borderRadius: 20,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--up)' }} />
      {ar ? 'مباشر' : 'LIVE'}
    </span>
  )
}

function OunceCard({ ar, label, d, up }: { ar: boolean; label: string; d: { iqd: number; usd: number }; up?: boolean }) {
  return (
    <div style={{ flex: '1 1 150px', background: 'var(--surf2)', border: '1px solid var(--line)', borderRadius: 14, padding: '13px 15px' }}>
      <div style={{ fontSize: 11.5, color: 'var(--ink4)', fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 800, color: up ? 'var(--up)' : 'var(--ink)', lineHeight: 1 }}>
        {fmt(d.iqd)}
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 4 }}>${fmt(d.usd)}</div>
    </div>
  )
}

const wrap: React.CSSProperties = { maxWidth: 760, margin: '0 auto', padding: '20px 16px 8px' }
const lbl: React.CSSProperties = { display: 'block', fontSize: 11.5, color: 'var(--ink3)', marginBottom: 6, fontWeight: 600 }
const inp: React.CSSProperties = {
  width: '100%', height: 42, borderRadius: 10, background: 'var(--surf3)',
  border: '1px solid var(--line2)', color: 'var(--ink)', fontSize: 15, padding: '0 12px',
  outline: 'none', fontFamily: 'var(--font-mono)',
}
