import type { Metadata, Viewport } from 'next'
import '../globals.css'
import { Document } from '@/components/shell/Document'
import { absUrl, seoAlternates } from '@/lib/seo'

/**
 * The ENGLISH root layout · everything under `/en`.
 *
 * ── Why the title rules differ from the Arabic side ───────────────────────
 * The Arabic root deliberately emits ONE SCRIPT PER TITLE and no brand token,
 * because a bilingual title gets reordered by bidi and Google appends the site
 * name itself. Both halves of that reasoning survive here — this file also
 * uses `template: '%s'` and no brand suffix — but the constraint that produced
 * it, a mixed-script line, no longer applies: an English title is one script by
 * construction. So English pages can spend their whole character budget on the
 * phrase a reader actually typed.
 *
 * The keyword set is NOT a translation of the Arabic one. «اسعار الاسهم
 * العراقية» and "Iraq stock market" are different searches by different people
 * with different intent, and pairing them term-for-term would just be the
 * Arabic list transliterated.
 */
export const metadata: Metadata = {
  title: {
    default: 'IQWealth · Iraq Stock Market Data',
    // No brand suffix by design · see the note above.
    template: '%s',
  },
  description:
    'Prices, charts and statistics for every company listed on the Iraq Stock Exchange (ISX), with the RSISX index, foreign investor flow and screening tools — updated after each trading session.',
  alternates: seoAlternates('/', 'en'),
  keywords: [
    'iraq stock market', 'iraq stock exchange', 'ISX', 'ISX60', 'RSISX index',
    'iraqi stocks', 'baghdad stock exchange', 'iraq equities',
    'iraq stock prices', 'invest in iraq', 'rabee securities',
  ],
  openGraph: {
    title: 'Iraq Stock Market · Iraq Stock Exchange (ISX) data',
    description: 'Prices, charts and market data for every stock on the Iraq Stock Exchange (ISX), updated after each session.',
    url: absUrl('/', 'en'),
    siteName: 'IQWealth',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    locale: 'en_US',
    alternateLocale: 'ar_IQ',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', site: '@iraqsm' },
  icons: {
    icon: [
      { url: '/favicon.svg',     type: 'image/svg+xml' },
      { url: '/favicon-32.png',  sizes: '32x32',    type: 'image/png' },
      { url: '/favicon-192.png', sizes: '192x192',  type: 'image/png' },
      { url: '/icon.png',        sizes: '1024x1024',type: 'image/png' },
    ],
    apple: [{ url: '/favicon-192.png', sizes: '192x192', type: 'image/png' }],
    shortcut: '/favicon-192.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0B0E14',
}

export default function EnglishRootLayout({ children }: { children: React.ReactNode }) {
  return <Document locale="en">{children}</Document>
}
