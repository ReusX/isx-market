import type { Metadata } from 'next'
import Freshness from '@/components/seo/Freshness'
import Breadcrumbs from '@/components/seo/Breadcrumbs'
import { absUrl, seoAlternates } from '@/lib/seo'

/**
 * `/en/pulse`.
 *
 * ⚠ The description promises breadth and participation and nothing more. It
 * does NOT say "market sentiment" or "market health" — the page is explicit
 * that it produces a classification from printed thresholds rather than a
 * score, and the metadata is not allowed to sell what the page refuses to
 * claim.
 */
export const metadata: Metadata = {
  title: { absolute: 'Iraq Market Breadth · advancing vs declining shares' },
  description:
    'Breadth on the Iraq Stock Exchange: advancing against declining companies, advancing and declining volume, new 52-week highs and lows, sector breadth and trading concentration.',
  alternates: seoAlternates('/pulse', 'en'),
  keywords: [
    'iraq stock exchange market breadth', 'ISX advancers decliners',
    'ISX market pulse', 'iraq advance decline line', 'iraqi market participation',
  ],
  openGraph: {
    url: absUrl('/pulse', 'en'),
    title: 'Iraq Market Breadth · IQWealth',
    description: 'Advancing against declining shares on the Iraq Stock Exchange, with volume, sector breadth and concentration.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    locale: 'en_US',
    alternateLocale: 'ar_IQ',
  },
}

export default function EnPulseLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}

      <Breadcrumbs trail={[{ name: 'Market Pulse', path: '/pulse' }]} locale="en" />

      <Freshness
        url={absUrl('/pulse', 'en')}
        name="Iraq Market Breadth"
        description="Breadth on the Iraq Stock Exchange: advancing against declining shares, with volume and participation."
        locale="en"
      />
    </>
  )
}
