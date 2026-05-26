'use client'

import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/context/AppContext'
import Link from 'next/link'

type Zone = 'TL'|'TC'|'TR'|'ML'|'MC'|'MR'|'BL'|'BC'|'BR'
type KeeperSide = 'L'|'C'|'R'
type Phase = 'idle'|'shooting'|'result'

const ZONE_POS: Record<Zone, { x: number; y: number }> = {
  TL: { x: 18, y: 15 }, TC: { x: 50, y: 15 }, TR: { x: 82, y: 15 },
  ML: { x: 18, y: 48 }, MC: { x: 50, y: 48 }, MR: { x: 82, y: 48 },
  BL: { x: 18, y: 76 }, BC: { x: 50, y: 76 }, BR: { x: 82, y: 76 },
}
const KEEPER_X: Record<KeeperSide, number> = { L: 14, C: 50, R: 86 }
const ZONES: Zone[] = ['TL','TC','TR','ML','MC','MR','BL','BC','BR']

// ── Goalkeeper figure ────────────────────────────────────────────────────────
function Goalkeeper({ side, diving }: { side: KeeperSide; diving: boolean }) {
  const angle = diving ? (side === 'L' ? -55 : side === 'R' ? 55 : 0) : 0
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      transform: `rotate(${angle}deg)`,
      transformOrigin: 'center 76%',
      transition: diving ? 'transform 0.48s cubic-bezier(0.22, 0, 0.32, 1)' : 'none',
      filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.6))',
    }}>

      {/* Head — Noor Sabri face slapped on like a meme photo */}
      <div style={{
        width: 34, height: 34,
        position: 'relative', marginBottom: 1, zIndex: 2,
        /* slight tilt + paper-stuck look */
        transform: 'rotate(-4deg)',
        filter: 'drop-shadow(2px 3px 4px rgba(0,0,0,0.7))',
      }}>
        {/* The photo itself */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/keeper-face.webp"
          alt="keeper"
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover',
            objectPosition: '50% 20%',   /* crop to face area */
            borderRadius: '3px',
            border: '2px solid #fff',    /* white photo border */
            display: 'block',
          }}
        />
      </div>

      {/* Neck */}
      <div style={{ width: 10, height: 4, background: '#D9897A', zIndex: 2 }} />

      {/* Arms + Jersey wrapper */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        {/* Left arm */}
        <div style={{
          position: 'absolute', top: 9, left: -24,
          width: 26, height: 9,
          background: 'linear-gradient(90deg, #E67300, #FF8C1A)',
          borderRadius: '4px 0 0 4px',
        }}>
          {/* Left glove */}
          <div style={{
            position: 'absolute', left: -8, top: -4,
            width: 13, height: 15,
            background: 'linear-gradient(145deg, #FFE44D, #F0A800)',
            borderRadius: '3px 3px 5px 5px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.35)',
            border: '1px solid rgba(0,0,0,0.12)',
          }}>
            {/* Glove fingers */}
            <div style={{ position: 'absolute', top: 1, left: 1, right: 1, height: 2, background: 'rgba(0,0,0,0.1)', borderRadius: 1 }} />
            <div style={{ position: 'absolute', top: 4, left: 1, right: 1, height: 2, background: 'rgba(0,0,0,0.1)', borderRadius: 1 }} />
          </div>
        </div>

        {/* Right arm */}
        <div style={{
          position: 'absolute', top: 9, right: -24,
          width: 26, height: 9,
          background: 'linear-gradient(90deg, #FF8C1A, #E67300)',
          borderRadius: '0 4px 4px 0',
        }}>
          {/* Right glove */}
          <div style={{
            position: 'absolute', right: -8, top: -4,
            width: 13, height: 15,
            background: 'linear-gradient(145deg, #FFE44D, #F0A800)',
            borderRadius: '3px 3px 5px 5px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.35)',
            border: '1px solid rgba(0,0,0,0.12)',
          }}>
            <div style={{ position: 'absolute', top: 1, left: 1, right: 1, height: 2, background: 'rgba(0,0,0,0.1)', borderRadius: 1 }} />
            <div style={{ position: 'absolute', top: 4, left: 1, right: 1, height: 2, background: 'rgba(0,0,0,0.1)', borderRadius: 1 }} />
          </div>
        </div>

        {/* Jersey body */}
        <div style={{
          width: 38, height: 40,
          background: 'linear-gradient(160deg, #FF8C00 0%, #E55500 100%)',
          borderRadius: '6px 6px 2px 2px',
          boxShadow: 'inset 0 3px 8px rgba(255,180,0,0.25), inset 0 -6px 10px rgba(0,0,0,0.25)',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Jersey collar */}
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 14, height: 7, borderRadius: '0 0 6px 6px', border: '2px solid rgba(255,255,255,0.25)', borderTop: 'none' }} />
          {/* Horizontal stripe */}
          <div style={{ position: 'absolute', top: 12, left: 0, right: 0, height: 6, background: 'rgba(255,255,255,0.12)' }} />
          {/* Jersey number */}
          <div style={{ position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)', fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.45)', lineHeight: 1 }}>1</div>
        </div>
      </div>

      {/* Shorts */}
      <div style={{
        width: 38, height: 14,
        background: 'linear-gradient(180deg, #0d1a6e 0%, #091250 100%)',
        display: 'flex', gap: 2, padding: '1px 2px 2px', zIndex: 2,
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)',
      }}>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '0 0 1px 1px' }} />
        <div style={{ width: 1, background: 'rgba(0,0,0,0.3)' }} />
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '0 0 1px 1px' }} />
      </div>

      {/* Socks */}
      <div style={{ display: 'flex', gap: 4, zIndex: 2 }}>
        <div style={{ width: 14, height: 20, background: 'linear-gradient(180deg, #f5f5f5, #ddd)', borderRadius: '0 0 1px 1px', boxShadow: 'inset -2px 0 3px rgba(0,0,0,0.08)' }} />
        <div style={{ width: 14, height: 20, background: 'linear-gradient(180deg, #f5f5f5, #ddd)', borderRadius: '0 0 1px 1px', boxShadow: 'inset 2px 0 3px rgba(0,0,0,0.08)' }} />
      </div>

      {/* Boots */}
      <div style={{ display: 'flex', gap: 2, zIndex: 2 }}>
        <div style={{ width: 17, height: 8, background: 'linear-gradient(135deg, #333, #111)', borderRadius: '2px 3px 4px 4px', boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }} />
        <div style={{ width: 17, height: 8, background: 'linear-gradient(135deg, #333, #111)', borderRadius: '3px 2px 4px 4px', boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }} />
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function PenaltyPage() {
  const { user, profile, refreshProfile, openAuth, lang } = useApp()
  const ar = lang === 'ar'

  const [phase, setPhase]             = useState<Phase>('idle')
  const [shotsLeft, setShotsLeft]     = useState(10)
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null)
  const [keeperSide, setKeeperSide]   = useState<KeeperSide>('C')
  const [scored, setScored]           = useState<boolean | null>(null)
  const [totalToday, setTotalToday]   = useState(0)
  const [ballPos, setBallPos]         = useState({ x: 50, y: 105 })
  const [keeperX, setKeeperX]         = useState(50)
  const [ballVisible, setBallVisible] = useState(false)
  const [hover, setHover]             = useState<Zone | null>(null)
  const [loading, setLoading]         = useState(false)
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
    setBallPos({ x: 50, y: 105 })

    const res = await fetch('/api/penalty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zone }),
    })
    const data = await res.json()
    setLoading(false)

    if (data.error === 'daily_limit') {
      setShotsLeft(0); setPhase('idle'); setBallVisible(false); return
    }

    const ks: KeeperSide = data.keeperSide
    const sc: boolean    = data.scored

    const t1 = setTimeout(() => {
      setBallPos(ZONE_POS[zone])
      setKeeperX(KEEPER_X[ks])
      setKeeperSide(ks)
    }, 50)
    const t2 = setTimeout(() => {
      setScored(sc); setPhase('result')
      setShotsLeft(data.shotsLeft)
      setTotalToday(prev => prev + 1)
      if (sc) refreshProfile()
    }, 750)
    const t3 = setTimeout(() => {
      setPhase('idle'); setBallVisible(false)
      setBallPos({ x: 50, y: 105 })
      setKeeperX(50); setSelectedZone(null); setScored(null)
    }, 2800)

    timeoutRef.current = [t1, t2, t3]
  }

  const maxShots = 10
  const shotsUsed = maxShots - shotsLeft
  const done = shotsLeft <= 0

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px 100px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>
            {ar ? '⚽ ركلة الجزاء' : '⚽ Penalty Shootout'}
          </h1>
          <p style={{ fontSize: 12, color: 'var(--ink3)', margin: '3px 0 0' }}>
            {ar ? 'سجل هدفاً واحصل على 100 نقطة — حد 10 ركلات يومياً'
                : 'Score to earn 100 pts — max 10 shots per day'}
          </p>
        </div>
        <Link href="/quests" style={{ fontSize: 12, color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>
          {ar ? '← العودة' : '← Back'}
        </Link>
      </div>

      {/* ── Stats bar ── */}
      <div style={{
        background: 'var(--surf)', border: '1px solid var(--line)',
        borderRadius: 12, padding: '12px 16px', marginBottom: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', gap: 20 }}>
          {[
            { val: totalToday * 100, label: ar ? 'نقاط اليوم' : "Today's pts", color: 'var(--gold)' },
            { val: shotsLeft,        label: ar ? 'ركلات متبقية' : 'Shots left', color: 'var(--ink2)' },
            { val: (profile?.points ?? 0).toLocaleString(), label: ar ? 'مجموع نقاطك' : 'Total pts', color: 'var(--ink2)' },
          ].map(({ val, label, color }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color, lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
        {/* Shot dots */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 76, justifyContent: 'flex-end' }}>
          {Array.from({ length: maxShots }).map((_, i) => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: '50%',
              background: i < shotsUsed ? 'var(--brand)' : 'var(--surf3)',
              border: '1px solid var(--line2)', transition: 'background 0.3s',
            }} />
          ))}
        </div>
      </div>

      {/* ── Stadium ── */}
      <div style={{ borderRadius: 18, overflow: 'hidden', boxShadow: '0 12px 48px rgba(0,0,0,0.55)' }}>

        {/* Crowd / stands atmosphere */}
        <div style={{
          height: 36,
          background: 'linear-gradient(180deg, #0c0e1c 0%, #141830 70%, #152a1a 100%)',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Crowd dots simulation */}
          {[...Array(32)].map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${(i / 32) * 100 + Math.sin(i) * 1.5}%`,
              top: `${20 + Math.sin(i * 1.7) * 14 + Math.cos(i * 0.9) * 8}%`,
              width: 6, height: 6, borderRadius: '50%',
              background: ['#e53935','#1565c0','#f9a825','#2e7d32','#fff','#e91e63'][i % 6],
              opacity: 0.55 + Math.sin(i) * 0.2,
            }} />
          ))}
          {/* Stadium lights glow */}
          <div style={{ position: 'absolute', top: -10, left: '20%', width: 60, height: 30, background: 'rgba(255,240,180,0.07)', borderRadius: '50%', filter: 'blur(10px)' }} />
          <div style={{ position: 'absolute', top: -10, right: '20%', width: 60, height: 30, background: 'rgba(255,240,180,0.07)', borderRadius: '50%', filter: 'blur(10px)' }} />
        </div>

        {/* Pitch green area */}
        <div style={{
          background: '#1c7832',
          backgroundImage: 'repeating-linear-gradient(90deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 24px, rgba(0,0,0,0.055) 24px, rgba(0,0,0,0.055) 48px)',
          paddingTop: 16,
          position: 'relative',
        }}>

          {/* ── Goal structure ── */}
          <div style={{ width: '88%', margin: '0 auto', position: 'relative' }}>

            {/* Goal interior (net + dark bg) */}
            <div style={{
              position: 'relative',
              paddingTop: '54%',
              background: 'linear-gradient(170deg, #060810 0%, #0b1020 60%, #0e1828 100%)',
              overflow: 'hidden',
            }}>
              {/* Net lines */}
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: `
                  repeating-linear-gradient(0deg,   rgba(200,220,255,0.09) 0, rgba(200,220,255,0.09) 1px, transparent 1px, transparent 15px),
                  repeating-linear-gradient(90deg,  rgba(200,220,255,0.09) 0, rgba(200,220,255,0.09) 1px, transparent 1px, transparent 15px)
                `,
              }} />
              {/* Net depth shadow — left wall */}
              <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '10%', background: 'linear-gradient(90deg, rgba(0,0,0,0.55), transparent)', pointerEvents: 'none' }} />
              {/* Net depth shadow — right wall */}
              <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '10%', background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.55))', pointerEvents: 'none' }} />
              {/* Net depth shadow — top/ceiling */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '18%', background: 'linear-gradient(180deg, rgba(0,0,0,0.6), transparent)', pointerEvents: 'none' }} />
              {/* Net floor brightness */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '20%', background: 'linear-gradient(0deg, rgba(30,80,40,0.35), transparent)', pointerEvents: 'none' }} />

              {/* ── KEEPER ── */}
              <div style={{
                position: 'absolute',
                bottom: 2,
                left: `${keeperX}%`,
                transform: 'translateX(-50%)',
                transition: 'left 0.48s cubic-bezier(0.22, 0, 0.32, 1)',
                zIndex: 4,
              }}>
                <Goalkeeper side={keeperSide} diving={phase === 'shooting'} />
              </div>

              {/* ── BALL ── */}
              {ballVisible && (
                <div style={{
                  position: 'absolute',
                  left: `${ballPos.x}%`,
                  top: ballPos.y > 100 ? '90%' : `${ballPos.y}%`,
                  transform: 'translate(-50%, -50%)',
                  transition: phase === 'shooting'
                    ? 'left 0.62s cubic-bezier(0.18,0,0.6,1), top 0.62s cubic-bezier(0.35,0.1,0.5,1)'
                    : 'none',
                  zIndex: 5,
                  fontSize: 30,
                  lineHeight: 1,
                  filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.8))',
                  pointerEvents: 'none',
                }}>
                  ⚽
                </div>
              )}

              {/* ── ZONE GRID ── */}
              <div dir="ltr" style={{
                position: 'absolute', inset: 0,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
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
                        ? 'rgba(255,255,255,0.14)'
                        : selectedZone === z
                          ? scored === true  ? 'rgba(34,197,94,0.28)'
                          : scored === false ? 'rgba(239,68,68,0.28)'
                          : 'rgba(255,255,255,0.18)'
                        : 'transparent',
                      border: hover === z && phase === 'idle' && !done
                        ? '1px solid rgba(255,255,255,0.35)'
                        : '1px solid transparent',
                      cursor: phase === 'idle' && !done ? 'crosshair' : 'default',
                      borderRadius: 4,
                      transition: 'background 0.12s, border 0.12s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {hover === z && phase === 'idle' && !done && (
                      <div style={{
                        width: 14, height: 14, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.75)',
                        boxShadow: '0 0 10px 4px rgba(255,255,255,0.3)',
                      }} />
                    )}
                  </button>
                ))}
              </div>

              {/* ── RESULT OVERLAY ── */}
              {phase === 'result' && scored !== null && (
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 10, pointerEvents: 'none',
                }}>
                  <div style={{
                    background: scored
                      ? 'linear-gradient(135deg, rgba(16,185,80,0.95), rgba(5,140,50,0.95))'
                      : 'linear-gradient(135deg, rgba(220,40,40,0.95), rgba(170,20,20,0.95))',
                    color: '#fff', fontWeight: 900,
                    fontSize: scored ? 34 : 26,
                    padding: '12px 32px', borderRadius: 18,
                    boxShadow: scored
                      ? '0 0 40px rgba(16,185,80,0.7), inset 0 1px 0 rgba(255,255,255,0.2)'
                      : '0 0 30px rgba(220,40,40,0.6), inset 0 1px 0 rgba(255,255,255,0.15)',
                    animation: 'popIn 0.22s cubic-bezier(0.34,1.4,0.64,1)',
                    textShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    letterSpacing: '-0.5px',
                  }}>
                    {scored
                      ? (ar ? '🎉 هدف! +100' : '🎉 GOAL! +100')
                      : (ar ? '🧤 صدّ الحارس!' : '🧤 SAVED!')}
                  </div>
                </div>
              )}
            </div>

            {/* ── GOAL POSTS (rendered on top of interior) ── */}
            {/* Crossbar */}
            <div style={{
              position: 'absolute', top: -7, left: -11, right: -11, height: 11,
              background: 'linear-gradient(180deg, #ffffff 30%, #d0d0d0 100%)',
              borderRadius: '4px 4px 1px 1px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.65), inset 0 2px 0 rgba(255,255,255,0.9), inset 0 -2px 4px rgba(0,0,0,0.15)',
              zIndex: 10,
            }} />
            {/* Left post */}
            <div style={{
              position: 'absolute', top: -7, left: -11, width: 11, height: 'calc(100% + 7px)',
              background: 'linear-gradient(90deg, #b8b8b8 0%, #ffffff 45%, #e0e0e0 100%)',
              borderRadius: '4px 0 0 0',
              boxShadow: '-4px 6px 14px rgba(0,0,0,0.5), inset 3px 0 6px rgba(255,255,255,0.4)',
              zIndex: 10,
            }} />
            {/* Right post */}
            <div style={{
              position: 'absolute', top: -7, right: -11, width: 11, height: 'calc(100% + 7px)',
              background: 'linear-gradient(90deg, #e0e0e0 0%, #ffffff 55%, #b8b8b8 100%)',
              borderRadius: '0 4px 0 0',
              boxShadow: '4px 6px 14px rgba(0,0,0,0.5), inset -3px 0 6px rgba(255,255,255,0.4)',
              zIndex: 10,
            }} />
          </div>

          {/* ── PITCH below goal ── */}
          <div style={{
            height: 90,
            background: '#1c7832',
            backgroundImage: 'repeating-linear-gradient(90deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 24px, rgba(0,0,0,0.055) 24px, rgba(0,0,0,0.055) 48px)',
            position: 'relative',
            borderTop: '1px solid rgba(0,0,0,0.15)',
          }}>
            {/* Goal area box (6-yard box) */}
            <div style={{
              position: 'absolute', top: 0, left: '22%', right: '22%', height: 28,
              border: '1.5px solid rgba(255,255,255,0.35)',
              borderTop: 'none',
              borderRadius: '0 0 2px 2px',
            }} />
            {/* Penalty area box (18-yard box) */}
            <div style={{
              position: 'absolute', top: 0, left: '10%', right: '10%', height: 56,
              border: '1.5px solid rgba(255,255,255,0.3)',
              borderTop: 'none',
              borderRadius: '0 0 3px 3px',
            }} />
            {/* Penalty spot */}
            <div style={{
              position: 'absolute', top: 62, left: '50%', transform: 'translateX(-50%)',
              width: 7, height: 7, borderRadius: '50%',
              background: 'rgba(255,255,255,0.75)',
              boxShadow: '0 0 4px rgba(255,255,255,0.4)',
            }} />
            {/* Penalty arc (D) */}
            <div style={{
              position: 'absolute', top: 28, left: '50%',
              width: 80, height: 80,
              border: '1.5px solid rgba(255,255,255,0.28)',
              borderRadius: '50%',
              transform: 'translateX(-50%)',
              clip: 'rect(0, 80px, 40px, 0)',  // show only bottom half
            }} />

            {/* Ball shadow on pitch (when ball is at penalty spot) */}
            {ballVisible && ballPos.y > 90 && (
              <div style={{
                position: 'absolute', top: 56, left: '50%', transform: 'translateX(-50%)',
                width: 24, height: 8, borderRadius: '50%',
                background: 'rgba(0,0,0,0.35)',
                filter: 'blur(3px)',
              }} />
            )}

            {/* Instruction text on pitch */}
            {phase === 'idle' && !done && (
              <div style={{
                position: 'absolute', bottom: 10, left: 0, right: 0,
                textAlign: 'center',
                fontSize: 12, color: 'rgba(255,255,255,0.55)',
                fontWeight: 600, letterSpacing: '0.02em',
              }}>
                {ar ? '👆 اختر زاوية لتسدّد' : '👆 Click a zone to shoot'}
              </div>
            )}
          </div>

          {/* Done state */}
          {done && (
            <div style={{
              padding: '20px 16px',
              background: 'rgba(0,0,0,0.45)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🏆</div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#fff', marginBottom: 4 }}>
                {ar ? 'انتهت ركلاتك اليوم!' : 'All done for today!'}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
                {ar ? `سجّلت ${totalToday * 100} نقطة — عُد غداً`
                    : `You earned ${totalToday * 100} pts — come back tomorrow`}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Login prompt ── */}
      {!user && (
        <div style={{
          marginTop: 16, textAlign: 'center',
          background: 'var(--surf)', border: '1px solid var(--line)',
          borderRadius: 12, padding: '16px',
        }}>
          <div style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 10 }}>
            {ar ? 'سجّل الدخول للعب وكسب النقاط' : 'Sign in to play and earn points'}
          </div>
          <button onClick={() => openAuth('signin')} style={{
            padding: '9px 24px', background: 'var(--brand)', color: '#fff',
            border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {ar ? 'تسجيل الدخول' : 'Sign In'}
          </button>
        </div>
      )}

      {/* ── How it works ── */}
      <div style={{
        marginTop: 16, background: 'var(--surf)', border: '1px solid var(--line)',
        borderRadius: 12, padding: '14px 16px',
      }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--ink2)' }}>
          {ar ? 'كيف تلعب؟' : 'How it works'}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(ar ? [
            ['⚽', 'اختر أي خانة من المرمى لتسدّد'],
            ['🧤', 'الحارس يتحرك بشكل عشوائي — إذا اختلف الاتجاه فهو هدف!'],
            ['💰', '100 نقطة لكل هدف — حد 1000 نقطة يومياً (10 ركلات)'],
          ] : [
            ['⚽', 'Click any zone in the goal to shoot'],
            ['🧤', 'Keeper dives randomly — different direction = GOAL!'],
            ['💰', '100 pts per goal — max 1,000 pts/day (10 shots)'],
          ]).map(([icon, text], i) => (
            <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--ink3)', alignItems: 'flex-start' }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes popIn {
          from { transform: scale(0.5) translateY(10px); opacity: 0; }
          to   { transform: scale(1)   translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}
