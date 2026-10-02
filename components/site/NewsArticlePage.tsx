'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { SiteShell } from './SiteShell'
import { DoorRail } from './DoorRail'
import { ArticleCover } from './ArticleCover'
import { ArticleBody } from './ArticlePage'
import { RailIcon } from './RailIcon'
import { railDef } from './rails'
import { coverTopic } from '@/lib/articleFigures'
import type { Heading } from '@/lib/article'
import '@/styles/news-page.css'

type Neighbour = { slug: string; title: string; href: string; cover?: { image: string | null; topic: string } }

/**
 * /news/[slug] · one story, rebuilt on the board (board 2, page 5).
 *
 * «صفحة القراءة أقرب شي لروح الجريدة: عمود واحد مريح، والأرقام المرتبطة
 * بالخبر جنبه.» The headline and standfirst, then the featured image (or
 * the story's drawn cover — every article has the slot), then the body in
 * one reading column with, beside it, the key card «أرقام الخبر على
 * IQWealth» linking to the site's live figures the story talks about, and
 * the contents. After the body, the neighbours and more stories as cards
 * with their covers.
 *
 * Learn and research keep components/site/ArticlePage; this page is news
 * only.
 */
export function NewsArticlePage({ backHref, backLabel, eyebrow, title, standfirst, author, dateLabel, dateTime, image, figures, bodyHtml, blocks, layout = 'article', headings, related, prev, next, relatedLabel }: {
  backHref: string
  backLabel: string
  eyebrow: string
  title: string
  standfirst: string | null
  author: string | null
  dateLabel: string | null
  dateTime: string | null
  image: string | null
  figures: string[]
  bodyHtml: string
  blocks?: Record<string, ReactNode>
  layout?: 'article' | 'guide'
  headings: Heading[]
  related: Neighbour[]
  prev: Neighbour | null
  next: Neighbour | null
  relatedLabel: string
}) {
  const { t, href: L } = useLocale()
  const a = t.learn.article
  const topic = coverTopic(figures)
  const links = figures.map((route) => {
    if (route.startsWith('/c/')) return { route, icon: 'companies' as const, label: `${t.results.companyPage} · ${route.slice(3)}` }
    const d = railDef(route)
    return d ? { route, icon: d.icon, label: d.label(t) } : null
  }).filter((x): x is NonNullable<typeof x> => x != null)

  const card = (n: Neighbour, tag?: string) => (
    <Link href={L(n.href)} className="na-card">
      <ArticleCover image={n.cover?.image ?? null} topic={n.cover?.topic ?? '/market'} alt="" size="sm" />
      {tag ? <span className="id-cap">{tag}</span> : null}
      <span className="na-card-h">{n.title}</span>
    </Link>
  )

  return (
    <SiteShell>
      <main className="nws na id-full iq-door" data-world="tile" data-level="accent">
        <DoorRail door="learn" />
        <article className="na-body">
          <header className="na-head">
            <nav className="id-cap na-crumbs" aria-label={a.crumbs}>
              <Link href={L(backHref)}>{backLabel}</Link> · <span>{eyebrow}</span>
            </nav>
            <h1 className="na-title">{title}</h1>
            {standfirst ? <p className="na-standfirst">{standfirst}</p> : null}
            {author || dateLabel ? (
              <p className="na-meta id-cap">
                {author ? <span>{author}</span> : null}
                {author && dateLabel ? ' · ' : ''}
                {dateLabel && dateTime ? <time dateTime={dateTime}>{dateLabel}</time> : dateLabel}
              </p>
            ) : null}
          </header>

          <ArticleCover image={image} topic={topic} alt={title} priority />

          <div className="na-grid">
            <div className="na-main">
              <ArticleBody html={bodyHtml} blocks={blocks} cls={`art-body id-body${layout === 'guide' ? ' art-guide' : ''}`} />
            </div>

            <aside className="na-side">
              {links.length ? (
                <section className="id-print is-key na-figs" aria-label={a.figures}>
                  <p className="na-figs-h">{a.figures}</p>
                  {links.map((x) => (
                    <Link key={x.route} href={L(x.route)} className="na-fig">
                      <RailIcon name={x.icon} /><span>{x.label}</span><span className="na-go" aria-hidden="true">←</span>
                    </Link>
                  ))}
                </section>
              ) : null}
              {headings.length > 1 ? (
                <nav className="id-print is-calm na-toc" aria-label={a.contents}>
                  <p className="na-figs-h">{a.contents}</p>
                  <ol>
                    {headings.map((h) => <li key={h.id} className={h.level === 3 ? 'is-sub' : ''}><a href={`#${h.id}`}>{h.text}</a></li>)}
                  </ol>
                </nav>
              ) : null}
            </aside>
          </div>

          {prev || next ? (
            <nav className="na-pair" aria-label={a.articleNav}>
              {prev ? card(prev, a.prev) : <span />}
              {next ? card(next, a.next) : <span />}
            </nav>
          ) : null}

          {related.length ? (
            <section className="na-more" aria-label={relatedLabel}>
              <h2 className="id-h3">{relatedLabel}</h2>
              <ul className="na-cards">
                {related.map((r) => <li key={r.slug}>{card(r)}</li>)}
              </ul>
            </section>
          ) : null}
        </article>
      </main>
    </SiteShell>
  )
}
