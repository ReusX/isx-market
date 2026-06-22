import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: { absolute: 'تنبيهات الأسعار — بورصة العراق | ISX Price Alerts' },
  description: 'اضبط تنبيهات أسعار لأسهم سوق العراق للأوراق المالية وتابع بلوغ أهدافك السعرية. Set price alerts for Iraq Stock Exchange (ISX) stocks and get notified when targets are hit.',
  alternates: { canonical: 'https://iraqsm.com/alerts' },
  keywords: ['iraq stock exchange price alerts', 'isx price alerts', 'تنبيهات اسعار اسهم العراق', 'تنبيه سعر بورصة العراق'],
  openGraph: { url: 'https://iraqsm.com/alerts', title: 'ISX Price Alerts — تنبيهات الأسعار | بورصة العراق', images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
}
export default function AlertsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
        تنبيهات الأسعار — سوق العراق للأوراق المالية | Iraq Stock Exchange Price Alerts
      </h1>
      {children}
    </>
  )
}
