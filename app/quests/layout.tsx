import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'المهام | ISX Quests',
  description: 'أكمل المهام اليومية واربح نقاطاً في منصة ISX Market. Complete daily quests and earn points on ISX Market.',
  alternates: { canonical: 'https://iraqsm.com/quests' },
  openGraph: { url: 'https://iraqsm.com/quests', images: [{ url: '/og-image.png', width: 1200, height: 630 }] },
}
export default function QuestsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
        ISX Market Daily Quests — Earn Points
      </h1>
      {children}
    </>
  )
}
