import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import companiesData from '@/public/data/companies.json'
import CompanyProfile from '@/components/company/CompanyProfile'
import { buildCompanySeo } from '@/lib/companySeo'
import { getQuote, describeQuote } from '@/lib/quote'
import Breadcrumbs from '@/components/seo/Breadcrumbs'

const BASE = 'https://iraqsm.com'

// Passed to the name shortener so it can reject a core two companies share.
const ARABIC_NAMES = (companiesData as { ar: string }[]).map(c => c.ar).filter(Boolean)

interface Props {
  params:   { sym: string }
  children: React.ReactNode
}

export async function generateMetadata({ params }: { params: { sym: string } }): Promise<Metadata> {
  const sym     = params.sym.toUpperCase()
  const company = (companiesData as { sym: string; ar: string; en: string; sec?: string }[])
    .find(c => c.sym === sym)

  const enName  = company?.en ?? sym
  const arName  = company?.ar ?? sym

  /*
   * The live price goes in the description. On a "كم سعر سهم اسياسيل" query the
   * result that already shows the number is the one that gets clicked, and this
   * is the only place we can put a number in front of the reader before they
   * decide. Suspended listings are excluded: their last close is years old, so
   * publishing it as today's price would be a lie in the SERP itself.
   */
  const quote = await getQuote(sym)
  const priceLine = quote && !quote.suspended ? describeQuote(quote) : undefined
  const seo     = buildCompanySeo(sym, arName, enName, priceLine, ARABIC_NAMES)
  const url     = `${BASE}/c/${sym}`

  return {
    title: { absolute: seo.title },
    description: seo.description,
    alternates: { canonical: url },
    keywords: seo.keywords,
    openGraph: {
      title:       seo.title,
      description: seo.description,
      url,
      siteName: 'IQWealth',
      images:   [{ url: '/opengraph-image', width: 1200, height: 630, alt: `${seo.shortAr} ${sym} – بورصة العراق` }],
      locale:   'ar_IQ',
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

export default async function CompanyLayout({ children, params }: Props) {
  const sym     = params.sym.toUpperCase()
  const company = (companiesData as { sym: string; ar: string; en: string; sec?: string; mcap?: number }[])
    .find(c => c.sym === sym)

  // Return a real HTTP 404 for unknown tickers (delisted, mistyped, etc.)
  // This prevents soft-404s (200 with empty content) which confuse Google.
  if (!company) notFound()

  const seo = buildCompanySeo(sym, company.ar, company.en, undefined, ARABIC_NAMES)
  // Cached by the same fetch generateMetadata already made for this request.
  const quote = await getQuote(sym)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Corporation',
    name: company.en,
    alternateName: seo.altNames,
    tickerSymbol: sym,
    url: `${BASE}/c/${sym}`,
    description: `${company.en} (${sym}) · Iraq Stock Exchange (ISX) share price and market data.`,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Server-rendered H1 · visible to crawlers, visually hidden. Arabic-first
          and built around the real-world "سعر سهم … اليوم" search queries. */}
      {children}

      {/* Unique company profile · language-aware (Arabic on the Arabic
          site, English on the English site). SSRs in Arabic since `lang`
          defaults to 'ar', so crawlers still get unique content per page. */}
      <Breadcrumbs
        trail={[
          { name: 'الشركات', path: '/companies' },
          { name: seo.shortAr, path: `/c/${sym}` },
        ]}
      />

      <CompanyProfile
        sym={sym}
        en={company.en}
        ar={company.ar}
        sec={company.sec}
        mcap={company.mcap}
        quote={quote}
      />
    </>
  )
}
