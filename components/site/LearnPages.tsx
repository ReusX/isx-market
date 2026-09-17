'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { filterLearn, learnDate, type LearnItem, type LearnPath } from '@/lib/learn'
import { guideSections, sectionId } from '@/lib/tradingFromZero'
import { existsIn } from '@/lib/i18n/routes'
import { SiteShell } from './SiteShell'
import { DoorRail } from './DoorRail'
import { PageTitle } from './PageTitle'
import '@/styles/news-page.css'
import '@/styles/learn-page.css'

/**
 * The learn door on the site shell — the last routes off the old stack.
 *
 *   /learn                    the path card, the newest articles, the library
 *   /learn/trading-from-zero  the hand-authored beginner guide, six sections
 *
 * The guide's CONTENT is `lib/tradingFromZero.ts`, untouched; the library
 * comes from the CMS and is empty today — «المحتوى قيد الإعداد» is its
 * normal state, and an outage is reported as an outage, not as emptiness.
 */
const LEARN_HOME: Record<string, string | null> = { ar: '/learn', en: '/learn' }

export function LearnIndexPage({ items, path, libraryOk }: { items: LearnItem[]; path: LearnPath; libraryOk: boolean }) {
  const { t, locale, href: L } = useLocale()
  const ln = t.learn
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState(9)
  const results = useMemo(() => filterLearn(items, query), [items, query])
  const filtering = query.trim() !== ''

  return (
    <SiteShell>
      <main className="nws id-full iq-door">
        <DoorRail door="learn" />
        <div className="nws-body lrn">
          <header className="nws-head">
            <p className="id-eyebrow">{t.home.landing.doors.learn.name}</p>
            <PageTitle title={ln.title} />
          </header>

          <section className="id-panel lrn-start" aria-label={ln.startHere}>
            <p className="id-cap">{ln.startHere}</p>
            <Link className="lrn-path" href={L(path.href)}>
              <span className="lrn-path-copy">
                <strong className="id-h3">{path.title}</strong>
                <span className="id-body">{path.summary}</span>
                <span className="id-cap">{ln.sectionsCount(String(path.sections))} · {ln.minutes(String(path.minutes))}</span>
              </span>
              <span className="id-btn is-primary is-sm">{ln.start}</span>
            </Link>
          </section>

          <section className="lrn-library" aria-label={ln.allArticles}>
            <div className="lrn-library-head">
              <h2 className="id-h3">{ln.allArticles}</h2>
              <input type="search" className="id-input lrn-q" value={query} placeholder={ln.searchPlaceholder} aria-label={ln.searchLabel}
                onChange={(e) => { setQuery(e.target.value); setShown(9) }} disabled={!items.length} title={!items.length ? (libraryOk ? ln.nothingToSearch : ln.libraryFailed) : undefined} />
            </div>
            {!libraryOk ? <p className="id-note"><b>{ln.libraryDown}</b></p>
              : !items.length ? <p className="id-note"><b>{ln.emptyTitle}</b> · {ln.emptyNote}</p>
              : !results.length ? <p className="id-note"><b>{ln.noResults}</b> · {ln.noResultsNote}</p>
              : (
                <>
                  {filtering ? <p className="id-cap">{ln.ofTotal(String(results.length), String(items.length))} <button type="button" className="id-link lrn-clear" onClick={() => setQuery('')}>{ln.clear}</button></p> : null}
                  <ul className="lrn-grid">
                    {results.slice(0, shown).map((l) => (
                      <li key={l.slug}>
                        {existsIn(l.href, locale) || locale === 'ar' ? (
                          <Link href={locale === 'ar' ? l.href : L(l.href)} className="lrn-card">
                            <strong className="id-name">{l.title}</strong>
                            {l.summary ? <span className="id-cap lrn-card-sum">{l.summary}</span> : null}
                            <span className="id-cap">{ln.minutesPlural(String(l.minutes))}{learnDate(l.updated, locale) ? ` · ${ln.lastUpdated(learnDate(l.updated, locale) as string)}` : ''}</span>
                          </Link>
                        ) : (
                          <span className="lrn-card"><strong className="id-name">{l.title}</strong></span>
                        )}
                      </li>
                    ))}
                  </ul>
                  {shown < results.length ? <p className="nws-more"><button type="button" className="id-btn is-sm" onClick={() => setShown((n) => n + 9)}>{ln.showMore}</button></p> : null}
                </>
              )}
          </section>
        </div>
      </main>
    </SiteShell>
  )
}

export function LearnGuidePage() {
  const { t, locale, href: L } = useLocale()
  const ln = t.learn
  const sections = guideSections(locale)
  return (
    <SiteShell>
      <main className="nws id-full iq-door">
        <DoorRail door="learn" />
        <article className="art id-read">
          <nav className="id-eyebrow art-crumbs" aria-label={ln.crumbsLabel}>
            {LEARN_HOME[locale] ? <Link href={L(LEARN_HOME[locale] as string)}>{ln.title}</Link> : <span>{ln.title}</span>} · <span>{ln.startHere}</span>
          </nav>
          <h1 className="id-h1 art-title">{ln.guideH1}</h1>
          <p className="art-standfirst">{ln.guideIntro} {ln.guideStandfirst}</p>
          <p className="art-meta id-cap">{ln.sectionsCount(String(sections.length))}</p>
          <nav className="art-toc" aria-label={ln.pathSections}>
            <p className="id-cap">{ln.pathSections}</p>
            <ol>{sections.map((s, i) => <li key={sectionId(i)}><a href={`#${sectionId(i)}`}>{s.title}</a></li>)}</ol>
          </nav>
          <div className="art-body id-body ln-prose">
            {sections.map((s, i) => (
              <section key={sectionId(i)}>
                <h2 id={sectionId(i)}><span className="lrn-step" aria-hidden="true"><bdi>{i + 1}</bdi></span>{s.title}</h2>
                {s.body.split('\n\n').map((para, j) => <p key={j} style={{ whiteSpace: 'pre-line' }}>{para}</p>)}
              </section>
            ))}
          </div>
          <nav className="art-nav" aria-label={ln.afterPath}>
            <Link href={L('/market')} className="art-nav-a"><span className="id-cap">{ln.followMarket}</span><span>{ln.market}</span></Link>
            {LEARN_HOME[locale] ? <Link href={L(LEARN_HOME[locale] as string)} className="art-nav-a is-next"><span className="id-cap">{ln.afterPath}</span><span>{ln.allArticles}</span></Link> : <span />}
          </nav>
        </article>
      </main>
    </SiteShell>
  )
}
