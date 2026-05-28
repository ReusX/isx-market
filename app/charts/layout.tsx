import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: { absolute: 'مخططات اسعار الاسهم العراقية | ISX Stock Charts' },
  description: 'Interactive price charts for all Iraq Stock Exchange (ISX) stocks — historical data, candlestick charts, and RSISX index. مخططات اسعار الاسهم العراقية التاريخية، بورصة العراق، سوق الاسهم العراقي.',
  alternates: { canonical: 'https://iraqsm.com/charts' },
  keywords: [
    'iraq stock exchange charts', 'iraq stock market charts', 'isx charts',
    'مخططات اسعار الاسهم العراقية', 'مخططات بورصة العراق', 'سوق الاسهم العراقي',
    'RSISX chart', 'rabee securities charts',
  ],
  openGraph: {
    url: 'https://iraqsm.com/charts',
    title: 'Iraq Stock Exchange Charts — ISX Price Charts | مخططات اسعار الاسهم العراقية',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}
export default function ChartsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
        Iraq Stock Exchange Charts — ISX Historical Price Charts | مخططات اسعار الاسهم العراقية | بورصة العراق
      </h1>
      {children}
    </>
  )
}
