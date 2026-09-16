'use client'

import { useEffect, useRef } from 'react'
import { LAND_B64, LAND_H, LAND_W } from '@/lib/landmask'

/**
 * The homepage globe · a slowly turning Earth drawn as a grid of characters.
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
 * Decoration only: `aria-hidden`, no pointer events, stops when off screen,
 * and holds one still frame under `prefers-reduced-motion`.
 */
const GLYPHS = '$€£¥₪₺₹¢#'  // what the site is about: money, many currencies
const CELL = 12            // px between characters, in CSS pixels
const TILT = -0.35         // radians · the axis leans like the real thing
const SPIN = 0.09          // radians per second · one turn ≈ 70 s

function decodeMask(): Uint8Array {
  const bin = atob(LAND_B64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export function Globe({ className }: { className?: string }) {
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
      // Sits a little above centre so the title and intro own the corners.
      cx = w / 2; cy = h * 0.47
      r = Math.min(w * 0.36, h * 0.38)
      ctx.font = `${CELL - 1}px ui-monospace, Menlo, monospace`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    }

    const draw = (now: number) => {
      const spin = still ? 0.8 : ((now - t0) / 1000) * SPIN
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
            ctx.fillStyle = `rgba(255,255,255,${(0.92 * depth).toFixed(3)})`
            ctx.fillText(g, x, y)
          } else {
            ctx.fillStyle = `rgba(255,255,255,${(0.28 * depth).toFixed(3)})`
            ctx.fillRect(x - 0.6, y - 0.6, 1.2, 1.2)
          }
        }
      }
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
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect() }
  }, [])

  return <canvas ref={ref} className={className} aria-hidden="true" />
}
