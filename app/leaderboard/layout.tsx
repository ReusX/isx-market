import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'المتصدرون | ISX Leaderboard',
  description: 'أفضل المستثمرين في منصة ISX Market — تصنيفات الرتب والنقاط. Top investors on ISX Market ranked by points and performance.',
  alternates: { canonical: 'https://iraqsm.com/leaderboard' },
  openGraph: { url: 'https://iraqsm.com/leaderboard', images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
}
export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
        ISX Market Leaderboard — Top Investors
      </h1>
      {children}
    </>
  )
}
