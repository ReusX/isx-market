import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { AppProvider } from '@/context/AppContext'
import Navbar from '@/components/layout/Navbar'
import BottomNav from '@/components/layout/BottomNav'
import Footer from '@/components/layout/Footer'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import NativeBridge from '@/components/NativeBridge'
import ChatWidget from '@/components/chat/ChatWidgetLazy'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-en',
  display: 'optional',
})

// JetBrains Mono — for prices, codes, numbers (replaces Google Fonts stylesheet)
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'optional',
})

// Thmanyah families (Sans / Serif Text / Serif Display) are declared via
// @font-face in globals.css and referenced as the primary font in --font-ar*.
// They use font-display:optional and load on demand, so we don't declare them
// through next/font here — doing so emitted duplicate (and preloaded) copies of
// the same .woff2 files, wasting bandwidth on the critical path.

export const metadata: Metadata = {
  title: {
    default: 'Iraq Stock Market ISX — بورصة العراق | اسعار الاسهم العراقية',
    template: '%s | iraqsm.com',
  },
  description: 'Iraq Stock Market & Iraq Stock Exchange (ISX) — live prices, charts, and analysis for all Iraqi stocks. اسعار الاسهم العراقية مباشرة، تحليلات سوق الاسهم العراقي، مؤشر RSISX، اسهم العراق، بورصة العراق للأوراق المالية.',
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
    title: 'Iraq Stock Market — Iraq Stock Exchange (ISX) | اسعار الاسهم العراقية',
    description: 'Live prices, charts, and market data for all stocks on the Iraq Stock Exchange (ISX). اسعار الاسهم العراقية مباشرة، سوق الاسهم العراقي، بورصة العراق.',
    url: 'https://iraqsm.com',
    siteName: 'Iraq Stock Market — iraqsm.com',
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
    <html lang="ar" dir="rtl" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head />
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
                name: 'Iraq Stock Market — iraqsm.com',
                alternateName: ['ISX Market', 'Iraq Stock Exchange', 'بورصة العراق', 'سوق الاسهم العراقي'],
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
                name: 'Iraq Stock Market',
                alternateName: 'iraqsm.com',
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
                description: 'Real-time stock market data for the Iraq Stock Exchange (ISX) — prices, charts, indices, and company analysis.',
                url: 'https://iraqsm.com',
                areaServed: { '@type': 'Country', name: 'Iraq' },
                serviceType: 'Stock Market Data',
              },
            ],
          })}}
        />
        <AppProvider>
          <Navbar />
          <main style={{ paddingTop: 'var(--nav-h)' }}>
            {children}
          </main>
          <Footer />
          <BottomNav />
          <NativeBridge />
          <ChatWidget />
          <Analytics />
          <SpeedInsights />
        </AppProvider>
      </body>
    </html>
  )
}
