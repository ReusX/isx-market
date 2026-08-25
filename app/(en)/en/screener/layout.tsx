import type { Metadata } from 'next'
import Freshness from '@/components/seo/Freshness'
import Breadcrumbs from '@/components/seo/Breadcrumbs'
import { absUrl, seoAlternates } from '@/lib/seo'

/**
 * `/en/screener`.
 *
 * «Stock screener» is the established English term for this tool and it is what
 * an English reader searches for, so the title leads with it — even though the
 * Arabic side deliberately moved AWAY from «فارز» to «مستكشف». The two
 * languages are not obliged to have made the same choice; each is judged by
 * what its own reader types.
 */
export const metadata: Metadata = {
  title: { absolute: 'Iraq Stock Screener · filter ISX-listed companies' },
  description:
    'Screen Iraq Stock Exchange companies by daily, weekly and yearly performance, liquidity, trailing P/E, foreign flow and distance from the 52-week high — with one-press starting points.',
  alternates: seoAlternates('/screener', 'en'),
  keywords: [
    'iraq stock screener', 'ISX stock screener', 'iraq stock filter',
    'iraqi equities screener', 'ISX P/E', 'iraq stock exchange companies',
  ],
  openGraph: {
    url: absUrl('/screener', 'en'),
    title: 'Iraq Stock Screener · IQWealth',
    description: 'Filter Iraq Stock Exchange companies by performance, liquidity, valuation and foreign flow.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    locale: 'en_US',
    alternateLocale: 'ar_IQ',
  },
}

export default function EnScreenerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}

      <Breadcrumbs trail={[{ name: 'Stock Screener', path: '/screener' }]} locale="en" />

      <Freshness
        url={absUrl('/screener', 'en')}
        name="Iraq Stock Screener"
        description="Screen Iraq Stock Exchange companies by performance, liquidity, valuation and foreign flow."
        locale="en"
      />
    </>
  )
}
