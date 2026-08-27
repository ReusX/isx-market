import type { Metadata } from 'next'
import Breadcrumbs from '@/components/seo/Breadcrumbs'
import { absUrl, seoAlternates } from '@/lib/seo'

/**
 * `/en/news`.
 *
 * ⚠ The description does NOT promise English articles. This page is English
 * CHROME over a real, current index whose editorial bodies are Arabic; it
 * says so, because a reader who arrives expecting English articles and finds
 * Arabic ones has been misled by the snippet, not by the page.
 *
 * Company filings ARE language-neutral — they are PDFs from the Securities
 * Commission — so the page is genuinely useful in English regardless.
 */
export const metadata: Metadata = {
  title: { absolute: 'Iraq Stock Exchange news and company filings' },
  description:
    'Company filings from the Iraq Securities Commission and market news for the Iraq Stock Exchange, searchable by company, ticker and sector. Editorial articles are published in Arabic.',
  alternates: seoAlternates('/news', 'en'),
  keywords: ['iraq stock market news', 'ISX news', 'iraq company filings', 'ISX disclosures'],
  openGraph: {
    url: absUrl('/news', 'en'),
    title: 'Iraq Stock Exchange news and filings · IQWealth',
    description: 'Company filings and market news for the Iraq Stock Exchange.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    locale: 'en_US',
    alternateLocale: 'ar_IQ',
  },
}

export default function EnNewsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Breadcrumbs locale="en" trail={[{ name: 'News', path: '/news' }]} />
    </>
  )
}
