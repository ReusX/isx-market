'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import Link from 'next/link'
import { guideSections, sectionId } from '@/lib/tradingFromZero'
import '@/styles/learn.css'

/**
 * `/learn/trading-from-zero` — the beginner path, in the approved chrome.
 *
 * ── What changed, and what did not ────────────────────────────────────────
 * The CONTENT is untouched: same six sections, same titles, same bodies, same
 * order, byte for byte (see `lib/tradingFromZero.ts`). What changed is the
 * surface — the live page was a stack of inline-styled `<div>`s at 740px with
 * a `.wp-content` body class, and it now uses the approved reading column,
 * `.ln-prose` vocabulary and the article rail.
 *
 * ── The one defect this fixes ─────────────────────────────────────────────
 * The live contents list is a plain `<ol>` of TEXT. Six items, no anchors, no
 * position — it looks like navigation and navigates nowhere. Here the path
 * navigation is real: anchored, position-aware, and it tells the reader where
 * they are in a long read.
 *
 * ── The CTA is gone ───────────────────────────────────────────────────────
 * The live page ends in a gradient card pushing «السوق المباشر» and
 * «استعرض الشركات». The approved article template ends on a way onward
 * instead, and «مباشر» is a claim this product does not make about its own
 * prices — the market page is one session behind, not live. The two
 * destinations survive as ordinary links.
 */
export function LearnGuide() {
  const { t: T, locale, href: L } = useLocale()
  const ln = T.learn
  const sections = guideSections(locale)
  const [active, setActive] = useState<string | null>(null)

  /**
   * Which heading the reader is at.
   *
   * A scan for the last heading above a fold line rather than an
   * IntersectionObserver: an observer band leaves a hole at the very top of
   * the viewport, which is exactly where a heading lands after following a
   * contents link — the one moment the highlight matters most.
   */
  useEffect(() => {
    const ids = sections.map((_, i) => sectionId(i))
    const onScroll = () => {
      let current: string | null = ids[0] ?? null
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= 140) current = id
      }
      setActive(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('scroll', onScroll, { passive: true, capture: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('scroll', onScroll, { capture: true })
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const index = Math.max(0, sections.findIndex((_, i) => sectionId(i) === active))

  return (
    <main className="ln-art ln-path-page iq-page">
      <header className="ln-art-head">
        <nav className="ln-crumbs" aria-label={ln.crumbsLabel}>
          <Link href={L('/learn')}>{ln.title}</Link>
          <i aria-hidden="true">›</i>
          <span>{ln.startHere}</span>
        </nav>
      </header>

      <div className="ln-art-grid">
        <article className="ln-body">
          <h1>{ln.guideH1}</h1>
          <p className="ln-standfirst">
            {ln.guideIntro}
            {ln.guideStandfirst}
          </p>
          <p className="ln-art-meta">
            {ln.sectionsCount(String(sections.length))}
          </p>

          <div className="ln-prose">
            {sections.map((s, i) => (
              <section key={sectionId(i)}>
                <h2 id={sectionId(i)}>
                  <span className="ln-step" aria-hidden="true"><bdi>{i + 1}</bdi></span>
                  {s.title}
                </h2>
                {s.body.split('\n\n').map((para, j) => (
                  <p key={j} style={{ whiteSpace: 'pre-line' }}>{para}</p>
                ))}
              </section>
            ))}
          </div>

          <nav className="ln-pn" aria-label={ln.afterPath}>
            <Link href="/market" className="is-prev">
              <span>{ln.followMarket}</span><strong>{ln.market}</strong>
            </Link>
            <Link href="/learn" className="is-next">
              <span>{ln.afterPath}</span><strong>{ln.allArticles}</strong>
            </Link>
          </nav>
        </article>

        <aside className="ln-rail">
          {/* Real navigation, with a stated position. */}
          <nav className="ln-toc is-path" aria-labelledby="ln-path-h">
            <h2 id="ln-path-h">{ln.pathSections}</h2>
            <p className="ln-progress">
              {ln.ofSections(String(index + 1), String(sections.length))}
              <span className="ln-progress-track" aria-hidden="true">
                <i style={{ inlineSize: `${((index + 1) / sections.length) * 100}%` }} />
              </span>
            </p>
            <ol>
              {sections.map((s, i) => (
                <li key={sectionId(i)} className={active === sectionId(i) ? 'is-on' : ''}>
                  <a href={`#${sectionId(i)}`}>
                    <bdi>{i + 1}</bdi>
                    <span>{s.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>
      </div>
    </main>
  )
}
