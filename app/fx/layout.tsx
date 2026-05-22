import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'سعر الدولار اليوم في العراق — سعر الصرف مقابل الدينار',
  description: 'سعر صرف الدولار الأمريكي مقابل الدينار العراقي اليوم — سعر 100 دولار بالدينار، محول العملات IQD/USD، وسعر الصرف الرسمي والسوق الموازية. Live dollar to Iraqi Dinar exchange rate and currency converter.',
  alternates: { canonical: 'https://iraqsm.com/fx' },
  openGraph: {
    url: 'https://iraqsm.com/fx',
    title: 'سعر الدولار اليوم في العراق | سعر صرف الدينار العراقي',
    description: 'سعر صرف الدولار مقابل الدينار العراقي اليوم — محول فوري IQD/USD.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
}
export default function FxLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
        سعر الدولار اليوم في العراق — سعر صرف الدينار العراقي مقابل الدولار الأمريكي
      </h1>
      {children}
    </>
  )
}
