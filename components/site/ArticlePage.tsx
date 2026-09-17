'use client'

import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import { SiteShell } from './SiteShell'
import { DoorRail } from './DoorRail'
import { existsIn } from '@/lib/i18n/routes'
import type { Heading } from '@/lib/article'
import '@/styles/news-page.css'

type ArticleNeighbour = { slug: string; title: string; href: string }

/**
 * One article — news today, learn and research when those rows land.
 *
 * A reading page: `.id-read` measure, the title, the standfirst as the
 * lede (it is the article's own first sentence, not a page note), the
 * byline and date, the lead image, a contents list when the body has
 * headings, the body as the CMS renders it, then previous/next and more
 * from the section. Nothing here fetches; the route loads the article.
 */
export function ArticlePage({ eyebrow, backHref, backLabel, title, standfirst, author, dateLabel, dateTime, image, imageAlt, bodyHtml, headings, related, prev, next, relatedLabel }: {
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
  const { t, locale, href: L } = useLocale()
  const a = t.learn.article
  const rail = [
    { label: t.home.landing.doors.learn.links.news, route: '/news' },
    { label: t.home.landing.doors.learn.links.learn, route: '/learn', soon: true },
    { label: t.home.landing.doors.learn.links.zero, route: '/learn/trading-from-zero', soon: true },
    { label: t.home.landing.doors.learn.links.research, route: '/research', soon: true },
  ].filter((r) => r.soon || existsIn(r.route, locale))

  return (
    <SiteShell>
      <main className="nws id-full iq-door">
        <DoorRail door="learn" items={rail} />
        <article className="art id-read">
          <nav className="id-eyebrow art-crumbs" aria-label={a.crumbs}>
            <Link href={L(backHref)}>{backLabel}</Link> · <span>{eyebrow}</span>
          </nav>
          <h1 className="id-h1 art-title">{title}</h1>
          {standfirst ? <p className="art-standfirst">{standfirst}</p> : null}
          {author || dateLabel ? (
            <p className="art-meta id-cap">
              {author ? <span>{author}</span> : null}
              {author && dateLabel ? ' · ' : ''}
              {dateLabel && dateTime ? <time dateTime={dateTime}>{dateLabel}</time> : dateLabel}
            </p>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {image ? <img className="art-img" src={image} alt={imageAlt} loading="lazy" /> : null}

          {headings.length > 1 ? (
            <nav className="art-toc" aria-label={a.contents}>
              <p className="id-cap">{a.contents}</p>
              <ol>
                {headings.map((h) => <li key={h.id} className={h.level === 3 ? 'is-sub' : ''}><a href={`#${h.id}`}>{h.text}</a></li>)}
              </ol>
            </nav>
          ) : null}

          {/* The CMS body, as it arrives: its own headings, links, images and tables. */}
          <div className="art-body id-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />

          {prev || next ? (
            <nav className="art-nav" aria-label={a.articleNav}>
              {prev ? <Link href={L(prev.href)} className="art-nav-a"><span className="id-cap">{a.prev}</span><span>{prev.title}</span></Link> : <span />}
              {next ? <Link href={L(next.href)} className="art-nav-a is-next"><span className="id-cap">{a.next}</span><span>{next.title}</span></Link> : <span />}
            </nav>
          ) : null}

          {related.length ? (
            <section className="art-related" aria-label={relatedLabel}>
              <h2 className="id-h3">{relatedLabel}</h2>
              <ul>
                {related.map((r) => <li key={r.slug}><Link href={L(r.href)}>{r.title}</Link></li>)}
              </ul>
            </section>
          ) : null}
        </article>
      </main>
    </SiteShell>
  )
}
