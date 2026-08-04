import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans_Arabic, Noto_Kufi_Arabic, Roboto_Mono } from 'next/font/google'
import './globals.css'
import { AppProvider } from '@/context/AppContext'
import AppShell from '@/components/layout/AppShell'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import NativeBridge from '@/components/NativeBridge'

// The three IQWealth design typefaces, self-hosted by next/font. These drive
// the whole UI: IBM Plex Sans Arabic for body copy (--font-body), Noto Kufi
// Arabic for display headings (--font-display), Roboto Mono for every number
// (--font-numeric). globals.css maps the legacy --font-mono onto --font-numeric
// so pre-redesign inline styles pick up the same digits.
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
})

const kufiArabic = Noto_Kufi_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
})

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-numeric',
  display: 'swap',
})

/*
 * Titles and descriptions are written to one rule: ONE SCRIPT PER TITLE, and
 * no brand token.
 *
 * Both were learned from the live SERP. Bilingual titles ("ISX Stock Screener
 * - IQWealth | فارز الأسهم") get reordered by bidi, so the phrase the user
 * actually searched for ends up buried mid-line. And Google appends the site
 * name itself — it takes that from WebSite.name in the JSON-LD below — so a
 * brand suffix in our own title only spends characters to print it twice.
 *
 * Descriptions are Arabic-only for the same budget reason: the old ones paired
 * an Arabic sentence with its English translation plus a keyword tail repeated
 * verbatim on every page, which blew past the ~160-char snippet budget and got
 * them rejected. Google was substituting scraped table text and, on /companies,
 * the sidebar nav labels. English stays in the OG/Twitter copy and page body.
 */
export const metadata: Metadata = {
  title: {
    default: 'بورصة العراق · اسعار الاسهم العراقية مباشرة اليوم',
    // No brand suffix by design · see the note above.
    template: '%s',
  },
  description: 'متابعة مباشرة لأسعار الأسهم المدرجة في بورصة العراق للأوراق المالية مع مؤشر ISX60، المخططات، تدفق الأجانب وأدوات الفرز — محدّثة بعد كل جلسة تداول.',
  metadataBase: new URL('https://iraqsm.com'),
  alternates: {
    canonical: 'https://iraqsm.com',
  },
  keywords: [
    'iraq stock market', 'iraq stock exchange', 'isx stock exchange', 'isx market',
    'اسعار الاسهم العراقية', 'اسهم العراق', 'سوق الاسهم العراقي', 'بورصة العراق',
    'أبحاث السوق في العراق', 'الاسهم العراقية', 'تداول', 'استثمار', 'RSISX', 'rabee securities',
  ],
  openGraph: {
    title: 'Iraq Stock Market · Iraq Stock Exchange (ISX) | اسعار الاسهم العراقية',
    description: 'Live prices, charts, and market data for all stocks on the Iraq Stock Exchange (ISX). اسعار الاسهم العراقية مباشرة، سوق الاسهم العراقي، بورصة العراق.',
    url: 'https://iraqsm.com',
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" data-theme="dark" className={`${plexArabic.variable} ${kufiArabic.variable} ${robotoMono.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme')||'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();` }}
        />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'WebSite',
                '@id': 'https://iraqsm.com/#website',
                url: 'https://iraqsm.com',
                // Google reads the SERP site-name suffix from here. Keep it to
                // the bare brand — anything longer gets appended to every title.
                name: 'IQWealth',
                alternateName: ['IQWealth · بورصة العراق', 'Iraq Stock Market', 'بورصة العراق', 'سوق الاسهم العراقي'],
                description: 'Live prices, charts, and analysis for the Iraq Stock Exchange (ISX). اسعار الاسهم العراقية مباشرة.',
                inLanguage: ['ar-IQ', 'en'],
                potentialAction: {
                  '@type': 'SearchAction',
                  target: { '@type': 'EntryPoint', urlTemplate: 'https://iraqsm.com/market?q={search_term_string}' },
                  'query-input': 'required name=search_term_string',
                },
              },
              {
                '@type': 'Organization',
                '@id': 'https://iraqsm.com/#organization',
                name: 'IQWealth',
                alternateName: ['Iraq Stock Market', 'iraqsm.com'],
                url: 'https://iraqsm.com',
                logo: {
                  '@type': 'ImageObject',
                  url: 'https://iraqsm.com/icon.png',
                  width: 1024,
                  height: 1024,
                },
                image: 'https://iraqsm.com/icon.png',
                sameAs: ['https://iraqsm.com'],
              },
              {
                '@type': 'FinancialService',
                '@id': 'https://iraqsm.com/#service',
                name: 'Iraq Stock Exchange Market Tracker',
                description: 'Real-time stock market data for the Iraq Stock Exchange (ISX) · prices, charts, indices, and company analysis.',
                url: 'https://iraqsm.com',
                areaServed: { '@type': 'Country', name: 'Iraq' },
                serviceType: 'Stock Market Data',
              },
            ],
          })}}
        />
        <AppProvider>
          <AppShell>
            {children}
          </AppShell>
          <NativeBridge />
          <Analytics />
          <SpeedInsights />
        </AppProvider>
      </body>
    </html>
  )
}
