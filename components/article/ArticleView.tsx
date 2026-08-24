import Link from 'next/link'
import type { Heading } from '@/lib/article'
import '@/app/learn/learn.css'

/**
 * The long-form article surface — /news/[slug] and /learn/[slug].
 *
 * ══ WHY THIS FILE EXISTS ══════════════════════════════════════════════════
 * The approved design app has no redesigned article page for News: its
 * `news/[slug]` is still the pre-redesign `terminal-shell` version and must
 * not be ported. The one approved long-form reading surface in the reference
 * is `learn/Article.tsx` — the `.ln-art` / `.ln-prose` chrome — and it is the
 * same shape: a reading column, a derived contents rail, and a way onward.
 * So it is transplanted here once and both article routes use it. That is
 * what closes the seam between the transplanted News index and its articles.
 *
 * ── What is printed, and only what is printed ─────────────────────────────
 * Title, standfirst, author, date, lead image and body all come from the CMS
 * and are rendered as they arrive. The contents list is derived from the
 * body's own headings. Related articles and previous/next come from the real
 * post list for the same section, in real date order.
 *
 * ── What is NOT here ──────────────────────────────────────────────────────
 * The reference template carries a «المصادر» references block. The CMS has no
 * references field, so citing anything there would mean inventing citations —
 * it is omitted rather than filled. Reading time is likewise absent from the
 * CMS and is not shown on a news article, where the reader's question is when
 * it was published, not how long it takes. Author, date and image lines are
 * each omitted when the field is empty, never replaced with a placeholder.
 */
export type ArticleNeighbour = { slug: string; title: string; href: string }

export function ArticleView({
  eyebrow, backHref, backLabel, title, standfirst, author, dateLabel, dateTime,
  image, imageAlt, bodyHtml, headings, related, prev, next, relatedLabel,
}: {
  /** The section the article belongs to — the second crumb. */
  eyebrow: string
  backHref: string
  backLabel: string
  title: string
  standfirst: string | null
  author: string | null
  dateLabel: string | null
  dateTime: string | null
  image: string | null
  imageAlt: string
  bodyHtml: string
  headings: Heading[]
  related: ArticleNeighbour[]
  prev: ArticleNeighbour | null
  next: ArticleNeighbour | null
  relatedLabel: string
}) {
  const hasRail = headings.length > 1 || related.length > 0

  return (
    <main className="ln-art iq-page">
      <header className="ln-art-head">
        <nav className="ln-crumbs" aria-label="مسار التنقل">
          <Link href={backHref}>{backLabel}</Link>
          <i aria-hidden="true">›</i>
          <span>{eyebrow}</span>
        </nav>
      </header>

      <div className={`ln-art-grid ${hasRail ? '' : 'is-solo'}`.trim()}>
        <article className="ln-body">
          <h1>{title}</h1>
          {/* The standfirst sits between the title and the metadata so it
              reads as part of the headline rather than as the first
              paragraph. */}
          {standfirst ? <p className="ln-standfirst">{standfirst}</p> : null}

          {/* Each fact appears only if the CMS has it. An article with no
              stored author prints no author, rather than «فريق التحرير». */}
          {author || dateLabel ? (
            <p className="ln-art-meta">
              {author ? <span>{author}</span> : null}
              {author && dateLabel ? <i aria-hidden="true">·</i> : null}
              {dateLabel && dateTime ? <time dateTime={dateTime}>{dateLabel}</time> : null}
            </p>
          ) : null}

          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="ln-lead-img" src={image} alt={imageAlt} loading="lazy" />
          ) : null}

          {/* The editorial body, exactly as the CMS returned it — same
              mechanism the live article template uses, with ids added to the
              headings so the contents list can point at them. */}
          <div className="ln-prose" dangerouslySetInnerHTML={{ __html: bodyHtml }} />

          {prev || next ? (
            <nav className="ln-pn" aria-label="التنقل بين المقالات">
              {prev ? (
                <Link href={prev.href} className="is-prev">
                  <span>السابق</span><strong>{prev.title}</strong>
                </Link>
              ) : <span />}
              {next ? (
                <Link href={next.href} className="is-next">
                  <span>التالي</span><strong>{next.title}</strong>
                </Link>
              ) : <span />}
            </nav>
          ) : null}
        </article>

        {hasRail ? (
          <aside className="ln-rail">
            {/* One heading is not an outline; below two the list costs the
                reader more than it saves. */}
            {headings.length > 1 ? <ArticleToc headings={headings} /> : null}

            {related.length > 0 ? (
              <section className="ln-related" aria-labelledby="ln-rel-h">
                <h2 id="ln-rel-h">{relatedLabel}</h2>
                <ul>
                  {related.map((r) => (
                    <li key={r.slug}>
                      <Link href={r.href}><strong>{r.title}</strong></Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </aside>
        ) : null}
      </div>
    </main>
  )
}

/** Split out so the rail stays a server component and only this tracks scroll. */
function ArticleToc({ headings }: { headings: Heading[] }) {
  return (
    <nav className="ln-toc" aria-labelledby="ln-toc-h">
      <h2 id="ln-toc-h">المحتويات</h2>
      <ol>
        {headings.map((h) => (
          <li key={h.id} className={h.level === 3 ? 'is-sub' : ''}>
            <a href={`#${h.id}`}>{h.text}</a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
