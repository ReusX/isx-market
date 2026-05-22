import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'سعر الذهب اليوم في العراق — مثقال، غرام، أونصة بالدينار',
  description: 'سعر الذهب اليوم في العراق بالدينار العراقي — سعر مثقال الذهب عيار 21، سعر غرام الذهب عيار 24 و18، وسعر الأونصة. محول فوري بين الدولار والدينار. Gold price today in Iraq in IQD and USD.',
  alternates: { canonical: 'https://iraqsm.com/gold' },
  openGraph: {
    url: 'https://iraqsm.com/gold',
    title: 'سعر الذهب اليوم في العراق | مثقال وغرام بالدينار العراقي',
    description: 'سعر مثقال الذهب عيار 21 في العراق اليوم — محدّث تلقائياً بالدينار العراقي.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  keywords: ['سعر الذهب اليوم في العراق', 'سعر مثقال الذهب', 'سعر غرام الذهب', 'سعر الذهب عيار 21', 'اسعار الذهب العراق'],
}
export default function GoldLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
