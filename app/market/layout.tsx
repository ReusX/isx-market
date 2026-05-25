import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Iraq Stock Market — Live Prices | بورصة العراق ISX',
  description: 'Iraq stock market live prices — ISX Market tracks all stocks on the Iraq Stock Exchange (ISX) with real-time trading data, volume, market cap, and RSISX index. الاسهم العراقية مباشر، أسعار التداول، القيمة السوقية.',
  alternates: { canonical: 'https://iraqsm.com/market' },
  keywords: ['iraq stock market', 'isx market', 'الاسهم العراقية', 'iraq stock exchange', 'بورصة العراق', 'اسهم عراقية', 'rabee securities', 'RSISX'],
  openGraph: {
    url: 'https://iraqsm.com/market',
    title: 'Iraq Stock Market Live | ISX Market — بورصة العراق',
    description: 'Live prices for all stocks on the Iraq Stock Exchange — ISX Market with RSISX index and sector data.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}
export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
        Iraq Stock Market — ISX Market Live Prices | بورصة العراق للأوراق المالية
      </h1>
      {children}
    </>
  )
}
