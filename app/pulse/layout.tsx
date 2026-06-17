import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: { absolute: 'نبض السوق — اتساع السوق العراقي | ISX Market Breadth' },
  description: 'اتساع سوق العراق للأوراق المالية: الأسهم الصاعدة مقابل الهابطة، حجم التداول الصاعد/الهابط، القمم والقيعان الجديدة وخط الصعود/الهبوط — محدّث يومياً. Iraq Stock Exchange market breadth: advancers vs decliners, up/down volume, new highs/lows and the advance-decline line.',
  alternates: { canonical: 'https://iraqsm.com/pulse' },
  keywords: [
    'iraq stock exchange market breadth', 'isx advancers decliners', 'isx market pulse',
    'نبض السوق العراقي', 'اتساع السوق', 'الاسهم الصاعدة والهابطة', 'بورصة العراق',
  ],
  openGraph: {
    url: 'https://iraqsm.com/pulse',
    title: 'Market Pulse — Iraq Stock Exchange Breadth | نبض السوق العراقي',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}
export default function PulseLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
        نبض السوق — اتساع سوق العراق للأوراق المالية | Iraq Stock Exchange Market Breadth & Pulse
      </h1>
      {children}
    </>
  )
}
