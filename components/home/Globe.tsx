'use client'

import { useEffect, useRef } from 'react'
import { LAND_B64, LAND_H, LAND_W } from '@/lib/landmask'

/**
 * The homepage globe · a slowly turning Earth drawn as a grid of characters,
 * with the Iraqi market pinned to it.
 *
 * Nothing is loaded and nothing is an image. Each frame walks a character
 * grid over the hero, and for every cell that falls inside the disc it asks
 * where on the sphere that cell is looking (an inverse orthographic
 * projection, rotated by the current spin) and whether that point is land.
 * Land cells draw a currency glyph; sea cells draw a faint dot; the limb fades
 * with depth so the sphere reads as a sphere and not a coin.
 *
 * The glyph a land cell shows is chosen from the land grid, not the screen
 * grid, so it travels with the continent instead of flickering as it turns.
 *
 * On top of the Earth sit the market's labels, each pinned to a place on the
 * sphere and turning with it: the four anchors — ISX60, USD/IQD, oil, gold —
 * over Iraq, and the sector clusters of real ISX tickers spread round the
 * globe. A label shows only while its point faces the viewer, fades at the
 * limb, and one sector at a time is lit while the rest sit at low opacity.
 *
 * Decoration only: `aria-hidden`, no pointer events, stops when off screen,
 * and holds one still frame under `prefers-reduced-motion`.
 */
export type GlobeLabels = {
  anchors: string[]                       // ISX60 · USD/IQD · oil · gold
  sectors: { name: string; syms: string[] }[]
}

/* Where each sector's tickers sit, as [lat, lon] of the cluster's centre.
   Iraq holds the anchors; the sectors fan out across the globe so there is
   always something in view as it turns. */
const IRAQ: [number, number] = [33.3, 44.4]
const SECTOR_HOMES: [number, number][] = [
  [26, 22], [20, 62], [44, 12], [6, 32], [-5, 105], [35, 105], [45, -95], [-15, -55],
]
const HOLD = 7, FADE = 1.6  // seconds a sector stays lit · seconds to hand over
const GLYPHS = '$€£¥₪₺₹¢#'  // what the site is about: money, many currencies
const CELL = 12            // px between characters, in CSS pixels
/* The globe is turned to face Iraq and sways slowly about it rather than
   spinning past it: Baghdad stays near the centre of the disc, the tilt
   brings its latitude to eye level, and the sway shows the neighbours on
   either side without ever losing the country. */
const IRAQ_LON = (44.4 * Math.PI) / 180
const TILT = (-33.3 * Math.PI) / 180  // radians · Iraq's latitude faces the viewer
const SWAY = 0.55                    // radians either side of Iraq
const SWAY_PERIOD = 48               // seconds for one full sway

/* Iraq's outline, rough, as [lon, lat] — enough to light the country's own
   cells brighter than the rest of the land. */
const IRAQ_POLY: [number, number][] = [
  [38.8, 33.4], [39.2, 32.2], [40.4, 31.9], [42.1, 31.1], [44.7, 29.1], [46.5, 29.1], [47.4, 29.9], [48.0, 30.0],
  [48.6, 30.9], [47.7, 31.2], [47.4, 32.5], [46.1, 33.0], [45.4, 34.0], [45.9, 35.0], [46.2, 35.7], [45.3, 36.0],
  [44.8, 37.1], [44.2, 37.3], [42.8, 37.4], [42.4, 37.1], [41.3, 37.1], [40.7, 36.8], [39.2, 36.6], [38.8, 34.5],
]
function inIraq(lonDeg: number, latDeg: number) {
  if (lonDeg < 38.7 || lonDeg > 48.7 || latDeg < 29 || latDeg > 37.5) return false
  let inside = false
  for (let i = 0, j = IRAQ_POLY.length - 1; i < IRAQ_POLY.length; j = i++) {
    const [xi, yi] = IRAQ_POLY[i], [xj, yj] = IRAQ_POLY[j]
    if (((yi > latDeg) !== (yj > latDeg)) && (lonDeg < (xj - xi) * (latDeg - yi) / (yj - yi) + xi)) inside = !inside
  }
  return inside
}

function decodeMask(): Uint8Array {
  const bin = atob(LAND_B64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export function Globe({ className, labels }: { className?: string; labels: GlobeLabels }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const mask = decodeMask()
    const isLand = (lon: number, lat: number) => {
      // lon in (−π, π], lat in [−π/2, π/2]
      const i = Math.floor(((lon + Math.PI) / (2 * Math.PI)) * LAND_W) % LAND_W
      const j = Math.min(LAND_H - 1, Math.floor(((Math.PI / 2 - lat) / Math.PI) * LAND_H))
      const b = j * LAND_W + i
      return (mask[b >> 3] >> (b & 7)) & 1
    }

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const family = getComputedStyle(document.body).fontFamily
    /* The label plates are painted in the hero's own colour, which changes
       with the theme; re-read it whenever data-theme flips. */
    let plate = '20, 107, 253'
    const readPlate = () => { plate = getComputedStyle(canvas).getPropertyValue('--hero-plate').trim() || plate }
    readPlate()
    const mo = new MutationObserver(readPlate)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const rad = (d: number) => (d * Math.PI) / 180
    const hash = (i: number) => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x) }
    type Pin = { lat: number; lon: number; text: string; sector: number; big: boolean }
    const pins: Pin[] = []
    labels.anchors.forEach((text, i) => {
      const a = (i / labels.anchors.length) * Math.PI * 2
      pins.push({ lat: rad(IRAQ[0] + Math.sin(a) * 5.5), lon: rad(IRAQ[1] + Math.cos(a) * 7), text, sector: -1, big: true })
    })
    labels.sectors.forEach((s, si) => {
      const [hl, ho] = SECTOR_HOMES[si % SECTOR_HOMES.length]
      pins.push({ lat: rad(hl), lon: rad(ho), text: s.name, sector: si, big: true })
      s.syms.forEach((sym, k) => {
        const seed = si * 100 + k
        pins.push({ lat: rad(hl + (hash(seed) - 0.5) * 22), lon: rad(ho + (hash(seed + 1) - 0.5) * 30), text: sym, sector: si, big: false })
      })
    })
    let raf = 0
    let visible = true
    let w = 0, h = 0, dpr = 1
    let cols = 0, rows = 0, cx = 0, cy = 0, r = 0
    const t0 = performance.now()

    const size = () => {
      const rect = canvas.getBoundingClientRect()
      dpr = Math.min(2, window.devicePixelRatio || 1)
      w = rect.width; h = rect.height
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cols = Math.ceil(w / CELL); rows = Math.ceil(h / CELL)
      const narrow = w < 760
      const rtl = document.documentElement.dir !== 'ltr'
      /* Desktop: the globe owns the half of the hero the copy does not.
         Phone: centred, above the copy. */
      cx = narrow ? w / 2 : (rtl ? w * 0.31 : w * 0.69)
      cy = narrow ? h * 0.36 : h * 0.5
      r = narrow ? Math.min(w * 0.44, h * 0.28) : Math.min(w * 0.27, h * 0.40)
      ctx.font = `${CELL - 1}px ui-monospace, Menlo, monospace`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    }

    const draw = (now: number) => {
      const spin = -IRAQ_LON + (still ? 0 : Math.sin(((now - t0) / 1000 / SWAY_PERIOD) * Math.PI * 2) * SWAY)
      ctx.clearRect(0, 0, w, h)
      const sinT = Math.sin(TILT), cosT = Math.cos(TILT)
      for (let j = 0; j < rows; j++) {
        const y = (j + 0.5) * CELL
        const ny = (cy - y) / r
        if (ny < -1 || ny > 1) continue
        for (let i = 0; i < cols; i++) {
          const x = (i + 0.5) * CELL
          const nx = (x - cx) / r
          const d2 = nx * nx + ny * ny
          if (d2 > 1) continue
          const nz = Math.sqrt(1 - d2)
          // un-tilt around the screen x axis, then un-spin around the polar axis
          const y1 = ny * cosT - nz * sinT
          const z1 = ny * sinT + nz * cosT
          const lat = Math.asin(y1)
          let lon = Math.atan2(nx, z1) - spin
          lon = ((lon + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI
          const land = isLand(lon, lat)
          // limb fade · front of the sphere is brightest
          const depth = 0.35 + 0.65 * nz
          if (land) {
            const gi = Math.floor(((lon + Math.PI) / (2 * Math.PI)) * LAND_W)
            const gj = Math.floor(((Math.PI / 2 - lat) / Math.PI) * LAND_H)
            const g = GLYPHS[(gi * 31 + gj * 17) % GLYPHS.length]
            const iraq = inIraq((lon * 180) / Math.PI, (lat * 180) / Math.PI)
            ctx.fillStyle = iraq ? '#fff' : `rgba(255,255,255,${(0.52 * depth).toFixed(3)})`
            ctx.fillText(g, x, y)
          } else {
            ctx.fillStyle = `rgba(255,255,255,${(0.22 * depth).toFixed(3)})`
            ctx.fillRect(x - 0.6, y - 0.6, 1.2, 1.2)
          }
        }
      }

      /* ── Pinned labels · forward projection of the same rotation ── */
      const t = (now - t0) / 1000
      const slot = t / HOLD
      const lit = Math.floor(slot) % labels.sectors.length
      const prev = (lit + labels.sectors.length - 1) % labels.sectors.length
      const ease = Math.min(1, (slot % 1) * HOLD / FADE)
      const litness = (si: number) => si === lit ? ease : si === prev ? 1 - ease : 0
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      for (const p of pins) {
        const lon = p.lon + spin
        const px = Math.cos(p.lat) * Math.sin(lon)
        const py0 = Math.sin(p.lat)
        const pz0 = Math.cos(p.lat) * Math.cos(lon)
        // tilt around the screen x axis (inverse of the un-tilt above)
        const py = py0 * cosT + pz0 * sinT
        const pz = -py0 * sinT + pz0 * cosT
        if (pz < 0.08) continue                       // facing away
        const x = cx + px * r, y = cy - py * r
        const l = p.sector < 0 ? 1 : litness(p.sector)
        const o = (p.sector < 0 ? 1 : p.big ? 0.55 + 0.45 * l : 0.42 + 0.58 * l) * (0.35 + 0.65 * pz)
        ctx.font = p.sector < 0 ? `300 16px ${family}` : p.big ? `400 14px ${family}` : `400 12px ${family}`
        /* A solid plate in the hero's own blue sits under each label so the
           word cuts through the glyph field instead of dissolving into it. */
        const tw = ctx.measureText(p.text).width + 12
        const th = p.sector < 0 ? 22 : p.big ? 20 : 17
        const ty = y + (p.big ? 16 : 12)
        ctx.fillStyle = `rgba(${plate},${(0.92 * Math.min(1, o + 0.3)).toFixed(3)})`
        ctx.beginPath(); ctx.roundRect(x - tw / 2, ty - th / 2, tw, th, th / 2); ctx.fill()
        ctx.fillStyle = `rgba(255,255,255,${o.toFixed(3)})`
        ctx.beginPath(); ctx.arc(x, y, p.big ? 2.6 : 1.8, 0, Math.PI * 2); ctx.fill()
        ctx.fillText(p.text, x, ty)
      }
      ctx.font = `${CELL - 1}px ui-monospace, Menlo, monospace`
    }

    const loop = (now: number) => {
      if (visible) draw(now)
      if (!still) raf = requestAnimationFrame(loop)
    }

    size()
    if (still) draw(t0); else raf = requestAnimationFrame(loop)

    const ro = new ResizeObserver(() => { size(); if (still) draw(t0) })
    ro.observe(canvas)
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting })
    io.observe(canvas)
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); mo.disconnect() }
  }, [labels])

  return <canvas ref={ref} className={className} aria-hidden="true" />
}
