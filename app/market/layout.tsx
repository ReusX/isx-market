import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'السوق | Iraq Stock Exchange',
  description: 'جميع أسهم بورصة العراق للأوراق المالية — أسعار مباشرة، مؤشرات، وتصفية حسب القطاع. All ISX listed stocks with live prices, volume and market cap.',
  alternates: { canonical: 'https://iraqsm.com/market' },
  openGraph: { url: 'https://iraqsm.com/market', images: [{ url: '/og-image.png', width: 1200, height: 630 }] },
}
export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
        Iraq Stock Exchange — ISX Live Market Prices
      </h1>
      {children}
    </>
  )
}
