import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import companiesData from '@/public/data/companies.json'
import { buildCompanySeoEn } from '@/lib/companySeo'
import { getQuote, describeQuote } from '@/lib/quote'
import Breadcrumbs from '@/components/seo/Breadcrumbs'
import { absUrl, seoAlternates } from '@/lib/seo'

interface Props {
  params:   { sym: string }
  children: React.ReactNode
}

/**
 * `/en/c/[sym]`.
 *
 * ⚠ NO English company name is invented here. `buildCompanySeoEn` uses the
 * verified `en` from companies.json when there is one; where it is missing the
 * title falls back to the TICKER and the description carries the official
 * Arabic name once, so the page still matches a search for it.
 *
 * The price sentence is included for the same reason the Arabic page includes
 * it — a snippet carrying the actual number is what earns the click — and is
 * excluded for suspended listings for the same reason too: their last close is
 * years old, and publishing it as a current price would be a lie in the SERP
 * itself.
 */
export async function generateMetadata({ params }: { params: { sym: string } }): Promise<Metadata> {
  const sym     = params.sym.toUpperCase()
  const company = (companiesData as { sym: string; ar: string; en: string; sec?: string }[])
    .find(c => c.sym === sym)

  const enName = company?.en ?? sym
  const arName = company?.ar ?? ''

  const quote = await getQuote(sym)
  const priceLine = quote && !quote.suspended ? describeQuote(quote, 'en') : undefined
  const seo = buildCompanySeoEn(sym, arName, enName, priceLine)

  return {
    title: { absolute: seo.title },
    description: seo.description,
    alternates: seoAlternates(`/c/${sym}`, 'en'),
    keywords: seo.keywords,
    openGraph: {
      title:       seo.title,
      description: seo.description,
      url:         absUrl(`/c/${sym}`, 'en'),
      siteName: 'IQWealth',
      images:   [{ url: '/opengraph-image', width: 1200, height: 630, alt: `${seo.shortAr} ${sym} — Iraq Stock Exchange` }],
      locale:   'en_US',
      alternateLocale: 'ar_IQ',
      type:     'website',
    },
    twitter: {
      card:        'summary_large_image',
      title:       seo.title,
      description: seo.description,
      images:      ['/opengraph-image'],
    },
  }
}

export default async function EnCompanyLayout({ children, params }: Props) {
  const sym     = params.sym.toUpperCase()
  const company = (companiesData as { sym: string; ar: string; en: string; sec?: string; mcap?: number }[])
    .find(c => c.sym === sym)

  // A real HTTP 404 for unknown tickers, not a 200 with empty content.
  if (!company) notFound()

  const seo = buildCompanySeoEn(sym, company.ar, company.en)
  const quote = await getQuote(sym)

  /*
   * ONE Corporation entity, described in two languages — the `@id` is the
   * Arabic URL in both trees, exactly as the site-wide Organization is, so
   * Google is not told there are two companies. Only `url`, `description` and
   * `inLanguage` differ.
   */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Corporation',
    '@id': absUrl(`/c/${sym}#corporation`),
    name: company.en || sym,
    alternateName: seo.altNames,
    tickerSymbol: sym,
    url: absUrl(`/c/${sym}`, 'en'),
    inLanguage: 'en',
    description: `${company.en || sym} (${sym}) · Iraq Stock Exchange (ISX) share price and market data.`,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {children}

      <Breadcrumbs
        locale="en"
        trail={[
          { name: 'Market', path: '/market' },
          { name: seo.shortAr, path: `/c/${sym}` },
        ]}
      />
    </>
  )
}
