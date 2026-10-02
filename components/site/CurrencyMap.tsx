'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { CurrencyCode } from '@/lib/currencies'

/**
 * /currencies as a drawn map. The art (public/maps/currencies-map.webp, in
 * /learn's ink style, the flags drawn in) is the ground; every flag whose
 * currency we price is a button, and pressing it opens that currency's card
 * beside the flag: price in dinars, the day's chip, the official figure, a
 * link to its own page. Every eurozone flag opens the euro; Iraq's opens
 * the dollar.
 *
 * Spots are the flags' cloth centres in the art's own pixels (1499×1049).
 * Re-pin them if the art is redrawn.
 */
export const ART_W = 1499, ART_H = 1049
export type MapCode = CurrencyCode | 'USD'
export const MAP_FLAGS: { id: string; code: MapCode; x: number; y: number }[] = [
  { id: 'iq', code: 'USD', x: 995, y: 585 },
  { id: 'gb', code: 'GBP', x: 258, y: 190 },
  { id: 'no', code: 'NOK', x: 422, y: 80 },
  { id: 'se', code: 'SEK', x: 525, y: 82 },
  { id: 'ru', code: 'RUB', x: 1075, y: 195 },
  { id: 'ch', code: 'CHF', x: 410, y: 355 },
  { id: 'tr', code: 'TRY', x: 820, y: 470 },
  { id: 'lb', code: 'LBP', x: 847, y: 580 },
  { id: 'sy', code: 'SYP', x: 892, y: 553 },
  { id: 'jo', code: 'JOD', x: 878, y: 632 },
  { id: 'eg', code: 'EGP', x: 725, y: 710 },
  { id: 'ir', code: 'IRR', x: 1205, y: 535 },
  { id: 'kw', code: 'KWD', x: 1158, y: 638 },
  { id: 'bh', code: 'BHD', x: 1180, y: 688 },
  { id: 'qa', code: 'QAR', x: 1248, y: 718 },
  { id: 'ae', code: 'AED', x: 1232, y: 800 },
  { id: 'om', code: 'OMR', x: 1315, y: 767 },
  { id: 'sa', code: 'SAR', x: 990, y: 750 },
  /* The eurozone, each flag opening the euro. */
  { id: 'fr', code: 'EUR', x: 288, y: 325 },
  { id: 'de', code: 'EUR', x: 450, y: 248 },
  { id: 'it', code: 'EUR', x: 465, y: 405 },
  { id: 'es', code: 'EUR', x: 202, y: 483 },
  { id: 'pt', code: 'EUR', x: 132, y: 455 },
  { id: 'nl', code: 'EUR', x: 375, y: 228 },
  { id: 'be', code: 'EUR', x: 345, y: 268 },
  { id: 'at', code: 'EUR', x: 515, y: 333 },
  { id: 'ie', code: 'EUR', x: 152, y: 205 },
  { id: 'gr', code: 'EUR', x: 645, y: 500 },
  { id: 'fi', code: 'EUR', x: 632, y: 35 },
  { id: 'ee', code: 'EUR', x: 690, y: 93 },
  { id: 'lv', code: 'EUR', x: 690, y: 137 },
  { id: 'sk', code: 'EUR', x: 598, y: 298 },
  { id: 'mt', code: 'EUR', x: 530, y: 575 },
  { id: 'cy', code: 'EUR', x: 790, y: 570 },
]

export type MapCard = {
  code: MapCode; flag: string; name: string; price: string; unit: string; sub?: string
  tone: '' | 'is-up' | 'is-down'; chip: ReactNode; official?: string; cross?: string; href?: string; hrefLabel?: string
}

const MIN = 1, MAX = 4, R = ART_W / ART_H
type View = { s: number; x: number; y: number }
/* The art covers the frame at its own proportions (a phone's frame is
   taller than the art, so the art overflows sideways and is dragged). */
const cover = (w: number, h: number) => ({ w: Math.max(w, h * R), h: Math.max(h, w / R) })

export function CurrencyMap({ cards, countries, active, onActive, label, hint, closeLabel, officialLabel, zoomIn, zoomOut, zoomReset }: {
  cards: Partial<Record<MapCode, MapCard>>
  countries: Record<string, string>
  active: string | null
  onActive: (id: string | null) => void
  label: string
  hint: string
  closeLabel: string
  officialLabel: string
  zoomIn: string
  zoomOut: string
  zoomReset: string
}) {
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [view, setView] = useState<View>({ s: 1, x: 0, y: 0 })
  const viewRef = useRef(view); viewRef.current = view
  const sizeRef = useRef(size); sizeRef.current = size
  const ptrs = useRef(new Map<number, { x: number; y: number }>())
  const drag = useRef<{ moved: boolean; pinch: number | null }>({ moved: false, pinch: null })

  /* Keep the map covering its frame at every zoom: no empty edges. */
  const clamp = useCallback((v: View): View => {
    const s = Math.min(MAX, Math.max(MIN, v.s))
    const { w, h } = sizeRef.current, L = cover(w, h)
    return { s, x: Math.min(0, Math.max(w - L.w * s, v.x)), y: Math.min(0, Math.max(h - L.h * s, v.y)) }
  }, [])
  /* Zoom by `f` around a point of the frame (px from its top-left). */
  const zoomAt = useCallback((f: number, px: number, py: number) => {
    const v = viewRef.current, s = Math.min(MAX, Math.max(MIN, v.s * f)), k = s / v.s
    setView(clamp({ s, x: px - (px - v.x) * k, y: py - (py - v.y) * k }))
  }, [clamp])

  /* Measure the frame; on a phone, open zoomed onto Iraq and the Gulf so the
     flags are big enough to tap. */
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const w = e.contentRect.width, h = e.contentRect.height
      const first = sizeRef.current.w === 0
      if (w === 0) return
      sizeRef.current = { w, h }; setSize({ w, h })
      if (first && w > 0 && w < 700) {
        const L = cover(w, h), s = 1.15, cx = (1060 / ART_W) * L.w, cy = (600 / ART_H) * L.h
        setView(clamp({ s, x: w / 2 - cx * s, y: h / 2 - cy * s }))
      } else setView((v) => clamp(v))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [clamp])

  /* Trackpad pinch (and ctrl/⌘ + wheel) zooms; a plain wheel still scrolls the page. */
  useEffect(() => {
    const el = box.current
    if (!el) return
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const r = el.getBoundingClientRect()
      zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top)
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  }, [zoomAt])

  /* A flag chosen elsewhere (the search) is brought into view if it is off
     the visible part of a zoomed map. */
  useEffect(() => {
    const f = MAP_FLAGS.find((x) => x.id === active)
    const { w, h } = sizeRef.current, v = viewRef.current, L = cover(w, h)
    if (!f || !w) return
    const px = v.x + (f.x / ART_W) * L.w * v.s, py = v.y + (f.y / ART_H) * L.h * v.s
    if (px < 40 || px > w - 40 || py < 40 || py > h - 40) setView(clamp({ ...v, x: v.x + (w / 2 - px), y: v.y + (h / 2 - py) }))
  }, [active, clamp])

  /* Escape or a press outside the card closes it. */
  useEffect(() => {
    if (!active) return
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onActive(null) }
    const down = (e: PointerEvent) => { if (!(e.target as Element).closest('.cmap-flag, .cmap-pop, .cur-search, .cmap-ctl')) onActive(null) }
    window.addEventListener('keydown', key); window.addEventListener('pointerdown', down)
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('pointerdown', down) }
  }, [active, onActive])

  /* Drag to move, two fingers to pinch. A drag never counts as a flag press. */
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as Element).closest('.cmap-pop, .cmap-ctl')) return
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    drag.current = { moved: false, pinch: null }
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()]
      drag.current.pinch = Math.hypot(a.x - b.x, a.y - b.y)
    }
  }
  const onMove = (e: React.PointerEvent) => {
    const prev = ptrs.current.get(e.pointerId)
    if (!prev) return
    const cur = { x: e.clientX, y: e.clientY }
    ptrs.current.set(e.pointerId, cur)
    if (ptrs.current.size === 2 && drag.current.pinch) {
      const [a, b] = [...ptrs.current.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y), r = box.current!.getBoundingClientRect()
      zoomAt(d / drag.current.pinch, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top)
      drag.current.pinch = d; drag.current.moved = true
      return
    }
    const dx = cur.x - prev.x, dy = cur.y - prev.y
    if (!drag.current.moved && Math.hypot(dx, dy) < 3) return
    if (viewRef.current.s <= 1) return
    if (!drag.current.moved) box.current?.setPointerCapture(e.pointerId)
    drag.current.moved = true
    setView((v) => clamp({ ...v, x: v.x + dx, y: v.y + dy }))
  }
  const onUp = (e: React.PointerEvent) => { ptrs.current.delete(e.pointerId); if (ptrs.current.size < 2) drag.current.pinch = null }

  const spot = MAP_FLAGS.find((f) => f.id === active) ?? null
  const card = spot ? cards[spot.code] : null
  /* The card sits outside the zoomed layer (it stays readable); place it at
     the flag's on-screen point, on whichever side has room. */
  const L = cover(size.w, size.h)
  const fx = spot ? view.x + (spot.x / ART_W) * L.w * view.s : 0
  const fy = spot ? view.y + (spot.y / ART_H) * L.h * view.s : 0
  const onScreen = spot && fx > -10 && fx < size.w + 10 && fy > -10 && fy < size.h + 10
  const zoomed = view.s > 1.001
  return (
    <figure className={`cmap ${zoomed ? 'is-zoomed' : ''} ${card ? 'has-pop' : ''}`.trim()} aria-label={label}>
      <div ref={box} className="cmap-view" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onDoubleClick={(e) => { if ((e.target as Element).closest('.cmap-flag, .cmap-pop, .cmap-ctl')) return; const r = e.currentTarget.getBoundingClientRect(); zoomAt(1.8, e.clientX - r.left, e.clientY - r.top) }}>
        <div className="cmap-layer" style={{ width: L.w || '100%', height: L.h || '100%', transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})` }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- a fixed illustration; next/image would re-encode the art. */}
          <img src="/maps/currencies-map.webp" alt="" className="cmap-art" width={ART_W} height={ART_H} decoding="async" draggable={false} />
          {MAP_FLAGS.filter((f) => cards[f.code]).map((f) => {
            const c = cards[f.code] as MapCard
            return (
              <button key={f.id} type="button" className={`cmap-flag ${active === f.id ? 'is-on' : ''} ${f.id === 'iq' ? 'is-home' : ''}`.trim()}
                style={{ left: `${(f.x / ART_W) * 100}%`, top: `${(f.y / ART_H) * 100}%` }}
                aria-label={`${countries[f.id] ?? ''} · ${c.name}`} aria-expanded={active === f.id}
                onClick={() => { if (drag.current.moved) return; onActive(active === f.id ? null : f.id) }} />
            )
          })}
        </div>
        <p className="cmap-hint">{hint}</p>
        <div className="cmap-ctl" role="group">
          <button type="button" onClick={() => zoomAt(1.5, size.w / 2, size.h / 2)} aria-label={zoomIn} disabled={view.s >= MAX}>+</button>
          <button type="button" onClick={() => zoomAt(1 / 1.5, size.w / 2, size.h / 2)} aria-label={zoomOut} disabled={!zoomed}>−</button>
          <button type="button" onClick={() => setView({ s: 1, x: 0, y: 0 })} aria-label={zoomReset} disabled={!zoomed}>⤢</button>
        </div>
        {spot && card && onScreen ? (
          <div className={`cmap-pop ${fx > size.w * 0.58 ? 'is-left' : ''} ${fy > size.h * 0.62 ? 'is-up' : fy < size.h * 0.25 ? 'is-down' : ''}`.trim()} role="dialog" aria-label={card.name}
            style={{ left: fx, top: fy }}>
            <button type="button" className="cmap-close" onClick={() => onActive(null)} aria-label={closeLabel}>×</button>
            <p className="cmap-pop-name"><span aria-hidden="true">{card.flag}</span> {countries[spot.id] && countries[spot.id] !== card.name ? <><b>{countries[spot.id]}</b> · </> : null}{card.name}</p>
            <p className="cmap-pop-price id-num"><bdi className={card.tone}>{card.price}</bdi> <small>{card.unit}{card.sub ? ` · ${card.sub}` : ''}</small></p>
            <div className="cmap-pop-row id-num">
              {card.chip}
              {card.official ? <span className="cmap-pop-off">{officialLabel} <bdi>{card.official}</bdi></span> : null}
            </div>
            {card.cross ? <p className="cmap-pop-cross id-num">{card.cross}</p> : null}
            {card.href ? <Link href={card.href} className="cmap-pop-link">{card.hrefLabel}</Link> : null}
          </div>
        ) : null}
      </div>
    </figure>
  )
}
