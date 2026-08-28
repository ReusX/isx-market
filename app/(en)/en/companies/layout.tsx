import type { Metadata } from 'next'
import companiesData from '@/public/data/companies.json'
import Freshness from '@/components/seo/Freshness'
import Breadcrumbs from '@/components/seo/Breadcrumbs'
import { absUrl, seoAlternates } from '@/lib/seo'

/**
 * /en/companies — the English half of the company directory.
 *
 * Built because all 104 /en/c/[sym] pages were ORPHANS: in the sitemap, linked
 * from nothing, and every one of them pointed a breadcrumb at this URL while
 * it returned 404. `/companies` is a real ranking page on the Arabic side —
 * Google indexes it as «الشركات المدرجة في بورصة العراق · 104 شركة حسب
 * القطاع» — so the fix is a genuine English equivalent and a proper hreflang
 * pair, not a redirect to /en/market, which is a different page answering a
 * different question.
 */
const TOTAL = (companiesData as unknown[]).length

export const metadata: Metadata = {
  title: { absolute: `Iraq Stock Exchange Listed Companies · All ${TOTAL} by Sector` },
  description: `Every company listed on the Iraq Stock Exchange (ISX) — all ${TOTAL}, grouped by sector, with the last traded price, daily change and market capitalisation.`,
  // Self-canonical, and reciprocal with the Arabic directory. Never
  // cross-canonical English to Arabic: they are a translation pair, not
  // duplicates of one another.
  alternates: seoAlternates('/companies', 'en'),
  keywords: [
    'iraq stock exchange companies', 'isx listed companies', 'iraq stock market companies',
    'ISX company list', 'Iraqi listed companies', 'Iraq Stock Exchange sectors',
  ],
  openGraph: {
    url: absUrl('/companies', 'en'),
    title: `Iraq Stock Exchange Listed Companies · All ${TOTAL} by Sector`,
    description: `Every company listed on the Iraq Stock Exchange (ISX), grouped by sector with last price and market capitalisation.`,
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    locale: 'en_US',
    alternateLocale: 'ar_IQ',
  },
}

export default function CompaniesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Breadcrumbs trail={[{ name: 'Companies', path: '/companies' }]} locale="en" />
      <Freshness
        url={absUrl('/companies', 'en')}
        name="Iraq Stock Exchange Listed Companies"
        description="Directory of companies listed on the Iraq Stock Exchange, by sector."
      />
    </>
  )
}
