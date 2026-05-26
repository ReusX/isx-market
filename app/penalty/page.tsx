'use client'

import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/context/AppContext'
import Link from 'next/link'

type Zone = 'TL'|'TC'|'TR'|'ML'|'MC'|'MR'|'BL'|'BC'|'BR'
type KeeperSide = 'L'|'C'|'R'
type Phase = 'idle'|'shooting'|'result'

const ZONE_POS: Record<Zone, { x: number; y: number }> = {
  TL: { x: 18,  y: 18  }, TC: { x: 50,  y: 18  }, TR: { x: 82,  y: 18  },
  ML: { x: 18,  y: 50  }, MC: { x: 50,  y: 50  }, MR: { x: 82,  y: 50  },
  BL: { x: 18,  y: 78  }, BC: { x: 50,  y: 78  }, BR: { x: 82,  y: 78  },
}

const KEEPER_X: Record<KeeperSide, number> = { L: 15, C: 50, R: 85 }

const ZONES: Zone[] = ['TL','TC','TR','ML','MC','MR','BL','BC','BR']

export default function PenaltyPage() {
  const { user, profile, refreshProfile, openAuth, lang } = useApp()
  const ar = lang === 'ar'

  const [phase, setPhase]       = useState<Phase>('idle')
  const [shotsLeft, setShotsLeft] = useState(10)
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null)
  const [keeperSide, setKeeperSide]     = useState<KeeperSide>('C')
  const [scored, setScored]     = useState<boolean | null>(null)
  const [totalToday, setTotalToday]     = useState(0)
  const [ballPos, setBallPos]   = useState({ x: 50, y: 105 })
  const [keeperX, setKeeperX]   = useState(50)
  const [ballVisible, setBallVisible] = useState(false)
  const [hover, setHover]       = useState<Zone | null>(null)
  const [loading, setLoading]   = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (!user) return
    fetch('/api/penalty').then(r => r.json()).then(d => setShotsLeft(d.shotsLeft ?? 10))
  }, [user])

  function clearTimeouts() {
    timeoutRef.current.forEach(clearTimeout)
    timeoutRef.current = []
  }

  async function shoot(zone: Zone) {
    if (phase !== 'idle' || shotsLeft <= 0 || loading) return
    if (!user) { openAuth('signin'); return }

    setLoading(true)
    setSelectedZone(zone)
    setPhase('shooting')
    setBallVisible(true)
    setBallPos({ x: 50, y: 105 })   // reset ball to penalty spot

    // Call API first so keeper side is determined
    const res = await fetch('/api/penalty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zone }),
    })
    const data = await res.json()
    setLoading(false)

    if (data.error === 'daily_limit') {
      setShotsLeft(0)
      setPhase('idle')
      setBallVisible(false)
      return
    }

    const ks: KeeperSide = data.keeperSide
    const sc: boolean    = data.scored

    // Animate: ball flies to zone, keeper dives simultaneously
    const t1 = setTimeout(() => {
      setBallPos(ZONE_POS[zone])
      setKeeperX(KEEPER_X[ks])
      setKeeperSide(ks)
    }, 50)

    // Show result after animation
    const t2 = setTimeout(() => {
      setScored(sc)
      setPhase('result')
      setShotsLeft(data.shotsLeft)
      setTotalToday(prev => prev + 1)
      if (sc) refreshProfile()
    }, 750)

    // Reset for next shot
    const t3 = setTimeout(() => {
      setPhase('idle')
      setBallVisible(false)
      setBallPos({ x: 50, y: 105 })
      setKeeperX(50)
      setSelectedZone(null)
      setScored(null)
    }, 2800)

    timeoutRef.current = [t1, t2, t3]
  }

  const maxShots = 10
  const shotsUsed = maxShots - shotsLeft
  const done = shotsLeft <= 0

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 16px 100px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>
            {ar ? '⚽ ركلة الجزاء' : '⚽ Penalty Shootout'}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink3)', margin: '4px 0 0' }}>
            {ar ? 'سجل هدفاً واحصل على 100 نقطة — حد 10 ركلات يومياً'
                : 'Score to earn 100 pts — max 10 shots per day'}
          </p>
        </div>
        <Link href="/quests" style={{ fontSize: 12, color: 'var(--brand)', fontWeight: 600 }}>
          {ar ? '← العودة' : '← Back'}
        </Link>
      </div>

      {/* Points info */}
      <div style={{
        background: 'var(--surf)', border: '1px solid var(--line)',
        borderRadius: 12, padding: '12px 16px', marginBottom: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--gold)' }}>
              {totalToday * 100}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink4)' }}>
              {ar ? 'نقاط اليوم' : "Today's pts"}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--ink2)' }}>
              {shotsLeft}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink4)' }}>
              {ar ? 'ركلات متبقية' : 'Shots left'}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--ink2)' }}>
              {(profile?.points ?? 0).toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink4)' }}>
              {ar ? 'مجموع نقاطك' : 'Total points'}
            </div>
          </div>
        </div>

        {/* Shot dots */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 80, justifyContent: 'flex-end' }}>
          {Array.from({ length: maxShots }).map((_, i) => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: '50%',
              background: i < shotsUsed ? 'var(--brand)' : 'var(--surf3)',
              border: '1px solid var(--line2)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>
      </div>

      {/* GOAL / PITCH */}
      <div style={{
        background: 'linear-gradient(180deg, #1a6b2e 0%, #1e7a34 50%, #1a6b2e 100%)',
        borderRadius: 16, padding: '24px 16px 32px',
        position: 'relative', overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        {/* Pitch lines */}
        <div style={{
          position: 'absolute', bottom: 0, left: '10%', right: '10%', height: 1,
          background: 'rgba(255,255,255,0.15)',
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: '30%', right: '30%', height: 40,
          border: '1px solid rgba(255,255,255,0.15)', borderBottom: 'none',
          borderRadius: '4px 4px 0 0',
        }} />

        {/* GOAL frame */}
        <div style={{ position: 'relative', margin: '0 auto', width: '85%' }}>

          {/* Crossbar + posts */}
          <div style={{
            position: 'absolute', top: 0, left: -6, right: -6, height: 6,
            background: '#fff', borderRadius: '3px 3px 0 0', zIndex: 10,
            boxShadow: '0 0 12px rgba(255,255,255,0.4)',
          }} />
          <div style={{
            position: 'absolute', top: 0, left: -6, width: 6, height: '100%',
            background: '#fff', borderRadius: '3px 0 0 3px', zIndex: 10,
          }} />
          <div style={{
            position: 'absolute', top: 0, right: -6, width: 6, height: '100%',
            background: '#fff', borderRadius: '0 3px 3px 0', zIndex: 10,
          }} />

          {/* Net pattern */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.07) 0, rgba(255,255,255,0.07) 1px, transparent 0, transparent 14%), repeating-linear-gradient(90deg, rgba(255,255,255,0.07) 0, rgba(255,255,255,0.07) 1px, transparent 0, transparent 14%)',
          }} />

          {/* Goal area — relative container for the game */}
          <div style={{ position: 'relative', paddingTop: '55%', background: 'rgba(0,0,0,0.35)' }}>

            {/* KEEPER */}
            <div style={{
              position: 'absolute',
              bottom: 8,
              left: `${keeperX}%`,
              transform: 'translateX(-50%)',
              transition: phase === 'shooting' ? 'left 0.55s cubic-bezier(0.4,0,0.2,1)' : 'none',
              zIndex: 4,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
              {/* Keeper body */}
              <div style={{
                width: 28, height: 36,
                background: 'linear-gradient(180deg, #FF6B00 0%, #FF8C00 100%)',
                borderRadius: '6px 6px 0 0',
                position: 'relative',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              }}>
                {/* Arms */}
                <div style={{
                  position: 'absolute', top: 8, left: -16, width: 16, height: 5,
                  background: '#FF6B00', borderRadius: 3,
                  transform: phase === 'shooting' && keeperSide === 'L' ? 'rotate(-30deg)' :
                             phase === 'shooting' && keeperSide === 'R' ? 'rotate(10deg)' : 'rotate(-10deg)',
                  transition: 'transform 0.4s',
                }} />
                <div style={{
                  position: 'absolute', top: 8, right: -16, width: 16, height: 5,
                  background: '#FF6B00', borderRadius: 3,
                  transform: phase === 'shooting' && keeperSide === 'R' ? 'rotate(30deg)' :
                             phase === 'shooting' && keeperSide === 'L' ? 'rotate(-10deg)' : 'rotate(10deg)',
                  transition: 'transform 0.4s',
                }} />
              </div>
              {/* Head */}
              <div style={{
                width: 18, height: 18, borderRadius: '50%',
                background: '#FDBCB4', border: '2px solid rgba(0,0,0,0.2)',
                marginBottom: 2, order: -1,
              }} />
              {/* Legs */}
              <div style={{ display: 'flex', gap: 4 }}>
                <div style={{ width: 10, height: 16, background: '#1a1a2e', borderRadius: '0 0 3px 3px' }} />
                <div style={{ width: 10, height: 16, background: '#1a1a2e', borderRadius: '0 0 3px 3px' }} />
              </div>
            </div>

            {/* BALL */}
            {ballVisible && (
              <div style={{
                position: 'absolute',
                left: `${ballPos.x}%`,
                top: ballPos.y > 100 ? '92%' : `${ballPos.y}%`,
                transform: 'translate(-50%, -50%)',
                transition: phase === 'shooting' ? 'left 0.6s cubic-bezier(0.2,0,0.8,1), top 0.6s cubic-bezier(0.4,0.2,0.6,0.8)' : 'none',
                zIndex: 5,
                fontSize: 24,
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.6))',
                pointerEvents: 'none',
              }}>
                ⚽
              </div>
            )}

            {/* ZONE GRID — 3×3 clickable zones */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
              gridTemplateRows: '1fr 1fr 1fr',
              zIndex: 6,
            }}>
              {ZONES.map(z => (
                <button
                  key={z}
                  disabled={phase !== 'idle' || done}
                  onMouseEnter={() => setHover(z)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => shoot(z)}
                  style={{
                    background: hover === z && phase === 'idle' && !done
                      ? 'rgba(255,255,255,0.18)'
                      : selectedZone === z
                      ? scored === true  ? 'rgba(34,197,94,0.3)'
                        : scored === false ? 'rgba(239,68,68,0.3)'
                        : 'rgba(255,255,255,0.22)'
                      : 'transparent',
                    border: hover === z && phase === 'idle' && !done ? '1px solid rgba(255,255,255,0.4)' : '1px solid transparent',
                    cursor: phase === 'idle' && !done ? 'crosshair' : 'default',
                    borderRadius: 4,
                    transition: 'background 0.15s, border 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {hover === z && phase === 'idle' && !done && (
                    <div style={{
                      width: 12, height: 12, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.7)',
                      boxShadow: '0 0 8px rgba(255,255,255,0.8)',
                    }} />
                  )}
                </button>
              ))}
            </div>

            {/* Result overlay */}
            {phase === 'result' && scored !== null && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 10, pointerEvents: 'none',
              }}>
                <div style={{
                  background: scored ? 'rgba(34,197,94,0.92)' : 'rgba(239,68,68,0.92)',
                  color: '#fff', fontWeight: 900,
                  fontSize: scored ? 36 : 28,
                  padding: '10px 28px', borderRadius: 16,
                  boxShadow: scored ? '0 0 32px rgba(34,197,94,0.8)' : '0 0 24px rgba(239,68,68,0.6)',
                  animation: 'popIn 0.25s cubic-bezier(0.4,0,0.2,1)',
                }}>
                  {scored
                    ? (ar ? '🎉 هدف! +100' : '🎉 GOAL! +100')
                    : (ar ? '🧤 صدّ الحارس!' : '🧤 SAVED!')}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Instruction below goal */}
        {phase === 'idle' && !done && (
          <p style={{
            textAlign: 'center', marginTop: 16, marginBottom: 0,
            fontSize: 13, color: 'rgba(255,255,255,0.6)',
          }}>
            {ar ? '👆 اختر زاوية لتسديد الكرة' : '👆 Click a zone to shoot'}
          </p>
        )}

        {done && (
          <div style={{
            textAlign: 'center', marginTop: 20, padding: '16px',
            background: 'rgba(0,0,0,0.4)', borderRadius: 12,
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🏆</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#fff', marginBottom: 4 }}>
              {ar ? 'انتهت ركلاتك اليوم!' : "All done for today!"}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
              {ar ? `سجّلت ${totalToday * 100} نقطة — عُد غداً لمزيد`
                  : `You earned ${totalToday * 100} pts — come back tomorrow`}
            </div>
          </div>
        )}
      </div>

      {/* Login prompt */}
      {!user && (
        <div style={{
          marginTop: 16, textAlign: 'center',
          background: 'var(--surf)', border: '1px solid var(--line)',
          borderRadius: 12, padding: '16px',
        }}>
          <div style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 10 }}>
            {ar ? 'سجّل الدخول للعب وكسب النقاط' : 'Sign in to play and earn points'}
          </div>
          <button
            onClick={() => openAuth('signin')}
            style={{
              padding: '9px 24px', background: 'var(--brand)', color: '#fff',
              border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {ar ? 'تسجيل الدخول' : 'Sign In'}
          </button>
        </div>
      )}

      {/* How it works */}
      <div style={{
        marginTop: 20, background: 'var(--surf)', border: '1px solid var(--line)',
        borderRadius: 12, padding: '16px',
      }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--ink2)' }}>
          {ar ? 'كيف تلعب؟' : 'How it works'}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            ar ? ['⚽', 'اختر أي خانة من المرمى لتسدّد'] : ['⚽', 'Click any zone in the goal to shoot'],
            ar ? ['🧤', 'الحارس يتحرك بشكل عشوائي — إذا اختلف الاتجاه فهو هدف!'] : ['🧤', 'Keeper dives randomly — different direction = GOAL!'],
            ar ? ['💰', '100 نقطة لكل هدف — حد 1000 نقطة يومياً (10 ركلات)'] : ['💰', '100 pts per goal — max 1,000 pts/day (10 shots)'],
          ].map(([icon, text], i) => (
            <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13, color: 'var(--ink3)', alignItems: 'flex-start' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes popIn {
          from { transform: scale(0.6); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  )
}
