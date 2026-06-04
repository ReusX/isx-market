import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import companiesData from '@/public/data/companies.json'
import CompanyProfile from '@/components/company/CompanyProfile'
import { buildCompanySeo } from '@/lib/companySeo'

const BASE = 'https://iraqsm.com'

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
  const seo     = buildCompanySeo(sym, arName, enName)
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
      siteName: 'Iraq Stock Market — iraqsm.com',
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

export default function CompanyLayout({ children, params }: Props) {
  const sym     = params.sym.toUpperCase()
  const company = (companiesData as { sym: string; ar: string; en: string; sec?: string; mcap?: number }[])
    .find(c => c.sym === sym)

  // Return a real HTTP 404 for unknown tickers (delisted, mistyped, etc.)
  // This prevents soft-404s (200 with empty content) which confuse Google.
  if (!company) notFound()

  const seo = buildCompanySeo(sym, company.ar, company.en)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Corporation',
    name: company.en,
    alternateName: seo.altNames,
    tickerSymbol: sym,
    url: `${BASE}/c/${sym}`,
    description: `${company.en} (${sym}) — Iraq Stock Exchange (ISX) share price and market data.`,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Server-rendered H1 — visible to crawlers, visually hidden. Arabic-first
          and built around the real-world "سعر سهم … اليوم" search queries. */}
      <h1 style={{
        position: 'absolute', width: 1, height: 1,
        overflow: 'hidden', clip: 'rect(0,0,0,0)',
        whiteSpace: 'nowrap',
      }}>
        {seo.h1}
      </h1>
      {children}

      {/* Unique company profile — language-aware (Arabic on the Arabic
          site, English on the English site). SSRs in Arabic since `lang`
          defaults to 'ar', so crawlers still get unique content per page. */}
      <CompanyProfile
        sym={sym}
        en={company.en}
        ar={company.ar}
        sec={company.sec}
        mcap={company.mcap}
      />
    </>
  )
}
