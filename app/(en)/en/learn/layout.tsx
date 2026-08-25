import type { Metadata } from 'next'
import Breadcrumbs from '@/components/seo/Breadcrumbs'
import { absUrl, seoAlternates } from '@/lib/seo'

/**
 * `/en/learn`.
 *
 * ⚠ The description promises a beginner's guide, singular, because that is
 * what exists. The library is genuinely empty and the metadata does not
 * advertise "guides and articles" the page cannot show.
 */
export const metadata: Metadata = {
  title: { absolute: 'Learn · investing on the Iraq Stock Exchange' },
  description:
    'A beginner’s guide to the Iraq Stock Exchange: what the market is, how to open an account with a licensed broker, how to read a share price, and how the sectors are structured.',
  alternates: seoAlternates('/learn', 'en'),
  keywords: ['learn iraq stock exchange', 'ISX beginner guide', 'how to invest in iraq', 'iraqi shares for beginners'],
  openGraph: {
    url: absUrl('/learn', 'en'),
    title: 'Learn · Iraq Stock Exchange · IQWealth',
    description: 'A beginner’s guide to investing on the Iraq Stock Exchange.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    locale: 'en_US',
    alternateLocale: 'ar_IQ',
  },
}

export default function EnLearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Breadcrumbs locale="en" trail={[{ name: 'Learn', path: '/learn' }]} />
    </>
  )
}
