import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: { absolute: 'فارز الأسهم · بورصة العراق | ISX Stock Screener' },
  description: 'فارز أسهم سوق العراق للأوراق المالية: فلترة وترتيب حسب التغيّر (يوم/أسبوع/شهر/سنة)، السيولة، تدفق الأجانب، القرب من قمة ٥٢ أسبوعاً والقطاع. Screen all Iraq Stock Exchange (ISX) stocks by performance, liquidity, foreign flow, 52-week range and sector.',
  alternates: { canonical: 'https://iraqsm.com/screener' },
  keywords: [
    'iraq stock exchange screener', 'isx stock screener', 'isx stock filter',
    'فارز الاسهم العراقية', 'تصفية اسهم بورصة العراق', 'سوق الاسهم العراقي',
  ],
  openGraph: {
    url: 'https://iraqsm.com/screener',
    title: 'ISX Stock Screener · فارز الأسهم العراقية | بورصة العراق',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}
export default function ScreenerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
        فارز الأسهم · سوق العراق للأوراق المالية | Iraq Stock Exchange Stock Screener
      </h1>
      {children}
    </>
  )
}
