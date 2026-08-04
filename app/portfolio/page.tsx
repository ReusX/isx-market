'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import TickerPicker from '@/components/TickerPicker'
import { CompanyLogo } from '@/components/CompanyLogo'
import {
  usePortfolio, useMarketData, aggregate, totals,
  fmtIQD, fmtPct, type Holding,
} from '@/lib/portfolio'

const SECTOR_AR: Record<string, string> = {
  Banks: 'بنوك', Industry: 'صناعة', Services: 'خدمات', Tourism: 'سياحة وفنادق',
  Investment: 'استثمار', Insurance: 'تأمين', Telecom: 'اتصالات', Agriculture: 'زراعة',
  'Money Transfer': 'تحويل مالي', Other: 'أخرى',
}
const tone = (v: number) => v > 0 ? 'var(--up)' : v < 0 ? 'var(--dn)' : 'var(--ink3)'

export default function PortfolioPage() {
  const { user, openAuth } = useApp()
  const { meta, metaBy, prices, loading } = useMarketData()
  const { lots, addLot, removeSym } = usePortfolio()

  const [sym, setSym]     = useState('')
  const [qty, setQty]     = useState('')
  const [price, setPrice] = useState('')
  const [date, setDate]   = useState('')
  const [showForm, setShowForm] = useState(false)

  const holdings = useMemo(() => aggregate(lots, prices), [lots, prices])
  const tot = useMemo(() => totals(holdings), [holdings])

  // sector allocation (by current value)
  const alloc = useMemo(() => {
    const m = new Map<string, number>()
    for (const h of holdings) {
      const sec = metaBy.get(h.sym)?.sec ?? 'Other'
      m.set(String(sec), (m.get(String(sec)) ?? 0) + h.value)
    }
    return Array.from(m.entries()).map(([sec, v]) => ({ sec, v, pct: tot.value > 0 ? v / tot.value * 100 : 0 }))
      .sort((a, b) => b.v - a.v)
  }, [holdings, metaBy, tot.value])

  const submit = () => {
    const q = Number(qty), p = Number(price)
    if (!sym || !(q > 0) || !(p > 0)) return
    addLot({ sym, qty: q, price: p, date: date || undefined })
    setSym(''); setQty(''); setPrice(''); setDate(''); setShowForm(false)
  }

  const SECTOR_COLORS = ['var(--brand)', 'var(--up)', 'var(--gold)', '#a855f7', '#06b6d4', '#f97316', '#ec4899', '#84cc16']

  return (
    <div className="terminal-shell app-page">
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: 'var(--ink)' }}>محفظتي</h1>
          <p style={{ fontSize: 12.5, color: 'var(--ink4)', margin: '6px 0 0' }}>
            تتبّع استثماراتك في سوق العراق · القيمة الحالية والأرباح والتوزيع حسب القطاع
          </p>
        </div>
        <button onClick={() => setShowForm(s => !s)} style={btn(true)}>
          {showForm ? 'إغلاق' : '+ إضافة سهم'}
        </button>
      </div>

      {/* not-signed-in hint */}
      {!user && lots.length > 0 && (
        <div style={{ background: 'var(--brand-soft)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: 'var(--ink2)' }}>
          محفظتك محفوظة على هذا الجهاز فقط. <button onClick={() => openAuth('signin')} style={{ background: 'none', border: 'none', color: 'var(--brand)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12 }}>سجّل الدخول</button> لحفظها ومزامنتها عبر أجهزتك.
        </div>
      )}

      {/* add form */}
      {showForm && (
        <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <Field label="الشركة">
              <TickerPicker meta={meta} value={sym} onChange={s => { setSym(s); if (s && !price) setPrice(String(prices[s] ?? '')) }} />
            </Field>
            <Field label="عدد الأسهم">
              <input type="number" inputMode="numeric" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" style={inp} />
            </Field>
            <Field label="سعر الشراء">
              <input type="number" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.000" style={inp} />
            </Field>
            <Field label="تاريخ الشراء (اختياري)">
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inp} />
            </Field>
            <button onClick={submit} disabled={!sym || !(Number(qty) > 0) || !(Number(price) > 0)} style={btn(true)}>إضافة</button>
          </div>
          {sym && Number(qty) > 0 && Number(price) > 0 && (
            <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--ink4)' }}>
              التكلفة: {fmtIQD(Number(qty) * Number(price))} د.ع
              {prices[sym] ? ` · القيمة الحالية: ${fmtIQD(Number(qty) * prices[sym])} د.ع` : ''}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="skeleton" style={{ height: 360, borderRadius: 14 }} />
      ) : holdings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed var(--line)', borderRadius: 16 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>محفظتك فارغة</div>
          <p style={{ fontSize: 12.5, color: 'var(--ink4)', margin: '6px 0 16px' }}>أضف أول سهم لتتبّع أدائه وأرباحك لحظياً.</p>
          <button onClick={() => setShowForm(true)} style={btn(true)}>+ إضافة سهم</button>
        </div>
      ) : (
        <>
          {/* summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
            <Card label="القيمة الحالية" value={`${fmtIQD(tot.value)} د.ع`} />
            <Card label="التكلفة الإجمالية" value={`${fmtIQD(tot.cost)} د.ع`} />
            <Card label="الربح/الخسارة" value={`${tot.pl >= 0 ? '+' : '−'}${fmtIQD(Math.abs(tot.pl))} د.ع`} color={tone(tot.pl)} />
            <Card label="العائد" value={fmtPct(tot.plPct)} color={tone(tot.pl)} />
          </div>

          {/* allocation bar */}
          {alloc.length > 0 && (
            <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink3)', marginBottom: 10 }}>التوزيع حسب القطاع</div>
              <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 10 }}>
                {alloc.map((a, i) => (
                  <div key={a.sec} title={`${SECTOR_AR[a.sec] ?? a.sec} ${a.pct.toFixed(0)}%`}
                    style={{ width: `${a.pct}%`, background: SECTOR_COLORS[i % SECTOR_COLORS.length] }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {alloc.map((a, i) => (
                  <div key={a.sec} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 2, background: SECTOR_COLORS[i % SECTOR_COLORS.length] }} />
                    <span style={{ color: 'var(--ink3)' }}>{SECTOR_AR[a.sec] ?? a.sec}</span>
                    <span style={{ color: 'var(--ink4)', fontFamily: 'var(--font-mono)' }}>{a.pct.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* holdings table */}
          <div style={{ border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', background: 'var(--surf)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)', background: 'var(--surf2)' }}>
                    {['الشركة', 'الكمية', 'متوسط الكلفة', 'السعر الحالي', 'القيمة', 'الربح/الخسارة', 'الوزن', ''].map((h, i) => (
                      <th key={i} style={{ padding: '10px 12px', textAlign: i === 0 ? 'start' : 'end', fontSize: 11, fontWeight: 700, color: 'var(--ink4)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {holdings.map(h => <HoldingRow key={h.sym} h={h} name={metaBy.get(h.sym)?.ar ?? h.sym} logo={metaBy.get(h.sym)?.logo} color={metaBy.get(h.sym)?.color} weight={tot.value > 0 ? h.value / tot.value * 100 : 0} onRemove={() => removeSym(h.sym)} />)}
                </tbody>
              </table>
            </div>
          </div>
          <p style={{ fontSize: 11, color: 'var(--ink5)', marginTop: 12 }}>
            الأسعار من آخر نشرة تداول رسمية · القيمة = الكمية × السعر الحالي · الربح/الخسارة = القيمة − التكلفة
          </p>
        </>
      )}
    </div>
  )
}

// ─── Row ──────────────────────────────────────────────────────────────────────
function HoldingRow({ h, name, logo, color, weight, onRemove }: {
  h: Holding; name: string; logo?: string; color?: string; weight: number; onRemove: () => void
}) {
  return (
    <tr style={{ borderBottom: '1px solid var(--line)' }}>
      <td style={{ padding: '10px 12px' }}>
        <Link href={`/c/${h.sym}`} style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <CompanyLogo sym={h.sym} logo={logo} color={color} letters={3} style={{ background: 'var(--brand)', width: 26, height: 26, borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff' }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150 }}>{name}</div>
            <div style={{ fontSize: 10.5, color: 'var(--ink4)', fontFamily: 'var(--font-mono)' }}>{h.sym}</div>
          </div>
        </Link>
      </td>
      <td style={td}>{h.qty.toLocaleString('en')}</td>
      <td style={td}>{h.avg.toLocaleString('en', { maximumFractionDigits: 3 })}</td>
      <td style={td}>{h.price ? h.price.toLocaleString('en', { maximumFractionDigits: 3 }) : '·'}</td>
      <td style={td}>{fmtIQD(h.value)}</td>
      <td style={{ ...td, color: tone(h.pl), fontWeight: 800 }}>
        <div>{h.pl >= 0 ? '+' : '−'}{fmtIQD(Math.abs(h.pl))}</div>
        <div style={{ fontSize: 10.5, fontWeight: 700 }}>{fmtPct(h.plPct)}</div>
      </td>
      <td style={td}>{weight.toFixed(0)}%</td>
      <td style={{ ...td, textAlign: 'center' }}>
        <button onClick={onRemove} title="حذف" style={{ background: 'none', border: 'none', color: 'var(--ink4)', cursor: 'pointer', fontSize: 15, padding: 4 }}>✕</button>
      </td>
    </tr>
  )
}

// ─── atoms ──────────────────────────────────────────────────────────────────
function Card({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ fontSize: 10.5, color: 'var(--ink4)', fontWeight: 600, marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 800, fontFamily: 'var(--font-mono)', color: color ?? 'var(--ink)' }}>{value}</div>
    </div>
  )
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 130 }}>
      <span style={{ fontSize: 10.5, color: 'var(--ink4)', fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  )
}
const inp: React.CSSProperties = { width: '100%', height: 38, borderRadius: 9, background: 'var(--surf2)', border: '1px solid var(--line)', color: 'var(--ink)', fontSize: 13, padding: '0 12px', outline: 'none', fontFamily: 'inherit' }
const td: React.CSSProperties = { padding: '10px 12px', textAlign: 'end', fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--ink2)', whiteSpace: 'nowrap' }
function btn(primary: boolean): React.CSSProperties {
  return { padding: '9px 16px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', border: '1px solid var(--brand)', background: primary ? 'var(--brand)' : 'transparent', color: primary ? '#fff' : 'var(--brand)' }
}
