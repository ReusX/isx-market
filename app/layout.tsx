import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import localFont from 'next/font/local'
import './globals.css'
import { AppProvider } from '@/context/AppContext'
import Navbar from '@/components/layout/Navbar'
import BottomNav from '@/components/layout/BottomNav'
import Footer from '@/components/layout/Footer'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import NativeBridge from '@/components/NativeBridge'
import ChatWidget from '@/components/chat/ChatWidget'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-en',
  display: 'swap',
})

// Thmanyah Sans — primary UI font for all Arabic text
const thmanyahSans = localFont({
  src: [
    { path: '../fonts/thmanyahsans-Light.woff2',   weight: '300', style: 'normal' },
    { path: '../fonts/thmanyahsans-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/thmanyahsans-Medium.woff2',  weight: '500', style: 'normal' },
    { path: '../fonts/thmanyahsans-Bold.woff2',    weight: '700', style: 'normal' },
    { path: '../fonts/thmanyahsans-Black.woff2',   weight: '900', style: 'normal' },
  ],
  variable: '--font-thmanyah',
  display: 'swap',
})

// Thmanyah Serif Text — for long-form Arabic body text (news, articles, about)
const thmanyahSerifText = localFont({
  src: [
    { path: '../fonts/thmanyahseriftext-Light.woff2',   weight: '300', style: 'normal' },
    { path: '../fonts/thmanyahseriftext-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/thmanyahseriftext-Medium.woff2',  weight: '500', style: 'normal' },
    { path: '../fonts/thmanyahseriftext-Bold.woff2',    weight: '700', style: 'normal' },
    { path: '../fonts/thmanyahseriftext-Black.woff2',   weight: '900', style: 'normal' },
  ],
  variable: '--font-thmanyah-serif',
  display: 'swap',
})

// Thmanyah Serif Display — for large Arabic headings
const thmanyahSerifDisplay = localFont({
  src: [
    { path: '../fonts/thmanyahserifdisplay-Light.woff2',   weight: '300', style: 'normal' },
    { path: '../fonts/thmanyahserifdisplay-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/thmanyahserifdisplay-Medium.woff2',  weight: '500', style: 'normal' },
    { path: '../fonts/thmanyahserifdisplay-Bold.woff2',    weight: '700', style: 'normal' },
    { path: '../fonts/thmanyahserifdisplay-Black.woff2',   weight: '900', style: 'normal' },
  ],
  variable: '--font-thmanyah-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'ISX Market — بورصة العراق | تداول، استثمار، أسهم عراقية', template: '%s | ISX Market' },
  description: 'ISX Market — بورصة العراق للأوراق المالية. تتبع أسعار الاسهم العراقية مباشرة، تداول واستثمار، تحليلات مالية، أخبار السوق، ومؤشر RSISX. Iraq Stock Exchange live prices, trading, investing and analysis.',
  metadataBase: new URL('https://iraqsm.com'),
  // No root canonical — each page sets its own to avoid the "non-canonical in sitemap" issue
  keywords: ['iraq stock market', 'isx market', 'iraq stock exchange', 'الاسهم العراقية', 'بورصة العراق', 'تداول', 'استثمار', 'اسهم', 'RSISX', 'rabee'],
  openGraph: {
    title: 'ISX Market — بورصة العراق | Iraq Stock Exchange',
    description: 'تتبع أسعار الاسهم العراقية مباشرة، مؤشر RSISX، تحليلات مالية وأخبار بورصة العراق. Iraq Stock Exchange live prices, charts, trading and analysis.',
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
    <html lang="ar" dir="rtl" className={`${inter.variable} ${thmanyahSans.variable} ${thmanyahSerifText.variable} ${thmanyahSerifDisplay.variable}`} suppressHydrationWarning>
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
