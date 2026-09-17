'use client'

import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import { learnDate, readingMinutes } from '@/lib/learn'
import { stripHtml, SECTIONS, type WPPost } from '@/lib/cms'
import { SiteShell } from './SiteShell'
import { DoorRail } from './DoorRail'
import { PageTitle } from './PageTitle'
import '@/styles/news-page.css'
import '@/styles/learn-page.css'

/** /research · the analysis library from the CMS, Arabic-only, as cards. */
export function ResearchPage({ posts }: { posts: WPPost[] }) {
  const { t, locale } = useLocale()
  return (
    <SiteShell>
      <main className="nws id-full iq-door">
        <DoorRail door="learn" />
        <div className="nws-body lrn">
          <header className="nws-head">
            <p className="id-eyebrow">{t.home.landing.doors.learn.name}</p>
            <PageTitle title={locale === 'ar' ? SECTIONS.research.labelAr : SECTIONS.research.labelEn} note={locale === 'ar' ? SECTIONS.research.descAr : SECTIONS.research.descEn} />
          </header>
          {!posts.length ? <p className="id-note"><b>{t.learn.emptyTitle}</b> · {t.learn.emptyNote}</p> : (
            <ul className="lrn-grid">
              {posts.map((p) => {
                const summary = stripHtml(p.excerpt?.rendered ?? '').trim()
                const mins = readingMinutes(stripHtml(p.content?.rendered ?? ''))
                return (
                  <li key={p.id}>
                    <Link href={`/research/${p.slug}`} className="lrn-card">
                      <strong className="id-name">{stripHtml(p.title.rendered)}</strong>
                      {summary ? <span className="id-cap lrn-card-sum">{summary}</span> : null}
                      <span className="id-cap">{t.learn.minutesPlural(String(mins))}{learnDate(p.modified || p.date, locale) ? ` · ${t.learn.lastUpdated(learnDate(p.modified || p.date, locale) as string)}` : ''}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </main>
    </SiteShell>
  )
}
