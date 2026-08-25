import type { Metadata } from 'next'
import Breadcrumbs from '@/components/seo/Breadcrumbs'
import { absUrl, seoAlternates } from '@/lib/seo'

/**
 * `/en/statistics`.
 *
 * The page is a client component and cannot export metadata itself; without a
 * layout it would inherit the site default and compete with the English
 * homepage for the same title.
 *
 * The description lists the measures the page actually leads with. It does not
 * promise dividend data — that panel exists precisely to say the coverage is
 * near zero — and it does not describe this as an "official" statistics
 * source.
 */
export const metadata: Metadata = {
  title: { absolute: 'Iraq Stock Exchange Statistics · market size, activity and value' },
  description:
    'Statistics for the Iraq Stock Exchange: trading value, volume and trades over time, market capitalisation by sector, market concentration, P/E ratios and monthly sector activity.',
  alternates: seoAlternates('/statistics', 'en'),
  keywords: [
    'iraq stock exchange statistics', 'ISX market cap', 'ISX trading volume',
    'iraq market concentration', 'ISX P/E ratios', 'iraqi sector activity',
  ],
  openGraph: {
    url: absUrl('/statistics', 'en'),
    title: 'Iraq Stock Exchange Statistics · IQWealth',
    description: 'Market size, activity, concentration and valuation for the Iraq Stock Exchange.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    locale: 'en_US',
    alternateLocale: 'ar_IQ',
  },
}

export default function EnStatisticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}

      <Breadcrumbs trail={[{ name: 'Market Statistics', path: '/statistics' }]} locale="en" />
    </>
  )
}
