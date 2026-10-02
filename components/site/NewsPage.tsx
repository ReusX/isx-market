'use client'

import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import { SiteShell } from './SiteShell'
import { DoorRail } from './DoorRail'
import { PageTitle } from './PageTitle'
import { ArticleCover } from './ArticleCover'
import { dayLabel, type NewsItem } from '@/lib/news'
import type { NewsInitial } from '@/lib/newsServer'
import '@/styles/econ-page.css'
import '@/styles/news-page.css'

/**
 * /news · our own articles only (user, 2026-10-02), on the board (board 2,
 * page 5: «ورق الجرايد»).
 *
 * The masthead, then the newest article as the lead in the frame — its
 * featured image beside the headline and standfirst — then every other
 * article as a card with its image (or drawn cover, ArticleCover). No
 * filters: the feed is what IQWealth writes, not a wire.
 */
export function NewsPage({ initial }: { initial: NewsInitial }) {
  const { t, locale, href: L } = useLocale()
  const nw = t.news
  const B = nw.board
  const [lead, ...rest] = initial.items
  const href = (it: NewsItem) => (it.foreignLang ? it.href : L(it.href))

  return (
    <SiteShell>
      <main className="nws nw3 id-full iq-door" data-world="tile" data-level="accent">
        <DoorRail door="learn" />
        <div className="nws-body nw3-body">
          <header className="nw3-mast">
            <PageTitle title={nw.title} note={nw.standfirst} className="nw3-h1" />
            <p className="nw3-own">{B.own}</p>
          </header>

          {!initial.articlesOk ? <p className="id-note nws-notice"><b>{nw.articlesFailedTitle}</b> · {nw.articlesFailedNote}</p> : null}
          {!lead ? <p className="id-note"><b>{nw.emptyTitle}</b> · {nw.emptyNote}</p> : (
            <article className="fx-frame nw3-lead">
              <Link href={href(lead)} className="nw3-lead-img" tabIndex={-1} aria-hidden="true">
                <ArticleCover image={lead.cover?.image ?? null} topic={lead.cover?.topic ?? '/market'} alt="" priority />
              </Link>
              <div className="nw3-lead-txt">
                <p className="nw3-kicker id-num"><span className="nw3-kind is-article">{B.latest}</span><time dateTime={lead.at}>{dayLabel(lead.at, locale)}</time></p>
                <h2 className="nw3-lead-h"><Link href={href(lead)}>{lead.headline}</Link></h2>
                {lead.excerpt ? <p className="nw3-lead-x">{lead.excerpt}</p> : null}
                <p><Link href={href(lead)} className="fx-qbtn nw3-read">{B.read} ←</Link></p>
              </div>
            </article>
          )}

          {rest.length ? (
            <section aria-label={B.more}>
              <h2 className="id-h3 nw3-sec-h">{B.more}</h2>
              <ul className="nw3-cards">
                {rest.map((it) => (
                  <li key={it.id}>
                    <Link href={href(it)} className="nw3-card">
                      <ArticleCover image={it.cover?.image ?? null} topic={it.cover?.topic ?? '/market'} alt="" size="sm" />
                      <span className="nw3-card-d id-cap id-num">{dayLabel(it.at, locale)}</span>
                      <span className="nw3-card-h">{it.headline}</span>
                      {it.excerpt ? <span className="nw3-card-x">{it.excerpt}</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </main>
    </SiteShell>
  )
}
