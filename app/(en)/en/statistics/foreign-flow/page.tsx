import type { Metadata } from 'next'
import { absUrl, seoAlternates } from '@/lib/seo'
import { ForeignFlow } from '@/components/routes/ForeignFlow'

/**
 * `/en/statistics/foreign-flow`.
 *
 * ⚠ No «today» and no «updated daily». The figures arrive with the trading
 * bulletin and the latest stored session is not necessarily today's, so both
 * claims would sometimes be false. The page names the exact session instead —
 * the same rule the Arabic page follows, for the same reason.
 */
export const metadata: Metadata = {
  alternates: seoAlternates('/statistics/foreign-flow', 'en'),
  openGraph: {
    url: absUrl('/statistics/foreign-flow', 'en'),
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    locale: 'en_US',
    alternateLocale: 'ar_IQ',
  },
  title: 'Foreign Investor Flow · Iraq Stock Exchange',
  description:
    'Buying and selling by non-Iraqi investors on the Iraq Stock Exchange: net flow per session, the cumulative balance, and the most active companies and sectors — each with its session date.',
}

export default function Page() {
  return <ForeignFlow />
}
