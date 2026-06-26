'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import type { OilData, OilBlend, FxData } from '@/lib/rates'

const fmt  = (n: number) => n.toLocaleString('en-US')
const fmt0 = (n: number) => Math.round(n).toLocaleString('en-US')
const fmt2 = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const FLAG: Record<string, string> = {
  iraq: '🇮🇶', uk: '🇬🇧', usa: '🇺🇸', uae: '🇦🇪', kuwait: '🇰🇼',
  arab: '🇸🇦', saudi: '🇸🇦', iran: '🇮🇷', russia: '🇷🇺', opec: '🛢️',
  oman: '🇴🇲', qatar: '🇶🇦', mexico: '🇲🇽', canada: '🇨🇦',
}

// Curated, ordered blends with clean Arabic names. Iraq's own crude leads.
const IRAQ: { key: string; ar: string; en: string }[] = [
  { key: 'Basrah-Heavy',  ar: 'البصرة الثقيل',  en: 'Basrah Heavy' },
  { key: 'Basrah-Medium', ar: 'البصرة المتوسط', en: 'Basrah Medium' },
]
const BENCH: { key: string; ar: string; en: string }[] = [
  { key: 'Brent-Crude',  ar: 'خام برنت',          en: 'Brent' },
  { key: 'WTI-Crude',    ar: 'غرب تكساس WTI',     en: 'WTI' },
  { key: 'Opec-Basket',  ar: 'سلة أوبك',          en: 'OPEC Basket' },
  { key: 'Dubai',        ar: 'دبي/عُمان',         en: 'Dubai' },
  { key: 'Murban-Crude', ar: 'مربان',             en: 'Murban' },
]
const REGION: { key: string; ar: string; en: string }[] = [
  { key: 'Arab-Light',          ar: 'العربي الخفيف', en: 'Arab Light' },
  { key: 'Kuwait-Export-Blend', ar: 'مزيج الكويت',   en: 'Kuwait Export' },
  { key: 'Iran-Heavy',          ar: 'إيران الثقيل',  en: 'Iran Heavy' },
  { key: 'Iran-Light',          ar: 'إيران الخفيف',  en: 'Iran Light' },
]

// ── Tab bar (FX / Gold / Oil) ───────────────────────────────────────────────
function TabBar({ ar }: { ar: boolean }) {
  const base: React.CSSProperties = {
    flex: 1, padding: '9px 0', textAlign: 'center', fontSize: 13.5, fontWeight: 700,
    borderRadius: 9, textDecoration: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  }
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 22, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 12, padding: 4 }}>
      <Link href="/fx" style={{ ...base, color: 'var(--ink3)' }}>💵 {ar ? 'الدولار' : 'USD'}</Link>
      <Link href="/gold" style={{ ...base, color: 'var(--ink3)' }}>🏅 {ar ? 'الذهب' : 'Gold'}</Link>
      <div style={{ ...base, background: 'linear-gradient(135deg,#2C3E2D,#16241A)', color: '#9FE6B4', border: '1px solid rgba(83,190,108,0.3)' }}>
        🛢️ {ar ? 'النفط' : 'Oil'}
      </div>
    </div>
  )
}

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

function Chg({ pct, change }: { pct: number; change: number }) {
  const up = pct >= 0
  const c = up ? 'var(--up)' : 'var(--dn)'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-mono)', fontWeight: 700, color: c, fontSize: 12.5 }}>
      <span style={{ fontSize: 9 }}>{up ? '▲' : '▼'}</span>
      {Math.abs(change).toFixed(2)} ({up ? '+' : '−'}{Math.abs(pct).toFixed(2)}%)
    </span>
  )
}

export default function OilClient({ oil, fx }: { oil: OilData | null; fx: FxData | null }) {
  const { lang } = useApp()
  const ar = lang === 'ar'
  const iqdRate = fx?.sell ?? null // IQD per 1 USD

  const map = useMemo(() => {
    const m = new Map<string, OilBlend>()
    oil?.blends.forEach(b => m.set(b.key, b))
    return m
  }, [oil])

  const pick = (keys: { key: string; ar: string; en: string }[]) =>
    keys.map(k => ({ ...k, b: map.get(k.key) })).filter(x => x.b) as { key: string; ar: string; en: string; b: OilBlend }[]

  const iraq   = pick(IRAQ)
  const bench  = pick(BENCH)
  const region = pick(REGION)

  // newest source timestamp across the featured blends → "updated" label
  const newest = useMemo(() => {
    const stamps = [...iraq, ...bench, ...region].map(x => x.b.stamp).filter(Boolean) as number[]
    return stamps.length ? Math.max(...stamps) : null
  }, [iraq, bench, region])

  // ── Calculator: barrels → IQD/USD ──
  const [barrels, setBarrels] = useState('')
  const [calcKey, setCalcKey] = useState('Brent-Crude')
  const calcBlend = map.get(calcKey)
  const usdTotal = (parseFloat(barrels) || 0) * (calcBlend?.usd ?? 0)
  const iqdTotal = iqdRate ? usdTotal * iqdRate : null

  const iqdPerBbl = (usd: number) => (iqdRate ? usd * iqdRate : null)

  if (!oil || !iraq.length && !bench.length) {
    return (
      <div style={wrap}>
        <TabBar ar={ar} />
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink3)' }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>🛢️</div>
          {ar ? 'تعذّر تحميل أسعار النفط حالياً، حاول لاحقاً.' : 'Oil prices are unavailable right now.'}
        </div>
      </div>
    )
  }

  const hero = iraq[0] // Basrah Heavy

  return (
    <div style={wrap}>
      <TabBar ar={ar} />

      {/* ── Hero: Iraq Basrah crude ── */}
      {hero && (
        <div style={{
          position: 'relative', overflow: 'hidden', borderRadius: 18, padding: '22px 22px 24px',
          background: 'radial-gradient(120% 140% at 100% 0%, rgba(83,190,108,0.14), transparent 60%), var(--surf2)',
          border: '1px solid rgba(83,190,108,0.30)', marginBottom: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, fontSize: 22, background: 'linear-gradient(135deg,#2C3E2D,#16241A)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(83,190,108,0.3)' }}>🛢️</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>
                  🇮🇶 {ar ? 'نفط البصرة الثقيل' : 'Basrah Heavy Crude'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink4)' }}>{ar ? 'خام التصدير العراقي · للبرميل' : 'Iraqi export crude · per barrel'}</div>
              </div>
            </div>
            <LiveBadge ar={ar} />
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 40, fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>
              ${fmt2(hero.b.usd)}
            </span>
            <Chg pct={hero.b.pct} change={hero.b.change} />
          </div>
          {iqdPerBbl(hero.b.usd) != null && (
            <div style={{ fontSize: 14, color: 'var(--ink3)', marginTop: 8, fontWeight: 600 }}>
              ≈ <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{fmt0(iqdPerBbl(hero.b.usd)!)}</span> {ar ? 'دينار للبرميل' : 'IQD/bbl'}
            </div>
          )}
          {newest && (
            <div style={{ fontSize: 11.5, color: 'var(--ink4)', marginTop: 10 }}>
              {ar ? 'آخر تحديث' : 'Updated'}: {new Date(newest * 1000).toLocaleString(ar ? 'ar-IQ' : 'en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      )}

      {/* ── Iraq second blend (Basrah Medium) ── */}
      {iraq[1] && (
        <BlendRow ar={ar} item={iraq[1]} iqd={iqdPerBbl(iraq[1].b.usd)} flag="🇮🇶" highlight />
      )}

      {/* ── Global benchmarks ── */}
      <SectionLabel ar={ar} text={ar ? 'المؤشرات العالمية' : 'Global Benchmarks'} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
        {bench.map(x => (
          <BenchCard key={x.key} ar={ar} item={x} iqd={iqdPerBbl(x.b.usd)} />
        ))}
      </div>

      {/* ── Regional / OPEC blends ── */}
      {region.length > 0 && (
        <>
          <SectionLabel ar={ar} text={ar ? 'خامات أوبك والمنطقة' : 'OPEC & Regional Blends'} />
          <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
            {region.map((x, i) => (
              <BlendRow key={x.key} ar={ar} item={x} iqd={iqdPerBbl(x.b.usd)} flag={FLAG[x.b.country ?? ''] ?? '🛢️'} divider={i < region.length - 1} />
            ))}
          </div>
        </>
      )}

      {/* ── Calculator: barrels → IQD ── */}
      <div style={{ background: 'var(--surf2)', border: '1px solid var(--line)', borderRadius: 16, padding: 18, marginBottom: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
          🧮 {ar ? 'حاسبة قيمة البرميل بالدينار' : 'Barrel Value Calculator'}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ flex: '1 1 140px', minWidth: 0 }}>
            <span style={lbl}>{ar ? 'عدد البراميل' : 'Barrels'}</span>
            <input value={barrels} onChange={e => setBarrels(e.target.value.replace(/[^\d.]/g, ''))}
              inputMode="decimal" placeholder="0" style={inp} />
          </label>
          <label style={{ flex: '1 1 140px', minWidth: 0 }}>
            <span style={lbl}>{ar ? 'الخام' : 'Blend'}</span>
            <select value={calcKey} onChange={e => setCalcKey(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
              {[...iraq, ...bench, ...region].map(x => (
                <option key={x.key} value={x.key}>{ar ? x.ar : x.en}</option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px dashed var(--line2)', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, color: 'var(--ink3)' }}>{ar ? 'القيمة التقديرية' : 'Estimated value'}</span>
          <div style={{ textAlign: 'end' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 800, color: 'var(--ink)' }}>
              ${fmt2(usdTotal)}
            </div>
            {iqdTotal != null && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--up)', marginTop: 2 }}>
                {fmt0(iqdTotal)} <span style={{ fontSize: 11, color: 'var(--ink3)' }}>{ar ? 'د.ع' : 'IQD'}</span>
              </div>
            )}
          </div>
        </div>
        {iqdRate && (
          <div style={{ fontSize: 10.5, color: 'var(--ink4)', marginTop: 10 }}>
            {ar ? `محسوب بسعر صرف ${fmt0(iqdRate)} دينار للدولار` : `Using ${fmt0(iqdRate)} IQD/USD`}
          </div>
        )}
      </div>

      {/* ── Source ── */}
      <div style={{ fontSize: 11, color: 'var(--ink4)', textAlign: 'center', paddingBottom: 8 }}>
        {ar ? 'المصدر' : 'Source'}:{' '}
        <a href={oil.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" style={{ color: 'var(--brand)' }}>
          {oil.source}
        </a>
        {' '}· {ar ? 'أسعار عالمية بتأخير بسيط · تُحدَّث يومياً' : 'global prices, slightly delayed · updated daily'}
      </div>
    </div>
  )
}

// ── bits ─────────────────────────────────────────────────────────────────────
function SectionLabel({ ar, text }: { ar: boolean; text: string }) {
  return (
    <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink3)', margin: '4px 2px 10px', textAlign: ar ? 'right' : 'left' }}>{text}</div>
  )
}

function BenchCard({ ar, item, iqd }: { ar: boolean; item: { ar: string; en: string; b: OilBlend }; iqd: number | null }) {
  return (
    <div style={{ background: 'var(--surf2)', border: '1px solid var(--line)', borderRadius: 14, padding: '13px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 14 }}>{FLAG[item.b.country ?? ''] ?? '🛢️'}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>{ar ? item.ar : item.en}</span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 21, fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>
        ${fmt2(item.b.usd)}
      </div>
      <div style={{ marginTop: 6 }}><Chg pct={item.b.pct} change={item.b.change} /></div>
      {iqd != null && <div style={{ fontSize: 10.5, color: 'var(--ink4)', marginTop: 5, fontFamily: 'var(--font-mono)' }}>{fmt0(iqd)} {ar ? 'د.ع/برميل' : 'IQD/bbl'}</div>}
    </div>
  )
}

function BlendRow({ ar, item, iqd, flag, divider, highlight }: {
  ar: boolean; item: { ar: string; en: string; b: OilBlend }; iqd: number | null; flag: string; divider?: boolean; highlight?: boolean
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px',
      borderBottom: divider ? '1px solid var(--line)' : 'none',
      ...(highlight ? { background: 'var(--surf2)', border: '1px solid rgba(83,190,108,0.25)', borderRadius: 14, marginBottom: 16 } : {}),
    }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{flag}</span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ar ? item.ar : item.en}</span>
      {iqd != null && <span style={{ fontSize: 11.5, color: 'var(--ink4)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{fmt0(iqd)} {ar ? 'د.ع' : 'IQD'}</span>}
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 800, color: 'var(--ink)', flexShrink: 0, minWidth: 78, textAlign: 'end' }}>${fmt2(item.b.usd)}</span>
      <span style={{ flexShrink: 0, minWidth: 96, textAlign: 'end' }}><Chg pct={item.b.pct} change={item.b.change} /></span>
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
