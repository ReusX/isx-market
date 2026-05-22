'use client'

import { useState, useEffect } from 'react'

const IQD_PER_USD = 1310  // Official rate fallback

interface GoldData {
  priceUSD: number   // per troy oz
  updatedAt: string
}

function calcIQD(usdPerOz: number, purity: number, grams: number, rate: number) {
  const usdPerGram = usdPerOz / 31.1035
  return Math.round(usdPerGram * purity * grams * rate)
}

function fmt(n: number) {
  return n.toLocaleString('ar-IQ')
}

export default function GoldPage() {
  const [gold, setGold] = useState<GoldData | null>(null)
  const [rate, setRate] = useState(IQD_PER_USD)
  const [loading, setLoading] = useState(true)
  const [grams, setGrams] = useState(1)
  const [calcGrams, setCalcGrams] = useState('')

  useEffect(() => {
    // Fetch gold spot price
    fetch('https://data-asg.goldprice.org/dbXRates/USD', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
      .then(r => r.json())
      .then(data => {
        const price = data?.items?.[0]?.xauPrice
        if (price) setGold({ priceUSD: price, updatedAt: new Date().toLocaleTimeString('ar-IQ') })
      })
      .catch(() => {
        // fallback approximate price
        setGold({ priceUSD: 3250, updatedAt: 'تقريبي' })
      })
      .finally(() => setLoading(false))
  }, [])

  const priceUSD = gold?.priceUSD ?? 3250

  const karats = [
    { label: 'عيار 24 (ذهب خالص)', purity: 1.0,       color: '#F5C84B' },
    { label: 'عيار 21 (الأكثر شيوعاً)', purity: 21/24, color: '#F0A500' },
    { label: 'عيار 18',               purity: 18/24,   color: '#C8860A' },
    { label: 'عيار 14',               purity: 14/24,   color: '#A06B08' },
  ]

  // مثقال = 4.608g in Iraq
  const MITHQAL = 4.608

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px 80px' }}>

      {/* H1 */}
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4, lineHeight: 1.3 }}>
        سعر الذهب اليوم في العراق
      </h1>
      <p style={{ fontSize: 13, color: 'var(--ink4)', marginBottom: 28 }}>
        {loading ? 'جاري التحميل...' : `آخر تحديث: ${gold?.updatedAt} — السعر العالمي: $${priceUSD.toFixed(2)}/أوقية`}
      </p>

      {/* IQD/USD rate input */}
      <div style={{
        background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 12,
        padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 13, color: 'var(--ink3)' }}>سعر الصرف المستخدم:</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>1 USD =</span>
          <input
            type="number"
            value={rate}
            onChange={e => setRate(Number(e.target.value))}
            style={{
              width: 80, padding: '4px 8px', borderRadius: 6,
              background: 'var(--surf2)', border: '1px solid var(--line)',
              color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: 13,
            }}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>IQD</span>
        </div>
      </div>

      {/* Per-gram prices by karat */}
      <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        سعر الغرام الواحد
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 28 }}>
        {karats.map(k => (
          <div key={k.label} style={{
            background: 'var(--surf)', border: `1px solid ${k.color}33`,
            borderRadius: 12, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.color, fontFamily: 'var(--font-mono)' }}>
              {fmt(calcIQD(priceUSD, k.purity, 1, rate))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 2 }}>دينار / غرام</div>
          </div>
        ))}
      </div>

      {/* Mithqal section — most searched in Iraq */}
      <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        سعر المثقال (٤.٦٠٨ غرام)
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 28 }}>
        {karats.map(k => (
          <div key={k.label} style={{
            background: 'var(--surf)', border: `1px solid ${k.color}44`,
            borderRadius: 12, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 6 }}>مثقال {k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.color, fontFamily: 'var(--font-mono)' }}>
              {fmt(calcIQD(priceUSD, k.purity, MITHQAL, rate))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 2 }}>دينار / مثقال</div>
          </div>
        ))}
      </div>

      {/* Quick weights table */}
      <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        جدول الأوزان — عيار 21
      </h2>
      <div style={{
        background: 'var(--surf)', border: '1px solid var(--line)',
        borderRadius: 12, overflow: 'hidden', marginBottom: 28,
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)', background: 'var(--surf2)' }}>
              {['الوزن', 'السعر بالدينار', 'السعر بالدولار'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'start', fontWeight: 700, color: 'var(--ink3)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[0.5, 1, 2, 5, 10, 20, 50, 100].map((g, i) => (
              <tr key={g} style={{ borderBottom: '1px solid var(--line)', background: i % 2 === 0 ? 'transparent' : 'var(--surf2)' }}>
                <td style={{ padding: '9px 14px', fontWeight: 600 }}>{g} غرام</td>
                <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', color: '#F0A500', fontWeight: 700 }}>
                  {fmt(calcIQD(priceUSD, 21/24, g, rate))}
                </td>
                <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', color: 'var(--ink3)' }}>
                  ${(priceUSD / 31.1035 * (21/24) * g).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Calculator */}
      <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        حاسبة سعر الذهب
      </h2>
      <div style={{
        background: 'var(--surf)', border: '1px solid var(--line)',
        borderRadius: 12, padding: '20px', marginBottom: 28,
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12,
      }}>
        <input
          type="number"
          placeholder="أدخل الوزن بالغرام"
          value={calcGrams}
          onChange={e => setCalcGrams(e.target.value)}
          style={{
            flex: 1, minWidth: 140, padding: '10px 14px', borderRadius: 8,
            background: 'var(--surf2)', border: '1px solid var(--line)',
            color: 'var(--ink)', fontSize: 14,
          }}
        />
        <span style={{ color: 'var(--ink3)', fontSize: 13 }}>غرام عيار 21 =</span>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 800, color: '#F0A500',
          background: 'rgba(240,165,0,0.1)', padding: '8px 16px', borderRadius: 8,
        }}>
          {calcGrams
            ? fmt(calcIQD(priceUSD, 21/24, Number(calcGrams), rate)) + ' دينار'
            : '—'
          }
        </div>
      </div>

      {/* Info section — keyword-rich */}
      <div style={{
        background: 'var(--surf)', border: '1px solid var(--line)',
        borderRadius: 12, padding: '20px', fontSize: 14, lineHeight: 1.8, color: 'var(--ink2)',
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--ink)' }}>
          كيف يُحسب سعر الذهب في العراق؟
        </h2>
        <p style={{ marginBottom: 10 }}>
          يُحدَّد <strong>سعر الذهب اليوم في العراق</strong> بناءً على سعر الذهب العالمي بالأونصة (Troy Ounce = 31.1 غرام)
          مضروباً بسعر صرف الدولار مقابل الدينار العراقي، ثم مقسوماً على عيار الذهب.
        </p>
        <p style={{ marginBottom: 10 }}>
          <strong>المثقال</strong> هو وحدة الوزن الشائعة في أسواق الذهب العراقية = <strong>4.608 غرام</strong>.
          أكثر الأوزان شيوعاً في السوق العراقية هو <strong>عيار 21</strong>.
        </p>
        <p>
          يتغير <strong>سعر مثقال الذهب عيار 21</strong> يومياً تبعاً لتذبذبات أسواق السلع العالمية.
          يمكنك تعديل سعر الصرف أعلاه لمطابقة السعر المتداول في السوق المحلية.
        </p>
      </div>
    </div>
  )
}
