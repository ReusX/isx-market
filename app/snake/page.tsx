'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'

// ─── Constants ────────────────────────────────────────────────────────────────
const COLS       = 20
const ROWS       = 20
const DAILY_CAP  = 2000
const INIT_SPEED = 175   // ms per step
const MIN_SPEED  = 65
const SPEED_STEP = 12    // speed up every 5 foods

type Dir   = 'U' | 'D' | 'L' | 'R'
type Pos   = { x: number; y: number }
type Phase = 'idle' | 'playing' | 'over'
const OPP: Record<Dir, Dir> = { U: 'D', D: 'U', L: 'R', R: 'L' }

function rndFood(snake: Pos[]): Pos {
  let p: Pos
  do { p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) } }
  while (snake.some(s => s.x === p.x && s.y === p.y))
  return p
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SnakePage() {
  const { lang, user } = useApp()
  const ar = lang === 'ar'

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cellRef   = useRef(20)   // px per cell, updated on resize

  // Keep user in ref so the RAF-loop closure always has the latest value
  const userRef = useRef(user)
  useEffect(() => { userRef.current = user }, [user])

  // ── All mutable game state in one stable ref ─────────────────────────────────
  const G = useRef({
    snake:    [{ x: 10, y: 10 }] as Pos[],
    dir:      'R' as Dir,
    nextDir:  'R' as Dir,
    food:     { x: 15, y: 10 } as Pos,
    score:    0,
    speed:    INIT_SPEED,
    lastTick: 0,
    phase:    'idle' as Phase,
    raf:      0,
    hs:       0,
  })
  const loopRef = useRef<(now: number) => void>()

  // ── React state (drives UI only) ────────────────────────────────────────────
  const [cellSz, setCellSz]         = useState(20)
  const [phase, setPhase]           = useState<Phase>('idle')
  const [score, setScore]           = useState(0)
  const [highScore, setHighScore]   = useState(0)
  const [dailyLeft, setDailyLeft]   = useState(DAILY_CAP)
  const [ptsAwarded, setPtsAwarded] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const W = cellSz * COLS
  const H = cellSz * ROWS

  // ── Responsive cell size ────────────────────────────────────────────────────
  useEffect(() => {
    const upd = () => {
      const sz = Math.floor(Math.min(400, window.innerWidth - 48) / COLS)
      cellRef.current = sz
      setCellSz(sz)
    }
    upd()
    window.addEventListener('resize', upd)
    return () => window.removeEventListener('resize', upd)
  }, [])

  // ── Load daily pts + local high score ───────────────────────────────────────
  useEffect(() => {
    if (user) {
      fetch('/api/snake').then(r => r.json()).then(d => setDailyLeft(d.ptsLeft ?? DAILY_CAP))
    }
    const hs = parseInt(localStorage.getItem('snake_hs') ?? '0')
    G.current.hs = hs
    setHighScore(hs)
  }, [user])

  // ── Draw ─────────────────────────────────────────────────────────────────────
  function draw() {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const sz = cellRef.current
    const cW = sz * COLS
    const cH = sz * ROWS

    // Background
    ctx.fillStyle = '#0b0e14'
    ctx.fillRect(0, 0, cW, cH)

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= COLS; i++) { ctx.beginPath(); ctx.moveTo(i * sz, 0); ctx.lineTo(i * sz, cH); ctx.stroke() }
    for (let i = 0; i <= ROWS; i++) { ctx.beginPath(); ctx.moveTo(0, i * sz); ctx.lineTo(cW, i * sz); ctx.stroke() }

    // Food — glowing red dot
    const { x: fx, y: fy } = G.current.food
    ctx.shadowColor = '#ff5252'
    ctx.shadowBlur  = 14
    ctx.fillStyle   = '#ff5252'
    ctx.beginPath()
    const fr = Math.max(2, sz * 0.2)
    roundRect(ctx, fx * sz + 2, fy * sz + 2, sz - 4, sz - 4, fr)
    ctx.fill()
    ctx.shadowBlur = 0

    // Snake — bright green head, fading tail
    G.current.snake.forEach((seg, i) => {
      const isHead = i === 0
      const alpha  = Math.max(0.3, 1 - (i / G.current.snake.length) * 0.65)
      ctx.fillStyle   = isHead ? '#00e676' : `rgba(0,185,80,${alpha.toFixed(2)})`
      ctx.shadowColor = isHead ? '#00e676' : 'transparent'
      ctx.shadowBlur  = isHead ? 12 : 0
      const r = isHead ? Math.max(2, sz * 0.3) : Math.max(1, sz * 0.15)
      ctx.beginPath()
      roundRect(ctx, seg.x * sz + 1, seg.y * sz + 1, sz - 2, sz - 2, r)
      ctx.fill()
      ctx.shadowBlur = 0
    })
  }

  // ── roundRect polyfill ──────────────────────────────────────────────────────
  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    if ((ctx as any).roundRect) {
      ;(ctx as any).roundRect(x, y, w, h, r)
    } else {
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r)
      ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
      ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r)
      ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y)
      ctx.closePath()
    }
  }

  // ── End game ─────────────────────────────────────────────────────────────────
  async function endGame() {
    cancelAnimationFrame(G.current.raf)
    G.current.phase = 'over'
    setPhase('over')

    const s = G.current.score
    if (s > G.current.hs) {
      G.current.hs = s
      localStorage.setItem('snake_hs', String(s))
      setHighScore(s)
    }

    if (userRef.current && s > 0) {
      setSubmitting(true)
      try {
        const res = await fetch('/api/snake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ score: s }),
        })
        const d = await res.json()
        setPtsAwarded(d.pointsAwarded ?? 0)
        setDailyLeft(d.ptsLeft ?? 0)
      } catch { /* network error */ }
      setSubmitting(false)
    }
  }

  // ── RAF game loop (wired up once, reads from refs) ───────────────────────────
  useEffect(() => {
    const loop = (now: number) => {
      const g = G.current
      if (g.phase !== 'playing') return
      g.raf = requestAnimationFrame(loop)

      if (now - g.lastTick < g.speed) return
      g.lastTick = now

      // Step direction
      g.dir = g.nextDir
      const h = g.snake[0]
      const nd: Pos = {
        x: h.x + (g.dir === 'R' ? 1 : g.dir === 'L' ? -1 : 0),
        y: h.y + (g.dir === 'D' ? 1 : g.dir === 'U' ? -1 : 0),
      }

      // Collision with wall or self
      if (
        nd.x < 0 || nd.x >= COLS || nd.y < 0 || nd.y >= ROWS ||
        g.snake.some(s => s.x === nd.x && s.y === nd.y)
      ) {
        endGame()
        return
      }

      const ate = nd.x === g.food.x && nd.y === g.food.y
      const ns  = [nd, ...g.snake]
      if (!ate) {
        ns.pop()
      } else {
        g.score++
        setScore(g.score)
        g.food = rndFood(ns)
        if (g.score % 5 === 0) g.speed = Math.max(MIN_SPEED, g.speed - SPEED_STEP)
      }
      g.snake = ns
      draw()
    }

    loopRef.current = loop
    return () => cancelAnimationFrame(G.current.raf)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Start / restart game ─────────────────────────────────────────────────────
  function startGame() {
    const g = G.current
    cancelAnimationFrame(g.raf)
    g.snake   = [{ x: 10, y: 10 }]
    g.dir     = 'R'; g.nextDir  = 'R'
    g.food    = { x: 15, y: 10 }
    g.score   = 0;  g.speed    = INIT_SPEED; g.lastTick = 0
    g.phase   = 'playing'
    setScore(0); setPhase('playing'); setPtsAwarded(null)
    g.raf = requestAnimationFrame(loopRef.current!)
    draw()
  }

  // ── Keyboard controls ────────────────────────────────────────────────────────
  useEffect(() => {
    const MAP: Record<string, Dir> = {
      ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R',
      w: 'U', s: 'D', a: 'L', d: 'R',
    }
    const fn = (e: KeyboardEvent) => {
      const d = MAP[e.key]
      if (d && G.current.phase === 'playing' && d !== OPP[G.current.dir]) {
        G.current.nextDir = d
        e.preventDefault()
      }
      if (e.key === ' ' && G.current.phase !== 'playing') startGame()
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Swipe (canvas touch) ─────────────────────────────────────────────────────
  const t0 = useRef<{ x: number; y: number } | null>(null)
  function onTouchStart(e: React.TouchEvent) {
    t0.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (!t0.current || G.current.phase !== 'playing') return
    const dx = e.changedTouches[0].clientX - t0.current.x
    const dy = e.changedTouches[0].clientY - t0.current.y
    const d: Dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U')
    if (d !== OPP[G.current.dir]) G.current.nextDir = d
  }

  // ── D-pad press (mobile buttons) ─────────────────────────────────────────────
  function dpad(d: Dir) {
    if (G.current.phase === 'playing' && d !== OPP[G.current.dir]) G.current.nextDir = d
  }

  // Redraw when cell size changes
  useEffect(() => { draw() }, [cellSz]) // eslint-disable-line react-hooks/exhaustive-deps

  const dailyPct = Math.min(100, Math.round((dailyLeft / DAILY_CAP) * 100))

  // ── Styles ───────────────────────────────────────────────────────────────────
  const btnStyle = (active = true): React.CSSProperties => ({
    width: 52, height: 52, borderRadius: 12,
    background: active ? 'var(--surf2)' : 'transparent',
    border: '1px solid var(--line)',
    color: 'var(--ink2)', fontSize: 18, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'manipulation',
    fontFamily: 'inherit',
  })

  const overlayStyle: React.CSSProperties = {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: 12,
    background: 'rgba(11,14,20,0.88)',
    backdropFilter: 'blur(6px)',
  }

  // ── JSX ──────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      maxWidth: 480, margin: '0 auto',
      padding: '20px 16px 32px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
    }}>

      {/* ── Header ── */}
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/quests" style={{ fontSize: 13, color: 'var(--ink3)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
          ← {ar ? 'المهمات' : 'Quests'}
        </Link>
        <h1 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>🐍 {ar ? 'لعبة الثعبان' : 'Snake'}</h1>
        <div style={{ fontSize: 11, color: 'var(--ink4)', textAlign: 'end' }}>
          <div>{ar ? 'أعلى نتيجة' : 'Best'}: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink2)' }}>{highScore}</span></div>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Current score */}
        <div style={{
          flex: 1, padding: '10px 14px', borderRadius: 12,
          background: 'var(--surf)', border: '1px solid var(--line)',
        }}>
          <div style={{ fontSize: 10, color: 'var(--ink4)', marginBottom: 2 }}>{ar ? 'النتيجة' : 'Score'}</div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{score}</div>
        </div>

        {/* Daily cap progress */}
        <div style={{
          flex: 2, padding: '10px 14px', borderRadius: 12,
          background: 'var(--surf)', border: '1px solid var(--line)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: 'var(--ink4)' }}>{ar ? 'النقاط المتبقية اليوم' : 'Daily pts left'}</span>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold)' }}>{dailyLeft}/{DAILY_CAP}</span>
          </div>
          <div style={{ height: 4, background: 'var(--surf3)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4,
              width: `${dailyPct}%`,
              background: dailyLeft > 100 ? 'var(--up)' : dailyLeft > 0 ? '#f5a623' : 'var(--dn)',
              transition: 'width 0.4s',
            }} />
          </div>
          <div style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 4 }}>
            {ar ? '100 نقطة لكل طعامة' : '100 pts per food eaten'}
          </div>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div style={{
        position: 'relative', borderRadius: 14, overflow: 'hidden',
        border: '1px solid var(--line)',
        boxShadow: phase === 'playing'
          ? '0 0 40px rgba(0,230,118,0.08)'
          : '0 4px 24px rgba(0,0,0,0.3)',
      }}>
        <canvas
          ref={canvasRef}
          width={W} height={H}
          style={{ display: 'block', touchAction: 'none' }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        />

        {/* Idle overlay */}
        {phase === 'idle' && (
          <div style={overlayStyle}>
            <div style={{ fontSize: 52 }}>🐍</div>
            <div style={{ fontWeight: 800, fontSize: 20 }}>{ar ? 'لعبة الثعبان' : 'Nokia Snake'}</div>
            <div style={{ fontSize: 12, color: 'var(--ink3)', textAlign: 'center', lineHeight: 1.7, maxWidth: 220 }}>
              {ar
                ? 'كل طعامة = 100 نقطة\nحد يومي 2000 نقطة\nيتسارع كل 5 طعامات'
                : 'Each food = 100 pts\n2000 pts daily limit\nSpeeds up every 5 foods'}
            </div>
            {!user && (
              <div style={{
                fontSize: 11, color: 'var(--ink4)',
                background: 'var(--surf2)', padding: '6px 14px', borderRadius: 8,
              }}>
                {ar ? '⚠️ سجّل دخولك لحفظ النقاط' : '⚠️ Sign in to save points'}
              </div>
            )}
            <button onClick={startGame} style={{
              padding: '11px 32px', background: 'var(--brand)', border: 'none',
              borderRadius: 10, color: '#fff', fontWeight: 800, fontSize: 15,
              fontFamily: 'inherit', cursor: 'pointer', marginTop: 4,
            }}>
              {ar ? 'ابدأ اللعب' : 'Start Game'}
            </button>
            <div style={{ fontSize: 11, color: 'var(--ink4)' }}>
              {ar ? 'أو اضغط مسافة للبدء' : 'or press Space'}
            </div>
          </div>
        )}

        {/* Game over overlay */}
        {phase === 'over' && (
          <div style={overlayStyle}>
            <div style={{ fontSize: 42 }}>💀</div>
            <div style={{ fontWeight: 800, fontSize: 20 }}>{ar ? 'انتهت اللعبة' : 'Game Over'}</div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 36, fontWeight: 800,
              color: 'var(--gold)', lineHeight: 1,
            }}>{score}</div>
            <div style={{ fontSize: 11, color: 'var(--ink4)' }}>
              {ar ? `أعلى نتيجة: ${highScore}` : `Best: ${highScore}`}
            </div>

            {submitting && (
              <div style={{ fontSize: 12, color: 'var(--ink3)' }}>
                {ar ? 'جاري حفظ النقاط...' : 'Saving points...'}
              </div>
            )}
            {ptsAwarded !== null && !submitting && (
              <div style={{
                padding: '8px 18px', borderRadius: 10,
                background: ptsAwarded > 0 ? 'rgba(0,230,118,0.1)' : 'var(--surf2)',
                border: `1px solid ${ptsAwarded > 0 ? 'rgba(0,230,118,0.3)' : 'var(--line)'}`,
                fontWeight: 700, fontSize: 15,
                color: ptsAwarded > 0 ? 'var(--up)' : 'var(--ink3)',
              }}>
                {ptsAwarded > 0
                  ? `+${ptsAwarded} ${ar ? 'نقطة 🎉' : 'pts 🎉'}`
                  : (ar ? 'وصلت الحد اليومي' : 'Daily cap reached')}
              </div>
            )}
            {!user && score > 0 && (
              <div style={{ fontSize: 11, color: 'var(--ink4)' }}>
                {ar ? 'سجّل دخولك لكسب النقاط' : 'Sign in to earn points'}
              </div>
            )}

            <button onClick={startGame} style={{
              padding: '11px 32px', background: 'var(--brand)', border: 'none',
              borderRadius: 10, color: '#fff', fontWeight: 800, fontSize: 14,
              fontFamily: 'inherit', cursor: 'pointer', marginTop: 4,
            }}>
              {ar ? 'العب مجدداً' : 'Play Again'}
            </button>
          </div>
        )}
      </div>

      {/* ── D-pad ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 52px)', gap: 6 }}>
        <div /><button style={btnStyle()} onPointerDown={() => dpad('U')}>▲</button><div />
        <button style={btnStyle()} onPointerDown={() => dpad('L')}>◀</button>
        <div style={{ width: 52, height: 52 }} />
        <button style={btnStyle()} onPointerDown={() => dpad('R')}>▶</button>
        <div /><button style={btnStyle()} onPointerDown={() => dpad('D')}>▼</button><div />
      </div>

      <p style={{ fontSize: 11, color: 'var(--ink4)', textAlign: 'center', margin: 0 }}>
        {ar
          ? 'مفاتيح الأسهم أو WASD للتحكم • يتسارع كل 5 طعامات'
          : 'Arrow keys / WASD to control • Speeds up every 5 foods'}
      </p>
    </div>
  )
}
