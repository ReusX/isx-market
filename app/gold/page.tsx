'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/context/AppContext'

const IQD_PER_USD = 1310  // Official rate fallback

interface GoldData {
  priceUSD: number   // per troy oz
  updatedAt: string
}

function calcIQD(usdPerOz: number, purity: number, grams: number, rate: number) {
  const usdPerGram = usdPerOz / 31.1035
  return Math.round(usdPerGram * purity * grams * rate)
}

function calcUSD(usdPerOz: number, purity: number, grams: number) {
  return (usdPerOz / 31.1035) * purity * grams
}

function fmtAr(n: number) {
  return n.toLocaleString('ar-IQ')
}

function fmtUSD(n: number, decimals = 2) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export default function GoldPage() {
  const { lang } = useApp()
  const [gold, setGold] = useState<GoldData | null>(null)
  const [rate, setRate] = useState(IQD_PER_USD)
  const [loading, setLoading] = useState(true)
  const [calcGrams, setCalcGrams] = useState('')

  useEffect(() => {
    fetch('https://data-asg.goldprice.org/dbXRates/USD', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
      .then(r => r.json())
      .then(data => {
        const price = data?.items?.[0]?.xauPrice
        if (price) setGold({
          priceUSD: price,
          updatedAt: new Date().toLocaleTimeString(lang === 'ar' ? 'ar-IQ' : 'en-US'),
        })
      })
      .catch(() => {
        setGold({ priceUSD: 3250, updatedAt: lang === 'ar' ? 'تقريبي' : 'Approximate' })
      })
      .finally(() => setLoading(false))
  }, [])

  const priceUSD = gold?.priceUSD ?? 3250

  const karats = lang === 'ar'
    ? [
        { label: 'عيار 24 (ذهب خالص)',      purity: 1.0,       color: '#F5C84B' },
        { label: 'عيار 21 (الأكثر شيوعاً)', purity: 21/24,     color: '#F0A500' },
        { label: 'عيار 18',                  purity: 18/24,     color: '#C8860A' },
        { label: 'عيار 14',                  purity: 14/24,     color: '#A06B08' },
      ]
    : [
        { label: '24K — Pure Gold',          purity: 1.0,       color: '#F5C84B' },
        { label: '22K',                      purity: 22/24,     color: '#F2B300' },
        { label: '18K',                      purity: 18/24,     color: '#C8860A' },
        { label: '14K',                      purity: 14/24,     color: '#A06B08' },
      ]

  // مثقال = 4.608g in Iraq
  const MITHQAL = 4.608

  if (lang === 'en') {
    /* ─────────────────── ENGLISH VERSION ─────────────────── */
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px 80px', direction: 'ltr', fontFamily: 'var(--font-en)' }}>

        {/* H1 */}
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4, lineHeight: 1.3 }}>
          Gold Price in Iraq Today
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink4)', marginBottom: 28 }}>
          {loading
            ? 'Loading live Iraq gold rate...'
            : `Iraq gold rate updated: ${gold?.updatedAt} — International spot: ${fmtUSD(priceUSD, 2)}/troy oz`}
        </p>

        {/* Spot price hero */}
        <div style={{
          background: 'var(--surf)', border: '1px solid #F5C84B33',
          borderRadius: 16, padding: '20px 24px', marginBottom: 20,
          display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Troy Ounce (31.10 g)</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#F5C84B', fontFamily: 'var(--font-mono)' }}>
              {fmtUSD(priceUSD)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Per Gram (24K)</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#F5C84B', fontFamily: 'var(--font-mono)' }}>
              {fmtUSD(calcUSD(priceUSD, 1.0, 1))}
            </div>
          </div>
        </div>

        {/* Per-gram prices by karat */}
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Iraq Gold Price Today — Per Gram
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 28 }}>
          {karats.map(k => (
            <div key={k.label} style={{
              background: 'var(--surf)', border: `1px solid ${k.color}33`,
              borderRadius: 12, padding: '14px 16px',
            }}>
              <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: k.color, fontFamily: 'var(--font-mono)' }}>
                {fmtUSD(calcUSD(priceUSD, k.purity, 1))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 2 }}>USD / gram</div>
            </div>
          ))}
        </div>

        {/* Weights table */}
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Iraq Gold Rate — Weight Table (18K)
        </h2>
        <div style={{
          background: 'var(--surf)', border: '1px solid var(--line)',
          borderRadius: 12, overflow: 'hidden', marginBottom: 28,
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)', background: 'var(--surf2)' }}>
                {['Weight', '24K (USD)', '22K (USD)', '18K (USD)'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--ink3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 5, 10, 20, 31.1, 50, 100].map((g, i) => (
                <tr key={g} style={{ borderBottom: '1px solid var(--line)', background: i % 2 === 0 ? 'transparent' : 'var(--surf2)' }}>
                  <td style={{ padding: '9px 14px', fontWeight: 600 }}>{g === 31.1 ? '1 troy oz' : `${g}g`}</td>
                  <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', color: '#F5C84B', fontWeight: 700 }}>
                    {fmtUSD(calcUSD(priceUSD, 1.0, g))}
                  </td>
                  <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', color: '#F2B300' }}>
                    {fmtUSD(calcUSD(priceUSD, 22/24, g))}
                  </td>
                  <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', color: 'var(--ink3)' }}>
                    {fmtUSD(calcUSD(priceUSD, 18/24, g))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculator */}
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Iraq Gold Price Calculator
        </h2>
        <div style={{
          background: 'var(--surf)', border: '1px solid var(--line)',
          borderRadius: 12, padding: '20px', marginBottom: 28,
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12,
        }}>
          <input
            type="number"
            placeholder="Enter weight in grams"
            value={calcGrams}
            onChange={e => setCalcGrams(e.target.value)}
            style={{
              flex: 1, minWidth: 160, padding: '10px 14px', borderRadius: 8,
              background: 'var(--surf2)', border: '1px solid var(--line)',
              color: 'var(--ink)', fontSize: 14, fontFamily: 'var(--font-en)',
            }}
          />
          <span style={{ color: 'var(--ink3)', fontSize: 13 }}>grams of 18K =</span>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 800, color: '#C8860A',
            background: 'rgba(200,134,10,0.1)', padding: '8px 16px', borderRadius: 8,
          }}>
            {calcGrams ? fmtUSD(calcUSD(priceUSD, 18/24, Number(calcGrams))) : '—'}
          </div>
        </div>

        {/* Info */}
        <div style={{
          background: 'var(--surf)', border: '1px solid var(--line)',
          borderRadius: 12, padding: '20px', fontSize: 14, lineHeight: 1.8, color: 'var(--ink2)',
          marginBottom: 20,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--ink)' }}>
            How is the gold price in Iraq calculated?
          </h2>
          <p style={{ marginBottom: 10 }}>
            The <strong>gold price in Iraq today</strong> is derived from the international spot price quoted in
            USD per troy ounce (1 troy oz = 31.1035 g) and converted to <strong>Iraqi Dinar (IQD)</strong> at
            the current exchange rate. The official CBI rate is ~1,310 IQD per USD.
          </p>
          <p style={{ marginBottom: 10 }}>
            Karat denotes purity: <strong>24K is 99.9% pure gold</strong>, 21K is 87.5% (the most common
            karat in Iraqi jewellery markets), 18K is 75%, and 14K is 58.3%.
          </p>
          <p style={{ marginBottom: 10 }}>
            The <strong>mithqal (مثقال)</strong> — equal to 4.608 grams — is the traditional Iraqi unit for
            quoting gold. The <strong>iraq gold rate today</strong> for one mithqal of 21K is the most widely
            searched gold price in Iraq.
          </p>
          <p>
            Prices reflect the London/COMEX spot benchmark and update in real time during market hours.
            Local dealer premiums, fabrication costs, and taxes are additional.
          </p>
        </div>

        {/* English SEO section — targets backlink traffic from cryptonews / coinnews */}
        <div style={{
          background: 'var(--surf)', border: '1px solid var(--line)',
          borderRadius: 12, padding: '20px 24px', fontSize: 14, lineHeight: 1.9, color: 'var(--ink2)',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16, color: 'var(--ink)' }}>
            Iraq Gold Price Today — Everything You Need to Know
          </h2>

          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>
            Why is the gold price in Iraq different from the global price?
          </h3>
          <p style={{ marginBottom: 14 }}>
            The <strong>gold price in Iraq</strong> is the international USD spot price converted to Iraqi
            Dinar. Because the IQD/USD rate is managed by the Central Bank of Iraq (CBI) and a parallel
            market rate exists, the effective price can differ slightly between official and market
            channels. This page uses the CBI official rate of approximately 1,310 IQD per USD, which you
            can adjust in the rate input above.
          </p>

          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>
            Gold price in Iraq 2026 — current trends
          </h3>
          <p style={{ marginBottom: 14 }}>
            In 2026, the <strong>iraq gold price</strong> has tracked global commodity markets closely.
            Gold broke record highs in USD terms, pushing the <strong>gold price in Iraqi Dinar</strong>
            to historic levels. Iraqi consumers and jewellers primarily trade 21K gold (عيار 21), making
            the mithqal price the most-watched daily figure in Iraqi souks.
          </p>

          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>
            How to read the Iraq gold rate table
          </h3>
          <p style={{ marginBottom: 0 }}>
            The tables above show the <strong>iraq gold rate today</strong> for common weights (gram,
            mithqal, 5g, 10g, 100g) across the four most traded karat grades. Use the calculator to
            convert any custom weight to IQD instantly. All prices update automatically from the live
            international gold spot market.
          </p>
        </div>
      </div>
    )
  }

  /* ─────────────────── ARABIC VERSION (original) ─────────────────── */
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px 80px' }}>

      {/* H1 */}
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4, lineHeight: 1.3 }}>
        سعر الذهب اليوم في العراق بالدينار العراقي
      </h1>
      <p style={{ fontSize: 13, color: 'var(--ink4)', marginBottom: 28 }}>
        {loading ? 'جاري تحميل اسعار الذهب...' : `آخر تحديث: ${gold?.updatedAt} — السعر العالمي: $${priceUSD.toFixed(2)}/أوقية`}
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
        سعر غرام الذهب في العراق اليوم
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 28 }}>
        {karats.map(k => (
          <div key={k.label} style={{
            background: 'var(--surf)', border: `1px solid ${k.color}33`,
            borderRadius: 12, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.color, fontFamily: 'var(--font-mono)' }}>
              {fmtAr(calcIQD(priceUSD, k.purity, 1, rate))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 2 }}>دينار / غرام</div>
          </div>
        ))}
      </div>

      {/* Mithqal section — most searched in Iraq */}
      <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        سعر مثقال الذهب في العراق اليوم (٤.٦٠٨ غرام)
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 28 }}>
        {karats.map(k => (
          <div key={k.label} style={{
            background: 'var(--surf)', border: `1px solid ${k.color}44`,
            borderRadius: 12, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 6 }}>مثقال {k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.color, fontFamily: 'var(--font-mono)' }}>
              {fmtAr(calcIQD(priceUSD, k.purity, MITHQAL, rate))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 2 }}>دينار / مثقال</div>
          </div>
        ))}
      </div>

      {/* Quick weights table */}
      <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        اسعار الذهب العراق اليوم — جدول الأوزان عيار 21
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
                  {fmtAr(calcIQD(priceUSD, 21/24, g, rate))}
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
        حاسبة سعر الذهب بالدينار العراقي
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
            ? fmtAr(calcIQD(priceUSD, 21/24, Number(calcGrams), rate)) + ' دينار'
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
          كيف يُحسب سعر الذهب اليوم في العراق بالدينار العراقي؟
        </h2>
        <p style={{ marginBottom: 10 }}>
          يُحدَّد <strong>سعر الذهب اليوم في العراق</strong> بناءً على <strong>سعر الذهب العالمي بالدولار</strong> لكل أونصة
          (Troy Ounce = 31.1 غرام) مضروباً بسعر صرف الدينار العراقي مقابل الدولار (1310 دينار تقريباً)،
          ثم مقسوماً على 31.1 للحصول على <strong>سعر غرام الذهب في العراق</strong>.
        </p>
        <p style={{ marginBottom: 10 }}>
          <strong>المثقال</strong> هو وحدة الوزن الأساسية في أسواق الذهب العراقية = <strong>4.608 غرام</strong>.
          <strong>سعر مثقال الذهب عيار 21</strong> هو الأكثر تداولاً وبحثاً في العراق يومياً.
        </p>
        <p style={{ marginBottom: 10 }}>
          تتغير <strong>اسعار الذهب العراق اليوم</strong> مع تذبذبات أسواق السلع العالمية.
          يمكنك تعديل <strong>سعر الصرف</strong> بالدينار العراقي أعلاه لمطابقة السعر المتداول في السوق المحلية.
        </p>
        <p>
          <strong>سعر الذهب بالدينار العراقي</strong> يعكس مزيجاً من السعر الدولي وسعر الصرف المعتمد من البنك المركزي العراقي.
        </p>
      </div>
    </div>
  )
}
