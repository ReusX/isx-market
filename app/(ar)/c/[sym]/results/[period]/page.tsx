import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { ResultsPage } from '@/components/site/ResultsPage'
import { loadResults, loadResultsIndex, resultsSlug } from '@/lib/resultsServer'
import { resultsVars } from '@/lib/resultsText'
import { messages } from '@/lib/i18n'
import { absUrl, seoAlternates } from '@/lib/seo'

/**
 * /c/[sym]/results/[period] · a filing written out — «نتائج مصرف بغداد
 * للربع الأول 2026». One page per trusted filing; the newest 150 are
 * prerendered, the rest on demand. Arabic-only for now.
 */
export const revalidate = 3600
export const dynamicParams = true
export async function generateStaticParams() {
  return (await loadResultsIndex()).slice(0, 150).map((k) => ({ sym: k.sym, period: resultsSlug(k) }))
}

export async function generateMetadata({ params }: { params: { sym: string; period: string } }): Promise<Metadata> {
  const x = await loadResults(params.sym, params.period)
  if (!x) return { title: 'Not found', robots: { index: false, follow: false } }
  const t = messages('ar'), v = resultsVars(x, t, 'ar')
  const title = t.results.seoTitle(v)
  const path = `/c/${x.key.sym}/results/${x.slug}`
  return {
    title: { absolute: title },
    description: t.results.seoDescription(v),
    alternates: seoAlternates(path),
    openGraph: { url: absUrl(path), type: 'article', title, publishedTime: x.addedAt ?? undefined, images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
  }
}

export default async function Page({ params }: { params: { sym: string; period: string } }) {
  if (params.sym !== params.sym.toUpperCase() || params.period !== params.period.toLowerCase()) permanentRedirect(`/c/${params.sym.toUpperCase()}/results/${params.period.toLowerCase()}`)
  const x = await loadResults(params.sym, params.period)
  if (!x) notFound()
  const t = messages('ar'), v = resultsVars(x, t, 'ar')
  const path = `/c/${x.key.sym}/results/${x.slug}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: t.results.seoTitle(v),
    description: t.results.seoDescription(v),
    datePublished: x.addedAt ?? undefined,
    dateModified: x.addedAt ?? undefined,
    inLanguage: 'ar',
    mainEntityOfPage: absUrl(path),
    author: { '@type': 'Organization', name: 'IQWealth', url: absUrl('/') },
    publisher: { '@type': 'Organization', name: 'IQWealth', url: absUrl('/'), logo: { '@type': 'ImageObject', url: absUrl('/icon.png') } },
    image: [absUrl('/opengraph-image')],
    articleSection: t.results.eyebrow,
    about: { '@type': 'Corporation', name: x.en, tickerSymbol: x.key.sym, url: absUrl(`/c/${x.key.sym}`) },
    citation: x.pdfUrl ?? undefined,
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ResultsPage initial={x} />
    </>
  )
}
