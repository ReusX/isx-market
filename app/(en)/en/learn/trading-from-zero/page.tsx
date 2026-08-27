import type { Metadata } from 'next'
import { LearnGuide } from '@/components/routes/LearnGuide'
import { absUrl, seoAlternates } from '@/lib/seo'

/**
 * `/en/learn/trading-from-zero`.
 *
 * ⚠ The ONLY Learn detail route with an English twin, and deliberately so:
 * this guide is hand-authored in this repo, so it can be translated honestly.
 * CMS-authored `/learn/[slug]` articles exist in Arabic alone and are not
 * mirrored — see `lib/i18n/routes.ts`.
 */
export const metadata: Metadata = {
  title: 'Trading shares from zero · a beginner’s guide to the Iraq Stock Exchange',
  description:
    'A complete beginner’s guide to trading on the Iraq Stock Exchange: how to start investing, how to read a share price, and the difference between trading and investing.',
  alternates: seoAlternates('/learn/trading-from-zero', 'en'),
  openGraph: {
    url: absUrl('/learn/trading-from-zero', 'en'),
    title: 'Trading shares from zero · Iraq Stock Exchange (ISX)',
    description: 'A beginner’s guide to trading shares on the Iraq Stock Exchange.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    locale: 'en_US',
    alternateLocale: 'ar_IQ',
  },
}

export default function Page() {
  return <LearnGuide />
}
