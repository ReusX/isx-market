import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'سعر الدولار مقابل الدينار العراقي | IQD USD',
  description: 'سعر صرف الدولار الأمريكي مقابل الدينار العراقي اليوم. Dollar to Iraqi Dinar exchange rate — live IQD/USD converter.',
  alternates: { canonical: 'https://iraqsm.com/fx' },
  openGraph: { url: 'https://iraqsm.com/fx', images: [{ url: '/og-image.png', width: 1200, height: 630 }] },
}
export default function FxLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
        IQD to USD Exchange Rate — Iraqi Dinar Converter
      </h1>
      {children}
    </>
  )
}
