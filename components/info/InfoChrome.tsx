'use client'

import { type ReactNode } from 'react'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import { useLocale } from '@/context/LocaleContext'
import { DitherArt, type Scene } from '@/components/design/DitherArt'
import { FAMILY } from '@/lib/infoData'
import type { LegalSection } from '@/lib/legalContent'

/**
 * The shared chrome for the public-information family — a direct transplant of
 * the approved `app/info/InfoChrome.tsx`.
 *
 * Four pages, one system: /about, /contact, /privacy and /legal read as four
 * chapters of one document rather than four pages that happen to be legal.
 *
 * ── What was adapted, and why ─────────────────────────────────────────────
 * The reference carries `useTheme()` and a `ThemeButton` on every page,
 * because the design app has no shell and each page owns its own toggle. This
 * application has ONE theme system — `data-theme` on <html>, set pre-paint —
 * and one toggle, in the global header. Both are dropped here: a second
 * toggle is a second source of truth for the same fact, and the CSS reads the
 * attribute rather than a page-root class.
 *
 * The `mv-preview` state selector is dropped for the same class of reason. It
 * is a designer's control for previewing loading/missing states; on a real
 * page the state comes from the load, not from a dropdown.
 */

export function InfoHead({
  eyebrow, title, standfirst, updated,
}: {
  eyebrow: string
  title: string
  standfirst?: string
  updated?: string
}) {
  return (
    <header className="in-head">
      <div className="in-head-row">
        <p className="in-eyebrow">{eyebrow}</p>
      </div>
      <h1>{title}</h1>
      {standfirst ? <p className="in-standfirst">{standfirst}</p> : null}
      {/* Arabic dates carry Arabic words as well as numerals, so this is NOT
          `bdi`-wrapped — isolating it would reorder the sentence around it. */}
      {updated ? <p className="in-updated">آخر تحديث {updated}</p> : null}
    </header>
  )
}

/**
 * The contents list for a legal document.
 *
 * A narrow sticky list on desktop, a collapsed «في هذه الصفحة» on mobile. It
 * is a `<details>` on purpose: it folds without JavaScript, and the document
 * body is always in the markup and always open — only its index folds. Hiding
 * legal CONTENT behind a client-only accordion is the thing this avoids.
 */
export function DocToc({ sections, active }: { sections: LegalSection[]; active: string | null }) {
  return (
    <nav className="in-toc" aria-labelledby="in-toc-h">
      <h2 id="in-toc-h">في هذه الصفحة</h2>
      <ol>
        {sections.map((s, i) => (
          <li key={s.id} className={active === s.id ? 'is-on' : ''}>
            <a href={`#${s.id}`}>
              <bdi>{i + 1}</bdi>
              <span>{s.title}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

/**
 * The family row.
 *
 * The reference app has no site footer, so these four pages link each other.
 * This app DOES have `components/shell/SiteFooter.tsx`, which already carries
 * all four links — but the footer sits below a long legal document, and a
 * reader who has just finished the privacy policy is at the point where the
 * next question («and the terms?») is most likely. The row is kept for that
 * proximity, not to substitute for the footer.
 */
export function FamilyRow({ current }: { current: string }) {
  const { t, href: L } = useLocale()
  return (
    <nav className="in-family" aria-label={t.info.familyLabel}>
      {FAMILY.filter((f) => f.href !== current).map((f) => (
        <Link key={f.href} href={L(f.href)}>{t.nav.info[f.id]}</Link>
      ))}
    </nav>
  )
}

/**
 * The plate · the family's one imagery component.
 *
 * A thin rule and corner ticks turn a dithered field into a PLATE — something
 * printed rather than a decorative background. The art is generated, not
 * fetched: no remote asset, no photography, no emblem, a few kilobytes of
 * procedural field reduced to one bit.
 *
 * `tier` is the whole system:
 *   hero   /about   — a full composed scene, the page's opening statement
 *   panel  /contact — a tall portrait column beside the content
 *   band   /privacy, /legal — a title-area strip, then reading takes over
 */
export function Plate({ scene, tier }: { scene: Scene; tier: 'hero' | 'panel' | 'band' }) {
  const { theme } = useApp()
  return (
    <figure className={`in-plate is-${tier}`} aria-hidden="true">
      <div className="in-plate-frame">
        <DitherArt scene={scene} theme={theme === 'dark' ? 'dark' : 'light'} />
        <i className="in-tick is-tl" /><i className="in-tick is-tr" />
        <i className="in-tick is-bl" /><i className="in-tick is-br" />
      </div>
    </figure>
  )
}

export function InfoSkeleton() {
  return (
    <div className="in-skel" aria-hidden="true">
      <span /><span /><span /><span /><span />
    </div>
  )
}

export function InfoMissing({ note }: { note: string }) {
  return (
    <div className="in-missing" role="status">
      <strong>تعذّر عرض هذه الصفحة</strong>
      <span>{note}</span>
      <Link className="in-missing-go" href="/contact">تواصل معنا</Link>
    </div>
  )
}

export function InfoPage({ variant, children }: { variant: string; children: ReactNode }) {
  return <main className={`in-page ${variant} iq-page`}>{children}</main>
}
