'use client'

import Link from 'next/link'
import { type ReactNode } from 'react'
import { useApp } from '@/context/AppContext'
import { DitherArt, type Scene } from '@/components/design/DitherArt'

/**
 * The shared shell for a whole-route failure — 404, 500, and nothing else.
 *
 * A direct transplant of the approved `app/system/StatePage.tsx`.
 *
 * These pages exist to enforce a rule by being RARE: a module that fails must
 * not take the page with it, so this shell appears only when the route itself
 * cannot render. Everything short of that uses `ModuleError` or
 * `PartialNotice` from `components/system/DataStates.tsx` and keeps the page.
 *
 * ── What both states owe the reader ───────────────────────────────────────
 * A code, so it can be reported. One sentence saying what happened, in the
 * product's own voice. And somewhere to go — a 404's whole job is «where can I
 * go instead?», which a bare «العودة إلى الرئيسية» does not answer.
 *
 * ── What they must never show ─────────────────────────────────────────────
 * No stack trace, no internal error code, no component name, no Supabase
 * message. `app/error.tsx` receives the `Error` object and deliberately drops
 * it: the raw string is English on an Arabic page at best, and a database
 * schema hint at worst.
 *
 * ── Adaptation ───────────────────────────────────────────────────────────
 * The reference reads the theme from localStorage itself, because its pages
 * each own a toggle. Here the theme is already on <html> before paint, so this
 * only reads it — which also means the one screen a reader hits when something
 * has gone wrong is not also the one screen that flashes the wrong colour.
 */
export function StatePage({
  scene, code, title, note, children,
}: {
  scene: Scene
  code: string
  title: string
  note: string
  children: ReactNode
}) {
  const { theme } = useApp()

  return (
    <main className="sp-page iq-page">
      <div className="sp-inner">
        <figure className="sp-plate" aria-hidden="true">
          <div className="sp-plate-frame">
            <DitherArt scene={scene} theme={theme === 'dark' ? 'dark' : 'light'} />
            <i className="in-tick is-tl" /><i className="in-tick is-tr" />
            <i className="in-tick is-bl" /><i className="in-tick is-br" />
          </div>
        </figure>

        <p className="sp-code"><bdi>{code}</bdi></p>
        <h1>{title}</h1>
        <p className="sp-note">{note}</p>
        {children}
      </div>
    </main>
  )
}

/** The «where else» row · two or three destinations, not a sitemap. */
export function StateLinks({ items }: { items: { href: string; label: string }[] }) {
  return (
    <nav className="sp-links" aria-label="وجهات مقترحة">
      {items.map((i) => <Link key={i.href} href={i.href}>{i.label}</Link>)}
    </nav>
  )
}
