import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'ISX Charts — Iraq Stock Exchange Price Charts | مخططات بورصة العراق',
  description: 'ISX charts — interactive historical price charts for all Iraq Stock Exchange (ISX) stocks and the RSISX index. Powered by Rabee Securities data. مخططات أسعار الأسهم العراقية التاريخية.',
  alternates: { canonical: 'https://iraqsm.com/charts' },
  keywords: ['isx charts', 'iraq stock exchange charts', 'مخططات بورصة العراق', 'rabee', 'RSISX chart', 'iraq stock market chart'],
  openGraph: { url: 'https://iraqsm.com/charts', title: 'ISX Charts — Iraq Stock Exchange', images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
}
export default function ChartsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
        ISX Charts — Iraq Stock Exchange Historical Price Charts | مخططات بورصة العراق
      </h1>
      {children}
    </>
  )
}
