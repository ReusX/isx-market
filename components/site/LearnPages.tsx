'use client'

import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import { guideSections, sectionId } from '@/lib/tradingFromZero'
import { SiteShell } from './SiteShell'
import { DoorRail } from './DoorRail'
import '@/styles/news-page.css'
import '@/styles/learn-page.css'

/**
 * The learn door on the site shell — the last routes off the old stack.
 *
 *   /learn/trading-from-zero  the hand-authored beginner guide, six sections
 *
 * The guide's CONTENT is `lib/tradingFromZero.ts`, untouched. /learn itself is
 * now the Learn platform's own home (components/learn/LearnHome.tsx).
 */
const LEARN_HOME: Record<string, string | null> = { ar: '/learn', en: '/learn' }

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
