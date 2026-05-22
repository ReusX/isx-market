'use client'

export const dynamic = 'force-dynamic'

import { useState, useRef } from 'react'
import { useApp } from '@/context/AppContext'
import { fmtPts } from '@/lib/ranks'

const PRIZES = [
  { label: '+50 pts',    pts: 50,   color: '#4F6BFF', prob: 30 },
  { label: '+100 pts',   pts: 100,  color: '#22C55E', prob: 25 },
  { label: '+200 pts',   pts: 200,  color: '#A855F7', prob: 18 },
  { label: '+500 pts',   pts: 500,  color: '#F5C84B', prob: 12 },
  { label: '×2 mult',   pts: 0,    color: '#EF4444', prob: 8,  special: 'x2' },
  { label: '+1000 pts',  pts: 1000, color: '#F97316', prob: 5  },
  { label: '🎰 JACKPOT', pts: 5000, color: '#EC4899', prob: 2  },
]

function Wheel({ spinning, result }: { spinning: boolean; result: number | null }) {
  const n = PRIZES.length
  const r = 130
  const cx = 150, cy = 150

  return (
    <svg width="300" height="300" viewBox="0 0 300 300" style={{
      filter: spinning ? 'drop-shadow(0 0 20px rgba(79,107,255,0.6))' : 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
      transition: 'filter 0.3s',
    }}>
      {PRIZES.map((p, i) => {
        const startAngle = (i / n) * 2 * Math.PI - Math.PI / 2
        const endAngle   = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2
        const x1 = cx + r * Math.cos(startAngle)
        const y1 = cy + r * Math.sin(startAngle)
        const x2 = cx + r * Math.cos(endAngle)
        const y2 = cy + r * Math.sin(endAngle)
        const midAngle = (startAngle + endAngle) / 2
        const tx = cx + (r * 0.68) * Math.cos(midAngle)
        const ty = cy + (r * 0.68) * Math.sin(midAngle)
        const isWin = result === i

        return (
          <g key={i}>
            <path
              d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
              fill={p.color}
              opacity={isWin ? 1 : 0.85}
              stroke={isWin ? '#fff' : 'rgba(0,0,0,0.2)'}
              strokeWidth={isWin ? 2 : 0.5}
            />
            <text
              x={tx} y={ty}
              textAnchor="middle" dominantBaseline="middle"
              fill="#fff" fontSize="9" fontWeight="700"
              transform={`rotate(${(midAngle * 180 / Math.PI) + 90}, ${tx}, ${ty})`}
            >
              {p.label}
            </text>
          </g>
        )
      })}
      {/* Center */}
      <circle cx={cx} cy={cy} r={22} fill="#0B0E14" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="18">🎰</text>
      {/* Pointer */}
      <polygon points={`${cx},${cy - r - 10} ${cx - 10},${cy - r + 14} ${cx + 10},${cy - r + 14}`} fill="#fff" />
    </svg>
  )
}

export default function SpinPage() {
  const { lang, user, profile, authLoading, refreshProfile, openAuth } = useApp()
  const ar = lang === 'ar'

  const [spinning,  setSpinning]  = useState(false)
  const [result,    setResult]    = useState<number | null>(null)
  const [prize,     setPrize]     = useState<typeof PRIZES[0] | null>(null)
  const [error,     setError]     = useState<string | null>(null)
  const [rotation,  setRotation]  = useState(0)
  const wheelRef = useRef<SVGSVGElement>(null)

  if (authLoading) return (
    <div style={{ maxWidth: 500, margin: '80px auto', padding: '0 24px' }}>
      <div className="skeleton" style={{ height: 48, width: 48, borderRadius: '50%', margin: '0 auto 16px' }} />
      <div className="skeleton" style={{ height: 300, borderRadius: 20, marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 44, borderRadius: 12 }} />
    </div>
  )

  if (!user || !profile) return (
    <div style={{ maxWidth: 500, margin: '80px auto', textAlign: 'center', padding: '0 24px' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🎡</div>
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
        {ar ? 'سجّل للعب' : 'Sign in to spin'}
      </div>
      <button onClick={() => openAuth('signup')} style={{
        padding: '10px 24px', background: 'var(--brand)', borderRadius: 12,
        fontSize: 14, fontWeight: 700, color: '#fff', border: 'none', fontFamily: 'inherit',
      }}>
        {ar ? 'إنشاء حساب مجاني' : 'Create Free Account'}
      </button>
    </div>
  )

  async function spin() {
    if (spinning) return
    setSpinning(true)
    setResult(null)
    setPrize(null)
    setError(null)

    try {
      const res  = await fetch('/api/spin', { method: 'POST' })
      const data = await res.json()
      if (!data.ok) { setError(data.error ?? 'Error'); setSpinning(false); return }

      const prizeIdx = PRIZES.findIndex(p => p.pts === data.prize_pts && (p.special ?? '') === (data.special ?? ''))
      const idx = prizeIdx >= 0 ? prizeIdx : 0

      // Animate wheel
      const n = PRIZES.length
      const sectorAngle = 360 / n
      const targetAngle = 360 * 5 + (360 - idx * sectorAngle - sectorAngle / 2)

      if (wheelRef.current) {
        wheelRef.current.style.transition = 'transform 3.5s cubic-bezier(0.17,0.67,0.12,1)'
        wheelRef.current.style.transformOrigin = '150px 150px'
        wheelRef.current.style.transform = `rotate(${rotation + targetAngle}deg)`
        setRotation(r => r + targetAngle)
      }

      setTimeout(() => {
        setResult(idx)
        setPrize(PRIZES[idx])
        setSpinning(false)
        refreshProfile()
      }, 3600)
    } catch {
      setError(ar ? 'حدث خطأ — حاول مرة أخرى' : 'Something went wrong — try again')
      setSpinning(false)
    }
  }

  const cooldownEnds = profile.spin_cooldown_ends_at ? new Date(profile.spin_cooldown_ends_at) : null
  const onCooldown   = cooldownEnds ? cooldownEnds > new Date() : false
  const hoursLeft    = onCooldown && cooldownEnds ? Math.ceil((cooldownEnds.getTime() - Date.now()) / 3600000) : 0

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: '24px', textAlign: 'center' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
        {ar ? 'عجلة الحظ' : 'Spin the Wheel'}
      </h1>
      <p style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 24 }}>
        {ar ? 'مجاني كل 24 ساعة — اربح نقاطاً ومكافآت!' : 'Free every 24h — win points & prizes!'}
      </p>

      {/* Points display */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '6px 16px', borderRadius: 999,
        background: 'rgba(245,200,75,0.12)', border: '1px solid rgba(245,200,75,0.27)',
        marginBottom: 24,
      }}>
        <span style={{ fontSize: 14 }}>₽</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold)', fontSize: 14 }}>
          {fmtPts(profile.points)}
        </span>
        <span style={{ fontSize: 11, color: 'var(--ink4)' }}>{ar ? 'نقطة' : 'pts'}</span>
      </div>

      {/* Wheel */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <svg ref={wheelRef} width="300" height="300" viewBox="0 0 300 300" style={{
          filter: spinning ? 'drop-shadow(0 0 20px rgba(79,107,255,0.6))' : 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
          transition: 'filter 0.3s',
        }}>
          {PRIZES.map((p, i) => {
            const n = PRIZES.length
            const r = 130
            const cx = 150, cy = 150
            const startAngle = (i / n) * 2 * Math.PI - Math.PI / 2
            const endAngle   = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2
            const x1 = cx + r * Math.cos(startAngle)
            const y1 = cy + r * Math.sin(startAngle)
            const x2 = cx + r * Math.cos(endAngle)
            const y2 = cy + r * Math.sin(endAngle)
            const midAngle = (startAngle + endAngle) / 2
            const tx = cx + (r * 0.68) * Math.cos(midAngle)
            const ty = cy + (r * 0.68) * Math.sin(midAngle)
            const isWin = result === i
            return (
              <g key={i}>
                <path
                  d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
                  fill={p.color} opacity={isWin ? 1 : 0.85}
                  stroke={isWin ? '#fff' : 'rgba(0,0,0,0.2)'} strokeWidth={isWin ? 2 : 0.5}
                />
                <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle"
                  fill="#fff" fontSize="9" fontWeight="700"
                  transform={`rotate(${(midAngle * 180 / Math.PI) + 90}, ${tx}, ${ty})`}>
                  {p.label}
                </text>
              </g>
            )
          })}
          <circle cx={150} cy={150} r={22} fill="#0B0E14" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
          <text x={150} y={150} textAnchor="middle" dominantBaseline="middle" fontSize="18">🎰</text>
          <polygon points="150,8 140,32 160,32" fill="#fff" />
        </svg>
      </div>

      {/* Result */}
      {prize && (
        <div style={{
          padding: '16px 24px', borderRadius: 16, marginBottom: 20,
          background: `${prize.color}22`, border: `1px solid ${prize.color}`,
          animation: 'pulse 0.5s ease-out',
        }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🎉</div>
          <div style={{ fontWeight: 800, fontSize: 18, color: prize.color }}>{prize.label}</div>
          <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 4 }}>
            {ar ? 'تمت إضافتها لحسابك!' : 'Added to your account!'}
          </div>
        </div>
      )}

      {error && (
        <div style={{
          padding: '10px 16px', borderRadius: 12, marginBottom: 20,
          background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
          fontSize: 13, color: 'var(--dn)',
        }}>{error}</div>
      )}

      {/* Spin button */}
      {onCooldown ? (
        <div style={{ padding: '14px', borderRadius: 14, background: 'var(--surf)', border: '1px solid var(--line)', fontSize: 13, color: 'var(--ink3)' }}>
          {ar ? `يمكنك الدوران مجدداً بعد ${hoursLeft} ساعة` : `Next spin in ${hoursLeft}h`}
        </div>
      ) : (
        <button onClick={spin} disabled={spinning} style={{
          width: '100%', padding: '14px', borderRadius: 14, border: 'none',
          background: spinning ? 'var(--surf3)' : 'linear-gradient(135deg, #4F6BFF, #A855F7)',
          color: spinning ? 'var(--ink4)' : '#fff',
          fontWeight: 800, fontSize: 16, fontFamily: 'inherit',
          boxShadow: spinning ? 'none' : '0 4px 20px rgba(79,107,255,0.4)',
          transition: 'all 0.3s',
        }}>
          {spinning ? (ar ? 'جارٍ الدوران...' : 'Spinning...') : (ar ? '🎡 دوّر الآن!' : '🎡 Spin Now!')}
        </button>
      )}

      {/* Prizes table */}
      <div style={{ marginTop: 28, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', fontSize: 12, fontWeight: 700, color: 'var(--ink3)' }}>
          {ar ? 'جدول الجوائز' : 'Prize Table'}
        </div>
        {PRIZES.map((p, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 16px', borderBottom: '1px solid var(--line)', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: p.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600 }}>{p.label}</span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--ink4)' }}>{p.prob}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
