import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'سوق الأسهم العراقي — أسعار مباشرة | بورصة العراق ISX',
  description: 'جميع أسهم سوق الأسهم العراقي مباشرة — أسعار التداول، حجم الصفقات، القيمة السوقية، ومؤشر RSISX. تصفية حسب القطاع: مصارف، صناعة، استثمار، اتصالات. All ISX stocks with live prices and market data.',
  alternates: { canonical: 'https://iraqsm.com/market' },
  openGraph: {
    url: 'https://iraqsm.com/market',
    title: 'سوق الأسهم العراقي مباشر | بورصة العراق للأوراق المالية',
    description: 'أسعار التداول المباشرة لجميع أسهم بورصة العراق — مؤشر RSISX والقطاعات.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
}
export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
        سوق الأسهم العراقي — بورصة العراق للأوراق المالية مباشر
      </h1>
      {children}
    </>
  )
}
