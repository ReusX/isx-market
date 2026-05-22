import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import localFont from 'next/font/local'
import './globals.css'
import { AppProvider } from '@/context/AppContext'
import Navbar from '@/components/layout/Navbar'
import BottomNav from '@/components/layout/BottomNav'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-en',
  display: 'swap',
})

const thmanyah = localFont({
  src: [
    { path: '../fonts/ThmanyahText-400-normal.woff2',    weight: '400', style: 'normal' },
    { path: '../fonts/ThmanyahText-500-normal.woff2',    weight: '500', style: 'normal' },
    { path: '../fonts/ThmanyahText-700-normal.woff2',    weight: '700', style: 'normal' },
    { path: '../fonts/ThmanyahDisplay-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/ThmanyahDisplay-700-normal.woff2', weight: '700', style: 'normal' },
    { path: '../fonts/ThmanyahDisplay-900-normal.woff2', weight: '900', style: 'normal' },
  ],
  variable: '--font-thmanyah',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'بورصة العراق — تتبع، تداول، استثمار، أخبار، تحليل', template: '%s | ISX Market' },
  description: 'بورصة العراق للأوراق المالية — تتبع أسعار الأسهم العراقية مباشرة خلال ساعات التداول، تحليلات مالية، أخبار السوق، مؤشر RSISX، وأدوات الاستثمار الذكي. Iraq Stock Exchange live prices, trading and analysis.',
  metadataBase: new URL('https://iraqsm.com'),
  // No root canonical — each page sets its own to avoid the "non-canonical in sitemap" issue
  openGraph: {
    title: 'بورصة العراق — تتبع، تداول، استثمار، أخبار، تحليل',
    description: 'تتبع أسعار الأسهم العراقية مباشرة، مؤشر RSISX، تحليلات مالية وأخبار بورصة العراق. Iraq Stock Exchange live prices, charts and analysis.',
    url: 'https://iraqsm.com',
    siteName: 'ISX Market',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    locale: 'ar_IQ',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }, { url: '/favicon-32.png', sizes: '32x32' }],
    apple: '/favicon-192.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0B0E14',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${inter.variable} ${thmanyah.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AppProvider>
          <Navbar />
          <main style={{ paddingTop: 'var(--nav-h)' }}>
            {children}
          </main>
          <BottomNav />
          <Analytics />
          <SpeedInsights />
        </AppProvider>
      </body>
    </html>
  )
}
