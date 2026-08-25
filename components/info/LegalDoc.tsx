'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { InfoHead, DocToc, FamilyRow, Plate } from './InfoChrome'
import { type LegalSection, type LegalBlock } from '@/lib/legalContent'
import type { Scene } from '@/components/design/DitherArt'
import '@/styles/info.css'

/**
 * The legal-document system · /privacy and /legal are the same machine.
 *
 * A direct transplant of the approved `app/info/LegalDoc.tsx`.
 *
 * ── The reading surface ───────────────────────────────────────────────────
 * No cards. Boxing a clause makes it look like a widget and makes the whole
 * document look secondary. What carries the structure instead is the measure,
 * the heading scale, the section rule and the space around it — and the body
 * is set at article size, not the 14px the pre-redesign pages used, for the
 * same reason.
 *
 * The section number is STRUCTURE, not part of the title string. The old
 * /legal numbered its sections inside the heading text — «1. إخلاء المسؤولية
 * الاستثمارية» — which is a page asking for an anchor it does not have.
 * Numbered clauses exist to be pointed at; here every section carries an `id`
 * and the contents list links to it.
 *
 * ⚠ Both documents are DRAFTS pending Iraq-qualified counsel. The unresolved
 * fields carry visible `[مراجعة قانونية: …]` markers — see `markReview` at the
 * foot of this file for why they are visible rather than smoothed away.
 */
export function LegalDoc({
  route, eyebrow, title, sections, banner, scene, updated,
}: {
  route: string
  eyebrow: string
  title: string
  sections: LegalSection[]
  /** /legal opens with a standing disclaimer. /privacy does not. */
  banner?: string
  scene: Scene
  /** The draft date, in the document's own language. */
  updated: string
}) {
  const { t } = useLocale()
  const lg = t.info.legal
  const active = useActiveSection(sections)

  /**
   * The index is open on desktop and folded on a phone.
   *
   * `<details>` is the right element — it folds without JavaScript, and it is
   * the index, never the document body. But a closed `<details>` hides its
   * children through UA rendering that CSS cannot reliably reopen, so the
   * initial state is decided once from the viewport. Rendering it closed and
   * "un-hiding" it with a media query would leave desktop readers with an
   * index that is in the DOM and invisible.
   */
  const [tocOpen, setTocOpen] = useState(true)
  useEffect(() => {
    if (window.matchMedia('(max-width: 1000px)').matches) setTocOpen(false)
  }, [])

  return (
    <main className="in-page in-doc iq-page">
      <InfoHead eyebrow={eyebrow} title={title} updated={updated} />

      {/* The band sits between the head and the document, at a third of the
          About plate's height: present but restrained, and once the reading
          starts readability dominates. There is no art below this line. */}
      <Plate scene={scene} tier="band" />

      <div className="in-doc-grid">
        <article className="in-body">
          {/* ONE disclaimer surface, and it is a stated rule with a label
              rather than a warning box — a standing legal fact is not an
              alert. */}
          {banner ? (
            <aside className="in-banner">
              <strong>{lg.notice}</strong>
              <p>{banner}</p>
            </aside>
          ) : null}

          <div className="in-prose">
            {sections.map((s, i) => (
              <section key={s.id} aria-labelledby={s.id}>
                <h2 id={s.id}>
                  <span className="in-num" aria-hidden="true"><bdi>{i + 1}</bdi></span>
                  {s.title}
                </h2>
                {s.blocks.map((b, j) => <BlockView key={j} b={b} />)}
              </section>
            ))}
          </div>

          <FamilyRow current={route} />
        </article>

        <aside className="in-rail">
          <details className="in-toc-fold" open={tocOpen}
            onToggle={(e) => setTocOpen((e.target as HTMLDetailsElement).open)}>
            <summary>{lg.onThisPage}</summary>
            <DocToc sections={sections} active={active} />
          </details>
        </aside>
      </div>
    </main>
  )
}

/**
 * Which section the reader is in.
 *
 * A scan for the last heading above a fold line, not an IntersectionObserver.
 * An observer band leaves a hole at the very top of the viewport, which is
 * exactly where a heading lands after following a contents link — so the one
 * moment the highlight matters most is the one it misses.
 */
export function useActiveSection(sections: LegalSection[]) {
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    const ids = sections.map((s) => s.id)
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
    // Capture phase on the document as well: if the shell ever scrolls an
    // inner container rather than the window, a window-only listener hears
    // nothing and the highlight silently freezes on the first heading.
    document.addEventListener('scroll', onScroll, { passive: true, capture: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('scroll', onScroll, { capture: true })
      window.removeEventListener('resize', onScroll)
    }
  }, [sections])
  return active
}

/**
 * One renderer per block kind.
 *
 * `note` is the only emphasis the documents have. It marks the sentence a
 * reader must not miss — «we are not a broker», «we do not guarantee
 * accuracy», «there is no delete button yet» — and it is a ruled aside rather
 * than bold text, because bolding a whole sentence inside a legal paragraph
 * reads as shouting and disappears when three paragraphs do it.
 */
function BlockView({ b }: { b: LegalBlock }) {
  switch (b.kind) {
    case 'p': return <p>{markReview(b.text)}</p>
    case 'ul': return <ul>{b.items.map((x, i) => <li key={i}>{markReview(x)}</li>)}</ul>
    case 'note': return <p className="in-key">{markReview(b.text)}</p>
  }
}

/**
 * Renders `[مراجعة قانونية: …]` as a visible marker.
 *
 * These are the fields nobody may invent — the operator's legal name, the
 * governing law, the competent court, retention periods, the minimum age. A
 * draft that hid them behind smooth prose would be the dangerous version: it
 * would read as finished and could be published by accident. Marked, the page
 * cannot pretend to be more settled than it is.
 */
function markReview(text: string) {
  const parts = text.split(/(\[مراجعة قانونية:[^\]]*\])/g)
  if (parts.length === 1) return text
  return parts.map((p, i) =>
    p.startsWith('[مراجعة قانونية:')
      ? <mark className="in-review" key={i}>{p}</mark>
      : <span key={i}>{p}</span>)
}
