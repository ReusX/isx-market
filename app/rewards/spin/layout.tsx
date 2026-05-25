import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'عجلة الحظ | ISX Market',
  description: 'العب عجلة الحظ اليومية واربح نقاط مجانية في بورصة العراق. Spin the daily wheel to earn free points on ISX Market — Iraq\'s stock exchange gamification platform.',
  alternates: { canonical: 'https://iraqsm.com/rewards/spin' },
  openGraph: { url: 'https://iraqsm.com/rewards/spin', images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
}
export default function SpinLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
