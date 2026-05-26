'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import { useQuestTrack } from '@/lib/useQuestTrack'

interface FxRate {
  source: string
  sourceAr: string
  buy: number
  sell: number
  note?: string
  noteAr?: string
}

const RATES: FxRate[] = [
  { source: 'CBI Official',     sourceAr: 'البنك المركزي (رسمي)',    buy: 1310, sell: 1320, note: 'Central Bank of Iraq rate' },
  { source: 'CBI Auction',      sourceAr: 'مزاد العملة',             buy: 1305, sell: 1315, note: 'Daily auction rate' },
  { source: 'Market (Baghdad)', sourceAr: 'السوق الحرة (بغداد)',     buy: 1315, sell: 1325 },
  { source: 'Western Union',    sourceAr: 'ويسترن يونيون',           buy: 1280, sell: 1300, note: 'Remittance rate' },
  { source: 'Hawala (est.)',    sourceAr: 'حوالة (تقريبي)',          buy: 1318, sell: 1328, noteAr: 'يتفاوت حسب الموقع' },
]

export default function FxPage() {
  const { lang } = useApp()
  useQuestTrack('currency_convert')
  const ar = lang === 'ar'

  const [usd, setUsd] = useState('')
  const [iqd, setIqd] = useState('')
  const [rate, setRate] = useState(1310)
  const [dir, setDir] = useState<'usd2iqd' | 'iqd2usd'>('usd2iqd')
  const [lastUpdated] = useState(new Date().toLocaleDateString('en-GB'))

  function onUsd(v: string) {
    setUsd(v)
    setDir('usd2iqd')
    setIqd(v ? (parseFloat(v) * rate).toFixed(0) : '')
  }
  function onIqd(v: string) {
    setIqd(v)
    setDir('iqd2usd')
    setUsd(v ? (parseFloat(v) / rate).toFixed(4) : '')
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>
          {ar ? 'تحويل IQD ⇄ USD' : 'IQD ⇄ USD Exchange'}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink3)', margin: 0 }}>
          {ar ? 'أسعار صرف الدينار العراقي مقابل الدولار الأمريكي' : 'Iraqi Dinar vs US Dollar exchange rates'}
        </p>
      </div>

      {/* Converter */}
      <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 20, padding: '24px', marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: 'var(--ink4)', marginBottom: 14, fontWeight: 600 }}>
          {ar ? 'حاسبة التحويل' : 'Converter'}
        </div>

        {/* Rate selector */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: 'var(--ink4)', display: 'block', marginBottom: 6 }}>
            {ar ? 'اختر سعر الصرف' : 'Select rate'}
          </label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {RATES.map(r => (
              <button key={r.source} onClick={() => {
                setRate(r.buy)
                if (dir === 'usd2iqd' && usd) setIqd((parseFloat(usd) * r.buy).toFixed(0))
                if (dir === 'iqd2usd' && iqd) setUsd((parseFloat(iqd) / r.buy).toFixed(4))
              }} style={{
                padding: '5px 11px', borderRadius: 999, border: 'none',
                background: rate === r.buy ? 'var(--brand)' : 'var(--surf3)',
                color: rate === r.buy ? '#fff' : 'var(--ink3)',
                fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
              }}>
                {ar ? r.sourceAr : r.source}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: 'var(--ink4)', display: 'block', marginBottom: 4 }}>USD</label>
            <input type="number" min="0" value={usd} onChange={e => onUsd(e.target.value)}
              placeholder="0.00"
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 12,
                background: 'var(--surf3)', border: `2px solid ${dir === 'usd2iqd' ? 'var(--brand)' : 'var(--line)'}`,
                color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: 18, outline: 'none',
              }} />
          </div>

          <div style={{ fontSize: 22, color: 'var(--ink4)', marginTop: 20, flexShrink: 0 }}>⇄</div>

          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: 'var(--ink4)', display: 'block', marginBottom: 4 }}>IQD</label>
            <input type="number" min="0" value={iqd} onChange={e => onIqd(e.target.value)}
              placeholder="0"
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 12,
                background: 'var(--surf3)', border: `2px solid ${dir === 'iqd2usd' ? 'var(--gold)' : 'var(--line)'}`,
                color: dir === 'iqd2usd' ? 'var(--gold)' : 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: 18, outline: 'none',
              }} />
          </div>
        </div>

        <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--surf3)', borderRadius: 10, fontSize: 12, color: 'var(--ink3)', textAlign: 'center' }}>
          {ar ? `1 USD = ${rate.toLocaleString('en')} IQD` : `1 USD = ${rate.toLocaleString('en')} IQD`}
          &nbsp;•&nbsp;
          {ar ? `1 IQD = ${(1 / rate).toFixed(6)} USD` : `1 IQD = ${(1 / rate).toFixed(6)} USD`}
        </div>
      </div>

      {/* Rates table */}
      <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 20, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{ar ? 'مقارنة أسعار الصرف' : 'Rate Comparison'}</span>
          <span style={{ fontSize: 10, color: 'var(--ink4)', marginInlineStart: 10 }}>
            {ar ? `آخر تحديث: ${lastUpdated}` : `Updated: ${lastUpdated}`}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px', padding: '8px 20px', borderBottom: '1px solid var(--line)' }}>
          {[ar ? 'المصدر' : 'Source', ar ? 'شراء' : 'Buy', ar ? 'بيع' : 'Sell'].map((h, i) => (
            <span key={i} style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink4)', textTransform: 'uppercase', textAlign: i > 0 ? 'end' : 'start' }}>{h}</span>
          ))}
        </div>

        {RATES.map((r, i) => (
          <div key={i}
            onClick={() => { setRate(r.buy); if (usd) setIqd((parseFloat(usd) * r.buy).toFixed(0)) }}
            style={{
              display: 'grid', gridTemplateColumns: '1fr 100px 100px',
              padding: '12px 20px', borderBottom: '1px solid var(--line)',
              cursor: 'pointer', transition: 'background 0.12s',
              background: rate === r.buy ? 'var(--brand-soft)' : '',
            }}
            onMouseEnter={e => e.currentTarget.style.background = rate === r.buy ? 'var(--brand-soft)' : 'var(--surf2)'}
            onMouseLeave={e => e.currentTarget.style.background = rate === r.buy ? 'var(--brand-soft)' : ''}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{ar ? r.sourceAr : r.source}</div>
              {(ar ? r.noteAr : r.note) && (
                <div style={{ fontSize: 10, color: 'var(--ink4)' }}>{ar ? r.noteAr : r.note}</div>
              )}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--up)', textAlign: 'end' }}>
              {r.buy.toLocaleString('en')}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--dn)', textAlign: 'end' }}>
              {r.sell.toLocaleString('en')}
            </div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 11, color: 'var(--ink4)', textAlign: 'center', marginTop: 14 }}>
        {ar
          ? '* الأسعار تقريبية للمعلومات فقط — تحقق من مصدرك الرسمي قبل أي معاملة'
          : '* Rates are indicative only — verify with official sources before any transaction'}
      </p>
    </div>
  )
}
