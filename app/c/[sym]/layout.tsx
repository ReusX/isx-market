import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import companiesData from '@/public/data/companies.json'

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
  const title   = `${sym} — ${enName.slice(0, 36)} | Iraq Stock Exchange`
  const desc    = `${arName} (${sym}) — سعر السهم في سوق الاسهم العراقي مباشرة. ${enName} (${sym}) live share price, charts, and market data on the Iraq Stock Exchange (ISX).`.slice(0, 158)
  const url     = `${BASE}/c/${sym}`

  return {
    title,
    description: desc,
    alternates: { canonical: url },
    keywords: [
      `${sym}`, `${enName}`, `${arName}`,
      'iraq stock exchange', 'iraq stock market', 'isx',
      'اسعار الاسهم العراقية', 'سوق الاسهم العراقي',
    ],
    openGraph: {
      title:       `${sym} — ${enName} | Iraq Stock Exchange`,
      description: desc,
      url,
      siteName: 'Iraq Stock Market — iraqsm.com',
      images:   [{ url: '/opengraph-image', width: 1200, height: 630, alt: `${sym} – Iraq Stock Exchange` }],
      locale:   'ar_IQ',
      type:     'website',
    },
    twitter: {
      card:        'summary_large_image',
      title:       `${sym} — ${enName} | Iraq Stock Exchange`,
      description: desc,
      images:      ['/opengraph-image'],
    },
  }
}

export default function CompanyLayout({ children, params }: Props) {
  const sym     = params.sym.toUpperCase()
  const company = (companiesData as { sym: string; ar: string; en: string }[])
    .find(c => c.sym === sym)

  // Return a real HTTP 404 for unknown tickers (delisted, mistyped, etc.)
  // This prevents soft-404s (200 with empty content) which confuse Google.
  if (!company) notFound()

  return (
    <>
      {/* Server-rendered H1 — visible to crawlers, visually hidden */}
      <h1 style={{
        position: 'absolute', width: 1, height: 1,
        overflow: 'hidden', clip: 'rect(0,0,0,0)',
        whiteSpace: 'nowrap',
      }}>
        {company.en} ({sym}) — Iraq Stock Exchange Share Price | {company.ar} سعر السهم في سوق الاسهم العراقي
      </h1>
      {children}
    </>
  )
}
