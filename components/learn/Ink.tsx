'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * The Learn platform's ink kit — what makes the pages feel drawn by hand.
 *
 *   <InkDefs/>     once per page: the «boiling line» filter. Real cartoon
 *                  animation redraws every line a few times a second, so it
 *                  shimmers; here a turbulence map re-seeds on a step (SMIL) and
 *                  nudges whatever wears `filter: url(#lx-boil)` a pixel or two.
 *                  Left static for readers who ask for reduced motion.
 *   useInView      marks a block `data-in` once it scrolls near, which starts
 *                  its draw-on and pop animations (styles/learn-home.css).
 *                  Everything is drawn and visible before that: the animation
 *                  plays FROM the finished state's own geometry, it never
 *                  waits hidden for an observer.
 *   <Scribble/>    hand-drawn underline / circle / arrow, drawn on stroke by stroke.
 */
export function InkDefs() {
  const [still, setStill] = useState(true)
  useEffect(() => { setStill(window.matchMedia('(prefers-reduced-motion: reduce)').matches) }, [])
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
      <filter id="lx-boil" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="1">
          {still ? null : <animate attributeName="seed" values="1;4;8;12" dur="0.6s" repeatCount="indefinite" calcMode="discrete" />}
        </feTurbulence>
        <feDisplacementMap in="SourceGraphic" scale="2.4" />
      </filter>
    </svg>
  )
}

export function useInView<T extends Element>(margin = '0px 0px -12% 0px') {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || inView) return
    if (!('IntersectionObserver' in window)) { setInView(true); return }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setInView(true); io.disconnect() } }, { rootMargin: margin })
    io.observe(el)
    return () => io.disconnect()
  }, [inView, margin])
  return [ref, inView] as const
}

/** A block that plays its ink animations once it is on screen. */
export function Reveal({ as: Tag = 'div', className, children, ...rest }: { as?: 'div' | 'section' | 'li' | 'figure'; className?: string; children: ReactNode } & Record<string, unknown>) {
  const [ref, inView] = useInView<HTMLElement>()
  const T = Tag as 'div'
  return <T ref={ref as React.Ref<HTMLDivElement>} className={className} data-in={inView ? '' : undefined} {...rest}>{children}</T>
}

type ScribbleKind = 'underline' | 'circle' | 'arrow' | 'swoosh'
const PATHS: Record<ScribbleKind, { vb: string; d: string[] }> = {
  underline: { vb: '0 0 200 20', d: ['M4 13 C 40 6, 80 16, 120 9 S 180 7, 196 12', 'M20 17 C 70 12, 120 18, 176 14'] },
  circle: { vb: '0 0 200 80', d: ['M100 6 C 40 4, 6 20, 8 42 C 10 66, 60 76, 110 74 C 160 72, 196 58, 192 36 C 188 14, 140 4, 84 10'] },
  arrow: { vb: '0 0 120 90', d: ['M110 8 C 80 10, 40 24, 22 70', 'M8 50 L 22 72 L 42 58'] },
  swoosh: { vb: '0 0 200 40', d: ['M4 30 C 50 10, 110 4, 196 20'] },
}

export function Scribble({ kind, className, color = 'currentColor', width = 3 }: { kind: ScribbleKind; className?: string; color?: string; width?: number }) {
  const p = PATHS[kind]
  return (
    <svg viewBox={p.vb} className={`lx-scribble is-${kind} ${className ?? ''}`} aria-hidden="true" preserveAspectRatio="none">
      {p.d.map((d, i) => (
        <path key={i} d={d} pathLength={1} className="lx-draw" style={{ animationDelay: `${0.15 + i * 0.25}s` }}
          fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  )
}

/** A comic speech bubble, lettered in Ruqaa. `tail` says which way it points. */
export function Bubble({ children, tail = 'down-start', className }: { children: ReactNode; tail?: 'down-start' | 'down-end' | 'up-start' | 'up-end'; className?: string }) {
  return <p className={`lx-bubble is-${tail} ${className ?? ''}`}>{children}</p>
}
