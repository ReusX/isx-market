import type { Metadata } from 'next'
import Freshness from '@/components/seo/Freshness'
import Breadcrumbs from '@/components/seo/Breadcrumbs'
import { absUrl, seoAlternates } from '@/lib/seo'

/**
 * `/en/market`.
 *
 * The English title leads with «Iraq Stock Exchange» rather than translating
 * «اسعار الاسهم العراقية اليوم» word for word. The Arabic phrase is what an
 * Iraqi reader types; an English searcher looking for this board is almost
 * always searching the exchange by its English name or the ISX initialism, and
 * a literal rendering would rank for neither.
 *
 * No «today» and no «live» in either language — one bulletin per session is
 * what the product has, and the title may not promise more than that.
 */
export const metadata: Metadata = {
  title: { absolute: 'Iraq Stock Exchange share prices · every listed company' },
  description:
    'Last price, change, volume, trading value and market cap for every company listed on the Iraq Stock Exchange (ISX) — sortable, filterable by sector, updated after each session.',
  alternates: seoAlternates('/market', 'en'),
  keywords: [
    'iraq stock exchange prices', 'ISX share prices', 'iraqi stock prices',
    'ISX listed companies', 'iraq equities', 'RSISX', 'rabee securities',
  ],
  openGraph: {
    url: absUrl('/market', 'en'),
    title: 'Iraq Stock Exchange share prices · IQWealth',
    description: 'Prices for every stock on the Iraq Stock Exchange, with change, volume and market cap.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    locale: 'en_US',
    alternateLocale: 'ar_IQ',
  },
}

export default function EnMarketLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}

      <Breadcrumbs trail={[{ name: 'Market', path: '/market' }]} locale="en" />

      <Freshness
        url={absUrl('/market', 'en')}
        name="Iraq Stock Exchange share prices"
        description="Prices for every company listed on the Iraq Stock Exchange, with change, volume and market cap."
        locale="en"
      />
    </>
  )
}
