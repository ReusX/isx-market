'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import type { FxData } from '@/lib/rates'

const fmt = (n: number, d = 2) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })

// ── Tab bar (FX / Gold) ─────────────────────────────────────────────────────
function TabBar({ ar }: { ar: boolean }) {
  const base: React.CSSProperties = {
    flex: 1, padding: '9px 0', textAlign: 'center', fontSize: 13.5, fontWeight: 700,
    borderRadius: 9, textDecoration: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  }
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 22, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 12, padding: 4 }}>
      <div style={{ ...base, background: 'var(--brand)', color: '#fff' }}>
        💵 {ar ? 'سعر الدولار' : 'USD Rate'}
      </div>
      <Link href="/gold" style={{ ...base, color: 'var(--ink3)' }}>
        🏅 {ar ? 'سعر الذهب' : 'Gold Price'}
      </Link>
    </div>
  )
}

export default function FxClient({ fx }: { fx: FxData | null }) {
  const { lang } = useApp()
  const ar = lang === 'ar'

  // Rate used for conversion: the quoted selling price (سعر البيع) is what
  // Iraqis cite as "سعر الدولار"; fall back to buy.
  const rate = fx?.sell ?? fx?.buy ?? null

  const [usd, setUsd] = useState('100')
  const [iqd, setIqd] = useState(() => (rate ? String(Math.round(100 * rate)) : ''))
  const [dir, setDir] = useState<'usd2iqd' | 'iqd2usd'>('usd2iqd')

  function onUsd(v: string) {
    const c = v.replace(/[^\d.]/g, ''); setUsd(c); setDir('usd2iqd')
    setIqd(rate && c ? String(Math.round(parseFloat(c) * rate)) : '')
  }
  function onIqd(v: string) {
    const c = v.replace(/[^\d.]/g, ''); setIqd(c); setDir('iqd2usd')
    setUsd(rate && c ? (parseFloat(c) / rate).toFixed(2) : '')
  }

  if (!fx || !rate) {
    return (
      <div style={wrap}>
        <TabBar ar={ar} />
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink3)' }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>💵</div>
          {ar ? 'تعذّر تحميل سعر الصرف حالياً، حاول لاحقاً.' : 'Exchange rate is unavailable right now.'}
        </div>
      </div>
    )
  }

  return (
    <div style={wrap}>
      <TabBar ar={ar} />

      {/* ── Hero: USD/IQD ── */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        borderRadius: 18, padding: '22px 22px 24px',
        background: 'radial-gradient(120% 140% at 100% 0%, rgba(48,138,224,0.16), transparent 60%), var(--surf2)',
        border: '1px solid rgba(48,138,224,0.35)', marginBottom: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 38, height: 38, borderRadius: 11, fontSize: 19,
              background: 'linear-gradient(135deg,#3CA0F0,#2570C8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>💵</span>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--ink)' }}>
                {ar ? 'دولار أمريكي / دينار عراقي' : 'USD / IQD'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink4)' }}>{ar ? 'السوق الموازي (السعر العام)' : 'Black market'}</div>
            </div>
          </div>
          <LiveBadge ar={ar} />
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 40, fontWeight: 800, color: 'var(--brand)', lineHeight: 1 }}>
            {fmt(rate, 0)}
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink3)' }}>{ar ? 'د.ع لكل دولار' : 'IQD / $1'}</span>
          {fx.change != null && fx.change !== 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3, marginInlineStart: 4,
              fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)',
              color: fx.change > 0 ? 'var(--up)' : 'var(--dn)',
            }}>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
                {fx.change > 0 ? <polygon points="4,1 7,6 1,6" /> : <polygon points="4,7 7,2 1,2" />}
              </svg>
              {fmt(Math.abs(fx.change), 2)}
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 6 }}>
          {fx.change != null && fx.change !== 0
            ? (ar ? 'مقارنة بسعر أمس' : 'vs. yesterday')
            : ''}
        </div>
        {fx.date && (
          <div style={{ fontSize: 11.5, color: 'var(--ink4)', marginTop: 10 }}>
            {ar ? 'آخر تحديث' : 'Updated'}: {fx.date}
          </div>
        )}
      </div>

      {/* ── Buy / Sell ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        {fx.buy != null && (
          <RateCard ar={ar} label={ar ? 'شراء' : 'Buy'} sub={ar ? 'سعر شراء الدولار' : 'they buy USD'} value={fmt(fx.buy, 2)} accent="var(--up)" />
        )}
        {fx.sell != null && (
          <RateCard ar={ar} label={ar ? 'بيع' : 'Sell'} sub={ar ? 'سعر بيع الدولار' : 'they sell USD'} value={fmt(fx.sell, 2)} accent="var(--dn)" />
        )}
      </div>

      {/* ── Converter ── */}
      <div style={{ background: 'var(--surf2)', border: '1px solid var(--line)', borderRadius: 16, padding: 18, marginBottom: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
          🔁 {ar ? 'محوّل العملة' : 'Currency Converter'}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <label style={{ flex: '1 1 130px', minWidth: 0 }}>
            <span style={lbl}>{ar ? 'دولار أمريكي' : 'US Dollar'}</span>
            <input value={usd} onChange={e => onUsd(e.target.value)} inputMode="decimal" placeholder="0" style={inp} />
          </label>
          <span style={{ fontSize: 20, color: 'var(--ink4)', paddingBottom: 9 }}>=</span>
          <label style={{ flex: '1 1 130px', minWidth: 0 }}>
            <span style={lbl}>{ar ? 'دينار عراقي' : 'Iraqi Dinar'}</span>
            <input value={iqd} onChange={e => onIqd(e.target.value)} inputMode="decimal" placeholder="0" style={inp} />
          </label>
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 10 }}>
          {ar ? `محسوب على سعر ${fmt(rate, 0)} د.ع للدولار` : `Based on ${fmt(rate, 0)} IQD/$1`}
        </div>
      </div>

      {/* ── Source ── */}
      <div style={{ fontSize: 11, color: 'var(--ink4)', textAlign: 'center', paddingBottom: 8 }}>
        {ar ? 'المصدر' : 'Source'}:{' '}
        <a href={fx.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" style={{ color: 'var(--brand)' }}>
          {fx.source}
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

function RateCard({ ar, label, sub, value, accent }: { ar: boolean; label: string; sub: string; value: string; accent: string }) {
  return (
    <div style={{ flex: '1 1 150px', background: 'var(--surf2)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent }} />
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>{label}</span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 4 }}>{sub}</div>
    </div>
  )
}

const wrap: React.CSSProperties = { maxWidth: 760, margin: '0 auto', padding: '20px 16px 8px' }
const lbl: React.CSSProperties = { display: 'block', fontSize: 11.5, color: 'var(--ink3)', marginBottom: 6, fontWeight: 600 }
const inp: React.CSSProperties = {
  width: '100%', height: 42, borderRadius: 10, background: 'var(--surf3)',
  border: '1px solid var(--line2)', color: 'var(--ink)', fontSize: 16, padding: '0 12px',
  outline: 'none', fontFamily: 'var(--font-mono)',
}
