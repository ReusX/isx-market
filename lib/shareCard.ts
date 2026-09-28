'use client'

import { STAR_PATH } from '@/components/brand/StarMark'

/**
 * The share image: a 1080×1350 card (the 4:5 shape chats and stories show
 * whole) drawn on a canvas IN the app's WebView. The browser does the Arabic
 * shaping and already has the site's Readex Pro loaded — a server renderer
 * (next/og) cannot join Arabic letters. Each rate screen publishes what its
 * card says through setShareCard(); screens without one share their link.
 */
export interface ShareCard {
  title: string
  value: string
  unit: string
  delta?: { text: string; tone: 'good' | 'bad' | 'flat' }
  lines?: string[]
  when?: string
  tone?: 'gold'
  foot: { site: string; cta: string }
}

let current: ShareCard | null = null
export const setShareCard = (c: ShareCard | null) => { current = c }
export const shareCard = () => current

const W = 1080, H = 1350

export async function drawShareCard(c: ShareCard, rtl: boolean): Promise<string> {
  await document.fonts?.ready
  const fam = getComputedStyle(document.body).fontFamily || 'sans-serif'
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const g = cv.getContext('2d')!
  g.direction = rtl ? 'rtl' : 'ltr'
  const gold = c.tone === 'gold'
  const ink = gold ? '#2b1d02' : '#ffffff'
  const soft = gold ? 'rgba(43,29,2,.72)' : 'rgba(255,255,255,.74)'

  // Ground: navy with a blue glow (or the gold card), rounded like the app's hero.
  const bg = g.createLinearGradient(0, 0, W, H)
  if (gold) { bg.addColorStop(0, '#f3d27a'); bg.addColorStop(1, '#b8862a') } else { bg.addColorStop(0, '#0f56d1'); bg.addColorStop(0.75, '#1a2035') }
  g.fillStyle = bg; g.fillRect(0, 0, W, H)
  const glow = g.createRadialGradient(W * 0.85, 0, 0, W * 0.85, 0, W)
  glow.addColorStop(0, gold ? 'rgba(255,241,191,.7)' : 'rgba(45,123,255,.8)'); glow.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = glow; g.fillRect(0, 0, W, H)

  // The star, large and faint, bottom corner.
  const star = new Path2D(STAR_PATH)
  g.save(); g.translate(rtl ? -180 : W - 900, H - 820); g.scale(11, 11)
  g.fillStyle = gold ? 'rgba(43,29,2,.07)' : 'rgba(255,255,255,.07)'; g.fill(star); g.restore()

  const x = rtl ? W - 90 : 90
  g.textAlign = rtl ? 'right' : 'left'
  const text = (s: string, y: number, size: number, weight: number, color: string, max = W - 180) => {
    g.font = `${weight} ${size}px ${fam}`; g.fillStyle = color
    let sz = size
    while (g.measureText(s).width > max && sz > 20) { sz -= 2; g.font = `${weight} ${sz}px ${fam}` }
    g.fillText(s, x, y)
  }

  // Brand row.
  g.save(); g.translate(rtl ? W - 90 - 56 : 90, 96); g.scale(56 / 96, 56 / 96); g.fillStyle = ink; g.fill(star); g.restore()
  g.font = `500 44px ${fam}`; g.fillStyle = ink
  g.fillText('IQWealth', rtl ? W - 90 - 72 : 90 + 72, 140)

  text(c.title, 330, 58, 500, ink)
  text(c.value, 560, 220, 300, ink)
  text(c.unit, 650, 44, 400, soft)

  let y = 760
  if (c.delta) {
    g.font = `500 42px ${fam}`
    const w = g.measureText(c.delta.text).width + 64
    const col = c.delta.tone === 'good' ? (gold ? '#0a7a43' : '#3ee08f') : c.delta.tone === 'bad' ? (gold ? '#b3261e' : '#ff8a8a') : soft
    g.fillStyle = gold ? 'rgba(43,29,2,.1)' : 'rgba(255,255,255,.14)'
    const px = rtl ? x - w : x
    g.beginPath(); g.roundRect(px, y - 54, w, 76, 38); g.fill()
    g.fillStyle = col; g.fillText(c.delta.text, rtl ? x - 32 : x + 32, y)
    y += 110
  }
  for (const l of c.lines ?? []) { text(l, y, 40, 400, soft); y += 64 }
  if (c.when) text(c.when, H - 250, 36, 400, soft)

  // Foot: the address people type, and where to get the app.
  g.fillStyle = gold ? 'rgba(43,29,2,.14)' : 'rgba(255,255,255,.18)'; g.fillRect(90, H - 190, W - 180, 2)
  text(c.foot.site, H - 110, 54, 500, ink)
  g.textAlign = rtl ? 'left' : 'right'; g.font = `400 34px ${fam}`; g.fillStyle = soft
  g.fillText(c.foot.cta, rtl ? 90 : W - 90, H - 112)

  return cv.toDataURL('image/png').split(',')[1]
}

// Development only: lets the browser preview draw the current card.
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  (window as unknown as { __iqCard?: () => Promise<string | null> }).__iqCard = async () => (current ? drawShareCard(current, document.documentElement.dir === 'rtl') : null)
}
