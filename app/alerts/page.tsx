'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import TickerPicker from '@/components/TickerPicker'
import { CompanyLogo } from '@/components/CompanyLogo'
import { useAlerts, useMarketData, alertHit, type Alert } from '@/lib/portfolio'

export default function AlertsPage() {
  const { user, openAuth } = useApp()
  const { meta, metaBy, prices, loading } = useMarketData()
  const { alerts, addAlert, removeAlert, setAll } = useAlerts()

  const [sym, setSym]       = useState('')
  const [dir, setDir]       = useState<'above' | 'below'>('above')
  const [target, setTarget] = useState('')

  // evaluate against latest prices: stamp triggeredAt the first time the
  // condition is met; clear it if the condition no longer holds (re-arm).
  useEffect(() => {
    if (loading || !alerts.length || !Object.keys(prices).length) return
    let changed = false
    const next = alerts.map(a => {
      const hit = alertHit(a, prices[a.sym] ?? 0)
      if (hit && !a.triggeredAt) { changed = true; return { ...a, triggeredAt: new Date().toISOString() } }
      if (!hit && a.triggeredAt)  { changed = true; return { ...a, triggeredAt: null } }
      return a
    })
    if (changed) setAll(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, prices, alerts.length])

  const triggered = useMemo(() => alerts.filter(a => a.triggeredAt), [alerts])
  const active    = useMemo(() => alerts.filter(a => !a.triggeredAt), [alerts])

  const submit = () => {
    const t = Number(target)
    if (!sym || !(t > 0)) return
    addAlert({ sym, dir, target: t, basePrice: prices[sym] ?? 0 })
    setSym(''); setTarget('')
  }

  return (
    <div className="terminal-shell app-page">
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: 'var(--ink)' }}>تنبيهات الأسعار</h2>
        <p style={{ fontSize: 12.5, color: 'var(--ink4)', margin: '6px 0 0' }}>
          اضبط سعراً مستهدفاً لأي سهم، وسنُعلِمك عند بلوغه. تُقيَّم التنبيهات على أحدث سعر إغلاق.
        </p>
      </div>

      {!user && alerts.length > 0 && (
        <div style={{ background: 'var(--brand-soft)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: 'var(--ink2)' }}>
          تنبيهاتك محفوظة على هذا الجهاز فقط. <button onClick={() => openAuth('signin')} style={{ background: 'none', border: 'none', color: 'var(--brand)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12 }}>سجّل الدخول</button> لحفظها عبر أجهزتك.
        </div>
      )}

      {/* create form */}
      <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 14, padding: 16, marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 180 }}>
            <span style={lbl}>الشركة</span>
            <TickerPicker meta={meta} value={sym} onChange={s => { setSym(s); if (s && !target) setTarget(String(prices[s] ?? '')) }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={lbl}>الشرط</span>
            <div style={{ display: 'inline-flex', background: 'var(--surf2)', borderRadius: 9, padding: 3, gap: 2, height: 38 }}>
              {([['above', 'يرتفع إلى'], ['below', 'ينخفض إلى']] as const).map(([d, t]) => (
                <button key={d} onClick={() => setDir(d)} style={{
                  border: 'none', borderRadius: 7, padding: '0 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  background: dir === d ? 'var(--brand)' : 'transparent', color: dir === d ? '#fff' : 'var(--ink3)',
                }}>{t}</button>
              ))}
            </div>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 120 }}>
            <span style={lbl}>السعر المستهدف</span>
            <input type="number" inputMode="decimal" value={target} onChange={e => setTarget(e.target.value)} placeholder="0.000" style={inp} />
          </label>
          <button onClick={submit} disabled={!sym || !(Number(target) > 0)} style={btn}>إضافة تنبيه</button>
        </div>
        {sym && prices[sym] ? (
          <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--ink4)' }}>السعر الحالي لـ {sym}: {prices[sym].toLocaleString('en', { maximumFractionDigits: 3 })} د.ع</div>
        ) : null}
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 200, borderRadius: 14 }} />
      ) : alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', border: '1px dashed var(--line)', borderRadius: 16 }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>🔔</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>لا توجد تنبيهات بعد</div>
          <p style={{ fontSize: 12.5, color: 'var(--ink4)', margin: '6px 0 0' }}>أضف تنبيهاً أعلاه لمتابعة سعر أي سهم.</p>
        </div>
      ) : (
        <>
          {triggered.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--up)', marginBottom: 8 }}>🔔 تنبيهات مُفعّلة ({triggered.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {triggered.map(a => <AlertRow key={a.id} a={a} name={metaBy.get(a.sym)?.ar ?? a.sym} logo={metaBy.get(a.sym)?.logo} color={metaBy.get(a.sym)?.color} price={prices[a.sym] ?? 0} onRemove={() => removeAlert(a.id)} hit />)}
              </div>
            </div>
          )}
          {active.length > 0 && (
            <div>
              {triggered.length > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink3)', marginBottom: 8 }}>قيد المتابعة ({active.length})</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {active.map(a => <AlertRow key={a.id} a={a} name={metaBy.get(a.sym)?.ar ?? a.sym} logo={metaBy.get(a.sym)?.logo} color={metaBy.get(a.sym)?.color} price={prices[a.sym] ?? 0} onRemove={() => removeAlert(a.id)} />)}
              </div>
            </div>
          )}
          <p style={{ fontSize: 11, color: 'var(--ink5)', marginTop: 16 }}>
            تُقيَّم التنبيهات على آخر سعر إغلاق رسمي (يُحدَّث يومياً). الإشعار داخل الموقع عند فتحه.
          </p>
        </>
      )}
    </div>
  )
}

// ─── Row ──────────────────────────────────────────────────────────────────────
function AlertRow({ a, name, logo, color, price, onRemove, hit }: {
  a: Alert; name: string; logo?: string; color?: string; price: number; onRemove: () => void; hit?: boolean
}) {
  // progress from base price → target (0..100)
  const span = a.target - a.basePrice
  const prog = span !== 0 ? Math.max(0, Math.min(100, ((price - a.basePrice) / span) * 100)) : (hit ? 100 : 0)
  const dist = price ? ((a.target - price) / price) * 100 : null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, border: `1px solid ${hit ? 'var(--up)' : 'var(--line)'}`, background: hit ? 'color-mix(in srgb, var(--up) 8%, var(--surf))' : 'var(--surf)' }}>
      <Link href={`/c/${a.sym}`} style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', minWidth: 0, flex: 1 }}>
        <CompanyLogo sym={a.sym} logo={logo} color={color} letters={3} style={{ background: 'var(--brand)', width: 30, height: 30, borderRadius: 7, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff' }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{name}</div>
          <div style={{ fontSize: 11, color: 'var(--ink4)' }}>
            {a.dir === 'above' ? 'يرتفع إلى' : 'ينخفض إلى'} <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink2)', fontWeight: 700 }}>{a.target.toLocaleString('en', { maximumFractionDigits: 3 })}</span>
          </div>
        </div>
      </Link>
      <div style={{ textAlign: 'end', flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{price ? price.toLocaleString('en', { maximumFractionDigits: 3 }) : '·'}</div>
        {hit ? (
          <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--up)' }}>تحقّق الهدف ✓</div>
        ) : dist != null ? (
          <div style={{ fontSize: 10.5, color: 'var(--ink4)', fontFamily: 'var(--font-mono)' }}>{dist >= 0 ? '+' : ''}{dist.toFixed(1)}% للهدف</div>
        ) : null}
      </div>
      <button onClick={onRemove} title="حذف" style={{ background: 'none', border: 'none', color: 'var(--ink4)', cursor: 'pointer', fontSize: 16, padding: 4, flexShrink: 0 }}>✕</button>
    </div>
  )
}

const lbl: React.CSSProperties = { fontSize: 10.5, color: 'var(--ink4)', fontWeight: 600 }
const inp: React.CSSProperties = { width: '100%', height: 38, borderRadius: 9, background: 'var(--surf2)', border: '1px solid var(--line)', color: 'var(--ink)', fontSize: 13, padding: '0 12px', outline: 'none', fontFamily: 'inherit' }
const btn: React.CSSProperties = { padding: '0 18px', height: 38, borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', border: '1px solid var(--brand)', background: 'var(--brand)', color: '#fff' }
