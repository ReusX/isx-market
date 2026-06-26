import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: { absolute: 'اسعار الاسهم العراقية | Iraq Stock Market Live Prices' },
  description: 'Iraq stock market live prices · all stocks on the Iraq Stock Exchange (ISX) with real-time data, volume, market cap, and RSISX index. اسعار الاسهم العراقية مباشرة، سوق الاسهم العراقي، اسهم العراق، بورصة العراق.',
  alternates: { canonical: 'https://iraqsm.com/market' },
  keywords: [
    'iraq stock market', 'iraq stock exchange', 'isx stock exchange', 'isx market',
    'اسعار الاسهم العراقية', 'اسهم العراق', 'سوق الاسهم العراقي', 'بورصة العراق',
    'الاسهم العراقية', 'تداول اسهم العراق', 'RSISX', 'rabee securities',
  ],
  openGraph: {
    url: 'https://iraqsm.com/market',
    title: 'Iraq Stock Market Live Prices · Iraq Stock Exchange ISX | اسعار الاسهم العراقية',
    description: 'Live prices for all stocks on the Iraq Stock Exchange · اسعار الاسهم العراقية، سوق الاسهم العراقي، مؤشر RSISX.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}
export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
        Iraq Stock Market Live Prices · Iraq Stock Exchange (ISX) | اسعار الاسهم العراقية | سوق الاسهم العراقي | اسهم العراق
      </h1>
      {children}
    </>
  )
}
