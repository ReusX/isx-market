import type { Metadata } from 'next'
import { absUrl, seoAlternates } from '@/lib/seo'

/**
 * `/en/legal`.
 *
 * ⚠ The description states what the page IS — terms of use plus the
 * investment and market-data disclaimer — rather than calling itself a vague
 * "legal framework" page, and it claims no regulatory status.
 */
export const metadata: Metadata = {
  title: { absolute: 'Terms of Use and disclaimer · IQWealth' },
  description:
    'The terms for using IQWealth, and the investment and market-data disclaimer: no investment advice, no guarantee of data accuracy, Iraqi governing law, and no general indemnity.',
  alternates: seoAlternates('/legal', 'en'),
  openGraph: {
    url: absUrl('/legal', 'en'),
    title: 'Terms of Use and disclaimer · IQWealth',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    locale: 'en_US',
    alternateLocale: 'ar_IQ',
  },
}

export default function EnLegalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
