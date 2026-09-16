'use client'

import { useEffect, useRef } from 'react'

/**
 * The homepage constellation · the Iraqi market as a slowly turning field.
 *
 * A large disc, drawn on canvas, made of three layers:
 *
 *   · an inner ring of four anchors — ISX60, USD/IQD, oil, gold — the numbers
 *     the whole economy is read through;
 *   · an outer band of eight sector clusters, each a scatter of REAL ISX
 *     ticker symbols round its Arabic sector name, joined to it by hairlines;
 *   · a field of faint dots that gives the disc its body.
 *
 * Everything is white at low opacity. One cluster at a time is lit — its
 * tickers step up to near-full white for a few seconds, then hand over to the
 * next — so the eye is led round the market rather than shown all of it at
 * once. The field turns once every five minutes; each node drifts a pixel or
 * two on its own slow orbit. Nothing glows, nothing pulses, nothing is fast.
 *
 * Decoration only: `aria-hidden`, no pointer events, stops when off screen,
 * and holds one still frame under `prefers-reduced-motion`.
 */
type Sector = { name: string; syms: string[] }

/* Real ISX symbols, by sector, as listed in public/data/companies.json. */
const SECTORS: Sector[] = [
  { name: 'المصارف',          syms: ['BBOB', 'BNOI', 'BIME', 'BMFI', 'BKUI', 'BASH', 'BIBI', 'BGUC', 'BROI', 'BMNS', 'BCIH', 'BJAB', 'BTRU', 'BSUC'] },
  { name: 'الاتصالات',        syms: ['TASC', 'TZNI'] },
  { name: 'الصناعة',          syms: ['IBSD', 'IMAP', 'IITC', 'IKLV', 'INCP', 'IMOS', 'IIDP', 'IFCM', 'IMIB', 'IHLI'] },
  { name: 'الفنادق والسياحة', syms: ['HBAY', 'HMAN', 'HISH', 'HPAL', 'HNTI', 'HBAG', 'HSAD', 'HKAR'] },
  { name: 'الزراعة',          syms: ['AIRP', 'AMEF', 'AIPM', 'AMAP', 'AISP', 'AAHP'] },
  { name: 'التأمين',          syms: ['NAME', 'NGIR', 'NAHF', 'NDSA', 'NHAM'] },
  { name: 'الخدمات',          syms: ['SBPT', 'SMOF', 'SILT', 'SKTA', 'SMRI', 'SIGT', 'SNUC'] },
  { name: 'الاستثمار',        syms: ['VKHF', 'VMES', 'VWIF', 'VAMF', 'VZAF', 'VBAT'] },
]
const ANCHORS = ['ISX60', 'USD / IQD', 'النفط', 'الذهب']

const TURN = 300        // seconds per full rotation of the field
const HOLD = 7          // seconds each cluster stays lit
const FADE = 1.6        // seconds to hand over
const DOTS = 420

type Node = { a: number; r: number; text: string; size: number; drift: number; period: number; phase: number; sector: number }

function hash(i: number) { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x) }

export function Constellation({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rtl = document.documentElement.dir !== 'ltr'
    const family = getComputedStyle(document.body).fontFamily
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    /* ── Build the field once ─────────────────────────────────────────── */
    const nodes: Node[] = []
    const wedge = (2 * Math.PI) / SECTORS.length
    SECTORS.forEach((s, si) => {
      const centre = si * wedge + wedge / 2
      const n = s.syms.length
      s.syms.forEach((sym, k) => {
        const seed = si * 100 + k
        /* Stratified, not random: each symbol gets its own slice of the
           wedge and a radius that walks the band, with a little jitter, so
           a fourteen-bank cluster does not pile up on itself. */
        nodes.push({
          a: centre + ((k + 0.5) / n - 0.5) * wedge * 0.86 + (hash(seed) - 0.5) * wedge * 0.12,
          r: 0.56 + (((k * 7) % n) / Math.max(1, n - 1)) * 0.36 + (hash(seed + 1) - 0.5) * 0.05,
          text: sym, size: 11, sector: si,
          drift: 1 + hash(seed + 2) * 2, period: 9 + hash(seed + 3) * 8, phase: hash(seed + 4) * Math.PI * 2,
        })
      })
    })
    const dots = Array.from({ length: DOTS }, (_, i) => {
      const a = hash(i * 3) * Math.PI * 2
      const r = Math.sqrt(hash(i * 3 + 1))            // uniform over the disc
      return { a, r, o: 0.06 + hash(i * 3 + 2) * 0.14, s: 0.8 + hash(i * 3 + 7) * 1.1 }
    })

    let raf = 0, visible = true
    let w = 0, h = 0, cx = 0, cy = 0, R = 0
    const t0 = performance.now()

    const size = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      w = rect.width; h = rect.height
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const narrow = w < 760
      /* Desktop: the disc owns the half of the hero the copy does not.
         Phone: centred, above the copy. */
      cx = narrow ? w / 2 : (rtl ? w * 0.30 : w * 0.70)
      cy = narrow ? h * 0.36 : h * 0.50
      R = narrow ? Math.min(w * 0.46, h * 0.30) : Math.min(w * 0.29, h * 0.43)
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    }

    const white = (o: number) => `rgba(255,255,255,${Math.max(0, Math.min(1, o)).toFixed(3)})`

    const draw = (now: number) => {
      const t = still ? 40 : (now - t0) / 1000
      const rot = (t / TURN) * Math.PI * 2
      /* Which cluster is lit, and how far into the hand-over we are. */
      const slot = t / HOLD
      const lit = Math.floor(slot) % SECTORS.length
      const into = (slot % 1) * HOLD
      const ease = into < FADE ? into / FADE : 1
      const prev = (lit + SECTORS.length - 1) % SECTORS.length
      const litness = (si: number) => si === lit ? ease : si === prev ? 1 - ease : 0

      ctx.clearRect(0, 0, w, h)

      /* Rings. */
      ctx.lineWidth = 1
      ctx.strokeStyle = white(0.13); ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke()
      ctx.strokeStyle = white(0.09); ctx.beginPath(); ctx.arc(cx, cy, R * 0.34, 0, Math.PI * 2); ctx.stroke()

      /* Dust. */
      for (const d of dots) {
        const a = d.a + rot * 0.6
        ctx.fillStyle = white(d.o)
        ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d.r * R, cy + Math.sin(a) * d.r * R, d.s, 0, Math.PI * 2); ctx.fill()
      }

      /* Sector centres, then the nodes tied to them. */
      const centres = SECTORS.map((_, si) => {
        const a = si * wedge + wedge / 2 + rot
        return { x: cx + Math.cos(a) * R * 0.74, y: cy + Math.sin(a) * R * 0.74 }
      })
      ctx.font = `400 11px ${family}`
      for (const n of nodes) {
        const a = n.a + rot
        const dx = Math.cos(t / n.period * Math.PI * 2 + n.phase) * n.drift
        const dy = Math.sin(t / n.period * Math.PI * 2 + n.phase) * n.drift
        const x = cx + Math.cos(a) * n.r * R + dx
        const y = cy + Math.sin(a) * n.r * R + dy
        const l = litness(n.sector)
        const c = centres[n.sector]
        ctx.strokeStyle = white(0.06 + 0.16 * l)
        ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(x, y); ctx.stroke()
        ctx.fillStyle = white(0.30 + 0.62 * l)
        ctx.beginPath(); ctx.arc(x, y, 1.6 + 0.6 * l, 0, Math.PI * 2); ctx.fill()
        ctx.fillText(n.text, x, y - 9)
      }
      /* Sector names. */
      ctx.font = `400 13px ${family}`
      centres.forEach((c, si) => {
        const l = litness(si)
        ctx.fillStyle = white(0.42 + 0.5 * l)
        ctx.beginPath(); ctx.arc(c.x, c.y, 2.4, 0, Math.PI * 2); ctx.fill()
        ctx.fillText(SECTORS[si].name, c.x, c.y + 16)
      })

      /* Anchors on the inner ring: steadier, larger, never dimmed. */
      ctx.font = `300 15px ${family}`
      ANCHORS.forEach((label, i) => {
        const a = (i / ANCHORS.length) * Math.PI * 2 - Math.PI / 2 + rot * 0.5
        const x = cx + Math.cos(a) * R * 0.34, y = cy + Math.sin(a) * R * 0.34
        ctx.fillStyle = white(0.85)
        ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill()
        ctx.fillText(label, x, y + 17)
      })
      /* Centre. */
      ctx.fillStyle = white(0.6); ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2); ctx.fill()
    }

    const loop = (now: number) => { if (visible) draw(now); if (!still) raf = requestAnimationFrame(loop) }
    size()
    if (still) draw(t0); else raf = requestAnimationFrame(loop)
    const ro = new ResizeObserver(() => { size(); if (still) draw(t0) })
    ro.observe(canvas)
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting })
    io.observe(canvas)
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect() }
  }, [])

  return <canvas ref={ref} className={className} aria-hidden="true" />
}
