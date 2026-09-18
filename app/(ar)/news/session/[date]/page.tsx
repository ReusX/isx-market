import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SessionWrapPage } from '@/components/site/SessionWrapPage'
import { loadSessionWrap, loadSessions, sessionIndexable } from '@/lib/wrapServer'
import { wrapVars } from '@/lib/wrapText'
import { messages } from '@/lib/i18n'
import { absUrl, seoAlternates } from '@/lib/seo'

/**
 * /news/session/[date] · the daily session wrap, one page per trading day.
 *
 * Generated from the session tables, so it exists for every session in the
 * index and needs no editor. The last sixty are prerendered; older dates
 * render on demand and are then kept. Arabic-only for now (the English
 * dictionary is in place for a mirror later).
 */
export const revalidate = 1800
export const dynamicParams = true
export async function generateStaticParams() {
  return (await loadSessions(15)).map((date) => ({ date }))
}

export async function generateMetadata({ params }: { params: { date: string } }): Promise<Metadata> {
  const s = await loadSessionWrap(params.date)
  if (!s) return { title: 'Not found', robots: { index: false, follow: false } }
  const t = messages('ar'), v = wrapVars(s, t, 'ar')
  const title = t.wrap.seoTitle(v.dateShort, v.close, v.pct, v.dir)
  return {
    title: { absolute: title },
    description: t.wrap.seoDescription(v),
    alternates: seoAlternates(`/news/session/${s.date}`),
    /* Older than SESSION_INDEX_DAYS: online, linked, but not offered to the index. */
    ...(sessionIndexable(s.date) ? {} : { robots: { index: false, follow: true } }),
    openGraph: { url: absUrl(`/news/session/${s.date}`), type: 'article', title, publishedTime: `${s.date}T14:00:00+03:00`, images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
  }
}

export default async function Page({ params }: { params: { date: string } }) {
  const s = await loadSessionWrap(params.date)
  if (!s) notFound()
  const t = messages('ar'), v = wrapVars(s, t, 'ar')
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: t.wrap.seoTitle(v.dateShort, v.close, v.pct, v.dir),
    description: t.wrap.seoDescription(v),
    datePublished: `${s.date}T14:00:00+03:00`,
    dateModified: `${s.date}T14:00:00+03:00`,
    inLanguage: 'ar',
    mainEntityOfPage: absUrl(`/news/session/${s.date}`),
    author: { '@type': 'Organization', name: 'IQWealth', url: absUrl('/') },
    publisher: { '@type': 'Organization', name: 'IQWealth', url: absUrl('/'), logo: { '@type': 'ImageObject', url: absUrl('/icon.png') } },
    image: [absUrl('/opengraph-image')],
    articleSection: t.wrap.eyebrow,
    about: { '@type': 'FinancialProduct', name: 'ISX60' },
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SessionWrapPage initial={s} />
    </>
  )
}
