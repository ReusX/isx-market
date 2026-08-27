import type { Metadata, Viewport } from 'next'
import '../globals.css'
import { Document } from '@/components/shell/Document'
import { SITE, absUrl, seoAlternates } from '@/lib/seo'

/**
 * The ARABIC root layout · everything at the site root (`/`, `/market`, …).
 *
 * It is one of two root layouts. The document itself — fonts, theme bootstrap,
 * entity graph, providers, frame — lives in `components/shell/Document.tsx`,
 * shared with `app/(en)/layout.tsx`. What stays here is the part that is
 * genuinely Arabic: the default title and description, and the keyword set.
 *
 * ⚠ Do not import `./globals.css` — the stylesheet is at `app/globals.css`,
 * one level up from this route group, and is loaded by both root layouts.
 */
export const metadata: Metadata = {
  title: {
    /* ⚠ «مباشرة اليوم» is GONE. The board carries the last CLOSED session,
       so on any non-trading day — and every morning before the close — a
       title promising today's live prices was simply false. It is the same
       claim already removed from /gold, /oil and the company pages.

       Still Arabic-only and still with no brand token: a mixed-script title
       is reordered by bidi and Google rewrites it, which is why the SERP
       pass landed on one script and no brand. The search terms it earns —
       «بورصة العراق», «اسعار الاسهم العراقية» — are both intact. */
    default: 'بورصة العراق · اسعار الاسهم العراقية وبيانات السوق',
    template: '%s',
  },
  description: 'أسعار الأسهم المدرجة في بورصة العراق للأوراق المالية، وأداء السوق وبيانات الشركات والإفصاحات والإحصاءات — محدّثة بعد كل جلسة تداول.',
  metadataBase: new URL(SITE),
  alternates: seoAlternates('/'),
  keywords: [
    'iraq stock market', 'iraq stock exchange', 'isx stock exchange', 'isx market',
    'اسعار الاسهم العراقية', 'اسهم العراق', 'سوق الاسهم العراقي', 'بورصة العراق',
    'أبحاث السوق في العراق', 'الاسهم العراقية', 'تداول', 'استثمار', 'RSISX', 'rabee securities',
  ],
  openGraph: {
    title: 'Iraq Stock Market · Iraq Stock Exchange (ISX) | اسعار الاسهم العراقية',
    description: 'Prices, charts and market data for every stock on the Iraq Stock Exchange (ISX), updated after each session. اسعار الاسهم العراقية، سوق الاسهم العراقي، بورصة العراق.',
    url: absUrl('/'),
    siteName: 'IQWealth',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    locale: 'ar_IQ',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', site: '@iraqsm' },
  icons: {
    icon: [
      { url: '/favicon.svg',    type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32',   type: 'image/png' },
      { url: '/favicon-192.png',sizes: '192x192', type: 'image/png' },
      { url: '/icon.png',       sizes: '1024x1024',type: 'image/png' },
    ],
    apple: [
      { url: '/favicon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/favicon-192.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0B0E14',
}

export default function ArabicRootLayout({ children }: { children: React.ReactNode }) {
  return <Document locale="ar">{children}</Document>
}
